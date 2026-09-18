import { db, ensureSchema } from '../server/db.js';

export default async function handler(req,res){
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  try{
    await ensureSchema();
    const sql=db();
    const [row]=await sql`select now() as now`;
    res.statusCode=200;
    res.end(JSON.stringify({ok:true,database:true,now:row.now}));
  }catch(err){
    console.error('health api failed',err);
    res.statusCode=503;
    res.end(JSON.stringify({ok:false,database:false,error:'database_unavailable'}));
  }
}
