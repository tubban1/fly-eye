const MP_MODULE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';
const MP_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth = (a,b,k)=>a+(b-a)*k;

export class PerceptionEngine {
  constructor({video, canvas, getFly, isRear}){
    this.video=video; this.canvas=canvas; this.ctx=canvas.getContext('2d',{willReadFrequently:true});
    this.getFly=getFly; this.isRear=isRear;
    this.w=96; this.h=54; this.canvas.width=this.w; this.canvas.height=this.h;
    this.handLandmarker=null; this.handStatus='loading'; this.handError='';
    this.lastHandRun=0; this.handInterval=90;
    this.reset();
  }

  async initHands(){
    if(this.handLandmarker || this.handStatus==='ready') return true;
    this.handStatus='loading';
    try{
      const {FilesetResolver,HandLandmarker}=await import(MP_MODULE);
      const vision=await FilesetResolver.forVisionTasks(MP_WASM);
      this.handLandmarker=await HandLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:HAND_MODEL,delegate:'GPU'},
        runningMode:'VIDEO',
        numHands:1,
        minHandDetectionConfidence:.48,
        minHandPresenceConfidence:.45,
        minTrackingConfidence:.45
      });
      this.handStatus='ready'; return true;
    }catch(err){
      console.warn('MediaPipe Hand Landmarker unavailable',err);
      this.handStatus='error'; this.handError=String(err?.message||err); return false;
    }
  }

  reset(){
    this.prev=null; this.reference=null; this.referenceTs=0;
    this.calibrationStart=0; this.calibrated=false;
    this.motionFloor=.018; this.shiftFloor=.35;
    this.prevHand=null; this.hand=null;
    this.approachEvidence=0; this.approachSince=0; this.alertSince=0;
    this.last={
      phase:'calibrating',cameraStable:false,globalMotion:0,localMotion:0,opticalLoom:0,
      handDetected:false,handConfidence:0,handArea:0,handDistance:1,handGrowth:0,handApproach:0,
      approach:0,looming:0,shiftX:0,shiftY:0,light:.5
    };
  }

  startCalibration(now=performance.now()){
    this.reset(); this.calibrationStart=now;
  }

  analyze(now=performance.now()){
    if(this.video.readyState<2) return this.last;
    if(!this.calibrationStart) this.calibrationStart=now;

    const {w,h}=this;
    this.ctx.drawImage(this.video,0,0,w,h);
    const rgba=this.ctx.getImageData(0,0,w,h).data;
    const gray=new Uint8Array(w*h);
    let lightSum=0;
    for(let i=0,p=0;i<rgba.length;i+=4,p++){
      const g=(rgba[i]*.2126+rgba[i+1]*.7152+rgba[i+2]*.0722)|0;
      gray[p]=g; lightSum+=g;
    }
    const light=lightSum/(gray.length*255);

    if(now-this.lastHandRun>=this.handInterval && this.handStatus==='ready' && this.handLandmarker){
      this.lastHandRun=now; this.updateHand(now);
    }

    const fly=this.getFly();
    const fx=(this.isRear()?fly.x:1-fly.x)*w, fy=fly.y*h;
    const handBox=this.hand?.box||null;
    const shift=this.prev?estimateGlobalShift(gray,this.prev,w,h,fx,fy,handBox):{dx:0,dy:0,cost:0};
    const local=this.prev?localMotionCompensated(gray,this.prev,w,h,fx,fy,shift):{near:0,global:0};
    const slow=this.reference?localMotionCompensated(gray,this.reference,w,h,fx,fy,{dx:0,dy:0}):{near:0,global:0};

    if(!this.reference || now-this.referenceTs>420){ this.reference=gray.slice(); this.referenceTs=now; }
    this.prev=gray;

    const shiftMag=Math.hypot(shift.dx,shift.dy);
    const globalMotion=clamp(shiftMag/4 + local.global*2.2);
    const residual=Math.max(0,local.near-local.global*1.12);
    const slowResidual=Math.max(0,slow.near-slow.global*1.08);
    const opticalLoom=clamp(residual*6.5 + slowResidual*2.1);

    const elapsed=now-this.calibrationStart;
    if(elapsed<1500){
      this.motionFloor=smooth(this.motionFloor,local.global,.08);
      this.shiftFloor=smooth(this.shiftFloor,shiftMag,.08);
    }else{
      this.calibrated=true;
    }
    const cameraStable=this.calibrated && shiftMag < Math.max(2.3,this.shiftFloor*3.2+.6) &&
      local.global < Math.max(.10,this.motionFloor*4.5+.025);

    const hm=this.handMetrics(now,fx/w,fy/h);
    const evidenceCount=(hm.growth>.12?1:0)+(hm.approach>.12?1:0)+(opticalLoom>.16?1:0);
    let semantic=0;
    if(hm.detected && cameraStable && hm.distance<.52 && evidenceCount>=2){
      semantic=clamp(hm.growth*.42+hm.approach*.38+opticalLoom*.20);
    }else if(!hm.detected && cameraStable && opticalLoom>.32 && residual>.055){
      semantic=clamp(opticalLoom*.34); // cautious optical-only fallback
    }

    this.approachEvidence = semantic>this.approachEvidence
      ? smooth(this.approachEvidence,semantic,.46)
      : this.approachEvidence*.88;

    if(this.approachEvidence>.22){
      if(!this.approachSince)this.approachSince=now;
    }else this.approachSince=0;

    if(this.approachEvidence>.48){
      if(!this.alertSince)this.alertSince=now;
    }else this.alertSince=0;

    let phase='ready';
    if(!this.calibrated) phase='calibrating';
    else if(!cameraStable) phase='camera-moving';
    else if(hm.detected && !this.approachSince) phase='hand-detected';
    else if(this.approachSince && now-this.approachSince>120) phase='approaching';
    if(this.alertSince && now-this.alertSince>100) phase='alert';

    const looming=(phase==='approaching'||phase==='alert')?clamp(this.approachEvidence):0;

    this.last={
      phase,cameraStable,globalMotion,localMotion:clamp(residual*7),opticalLoom,
      handDetected:hm.detected,handConfidence:hm.confidence,handArea:hm.area,
      handDistance:hm.distance,handGrowth:hm.growth,handApproach:hm.approach,
      approach:this.approachEvidence,looming,shiftX:shift.dx,shiftY:shift.dy,light
    };
    return this.last;
  }

  updateHand(now){
    try{
      const result=this.handLandmarker.detectForVideo(this.video,now);
      const lm=result?.landmarks?.[0];
      if(!lm?.length){ this.hand=null; return; }
      let minX=1,minY=1,maxX=0,maxY=0;
      for(const p of lm){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
      const handed=result?.handednesses?.[0]?.[0];
      const box={minX,minY,maxX,maxY};
      this.hand={t:now,landmarks:lm,box,cx:(minX+maxX)/2,cy:(minY+maxY)/2,area:Math.max(0,(maxX-minX)*(maxY-minY)),confidence:handed?.score??1};
    }catch(err){
      console.warn('Hand tracking frame failed',err);
    }
  }

  handMetrics(now,fx,fy){
    const h=this.hand;
    if(!h || now-h.t>260){
      this.prevHand=null;
      return {detected:false,confidence:0,area:0,distance:1,growth:0,approach:0};
    }
    const distance=Math.hypot(h.cx-fx,h.cy-fy);
    let growth=0,approach=0;
    if(this.prevHand){
      const dt=Math.max(.05,(h.t-this.prevHand.t)/1000);
      growth=clamp(((h.area-this.prevHand.area)/Math.max(.018,this.prevHand.area))/dt*.18);
      approach=clamp(((this.prevHand.distance-distance)/dt)*1.7);
    }
    if(!this.prevHand || h.t!==this.prevHand.t) this.prevHand={t:h.t,area:h.area,distance};
    return {detected:true,confidence:h.confidence,area:clamp(h.area/.24),distance:clamp(distance/1.15),growth,approach};
  }
}

