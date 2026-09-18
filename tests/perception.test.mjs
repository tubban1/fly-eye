import assert from 'node:assert/strict';
import { PerceptionEngine } from '../perception.js';

const W=96,H=54;

function makeFrame({shiftX=0,shiftY=0,blobX=null,blobY=27}={}){
  const data=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const sx=x-shiftX,sy=y-shiftY;
    let g=((Math.floor(sx/8)+Math.floor(sy/8))%2===0)?75:145;
    if(blobX!==null && Math.hypot(x-blobX,y-blobY)<4) g=230;
    const i=(y*W+x)*4;
    data[i]=g;data[i+1]=g;data[i+2]=g;data[i+3]=255;
  }
  return data;
}

function createEngine(){
  let current=makeFrame();
  const ctx={drawImage(){},getImageData(){return {data:current};}};
  const canvas={width:W,height:H,getContext(){return ctx;}};
  const video={readyState:2};
  const engine=new PerceptionEngine({
    video,canvas,
    getFly:()=>({x:.5,y:.5}),
    isRear:()=>true
  });
  return {
    engine,
    setFrame(next){current=next;}
  };
}

function warm(engine,setFrame){
  engine.startCalibration(1000);
  for(const t of [1000,1400,1800,2200,2600,2900]){
    setFrame(makeFrame());
    engine.analyze(t);
  }
}

{
  const {engine,setFrame}=createEngine();
  warm(engine,setFrame);
  const state=engine.analyze(3200);
  assert.equal(state.phase,'ready','static camera should reach ready');
  assert.equal(state.cameraStable,true);
  assert.equal(state.shiftX,0);
  assert.equal(state.shiftY,0);
  assert.ok(state.confidence.cameraStable>.5);
}

{
  const {engine,setFrame}=createEngine();
  warm(engine,setFrame);
  setFrame(makeFrame({shiftX:3,shiftY:1}));
  const moving=engine.analyze(3000);
  assert.equal(moving.phase,'camera-moving','camera translation must pause perception');
  assert.equal(moving.cameraStable,false);
  assert.equal(moving.looming,0);
  assert.equal(moving.motionBlocked,true);

  for(const t of [3100,3250,3450]){
    setFrame(makeFrame({shiftX:3,shiftY:1}));
    engine.analyze(t);
  }
  const recovered=engine.analyze(3650);
  assert.equal(recovered.phase,'ready','camera should re-arm after stable cooldown');
  assert.equal(recovered.cameraStable,true);
  assert.equal(recovered.looming,0);
}

{
  const {engine,setFrame}=createEngine();
  warm(engine,setFrame);
  let state=null,t=3300;
  for(const x of [24,28,32,36,40,43,46]){
    setFrame(makeFrame({blobX:x}));
    state=engine.analyze(t);
    t+=110;
  }
  assert.equal(state.cameraStable,true);
  assert.equal(state.tipSource,'optical','partial local object should use optical tip path');
  assert.equal(state.tipDetected,true);
  assert.ok(state.approach>.15,'approach confidence should rise for a local moving tip');
  assert.ok(state.looming>.15,'validated looming should rise for a local moving tip');
  assert.ok(state.confidence.finalLoomConfidence>.15);
}

console.log('PASS perception regression suite');
