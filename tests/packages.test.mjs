import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  parseFlyGraph,
  validateNeuronManifest,
  incomingEdges,
  buildOutgoing
} from '@flyeye/graph-core';
import { EscapeRuntime } from '@flyeye/runtime';
import { runEscapeBenchmarks, validateNeuronGraphIntegrity } from '@flyeye/benchmarks';
import { loadEscapeNeuronV1 } from '@flyeye/escape-neuron-v1';

function makeGraph(){
  const n=4;
  const rows=[0,0,1,2,3];
  const presyn=[0,1,2];
  const weights=[1800,1400,1200];
  const e=presyn.length;
  const bytes=20+(n+1)*4+e*4+e*8;
  const buffer=new ArrayBuffer(bytes);
  const view=new DataView(buffer);
  new Uint8Array(buffer,0,8).set(new TextEncoder().encode('FLYGRAPH'));
  view.setUint32(8,1,true);
  view.setUint32(12,n,true);
  view.setUint32(16,e,true);
  let off=20;
  for(const v of rows){view.setUint32(off,v,true);off+=4}
  for(const v of presyn){view.setUint32(off,v,true);off+=4}
  for(const v of weights){view.setFloat64(off,v,true);off+=8}
  return buffer;
}

const graph=parseFlyGraph(makeGraph());
assert.equal(graph.neuronCount,4);
assert.equal(graph.edgeCount,3);
assert.deepEqual(incomingEdges(graph,1),[{source:0,target:1,weight:1800}]);
const outgoing=buildOutgoing(graph);
assert.equal(outgoing.targets[outgoing.offsets[0]],1);

const manifest={
  schemaVersion:1,
  profile:'flyeye.test-neuron.v1',
  kind:'neuron-connectome',
  neuronCount:4,
  edgeCount:3,
  bodyIds:['10','11','12','13'],
  originalIndices:[100,101,102,103],
  groups:[
    {id:'loom',indices:[0]},
    {id:'turnL',indices:[1]},
    {id:'flightL',indices:[3]}
  ]
};
assert.equal(validateNeuronManifest(manifest),true);
assert.equal(validateNeuronGraphIntegrity(manifest,graph).pass,true);

const aggregate=JSON.parse(
  fs.readFileSync(new URL('../public/data/escape-fast-v1.json',import.meta.url),'utf8')
);
const vectors=JSON.parse(
  fs.readFileSync(new URL('../packages/benchmarks/vectors/escape-fast-v1.json',import.meta.url),'utf8')
);
const report=await runEscapeBenchmarks({profile:aggregate,Runtime:EscapeRuntime,vectors});
assert.equal(report.pass,true,JSON.stringify(report,null,2));

const realManifestPath=new URL('../public/data/escape-neuron-v1/manifest.json',import.meta.url);
const realGraphPath=new URL('../public/data/escape-neuron-v1/graph.bin',import.meta.url);
const fileFetch=async(url)=>{
  const target=String(url).includes('manifest')?realManifestPath:realGraphPath;
  const bytes=fs.readFileSync(target);
  return {
    ok:true,
    status:200,
    json:async()=>JSON.parse(bytes.toString('utf8')),
    arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
  };
};
const realNeuron=await loadEscapeNeuronV1({
  manifestUrl:'manifest.json',
  graphUrl:'graph.bin',
  fetch:fileFetch
});
assert.equal(realNeuron.manifest.profile,'flyeye.escape-neuron.v1');
assert.equal(realNeuron.manifest.neuronCount,3376);
assert.equal(realNeuron.manifest.edgeCount,78797);
assert.equal(realNeuron.graph.neuronCount,3376);
assert.equal(realNeuron.graph.edgeCount,78797);
assert.equal(validateNeuronGraphIntegrity(realNeuron.manifest,realNeuron.graph).pass,true);
assert.equal(realNeuron.manifest.groups.find(g=>g.id==='loom')?.indices.length,126);

const runtime=new EscapeRuntime(aggregate);
let state;
for(let i=0;i<5;i++) state=runtime.step({looming:.8});
assert.ok(state.lc4>.2);
assert.ok(state.flight>.05);
assert.ok(state.escape>.2);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'flyeye-packages-'));
const manifestFile=path.join(tmp,'manifest.json');
const graphFile=path.join(tmp,'graph.bin');
fs.writeFileSync(manifestFile,JSON.stringify(manifest));
fs.writeFileSync(graphFile,Buffer.from(makeGraph()));

const cli=spawnSync(process.execPath,[
  'packages/connectome-tools/bin/flyeye-connectome.js',
  'inspect',
  '--manifest',manifestFile,
  '--graph',graphFile
],{cwd:new URL('..',import.meta.url),encoding:'utf8'});

assert.equal(cli.status,0,cli.stderr);
const inspected=JSON.parse(cli.stdout);
assert.equal(inspected.neurons,4);
assert.equal(inspected.edges,3);

console.log('PASS FlyEye Developer Kit packages');
