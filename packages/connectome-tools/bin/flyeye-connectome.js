#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseFlyGraph, validateNeuronManifest, buildOutgoing } from '@fly-eye/graph-core';

function die(message){ console.error(message); process.exit(1); }
function parseArgs(argv){
  const out={_:[]};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg.startsWith('--')) out[arg.slice(2)]=argv[++i] ?? true;
    else out._.push(arg);
  }
  return out;
}
function readJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function list(value){ return String(value||'').split(',').map(v=>v.trim()).filter(Boolean); }

function inspect(manifestFile,graphFile){
  if(!manifestFile||!graphFile) die('inspect requires --manifest and --graph');
  const manifest=readJson(manifestFile);
  validateNeuronManifest(manifest);
  const graph=parseFlyGraph(fs.readFileSync(graphFile));
  console.log(JSON.stringify({
    profile:manifest.profile,
    neurons:graph.neuronCount,
    edges:graph.edgeCount,
    groups:(manifest.groups||[]).map(g=>({id:g.id,count:g.indices.length})),
    graphBytes:fs.statSync(graphFile).size,
    graphHash:crypto.createHash('sha256').update(fs.readFileSync(graphFile)).digest('hex')
  },null,2));
}

function bfsForward(starts,out,maxHops){
  const dist=new Int16Array(out.offsets.length-1);dist.fill(-1);
  let frontier=[...starts];
  for(const s of frontier) dist[s]=0;
  for(let d=0;d<maxHops&&frontier.length;d++){
    const next=[];
    for(const source of frontier){
      for(let e=out.offsets[source];e<out.offsets[source+1];e++){
        const target=out.targets[e];
        if(dist[target]===-1){dist[target]=d+1;next.push(target)}
      }
    }
    frontier=next;
  }
  return dist;
}
function bfsBackward(starts,graph,maxHops){
  const dist=new Int16Array(graph.neuronCount);dist.fill(-1);
  let frontier=[...starts];
  for(const s of frontier) dist[s]=0;
  for(let d=0;d<maxHops&&frontier.length;d++){
    const next=[];
    for(const target of frontier){
      for(let e=graph.rowOffsets[target];e<graph.rowOffsets[target+1];e++){
        const source=graph.presynapticIndices[e];
        if(dist[source]===-1){dist[source]=d+1;next.push(source)}
      }
    }
    frontier=next;
  }
  return dist;
}
function writeGraph(file,oldIndices,remap,graph){
  const rows=new Uint32Array(oldIndices.length+1);
  const presyn=[];const weights=[];
  for(let localTarget=0;localTarget<oldIndices.length;localTarget++){
    const oldTarget=oldIndices[localTarget];
    for(let edge=graph.rowOffsets[oldTarget];edge<graph.rowOffsets[oldTarget+1];edge++){
      const localSource=remap[graph.presynapticIndices[edge]];
      if(localSource<0) continue;
      presyn.push(localSource);weights.push(graph.weights[edge]);
    }
    rows[localTarget+1]=presyn.length;
  }
  const bytes=20+rows.length*4+presyn.length*4+weights.length*8;
  const buffer=Buffer.allocUnsafe(bytes);
  buffer.write('FLYGRAPH',0,'utf8');
  buffer.writeUInt32LE(1,8);
  buffer.writeUInt32LE(oldIndices.length,12);
  buffer.writeUInt32LE(presyn.length,16);
  let offset=20;
  for(const v of rows){buffer.writeUInt32LE(v,offset);offset+=4}
  for(const v of presyn){buffer.writeUInt32LE(v,offset);offset+=4}
  for(const v of weights){buffer.writeDoubleLE(v,offset);offset+=8}
  fs.writeFileSync(file,buffer);
  return {
    edgeCount:presyn.length,
    graphBytes:bytes,
    graphHash:crypto.createHash('sha256').update(buffer).digest('hex')
  };
}

function cut(args){
  const manifestFile=args.manifest||die('--manifest required');
  const graphFile=args.graph||die('--graph required');
  const outDir=args['out-dir']||die('--out-dir required');
  const profile=args.profile||'flyeye.custom.v1';
  const maxHops=Number(args['max-hops']||3);
  const seedIds=list(args['seed-groups']);
  const targetIds=list(args['target-groups']);
  if(!seedIds.length||!targetIds.length) die('--seed-groups and --target-groups required');

  const manifest=readJson(manifestFile);
  validateNeuronManifest(manifest);
  const graph=parseFlyGraph(fs.readFileSync(graphFile));
  const groups=new Map(manifest.groups.map(g=>[g.id,g]));
  const seeds=seedIds.flatMap(id=>groups.get(id)?.indices||[]);
  const targets=targetIds.flatMap(id=>groups.get(id)?.indices||[]);
  if(!seeds.length) die('No seed neurons found');
  if(!targets.length) die('No target neurons found');

  const outgoing=buildOutgoing(graph);
  const fwd=bfsForward(seeds,outgoing,maxHops);
  const back=bfsBackward(targets,graph,maxHops);
  const keep=new Uint8Array(graph.neuronCount);
  for(let i=0;i<graph.neuronCount;i++){
    if(fwd[i]>=0&&back[i]>=0&&fwd[i]+back[i]<=maxHops) keep[i]=1;
  }
  for(const i of seeds)keep[i]=1;
  for(const i of targets)keep[i]=1;

  const oldIndices=[];
  for(let i=0;i<keep.length;i++) if(keep[i]) oldIndices.push(i);
  const remap=new Int32Array(graph.neuronCount);remap.fill(-1);
  oldIndices.forEach((oldI,newI)=>{remap[oldI]=newI});

  fs.mkdirSync(outDir,{recursive:true});
  const stats=writeGraph(path.join(outDir,'graph.bin'),oldIndices,remap,graph);
  const remapList=xs=>(xs||[]).map(i=>remap[i]).filter(i=>i>=0);
  const outManifest={
    schemaVersion:1,
    profile,
    kind:'neuron-connectome',
    neuronCount:oldIndices.length,
    edgeCount:stats.edgeCount,
    graphBytes:stats.graphBytes,
    graphHash:stats.graphHash,
    bodyIds:oldIndices.map(i=>String(manifest.bodyIds?.[i]??i)),
    originalIndices:oldIndices,
    groups:manifest.groups.map(g=>({...g,indices:remapList(g.indices)})).filter(g=>g.indices.length),
    source:{
      profile:manifest.profile,
      graphHash:manifest.graphHash||manifest.sourceGraphSha256||null
    },
    extraction:{
      seedGroups:seedIds,
      targetGroups:targetIds,
      maxHops,
      preservesAllInternalEdgesAmongSelectedNodes:true
    }
  };
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(outManifest,null,2)+'\n');
  console.log(JSON.stringify({profile,neurons:oldIndices.length,...stats},null,2));
}

const args=parseArgs(process.argv.slice(2));
const command=args._[0];
if(command==='inspect') inspect(args.manifest||args._[1],args.graph||args._[2]);
else if(command==='cut') cut(args);
else die('Usage: flyeye-connectome inspect --manifest M --graph G | cut --manifest M --graph G --seed-groups loom --target-groups turnL,turnR --max-hops 3 --out-dir OUT [--profile ID]');
