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
