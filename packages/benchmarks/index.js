export async function runEscapeBenchmarks({profile,Runtime,vectors}){
  const results=[];
  for(const vector of vectors.vectors||[]){
    const runtime=new Runtime(profile);
    let state=runtime.reset();
    const max={lc4:0,dn:0,flight:0,escape:0};
    for(const looming of vector.steps||[]){
      state=runtime.step({looming});
      max.lc4=Math.max(max.lc4,state.lc4??state.loom??0);
      max.dn=Math.max(max.dn,state.dnLeft||0,state.dnRight||0);
      max.flight=Math.max(max.flight,state.flight||0);
      max.escape=Math.max(max.escape,state.escape||0);
    }
    const failures=[];
    const expected=vector.expect||{};
    if(expected.minLc4!=null&&max.lc4<expected.minLc4) failures.push('minLc4');
    if(expected.maxLc4!=null&&max.lc4>expected.maxLc4) failures.push('maxLc4');
    if(expected.minDn!=null&&max.dn<expected.minDn) failures.push('minDn');
    if(expected.minFlight!=null&&max.flight<expected.minFlight) failures.push('minFlight');
    if(expected.minEscape!=null&&max.escape<expected.minEscape) failures.push('minEscape');
    if(expected.maxEscape!=null&&max.escape>expected.maxEscape) failures.push('maxEscape');

    if(vector.reset){
      state=runtime.reset();
      const resetExpected=vector.expectAfterReset||{};
      if(resetExpected.maxEscape!=null&&state.escape>resetExpected.maxEscape) failures.push('resetEscape');
      if(resetExpected.maxLc4!=null&&(state.lc4??state.loom??0)>resetExpected.maxLc4) failures.push('resetLc4');
    }
    results.push({id:vector.id,pass:failures.length===0,failures,max});
  }
  return {pass:results.every(result=>result.pass),results};
}

export function validateNeuronGraphIntegrity(manifest,graph){
  const failures=[];
  if(manifest.neuronCount!==graph.neuronCount) failures.push('neuronCount');
  if(manifest.edgeCount!==graph.edgeCount) failures.push('edgeCount');
  if(graph.rowOffsets.length!==graph.neuronCount+1) failures.push('rowOffsets');
  if(graph.presynapticIndices.length!==graph.edgeCount) failures.push('presynapticIndices');
  if(graph.weights.length!==graph.edgeCount) failures.push('weights');
  for(const source of graph.presynapticIndices){
    if(source>=graph.neuronCount){failures.push('sourceRange');break}
  }
  return {pass:failures.length===0,failures};
}
