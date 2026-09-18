import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const COMMIT='bff49a376f0844c918eb7f2be83e95f2699b0d14';
const BASE=`https://raw.githubusercontent.com/dzhng/fly-escape/${COMMIT}/data/processed/brain`;
const cacheDir='.cache/flyeye-source';
const manifestPath=path.join(cacheDir,'manifest.json');
const graphPath=path.join(cacheDir,'graph.bin');
const outDir='public/data/escape-neuron-v1';

fs.mkdirSync(cacheDir,{recursive:true});
fs.mkdirSync(outDir,{recursive:true});

async function download(url,dest){
  const r=await fetch(url,{redirect:'follow'});
  if(!r.ok) throw new Error(`Download failed ${r.status}: ${url}`);
  const ab=await r.arrayBuffer();
  fs.writeFileSync(dest,Buffer.from(ab));
  console.log(`Downloaded ${path.basename(dest)} ${(ab.byteLength/1e6).toFixed(2)} MB`);
}

await download(`${BASE}/manifest.json`,manifestPath);
await download(`${BASE}/graph.bin`,graphPath);

const result=spawnSync(process.execPath,[
  'scripts/build-escape-graph.mjs',
  manifestPath,
  graphPath,
  outDir
],{stdio:'inherit',env:{...process.env,MAX_HOPS:'3',TOP_ESCAPE_DNS:'32'}});

if(result.status!==0) process.exit(result.status??1);

const m=JSON.parse(fs.readFileSync(path.join(outDir,'manifest.json'),'utf8'));
console.log(`Prepared escape-neuron-v1: ${m.neuronCount} neurons, ${m.edgeCount} edges, ${(m.graphBytes/1e6).toFixed(3)} MB`);
