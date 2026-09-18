import { db, ensureSchema } from '../server/db.js';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','private, no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('allow','GET');
    return send(res,405,{error:'method_not_allowed'});
  }

  try{
    await ensureSchema();
    const mode=req.query?.mode;
    if(!['sneak_up','scare_fast'].includes(mode)) return send(res,400,{error:'invalid_mode'});
    const limit=Math.max(1,Math.min(20,Number(req.query?.limit)||10));
    const viewerId=typeof req.query?.viewer_id==='string'?req.query.viewer_id:'';
    const sql=db();

    const rows=await sql`
      with best as (
        select distinct on (user_id)
          user_id, score, closest_approach, max_threat, escape_latency_ms,
          survived_ms, escaped, model_version, graph_profile, created_at
        from fly_eye_scores
        where mode=${mode}
        order by user_id, score desc, created_at asc
      ),
      ranked as (
        select
          b.*,
          p.display_name,
          rank() over (order by b.score desc)::int as rank
        from best b
        left join fly_eye_players p on p.user_id=b.user_id
      )
      select *
      from ranked
      order by score desc, created_at asc
      limit ${limit}
    `;

    return send(res,200,{
      ok:true,
      mode,
      entries:rows.map((row)=>({
        rank:row.rank,
        display_name:row.display_name||null,
        is_viewer:viewerId && String(row.user_id)===viewerId,
        score:row.score,
        closest_approach:row.closest_approach,
        max_threat:row.max_threat,
        escape_latency_ms:row.escape_latency_ms,
        survived_ms:row.survived_ms,
        escaped:row.escaped,
        model_version:row.model_version,
        graph_profile:row.graph_profile,
        created_at:row.created_at
      }))
    });
  }catch(err){
    console.error('leaderboard api failed',err);
    return send(res,500,{error:'leaderboard_unavailable'});
  }
}
