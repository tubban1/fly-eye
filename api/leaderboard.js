import { db, ensureSchema } from '../server/db.js';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','private, no-store');
  res.end(JSON.stringify(payload));
}

function mapEntry(row,viewerId,mode){
  if(!row) return null;
  return {
    rank:row.rank,
    display_name:row.display_name||null,
    is_viewer:!!viewerId && String(row.user_id)===viewerId,
    score:row.score,
    closest_approach:mode==='sneak_up'?row.closest_approach:null,
    max_threat:row.max_threat,
    escape_latency_ms:mode==='scare_fast'?row.escape_latency_ms:null,
    survived_ms:row.survived_ms,
    escaped:row.escaped,
    model_version:row.model_version,
    graph_profile:row.graph_profile,
    created_at:row.created_at
  };
}

async function sneakPage(sql,{limit,offset,viewerId}){
  const pageRows=await sql`
    with best as (
      select distinct on (s.user_id)
        s.user_id,s.score,s.closest_approach,s.max_threat,s.survived_ms,s.escaped,
        s.model_version,s.graph_profile,s.created_at
      from fly_eye_sneak_scores s
      order by
        s.user_id,
        s.escaped asc,
        s.closest_approach asc,
        s.survived_ms desc,
        s.max_threat asc,
        s.created_at asc
    ),
    ranked as (
      select
        b.*,p.display_name,
        rank() over (
          order by b.escaped asc,b.closest_approach asc,b.survived_ms desc,b.max_threat asc
        )::int as rank
      from best b
      left join fly_eye_players p on p.user_id=b.user_id
    )
    select *
    from ranked
    order by rank asc,created_at asc,user_id asc
    limit ${limit+1}
    offset ${offset}
  `;

  let viewerRow=null;
  if(viewerId){
    [viewerRow]=await sql`
      with best as (
        select distinct on (s.user_id)
          s.user_id,s.score,s.closest_approach,s.max_threat,s.survived_ms,s.escaped,
          s.model_version,s.graph_profile,s.created_at
        from fly_eye_sneak_scores s
        order by
          s.user_id,
          s.escaped asc,
          s.closest_approach asc,
          s.survived_ms desc,
          s.max_threat asc,
          s.created_at asc
      ),
      ranked as (
        select
          b.*,p.display_name,
          rank() over (
            order by b.escaped asc,b.closest_approach asc,b.survived_ms desc,b.max_threat asc
          )::int as rank
        from best b
        left join fly_eye_players p on p.user_id=b.user_id
      )
      select * from ranked where user_id::text=${viewerId} limit 1
    `;
  }
  return {pageRows,viewerRow};
}

async function scarePage(sql,{limit,offset,viewerId}){
  const pageRows=await sql`
    with best as (
      select distinct on (s.user_id)
        s.user_id,s.score,s.escape_latency_ms,s.max_threat,s.survived_ms,s.escaped,
        s.model_version,s.graph_profile,s.created_at
      from fly_eye_scare_scores s
      order by
        s.user_id,
        case when s.escaped and s.escape_latency_ms is not null then 0 else 1 end asc,
        s.escape_latency_ms asc nulls last,
        s.created_at asc
    ),
    ranked as (
      select
        b.*,p.display_name,
        rank() over (
          order by
            case when b.escaped and b.escape_latency_ms is not null then 0 else 1 end asc,
            b.escape_latency_ms asc nulls last
        )::int as rank
      from best b
      left join fly_eye_players p on p.user_id=b.user_id
    )
    select *
    from ranked
    order by rank asc,created_at asc,user_id asc
    limit ${limit+1}
    offset ${offset}
  `;

  let viewerRow=null;
  if(viewerId){
    [viewerRow]=await sql`
      with best as (
        select distinct on (s.user_id)
          s.user_id,s.score,s.escape_latency_ms,s.max_threat,s.survived_ms,s.escaped,
          s.model_version,s.graph_profile,s.created_at
        from fly_eye_scare_scores s
        order by
          s.user_id,
          case when s.escaped and s.escape_latency_ms is not null then 0 else 1 end asc,
          s.escape_latency_ms asc nulls last,
          s.created_at asc
      ),
      ranked as (
        select
          b.*,p.display_name,
          rank() over (
            order by
              case when b.escaped and b.escape_latency_ms is not null then 0 else 1 end asc,
              b.escape_latency_ms asc nulls last
          )::int as rank
        from best b
        left join fly_eye_players p on p.user_id=b.user_id
      )
      select * from ranked where user_id::text=${viewerId} limit 1
    `;
  }
  return {pageRows,viewerRow};
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

    const {pageRows,viewerRow}=mode==='sneak_up'
      ? await sneakPage(sql,{limit,offset,viewerId})
      : await scarePage(sql,{limit,offset,viewerId});

    const hasMore=pageRows.length>limit;
    const entries=pageRows.slice(0,limit).map(row=>mapEntry(row,viewerId,mode));

    return send(res,200,{
      ok:true,
      mode,
      offset,
      limit,
      has_more:hasMore,
      next_offset:hasMore?offset+entries.length:null,
      viewer_entry:mapEntry(viewerRow,viewerId,mode),
      entries,
      ranking:mode==='sneak_up'
        ? {primary:'escaped',secondary:'closest_approach',tertiary:'survived_ms',quaternary:'max_threat'}
        : {primary:'escaped',secondary:'escape_latency_ms'}
    });
  }catch(err){
    console.error('leaderboard api failed',err);
    return send(res,500,{error:'leaderboard_unavailable'});
  }
}
