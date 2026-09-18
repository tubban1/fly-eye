import fs from 'node:fs';
import vm from 'node:vm';

const posts=[];
const context={
  console,
  TextDecoder,TextEncoder,
  Uint8Array,Uint32Array,Int32Array,Float32Array,Float64Array,DataView,
  Math,Object,Number,Error,String,Array,ArrayBuffer,Set,Map,
  performance:{now:()=>Date.now()},
  self:{postMessage:(m)=>posts.push(m)}
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../connectome-worker.js', import.meta.url),'utf8'),context);

await context.self.onmessage({data:{type:'init'}});
const ready=posts.find(x=>x.type==='ready');
if(!ready) throw new Error('worker did not become ready');
if(ready.profile!=='escape-fast-v1') throw new Error('wrong profile: '+ready.profile);
if(!ready.aggregate) throw new Error('fast profile must be marked aggregate');
if(ready.groups!==5 || ready.aggregateLinks!==21) throw new Error('unexpected fast graph shape');

for(let i=0;i<6;i++){
  await context.self.onmessage({data:{type:'sensory',loom:.82,motion:.2,light:.5}});
}
const states=posts.filter(x=>x.type==='state');
console.log('ready',ready);
console.log('states',states.map(s=>({
  lc4:+s.lc4.toFixed(3),
  dnL:+s.dnLeft.toFixed(3),
  dnR:+s.dnRight.toFixed(3),
  flight:+s.flight.toFixed(3),
  escape:+s.escape.toFixed(3)
})));
if(!states.some(s=>s.lc4>.2)) throw new Error('LC4 aggregate did not activate');
if(!states.some(s=>Math.max(s.dnLeft,s.dnRight)>.05)) throw new Error('DN aggregate did not activate');
if(!states.some(s=>s.flight>.05)) throw new Error('flight aggregate did not activate');
if(!states.some(s=>s.escape>.35)) throw new Error('escape readout did not activate');

await context.self.onmessage({data:{type:'reset'}});
console.log('PASS');


function makeSyntheticGraph(){
  const n=3,edges=2;
  const bytes=20+(n+1)*4+edges*4+edges*8;
  const buffer=new ArrayBuffer(bytes);
  const view=new DataView(buffer);
  const magic=new TextEncoder().encode('FLYGRAPH');
  new Uint8Array(buffer,0,8).set(magic);
  view.setUint32(8,1,true);
  view.setUint32(12,n,true);
  view.setUint32(16,edges,true);
  let off=20;
  for(const v of [0,0,1,2]){view.setUint32(off,v,true);off+=4}
  for(const v of [0,1]){view.setUint32(off,v,true);off+=4}
  for(const v of [2000,2000]){view.setFloat64(off,v,true);off+=8}
  return buffer;
}

const detailedPosts=[];
const syntheticGraph=makeSyntheticGraph();
const syntheticManifest={
  neuronCount:3,
  edgeCount:2,
  graphBytes:syntheticGraph.byteLength,
  groups:[
    {id:'loom',indices:[0]},
    {id:'flightL',indices:[2]},
    {id:'flightR',indices:[2]}
  ],
  motor:{dnL:[1],dnR:[],mnL:[],mnR:[]},
  attribution:'synthetic test graph'
};
const detailedContext={
  console,
  TextDecoder,TextEncoder,
  Uint8Array,Uint32Array,Int32Array,Float32Array,Float64Array,DataView,
  Math,Object,Number,Error,String,Array,ArrayBuffer,Set,Map,
  performance:{now:()=>Date.now()},
  fetch:async(url)=>{
    if(String(url).endsWith('manifest.json')){
      return {ok:true,json:async()=>syntheticManifest,headers:{get:()=>null},body:null};
    }
    if(String(url).endsWith('graph.bin')){
      return {ok:true,arrayBuffer:async()=>syntheticGraph,headers:{get:()=>String(syntheticGraph.byteLength)},body:null};
    }
    return {ok:false,status:404,headers:{get:()=>null},body:null};
  },
  self:{postMessage:(m)=>detailedPosts.push(m)}
};

vm.createContext(detailedContext);
vm.runInContext(fs.readFileSync(new URL('../connectome-worker.js', import.meta.url),'utf8'),detailedContext);
await detailedContext.self.onmessage({data:{type:'init-detailed'}});

const detailedReady=detailedPosts.find(x=>x.type==='ready');
if(!detailedReady) throw new Error('detailed worker did not become ready');
if(detailedReady.profile!=='70k') throw new Error('wrong detailed profile');
if(detailedReady.aggregate) throw new Error('detailed profile must not be aggregate');
if(detailedReady.neurons!==3 || detailedReady.edges!==2) throw new Error('detailed graph parse mismatch');
if(detailedReady.loomCount!==1 || detailedReady.escapeTargetCount!==1) throw new Error('detailed metadata mismatch');

for(let i=0;i<8;i++){
  await detailedContext.self.onmessage({data:{type:'sensory',loom:.9,motion:0,light:.5}});
}
const detailedStates=detailedPosts.filter(x=>x.type==='state');
if(!detailedStates.length) throw new Error('detailed worker produced no states');
if(!detailedStates.some(x=>x.lc4>0)) throw new Error('detailed LC4 did not respond');

console.log('PASS detailed graph loader');
