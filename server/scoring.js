export function clamp01(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return 0;
  return Math.max(0,Math.min(1,n));
}

export function normalizeMetrics(metrics={}){
  return {
    closest_approach:clamp01(metrics.closest_approach ?? 1),
    max_threat:clamp01(metrics.max_threat ?? 0),
    escape_latency_ms:Math.max(0,Math.min(30000,Math.round(Number(metrics.escape_latency_ms)||0))),
    survived_ms:Math.max(0,Math.min(30000,Math.round(Number(metrics.survived_ms)||0))),
    escaped:!!metrics.escaped
  };
}

export function calculateScore(mode,input={}){
  const metrics=normalizeMetrics(input);
  const closest=metrics.closest_approach;
  const maxThreat=metrics.max_threat;
  const survived=metrics.survived_ms;
  const escaped=metrics.escaped;
  const latency=metrics.escape_latency_ms;

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
