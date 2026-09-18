const DOMAIN='fly.fde.fan';
const ZONE_NAME='fde.fan';
const TARGET='cname.vercel-dns-0.com';

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.end(JSON.stringify(payload));
}

async function cf(path,token,init={}){
  const resp=await fetch('https://api.cloudflare.com/client/v4'+path,{
    ...init,
    headers:{
      authorization:'Bearer '+token,
      'content-type':'application/json',
      ...(init.headers||{})
    }
  });
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok || data.success===false){
    const detail=data?.errors?.map(e=>e.message).join('; ')||('HTTP '+resp.status);
    throw new Error(detail);
  }
  return data;
}

export default async function handler(req,res){
  if(req.method!=='GET' && req.method!=='POST'){
    res.setHeader('allow','GET, POST');
    return send(res,405,{error:'method_not_allowed'});
  }

  const token=process.env.CLOUDFLARE_API_TOKEN;
  const accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
  if(!token||!accountId) return send(res,503,{error:'cloudflare_env_missing'});

  try{
    const zones=await cf('/zones?name='+encodeURIComponent(ZONE_NAME)+'&account.id='+encodeURIComponent(accountId),token);
    const zone=(zones.result||[]).find(z=>z.name===ZONE_NAME);
    if(!zone) return send(res,404,{error:'zone_not_found',zone:ZONE_NAME});

    const found=await cf('/zones/'+zone.id+'/dns_records?type=CNAME&name='+encodeURIComponent(DOMAIN),token);
    const existing=(found.result||[])[0];
    const body={
      type:'CNAME',
      name:DOMAIN,
      content:TARGET,
      ttl:1,
      proxied:false,
      comment:'Fly Eye production alias managed by Fly Eye setup endpoint'
    };

    let record;
    if(existing){
      const same=existing.content===TARGET && existing.proxied===false;
      if(same){
        record=existing;
      }else{
        const updated=await cf('/zones/'+zone.id+'/dns_records/'+existing.id,token,{method:'PUT',body:JSON.stringify(body)});
        record=updated.result;
      }
    }else{
      const created=await cf('/zones/'+zone.id+'/dns_records',token,{method:'POST',body:JSON.stringify(body)});
      record=created.result;
    }

    return send(res,200,{
      ok:true,
      domain:DOMAIN,
      target:TARGET,
      proxied:false,
      zone_id:zone.id,
      record_id:record?.id||null
    });
  }catch(err){
    console.error('dns setup failed',err);
    return send(res,500,{error:'dns_setup_failed',message:String(err?.message||err)});
  }
}
