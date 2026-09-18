import { db, ensureSchema } from '../server/db.js';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','private, no-store');
  res.end(JSON.stringify(payload));
}

function mapEntry(row,viewerId){
  if(!row) return null;
  return {
    rank:row.rank,
    display_name:row.display_name||null,
    is_viewer:!!viewerId && String(row.user_id)===viewerId,
    score:row.score,
    closest_approach:row.closest_approach,
    max_threat:row.max_threat,
    escape_latency_ms:row.escape_latency_ms,
    survived_ms:row.survived_ms,
    escaped:row.escaped,
    model_version:row.model_version,
    graph_profile:row.graph_profile,
    created_at:row.created_at
  };
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
    const limit=Math.max(1,Math.min(100,Number(req.query?.limit)||25));
    const offset=Math.max(0,Number(req.query?.offset)||0);
    const viewerId=typeof req.query?.viewer_id==='string'?req.query.viewer_id:'';
    const sql=db();

    const pageRows=await sql`
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
      order by score desc, created_at asc, user_id asc
      limit ${limit + 1}
      offset ${offset}
    `;

    let viewerEntry=null;
    if(viewerId){
      const viewerRows=await sql`
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
        where user_id::text=${viewerId}
        limit 1
      `;
      viewerEntry=mapEntry(viewerRows[0],viewerId);
    }

    const hasMore=pageRows.length>limit;
    const entries=pageRows.slice(0,limit).map(row=>mapEntry(row,viewerId));

    return send(res,200,{
      ok:true,
      mode,
      offset,
      limit,
      has_more:hasMore,
      next_offset:hasMore?offset+entries.length:null,
      viewer_entry:viewerEntry,
      entries
    });
  }catch(err){
    console.error('leaderboard api failed',err);
    return send(res,500,{error:'leaderboard_unavailable'});
  }
}
