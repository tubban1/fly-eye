import { db, ensureSchema } from '../server/db.js';
import { validUuid, normalizeDisplayName } from '../server/scoring.js';

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
    const userId=body.user_id;
    const displayName=normalizeDisplayName(body.display_name);
    if(!validUuid(userId)) return send(res,400,{error:'invalid_user_id'});
    if(!displayName) return send(res,400,{error:'invalid_display_name'});

    const sql=db();
    await sql`
      insert into fly_eye_players (user_id,display_name,updated_at)
      values (${userId},${displayName},now())
      on conflict (user_id)
      do update set display_name=excluded.display_name, updated_at=now()
    `;

    return send(res,200,{ok:true,display_name:displayName});
  }catch(err){
    console.error('player api failed',err);
    return send(res,500,{error:'player_backend_unavailable'});
  }
}
