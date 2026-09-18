const MAGIC='FLYGRAPH';

export function parseFlyGraph(buffer){
  const ab=buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  const view=new DataView(ab);
  const magic=new TextDecoder().decode(new Uint8Array(ab,0,8));
  if(magic!==MAGIC) throw new Error('Invalid FLYGRAPH magic');
  const version=view.getUint32(8,true);
  const neuronCount=view.getUint32(12,true);
  const edgeCount=view.getUint32(16,true);
  if(version!==1) throw new Error('Unsupported FLYGRAPH version '+version);

  const rowOffset=20;
  const preOffset=rowOffset+(neuronCount+1)*4;
  const weightOffset=preOffset+edgeCount*4;
  const expected=weightOffset+edgeCount*8;
  if(ab.byteLength!==expected){
    throw new Error('FLYGRAPH byte length mismatch: '+ab.byteLength+' != '+expected);
  }

  const rowOffsets=new Uint32Array(neuronCount+1);
  for(let i=0;i<=neuronCount;i++) rowOffsets[i]=view.getUint32(rowOffset+i*4,true);
  const presynapticIndices=new Uint32Array(edgeCount);
  for(let i=0;i<edgeCount;i++) presynapticIndices[i]=view.getUint32(preOffset+i*4,true);
  const weights=new Float64Array(edgeCount);
  for(let i=0;i<edgeCount;i++) weights[i]=view.getFloat64(weightOffset+i*8,true);

  return {format:'FLYGRAPH',version,neuronCount,edgeCount,rowOffsets,presynapticIndices,weights};
}

export function validateNeuronManifest(manifest){
  if(!manifest||typeof manifest!=='object') throw new Error('Manifest must be an object');
  if(!String(manifest.profile||'').startsWith('flyeye.')) throw new Error('Missing FlyEye profile id');
  if(!Number.isInteger(manifest.neuronCount)||manifest.neuronCount<1) throw new Error('Invalid neuronCount');
  if(!Number.isInteger(manifest.edgeCount)||manifest.edgeCount<0) throw new Error('Invalid edgeCount');
  if(!Array.isArray(manifest.groups)) throw new Error('Manifest groups must be an array');
  if(manifest.bodyIds && manifest.bodyIds.length!==manifest.neuronCount) throw new Error('bodyIds length mismatch');
  if(manifest.originalIndices && manifest.originalIndices.length!==manifest.neuronCount) throw new Error('originalIndices length mismatch');
  for(const group of manifest.groups){
    if(!group.id||!Array.isArray(group.indices)) throw new Error('Invalid group');
    for(const index of group.indices){
      if(!Number.isInteger(index)||index<0||index>=manifest.neuronCount) throw new Error('Group index out of range');
    }
  }
  return true;
}

export function validateAggregateProfile(profile){
  if(!profile||typeof profile!=='object') throw new Error('Profile must be an object');
  if(!Array.isArray(profile.nodes)||!Array.isArray(profile.edges)) throw new Error('Invalid aggregate profile shape');
  const ids=new Set(profile.nodes.map(n=>n.id));
  for(const edge of profile.edges){
    if(!ids.has(edge.source)||!ids.has(edge.target)) throw new Error('Unknown aggregate node');
    if(!Number.isFinite(edge.edgeCount)||edge.edgeCount<1) throw new Error('Invalid aggregate edgeCount');
    if(!Number.isFinite(edge.positiveWeight)||!Number.isFinite(edge.negativeWeight)) throw new Error('Invalid aggregate weights');
  }
  return true;
}

export async function loadJson(url,fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=='function') throw new Error('fetch implementation required');
  const response=await fetchImpl(url);
  if(!response.ok) throw new Error('HTTP '+response.status+' loading '+url);
  return response.json();
}

export async function loadNeuronGraph(manifestUrl,graphUrl,fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=='function') throw new Error('fetch implementation required');
  const [manifestResponse,graphResponse]=await Promise.all([
    fetchImpl(manifestUrl),
    fetchImpl(graphUrl)
  ]);
  if(!manifestResponse.ok) throw new Error('HTTP '+manifestResponse.status+' loading manifest');
  if(!graphResponse.ok) throw new Error('HTTP '+graphResponse.status+' loading graph');
  const manifest=await manifestResponse.json();
  validateNeuronManifest(manifest);
  const graph=parseFlyGraph(await graphResponse.arrayBuffer());
  if(graph.neuronCount!==manifest.neuronCount||graph.edgeCount!==manifest.edgeCount){
    throw new Error('Manifest/graph count mismatch');
  }
  return {manifest,graph};
}

export function groupById(manifest,id){
  return manifest.groups?.find(group=>group.id===id)||null;
}

export function bodyIdAt(manifest,index){
  return manifest.bodyIds?.[index]??null;
}

export function originalIndexAt(manifest,index){
  return manifest.originalIndices?.[index]??null;
}

export function incomingEdges(graph,target){
  if(target<0||target>=graph.neuronCount) throw new RangeError('target out of range');
  const out=[];
  for(let edge=graph.rowOffsets[target];edge<graph.rowOffsets[target+1];edge++){
    out.push({
      source:graph.presynapticIndices[edge],
      target,
      weight:graph.weights[edge]
    });
  }
  return out;
}

export function buildOutgoing(graph){
  const counts=new Uint32Array(graph.neuronCount);
  for(const source of graph.presynapticIndices) counts[source]++;
  const offsets=new Uint32Array(graph.neuronCount+1);
  for(let i=0;i<graph.neuronCount;i++) offsets[i+1]=offsets[i]+counts[i];
  const cursor=offsets.slice(0,graph.neuronCount);
  const targets=new Uint32Array(graph.edgeCount);
  const weights=new Float64Array(graph.edgeCount);
  for(let target=0;target<graph.neuronCount;target++){
    for(let edge=graph.rowOffsets[target];edge<graph.rowOffsets[target+1];edge++){
      const source=graph.presynapticIndices[edge];
      const pos=cursor[source]++;
      targets[pos]=target;
      weights[pos]=graph.weights[edge];
    }
  }
  return {offsets,targets,weights};
}
