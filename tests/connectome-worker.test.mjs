import fs from 'node:fs';
import vm from 'node:vm';

function graphBin(){
  // postsynaptic rows: target1 <- source0 weight 3000; target2 <- source1 weight 3000
  const n=3, edges=2;
  const rows=new Uint32Array([0,0,1,2]);
  const pre=new Uint32Array([0,1]);
  const weights=new Float64Array([3000,3000]);
  const buf=new ArrayBuffer(20+(n+1)*4+edges*4+edges*8);
  const u8=new Uint8Array(buf); u8.set(new TextEncoder().encode('FLYGRAPH'),0);
  const dv=new DataView(buf); dv.setUint32(8,1,true);dv.setUint32(12,n,true);dv.setUint32(16,edges,true);
  new Uint8Array(buf,20,rows.byteLength).set(new Uint8Array(rows.buffer));
  const pb=20+rows.byteLength;new Uint8Array(buf,pb,pre.byteLength).set(new Uint8Array(pre.buffer));
  const wb=pb+pre.byteLength;new Uint8Array(buf,wb,weights.byteLength).set(new Uint8Array(weights.buffer));
  return buf;
}
const manifest={groups:[{id:'loom',indices:[0]},{id:'flightL',indices:[2]},{id:'flightR',indices:[2]}],motor:{dnL:[1],dnR:[1],mnL:[],mnR:[]},attribution:'test'};
const posts=[];
const context={
  console,TextDecoder,Uint8Array,Uint32Array,Float32Array,Float64Array,DataView,Math,Object,Number,Error,String,ArrayBuffer,
  self:{postMessage:(m)=>posts.push(m)},
  fetch:async(url)=> url.endsWith('manifest.json')?{ok:true,json:async()=>manifest}:{ok:true,arrayBuffer:async()=>graphBin()},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../connectome-worker.js', import.meta.url),'utf8'),context);
await context.self.onmessage({data:{type:'init'}});
for(let i=0;i<8;i++) await context.self.onmessage({data:{type:'sensory',loom:1,motion:0,light:.5}});
const ready=posts.find(x=>x.type==='ready');
const states=posts.filter(x=>x.type==='state');
console.log('ready',ready);
console.log('states',states.map(s=>({lc4:+s.lc4.toFixed(3),dn:+s.dnLeft.toFixed(3),flight:+s.flight.toFixed(3),escape:+s.escape.toFixed(3),spikes:s.spikeCount})));
if(!ready||ready.neurons!==3||ready.edges!==2) throw new Error('parse failed');
if(!states.some(s=>s.dnLeft>0)) throw new Error('DN did not activate');
if(!states.some(s=>s.flight>0)) throw new Error('flight did not activate');
console.log('PASS');
