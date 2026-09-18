const MP_MODULE = '/vendor/mediapipe/vision_bundle.mjs';
const MP_WASM = '/vendor/mediapipe/wasm';
const HAND_MODEL = '/vendor/mediapipe/hand_landmarker.task';

const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth = (a,b,k)=>a+(b-a)*k;

export class PerceptionEngine {
  constructor({video, canvas, getFly, isRear}){
    this.video=video; this.canvas=canvas; this.ctx=canvas.getContext('2d',{willReadFrequently:true});
    this.getFly=getFly; this.isRear=isRear;
    this.w=96; this.h=54; this.canvas.width=this.w; this.canvas.height=this.h;
    this.handLandmarker=null; this.handStatus='loading'; this.handError='';
    this.lastHandRun=0; this.handInterval=110;
    this.reset();
  }

  async initHands(){
    if(this.handLandmarker || this.handStatus==='ready') return true;
    this.handStatus='loading';
    try{
      const {FilesetResolver,HandLandmarker}=await import(MP_MODULE);
      const vision=await FilesetResolver.forVisionTasks(MP_WASM);
      const options={
        runningMode:'VIDEO',
        numHands:1,
        minHandDetectionConfidence:.48,
        minHandPresenceConfidence:.45,
        minTrackingConfidence:.45
      };
      try{
        this.handLandmarker=await HandLandmarker.createFromOptions(vision,{
          ...options,baseOptions:{modelAssetPath:HAND_MODEL,delegate:'GPU'}
        });
      }catch(gpuError){
        console.warn('MediaPipe GPU delegate unavailable, retrying on CPU',gpuError);
        this.handLandmarker=await HandLandmarker.createFromOptions(vision,{
          ...options,baseOptions:{modelAssetPath:HAND_MODEL}
        });
      }
      this.handStatus='ready'; return true;
    }catch(err){
      console.warn('MediaPipe Hand Landmarker unavailable',err);
      this.handStatus='error'; this.handError=String(err?.message||err); return false;
    }
  }

