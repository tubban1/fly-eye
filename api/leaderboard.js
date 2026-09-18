import { db, ensureSchema } from '../server/db.js';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','public, max-age=10, s-maxage=20, stale-while-revalidate=60');
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
    const sql=db();

    const rows=await sql`
      select user_id, score, closest_approach, max_threat, escape_latency_ms,
             survived_ms, escaped, model_version, graph_profile, created_at
      from fly_eye_scores
      where mode=${mode}
      order by score desc, created_at asc
      limit ${limit}
    `;

    return send(res,200,{
      ok:true,
      mode,
      entries:rows.map((row,index)=>({
        rank:index+1,
        user_id:String(row.user_id),
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