function estimateGlobalShift(cur,prev,w,h,fx,fy,handBox){
  let best={dx:0,dy:0,cost:Infinity};
  for(let dy=-2;dy<=2;dy++) for(let dx=-3;dx<=3;dx++){
    let sum=0,n=0;
    for(let y=3;y<h-3;y+=2){
      const py=y+dy;if(py<0||py>=h)continue;
      for(let x=3;x<w-3;x+=2){
        const px=x+dx;if(px<0||px>=w)continue;
        const ndx=(x-fx)/(w*.30),ndy=(y-fy)/(h*.40);
        if(ndx*ndx+ndy*ndy<1) continue;
        if(handBox){
          const nx=x/w,ny=y/h;
          if(nx>handBox.minX-.06&&nx<handBox.maxX+.06&&ny>handBox.minY-.06&&ny<handBox.maxY+.06)continue;
        }
        sum+=Math.abs(cur[y*w+x]-prev[py*w+px]);n++;
      }
    }
    const cost=n?sum/(n*255):1;
    if(cost<best.cost)best={dx,dy,cost};
  }
  return best;
}

function localMotionCompensated(cur,prev,w,h,fx,fy,shift){
  let near=0,nearW=0,global=0,globalW=0;
  for(let y=2;y<h-2;y++){
    const py=Math.round(y+shift.dy);if(py<0||py>=h)continue;
    for(let x=2;x<w-2;x++){
      const px=Math.round(x+shift.dx);if(px<0||px>=w)continue;
      const d=Math.abs(cur[y*w+x]-prev[py*w+px])/255;
      const dx=(x-fx)/(w*.24),dy=(y-fy)/(h*.34);
      const weight=Math.exp(-(dx*dx+dy*dy)*1.6);
      near+=d*weight;nearW+=weight;
      if(dx*dx+dy*dy>1.4){global+=d;globalW++;}
    }
  }
  return {near:near/Math.max(1,nearW),global:global/Math.max(1,globalW)};
}