  reset(){
    this.prev=null; this.reference=null; this.referenceTs=0; this.frame=null;
    this.calibrationStart=0; this.calibrated=false;
    this.motionFloor=.018; this.shiftFloor=.35;
    this.prevHand=null; this.hand=null;
    this.prevOpticalTip=null; this.opticalTip=null;
    this.approachEvidence=0; this.approachSince=0; this.alertSince=0;
    this.last={
      phase:'calibrating',cameraStable:false,globalMotion:0,localMotion:0,opticalLoom:0,
      handDetected:false,handConfidence:0,handArea:0,handDistance:1,handGrowth:0,handApproach:0,
      tipDetected:false,tipSource:'none',tipDistance:1,tipApproach:0,tipConfidence:0,
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

    const shiftMag=Math.hypot(shift.dx,shift.dy);
    const globalMotion=clamp(shiftMag/4 + local.global*2.2);
    const residual=Math.max(0,local.near-local.global*1.12);
    const slowResidual=Math.max(0,slow.near-slow.global*1.08);
    const opticalLoom=clamp(residual*6.5 + slowResidual*2.1);
    const opticalTip=this.prev
      ? detectMovingTip(gray,this.prev,w,h,fx,fy,shift,this.motionFloor)
      : null;

    const elapsed=now-this.calibrationStart;
    if(elapsed<1500){
      this.motionFloor=smooth(this.motionFloor,local.global,.08);
      this.shiftFloor=smooth(this.shiftFloor,shiftMag,.08);
    }else{
      this.calibrated=true;
    }
    const cameraStable=this.calibrated && shiftMag < Math.max(3.4,this.shiftFloor*4.2+1.0) &&
      local.global < Math.max(.16,this.motionFloor*6.0+.045);

    const hm=this.handMetrics(now,fx/w,fy/h);
    const om=this.opticalTipMetrics(now,opticalTip,fx/w,fy/h);
    let semantic=0;

    if(cameraStable){
      let handEvidence=0;
      if(hm.detected){
        const proximity=clamp(1-hm.tipDistance);
        const motionToward=clamp(Math.max(hm.tipApproach,hm.approach));
        const proximityDrive=proximity>.38 ? (proximity-.38)/.62 : 0;
        handEvidence=clamp(
          motionToward*.50 +
          proximityDrive*.28 +
          hm.growth*.06 +
          opticalLoom*.16
        );
        if(hm.tipDistance<.24) handEvidence=Math.max(handEvidence,.34+(1-hm.tipDistance)*.22);
      }

      // Independent local tip tracker: does not need a whole-hand detection.
      let opticalTipEvidence=0;
      if(om.detected){
        const proximityDrive=om.distance<.72 ? clamp((.72-om.distance)/.72) : 0;
        opticalTipEvidence=clamp(
          om.approach*.56 +
          proximityDrive*.22 +
          om.confidence*.12 +
          opticalLoom*.10
        );
        if(om.distance<.22) opticalTipEvidence=Math.max(opticalTipEvidence,.30+(1-om.distance)*.20);
      }

      semantic=Math.max(handEvidence,opticalTipEvidence);

      // Last-resort looming path for a partial object too small to track as a tip.
      if(!hm.detected && !om.detected && opticalLoom>.42 && residual>.055 && globalMotion<.34){
        semantic=Math.max(semantic,clamp(.08+opticalLoom*.42+residual*1.3));
      }
    }

    this.prev=gray; this.frame=gray;

    this.approachEvidence = semantic>this.approachEvidence
      ? smooth(this.approachEvidence,semantic,.46)
      : this.approachEvidence*.88;

    if(this.approachEvidence>.16){
      if(!this.approachSince)this.approachSince=now;
    }else this.approachSince=0;

    if(this.approachEvidence>.36){
      if(!this.alertSince)this.alertSince=now;
    }else this.alertSince=0;

    let phase='ready';
    if(!this.calibrated) phase='calibrating';
    else if(!cameraStable) phase='camera-moving';
    else if((hm.detected||om.detected) && !this.approachSince) phase='hand-detected';
    else if(this.approachSince && now-this.approachSince>80) phase='approaching';
    if(this.alertSince && now-this.alertSince>70) phase='alert';

    const looming=(phase==='approaching'||phase==='alert')?clamp(this.approachEvidence):0;

    this.last={
      phase,cameraStable,globalMotion,localMotion:clamp(residual*7),opticalLoom,
      handDetected:hm.detected,handConfidence:hm.confidence,handArea:hm.area,
      handDistance:hm.distance,handTipDistance:hm.tipDistance,handGrowth:hm.growth,
      handApproach:hm.approach,handTipApproach:hm.tipApproach,
      tipDetected:hm.detected||om.detected,
      tipSource:hm.detected?'hand':(om.detected?'optical':'none'),
      tipDistance:hm.detected?hm.tipDistance:om.distance,
      tipApproach:hm.detected?hm.tipApproach:om.approach,
      tipConfidence:hm.detected?hm.confidence:om.confidence,
      approach:this.approachEvidence,looming,shiftX:shift.dx,shiftY:shift.dy,light
    };
    return this.last;
  }

  opticalTipMetrics(now,candidate,fx,fy){
    if(!candidate){
      if(this.prevOpticalTip && now-this.prevOpticalTip.t>260) this.prevOpticalTip=null;
      this.opticalTip=null;
      return {detected:false,distance:1,approach:0,confidence:0};
    }

    const distance=Math.hypot(candidate.x-fx,candidate.y-fy);
    let approach=0;

    if(this.prevOpticalTip){
      const dt=Math.max(.05,(now-this.prevOpticalTip.t)/1000);
      const spatialJump=Math.hypot(candidate.x-this.prevOpticalTip.x,candidate.y-this.prevOpticalTip.y);

      // Only compare consecutive candidates that plausibly belong to the same
      // moving fingertip/object edge.
      if(spatialJump<.22){
        approach=clamp(((this.prevOpticalTip.distance-distance)/dt)*2.6);
      }
    }

    this.prevOpticalTip={t:now,x:candidate.x,y:candidate.y,distance};
    this.opticalTip={...candidate,t:now,distance,approach};

    return {
      detected:candidate.confidence>.12,
      distance:clamp(distance/.72),
      approach,
      confidence:clamp(candidate.confidence)
    };
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
      const tipIndices=[8,4,12,16,20];
      const tips=tipIndices.map(i=>lm[i]).filter(Boolean).map((p,i)=>({x:p.x,y:p.y,kind:tipIndices[i]}));
      this.hand={
        t:now,landmarks:lm,box,tips,
        indexTip:lm[8]||null,
        cx:(minX+maxX)/2,cy:(minY+maxY)/2,
        area:Math.max(0,(maxX-minX)*(maxY-minY)),
        confidence:handed?.score??1
      };
    }catch(err){
      console.warn('Hand tracking frame failed',err);
    }
  }

