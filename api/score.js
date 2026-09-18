import { db, ensureSchema } from '../server/db.js';
import { calculateScore, validUuid, normalizeMetrics, normalizeDisplayName } from '../server/scoring.js';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify(payload));
}

async function readJson(req){
  if(req.body && typeof req.body==='object') return req.body;
  if(typeof req.body==='string') return JSON.parse(req.body||'{}');
  let raw='';
  for await (const chunk of req) raw+=chunk;
  return raw?JSON.parse(raw):{};
}

async function rankSneak(sql,userId){
  const [row]=await sql`
    with best as (
      select distinct on (user_id)
        user_id, score, closest_approach, max_threat, survived_ms, escaped, created_at
      from fly_eye_sneak_scores
      order by
        user_id,
        escaped asc,
        closest_approach asc,
        survived_ms desc,
        max_threat asc,
        created_at asc
    ),
    ranked as (
      select
        *,
        rank() over (
          order by escaped asc, closest_approach asc, survived_ms desc, max_threat asc
        )::int as rank
      from best
    )
    select score,rank
    from ranked
    where user_id=${userId}
    limit 1
  `;
  return row||null;
}

async function rankScare(sql,userId){
  const [row]=await sql`
    with best as (
      select distinct on (user_id)
        user_id, score, escape_latency_ms, survived_ms, escaped, created_at
      from fly_eye_scare_scores
      order by
        user_id,
        case when escaped and escape_latency_ms is not null then 0 else 1 end asc,
        escape_latency_ms asc nulls last,
        created_at asc
    ),
    ranked as (
      select
        *,
        rank() over (
          order by
            case when escaped and escape_latency_ms is not null then 0 else 1 end asc,
            escape_latency_ms asc nulls last
        )::int as rank
      from best
    )
    select score,rank
    from ranked
    where user_id=${userId}
    limit 1
  `;
  return row||null;
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('allow','POST');
    return send(res,405,{error:'method_not_allowed'});
  }

  try{
    await ensureSchema();
    const body=await readJson(req);
    const mode=body.mode;
    const userId=body.user_id;
    if(!validUuid(userId)) return send(res,400,{error:'invalid_user_id'});
    if(!['sneak_up','scare_fast'].includes(mode)) return send(res,400,{error:'invalid_mode'});

    const metrics=normalizeMetrics(body);
    const displayName=normalizeDisplayName(body.display_name);

    if(mode==='scare_fast' && metrics.escaped && metrics.escape_latency_ms<80){
      return send(res,400,{error:'implausible_latency'});
    }
    if(mode==='sneak_up' && metrics.survived_ms>20500 && metrics.escaped){
      metrics.survived_ms=20500;
    }

    const score=calculateScore(mode,metrics);
    const modelVersion=String(body.model_version||'0.5.0-alpha.3').slice(0,64);
    const graphProfile=String(body.graph_profile||'escape-fast-v1').slice(0,64);
    const sql=db();

    if(displayName){
      await sql`
        insert into fly_eye_players (user_id,display_name,updated_at)
        values (${userId},${displayName},now())
        on conflict (user_id)
        do update set display_name=excluded.display_name, updated_at=now()
      `;
    }

    let inserted;
    let ranked;

    if(mode==='sneak_up'){
      [inserted]=await sql`
        insert into fly_eye_sneak_scores
          (user_id,score,closest_approach,max_threat,survived_ms,escaped,model_version,graph_profile)
        values
          (${userId},${score},${metrics.closest_approach},${metrics.max_threat},
           ${metrics.survived_ms},${metrics.escaped},${modelVersion},${graphProfile})
        returning id,score,created_at
      `;
      ranked=await rankSneak(sql,userId);
    }else{
      [inserted]=await sql`
        insert into fly_eye_scare_scores
          (user_id,score,escape_latency_ms,max_threat,survived_ms,escaped,model_version,graph_profile)
        values
          (${userId},${score},${metrics.escape_latency_ms||null},${metrics.max_threat},
           ${metrics.survived_ms},${metrics.escaped},${modelVersion},${graphProfile})
        returning id,score,created_at
      `;
      ranked=await rankScare(sql,userId);
    }

    return send(res,200,{
      ok:true,
      id:String(inserted.id),
      score:inserted.score,
      personal_best:ranked?.score??inserted.score,
      rank:ranked?.rank??null,
      mode,
      display_name:displayName,
      metrics,
      rank_basis:mode==='sneak_up'
        ? ['escaped','closest_approach','survived_ms','max_threat']
        : ['escaped','escape_latency_ms']
    });
  }catch(err){
    console.error('score api failed',err);
    return send(res,500,{error:'score_backend_unavailable'});
  }
}
