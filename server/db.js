import postgres from 'postgres';

let client;
let schemaPromise;

export function db(){
  const url=process.env.SUPABASE_DB_URL;
  if(!url) throw new Error('SUPABASE_DB_URL is not configured');
  if(!client){
    client=postgres(url,{
      ssl:'require',
      max:1,
      idle_timeout:20,
      connect_timeout:10,
      prepare:false
    });
  }
  return client;
}

export function ensureSchema(){
  if(schemaPromise) return schemaPromise;
  const sql=db();
  schemaPromise=(async()=>{
    await sql`
      create table if not exists fly_eye_scores (
        id bigserial primary key,
        user_id uuid not null,
        mode text not null check (mode in ('sneak_up','scare_fast')),
        score integer not null,
        closest_approach double precision,
        max_threat double precision,
        escape_latency_ms integer,
        survived_ms integer not null default 0,
        escaped boolean not null default false,
        model_version text not null,
        graph_profile text not null,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists fly_eye_scores_mode_score_idx on fly_eye_scores(mode, score desc, created_at asc)`;
    await sql`create index if not exists fly_eye_scores_user_idx on fly_eye_scores(user_id, created_at desc)`;
    return true;
  })().catch(err=>{schemaPromise=null;throw err});
  return schemaPromise;
}

export function clamp01(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return 0;
  return Math.max(0,Math.min(1,n));
}

export function calculateScore(mode,metrics={}){
  const closest=clamp01(metrics.closest_approach ?? 1);
  const maxThreat=clamp01(metrics.max_threat ?? 0);
  const survived=Math.max(0,Math.min(30000,Math.round(Number(metrics.survived_ms)||0)));
  const escaped=!!metrics.escaped;
  const latency=Math.max(0,Math.min(30000,Math.round(Number(metrics.escape_latency_ms)||0)));

  if(mode==='sneak_up'){
    const proximity=Math.round((1-closest)*7000);
    const survival=Math.round(Math.min(1,survived/20000)*2500);
    const control=Math.round((1-maxThreat)*500);
    return Math.max(0,Math.min(10000,proximity+survival+control-(escaped?2500:0)));
  }

  if(mode==='scare_fast'){
    if(!escaped || !latency) return 0;
    return Math.max(0,Math.min(10000,10000-Math.round(latency*1.6)));
  }

  throw new Error('Unsupported mode');
}

export function validUuid(value){
  return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