  handMetrics(now,fx,fy){
    const h=this.hand;
    if(!h || now-h.t>360){
      this.prevHand=null;
      return {detected:false,confidence:0,area:0,distance:1,growth:0,approach:0,tipDistance:1,tipApproach:0};
    }

    const centerDistance=Math.hypot(h.cx-fx,h.cy-fy);
    let nearest={distance:centerDistance,x:h.cx,y:h.cy,kind:'center'};
    for(const tip of h.tips||[]){
      const d=Math.hypot(tip.x-fx,tip.y-fy);
      if(d<nearest.distance) nearest={distance:d,x:tip.x,y:tip.y,kind:tip.kind};
    }

    const tipDistance=nearest.distance;
    let growth=0,approach=0,tipApproach=0;
    if(this.prevHand && h.t!==this.prevHand.t){
      const dt=Math.max(.07,(h.t-this.prevHand.t)/1000);
      growth=clamp(((h.area-this.prevHand.area)/Math.max(.018,this.prevHand.area))/dt*.14);
      approach=clamp(((this.prevHand.centerDistance-centerDistance)/dt)*1.25);
      tipApproach=clamp(((this.prevHand.tipDistance-tipDistance)/dt)*2.4);
    }

    if(!this.prevHand || h.t!==this.prevHand.t){
      this.prevHand={t:h.t,area:h.area,centerDistance,tipDistance};
    }

    return {
      detected:true,
      confidence:h.confidence,
      area:clamp(h.area/.24),
      distance:clamp(centerDistance/1.15),
      tipDistance:clamp(tipDistance/.75),
      growth,
      approach,
      tipApproach
    };
  }
}

function detectMovingTip(cur,prev,w,h,fx,fy,shift,motionFloor){
  const mask=new Uint8Array(w*h);
  const threshold=Math.max(.085,motionFloor*3.6+.035);
  const maxRx=w*.34,maxRy=h*.46;

  for(let y=2;y<h-2;y++){
    const py=Math.round(y+shift.dy); if(py<0||py>=h) continue;
    for(let x=2;x<w-2;x++){
      const px=Math.round(x+shift.dx); if(px<0||px>=w) continue;
      const dx=(x-fx)/maxRx,dy=(y-fy)/maxRy;
      if(dx*dx+dy*dy>1.25) continue;
      const d=Math.abs(cur[y*w+x]-prev[py*w+px])/255;
      if(d>threshold) mask[y*w+x]=1;
    }
  }

  const seen=new Uint8Array(w*h);
  let best=null;
  const qx=new Int16Array(w*h),qy=new Int16Array(w*h);

  for(let sy=2;sy<h-2;sy++) for(let sx=2;sx<w-2;sx++){
    const start=sy*w+sx;
    if(!mask[start]||seen[start]) continue;

    let head=0,tail=0;
    qx[tail]=sx;qy[tail]=sy;tail++;seen[start]=1;
    let count=0,sumX=0,sumY=0,minDist=Infinity,tipX=sx,tipY=sy;

    while(head<tail){
      const x=qx[head],y=qy[head];head++;count++;sumX+=x;sumY+=y;
      const nd=Math.hypot((x-fx)/w,(y-fy)/h);
      if(nd<minDist){minDist=nd;tipX=x;tipY=y}
      for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+ox,ny=y+oy;
        if(nx<1||nx>=w-1||ny<1||ny>=h-1) continue;
        const ni=ny*w+nx;
        if(mask[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail]=ny;tail++}
      }
    }

    if(count<2||count>520) continue;
    const cx=sumX/count,cy=sumY/count;
    const compactness=clamp(Math.sqrt(count)/9);
    const proximity=clamp(1-minDist/.38);
    const confidence=clamp(compactness*.42+proximity*.58);
    const score=confidence*(.55+proximity*.45);
    if(!best||score>best.score){
      best={x:tipX/w,y:tipY/h,cx:cx/w,cy:cy/h,size:count,confidence,score};
    }
  }
  return best;
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
