import { db, ensureSchema } from '../server/db.js';
import { calculateScore, validUuid, normalizeMetrics } from '../server/scoring.js';

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

    // Plausibility checks: alpha anti-cheat. Stronger signed-session validation comes later.
    if(mode==='scare_fast' && metrics.escaped && metrics.escape_latency_ms<250){
      return send(res,400,{error:'implausible_latency'});
    }
    if(mode==='sneak_up' && metrics.survived_ms>20500 && metrics.escaped){
      metrics.survived_ms=20500;
    }

    const score=calculateScore(mode,metrics);
    const modelVersion=String(body.model_version||'0.5.0-alpha.3').slice(0,64);
    const graphProfile=String(body.graph_profile||'escape-fast-v1').slice(0,64);

    const sql=db();
    const [row]=await sql`
      insert into fly_eye_scores
        (user_id,mode,score,closest_approach,max_threat,escape_latency_ms,survived_ms,escaped,model_version,graph_profile)
      values
        (${userId},${mode},${score},${metrics.closest_approach},${metrics.max_threat},
         ${metrics.escape_latency_ms||null},${metrics.survived_ms},${metrics.escaped},${modelVersion},${graphProfile})
      returning id,score,created_at
    `;

    const [bestRow]=await sql`
      select max(score)::int as personal_best
      from fly_eye_scores
      where mode=${mode} and user_id=${userId}
    `;

    const [rankRow]=await sql`
      with best as (
        select distinct on (user_id) user_id, score
        from fly_eye_scores
        where mode=${mode}
        order by user_id, score desc, created_at asc
      )
      select 1 + count(*)::int as rank
      from best
      where score>${bestRow.personal_best}
    `;

    return send(res,200,{
      ok:true,
      id:String(row.id),
      score:row.score,
      personal_best:bestRow.personal_best,
      rank:rankRow.rank,
      mode,
      metrics
    });
  }catch(err){
    console.error('score api failed',err);
    return send(res,500,{error:'score_backend_unavailable'});
  }
}
