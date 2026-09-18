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

function clean(value,max=2000){
  if(typeof value!=='string') return '';
  return Array.from(value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim()).slice(0,max).join('');
}

export default async function handler(req,res){
  try{
    await ensureSchema();
    const sql=db();

    if(req.method==='POST'){
      const body=await readJson(req);
      const message=clean(body.message,2000);
      const category=['bug','idea','science','other'].includes(body.category)?body.category:'other';
      const userId=validUuid(body.user_id)?body.user_id:null;
      const displayName=normalizeDisplayName(body.display_name);
      const contact=clean(body.contact,160)||null;
      const pagePath=clean(body.page_path,240)||null;
      const mode=['sneak_up','scare_fast'].includes(body.mode)?body.mode:null;
      if(!message) return send(res,400,{error:'message_required'});

      const [row]=await sql`
        insert into fly_eye_feedback
          (user_id,display_name,category,message,contact,page_path,mode)
        values
          (${userId},${displayName},${category},${message},${contact},${pagePath},${mode})
        returning id,created_at
      `;
      return send(res,201,{ok:true,id:String(row.id),created_at:row.created_at});
    }

    if(req.method==='GET'){
      const expected=process.env.FEEDBACK_ADMIN_TOKEN;
      const auth=String(req.headers?.authorization||'');
      if(!expected || auth!==`Bearer ${expected}`) return send(res,401,{error:'unauthorized'});

      const limit=Math.max(1,Math.min(250,Number(req.query?.limit)||100));
      const rows=await sql`
        select id,user_id,display_name,category,message,contact,page_path,mode,created_at
        from fly_eye_feedback
        order by created_at desc
        limit ${limit}
      `;
      return send(res,200,{ok:true,entries:rows.map(row=>({
        ...row,
        id:String(row.id),
        user_id:row.user_id?String(row.user_id):null
      }))});
    }

    res.setHeader('allow','GET, POST');
    return send(res,405,{error:'method_not_allowed'});
  }catch(err){
    console.error('feedback api failed',err);
    return send(res,500,{error:'feedback_backend_unavailable'});
  }
}
