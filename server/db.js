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
    await sql`
      create table if not exists fly_eye_players (
        user_id uuid primary key,
        display_name text not null,
        updated_at timestamptz not null default now()
      )
    `;
    await sql`
      create table if not exists fly_eye_feedback (
        id bigserial primary key,
        user_id uuid,
        display_name text,
        category text not null check (category in ('bug','idea','science','other')),
        message text not null,
        contact text,
        page_path text,
        mode text,
        created_at timestamptz not null default now()
      )
    `;
    await sql`create index if not exists fly_eye_feedback_created_idx on fly_eye_feedback(created_at desc)`;
    return true;
  })().catch(err=>{schemaPromise=null;throw err});
  return schemaPromise;
}
