const $ = (s) => document.querySelector(s);
const video = $('#camera');
const visionCanvas = $('#visionCanvas');
const vctx = visionCanvas.getContext('2d', { willReadFrequently: true });
const fxCanvas = $('#fxCanvas');
const fctx = fxCanvas.getContext('2d');
const mosaicCanvas = $('#mosaicCanvas');
const mctx = mosaicCanvas.getContext('2d');

const dict = {
  en:{eyebrow:'A REAL-WORLD FLY BRAIN EXPERIMENT',hero:'Let a fly brain<br><em>see your world.</em>',desc:"Your camera becomes the fly's visual world. Motion, looming and light are processed locally on your device.",openCamera:'OPEN CAMERA',privacy:'Camera frames stay on your device.',needCamera:'Fly Eye needs camera access',needCameraBody:'We use the live image only inside your browser to estimate motion, looming and brightness. Raw camera frames are not uploaded.',tryAgain:'TRY AGAIN',challenge:'CHALLENGE',sneak:'Sneak up on the fly',challengeBody:'Move your hand slowly toward the fly. Get close without triggering escape.',threat:'THREAT',liveBrain:'LIVE BRAIN',flyVision:'FLY VISION',scienceNote:'Loading the real MaleCNS-derived graph locally…',calm:'CALM',reset:'RESET FLY',escaped:'ESCAPE TRIGGERED',resultTitle:'You woke up<br><em>the escape circuit.</em>',maxThreat:'MAX THREAT',again:'TRY AGAIN',share:'SHARE',whatFlySees:'WHAT THE FLY SEES',visionExplain:'A deliberately simplified compound-eye view used to explain the sensory pipeline.',science:'SCIENCE',scienceTitle:'Camera → sensory signals → fly behavior',scienceBody:'Fly Eye v0.2 loads a signed MaleCNS-derived connectome subgraph in a Web Worker and propagates spikes locally. Camera-to-neuron sensory encoding and the neuron dynamics remain models; this is not a complete biological replica.'},
  zh:{eyebrow:'现实世界果蝇大脑实验',hero:'让果蝇的大脑<br><em>看见你的世界。</em>',desc:'你的摄像头会成为果蝇的视觉世界。运动、逼近和亮度都在你的设备本地处理。',openCamera:'打开摄像头',privacy:'摄像头画面不会上传。',needCamera:'Fly Eye 需要摄像头权限',needCameraBody:'浏览器只在本地分析运动、逼近和亮度，不上传原始摄像头画面。',tryAgain:'重试',challenge:'挑战',sneak:'慢慢靠近果蝇',challengeBody:'把手慢慢靠近它，尽量接近，但不要触发逃逸。',threat:'威胁',liveBrain:'实时神经活动',flyVision:'果蝇视角',scienceNote:'正在本地加载真实 MaleCNS 衍生连接图…',calm:'平静',reset:'重置果蝇',escaped:'触发逃逸',resultTitle:'你唤醒了<br><em>逃逸回路。</em>',maxThreat:'最高威胁',again:'再试一次',share:'分享',whatFlySees:'果蝇看到的世界',visionExplain:'这是为了解释感觉输入流程而做的简化复眼视图。',science:'科学说明',scienceTitle:'摄像头 → 感觉信号 → 果蝇行为',scienceBody:'Fly Eye v0.2 会在 Web Worker 中加载真实的 MaleCNS 衍生有符号连接子图，并在本地传播神经脉冲。摄像头到神经元的感觉编码和神经动力学仍属于模型，并不是完整生物果蝇复制体。'}
};
let lang = localStorage.getItem('flyEye_lang') || 'en';
function t(k){ return dict[lang][k] || dict.en[k] || k }
function applyLang(){document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));$('#langBtn').textContent=lang==='en'?'中文':'EN';localStorage.setItem('flyEye_lang',lang)}
applyLang();

let W=innerWidth,H=innerHeight,D=Math.min(devicePixelRatio||1,2);
let stream=null, running=false, rear=false, lastFrame=null, lastEnergy=0, lastNearMotion=0, lastTs=performance.now();
let maxThreat=0, escaped=false, frameCounter=0;
const fly={x:.56,y:.55,vx:0,vy:0,state:'idle',escapeUntil:0,wing:0,blink:0};
const sensory={motion:0,light:0,loom:0};
const neural={r:0,lc4:0,lplc2:0,dnp:0,motor:0};

const connectome={status:'loading',worker:null,pending:false,lastSent:0,escape:0,network:0,spikes:0,neurons:0,edges:0,error:''};
function initConnectome(){
  try{
    connectome.worker=new Worker('/connectome-worker.js');
    connectome.worker.onmessage=(event)=>{
      const msg=event.data||{};
      if(msg.type==='ready'){
        connectome.status='ready';connectome.neurons=msg.neurons||0;connectome.edges=msg.edges||0;connectome.pending=false;updateConnectomeStatus();
      }else if(msg.type==='state'){
        connectome.pending=false;
        connectome.escape=smooth(connectome.escape,clamp(msg.escape||0),.42);
        connectome.network=smooth(connectome.network,clamp(msg.network||0),.3);
        connectome.spikes=msg.spikeCount||0;
        neural.r=connectome.network;
        neural.lc4=smooth(neural.lc4,clamp(msg.lc4||0),.45);
        neural.lplc2=smooth(neural.lplc2,clamp(msg.dnLeft||0),.4);
        neural.dnp=smooth(neural.dnp,clamp(msg.dnRight||0),.4);
        neural.motor=smooth(neural.motor,clamp(msg.flight||0),.4);
      }else if(msg.type==='error'){
        connectome.status='error';connectome.error=msg.message||'graph load failed';connectome.pending=false;updateConnectomeStatus();
      }
    };
    connectome.worker.postMessage({type:'init'});
  }catch(err){connectome.status='error';connectome.error=String(err);updateConnectomeStatus();}
}
function updateConnectomeStatus(){
  const el=$('#connectomeStatus'); if(!el)return;
  if(connectome.status==='ready'){
    el.textContent=lang==='zh'?`真实连接图在线 · ${connectome.neurons.toLocaleString()} 神经元 · ${connectome.edges.toLocaleString()} 条连接 · 本地 Worker`:`REAL GRAPH ONLINE · ${connectome.neurons.toLocaleString()} neurons · ${connectome.edges.toLocaleString()} edges · local Worker`;
  }else if(connectome.status==='error'){
    el.textContent=lang==='zh'?'连接图加载失败 · 已切换透明后备模型':'GRAPH LOAD FAILED · transparent fallback active';
  }else{
    el.textContent=lang==='zh'?'正在本地加载真实 MaleCNS 衍生连接图…':'Loading the real MaleCNS-derived graph locally…';
  }
}
initConnectome();

function resize(){W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,2);fxCanvas.width=W*D;fxCanvas.height=H*D;fctx.setTransform(D,0,0,D,0,0)}
addEventListener('resize',resize);resize();

function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v))}
function lerp(a,b,k){return a+(b-a)*k}
function smooth(prev,next,k=.16){return prev+(next-prev)*k}

async function openCamera(){
  $('#permission').classList.add('hidden');
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    const constraints={audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}};
    stream=await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject=stream; await video.play();
    const track=stream.getVideoTracks()[0]; rear=(track.getSettings().facingMode==='environment');
    document.body.classList.toggle('rear-camera',rear);
    $('#landing').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#result').classList.add('hidden');
    visionCanvas.width=96; visionCanvas.height=54; lastFrame=null; maxThreat=0; escaped=false; resetFly(); running=true;
    requestAnimationFrame(loop);
  }catch(err){ console.error(err); $('#permission').classList.remove('hidden'); }
}

function resetFly(){fly.x=.56;fly.y=.55;fly.vx=fly.vy=0;fly.state='idle';fly.escapeUntil=0;escaped=false;maxThreat=0;connectome.escape=0;connectome.network=0;Object.assign(neural,{r:0,lc4:0,lplc2:0,dnp:0,motor:0});connectome.worker?.postMessage({type:'reset'});$('#result').classList.add('hidden')}

function analyzeFrame(){
  if(video.readyState<2) return;
  const fw=96,fh=54;
  vctx.drawImage(video,0,0,fw,fh);
  const img=vctx.getImageData(0,0,fw,fh).data;
  const gray=new Uint8Array(fw*fh);
  const flyFrameX=(rear?fly.x:1-fly.x)*fw, flyFrameY=fly.y*fh;
  let sum=0,diff=0,nearDiff=0,nearWeight=0,nearLight=0;
  for(let i=0,p=0;i<img.length;i+=4,p++){
    const g=(img[i]*.2126+img[i+1]*.7152+img[i+2]*.0722)|0;
    gray[p]=g; sum+=g;
    const px=p%fw, py=(p/fw)|0;
    const dx=(px-flyFrameX)/(fw*.28),dy=(py-flyFrameY)/(fh*.38);
    const weight=Math.exp(-(dx*dx+dy*dy)*1.5);
    nearWeight+=weight; nearLight+=g*weight;
    if(lastFrame){const d=Math.abs(g-lastFrame[p]);diff+=d;nearDiff+=d*weight;}
  }
  const brightness=sum/(gray.length*255);
  const localBrightness=nearLight/(Math.max(1,nearWeight)*255);
  const motion=lastFrame ? diff/(gray.length*255) : 0;
  const nearMotion=lastFrame ? nearDiff/(Math.max(1,nearWeight)*255) : 0;
  const energy=nearMotion*(0.58+localBrightness*.42);
  const expansion=Math.max(0,nearMotion-lastNearMotion);
  const loom=clamp(expansion*14 + nearMotion*3.3 + Math.max(0,energy-lastEnergy)*8 - .055);
  lastEnergy=smooth(lastEnergy,energy,.34);
  lastNearMotion=smooth(lastNearMotion,nearMotion,.34);
  lastFrame=gray;
  sensory.motion=smooth(sensory.motion,clamp((nearMotion*.82+motion*.18)*7),.22);
  sensory.light=smooth(sensory.light,localBrightness,.12);
  sensory.loom=smooth(sensory.loom,loom,.28);
}

function modeledFallback(){
  neural.r=smooth(neural.r,clamp(sensory.motion*.58+sensory.light*.35),.18);
  neural.lc4=smooth(neural.lc4,clamp(sensory.loom*.9+sensory.motion*.22),.24);
  neural.lplc2=smooth(neural.lplc2,clamp(sensory.loom*.5+sensory.motion*.2),.2);
  neural.dnp=smooth(neural.dnp,clamp(neural.lc4*.5-.12),.23);
  neural.motor=smooth(neural.motor,clamp(neural.dnp*.85),.22);
  return clamp(neural.lc4*.52+neural.dnp*.28+neural.motor*.2);
}

function connectomeAdapter(now){
  if(connectome.status==='ready'&&connectome.worker){
    if(!connectome.pending&&now-connectome.lastSent>90){
      connectome.pending=true;connectome.lastSent=now;
      connectome.worker.postMessage({type:'sensory',motion:sensory.motion,light:sensory.light,loom:sensory.loom});
    }
    const threat=connectome.escape;
    maxThreat=Math.max(maxThreat,threat);
    if(!escaped&&sensory.loom>.12&&threat>.20)triggerEscape(threat);
    return threat;
  }
  const threat=modeledFallback();
  maxThreat=Math.max(maxThreat,threat);
  if(!escaped&&threat>.76)triggerEscape(threat);
  return threat;
}

function triggerEscape(threat){
  escaped=true; fly.state='escape'; fly.escapeUntil=performance.now()+1050;
  const a=Math.random()*Math.PI*2; fly.vx=Math.cos(a)*(rear?.008:.007); fly.vy=Math.sin(a)*.006-.003;
  setTimeout(()=>{if(!running)return; $('#maxThreat').textContent=Math.round(maxThreat*100)+'%';$('#resultExplain').textContent=connectome.status==='ready'?(lang==='zh'?'摄像头的逼近输入刺激了 LC4，活动沿真实 MaleCNS 衍生连接图传播到下降/飞行通路并触发逃逸。':'Camera looming drove LC4; activity propagated through the real MaleCNS-derived graph into descending/flight pathways and triggered escape.'):(lang==='zh'?'连接图不可用，本次使用透明后备模型触发逃逸。':'The graph was unavailable, so this run used the transparent fallback controller.');$('#result').classList.remove('hidden')},420)
}

function updateFly(dt,now,threat){
  fly.wing+=dt*(fly.state==='escape'?.06:.018);
  if(fly.state==='escape'){
    fly.x+=fly.vx*dt; fly.y+=fly.vy*dt; fly.vx*=.994; fly.vy*=.994;
    if(now>fly.escapeUntil) fly.state='alert';
  }else{
    fly.state=threat>.4?'alert':'idle';
    fly.x+=Math.sin(now*.0011)*.000012*dt; fly.y+=Math.cos(now*.0014)*.00001*dt;
  }
  fly.x=clamp(fly.x,.08,.92); fly.y=clamp(fly.y,.18,.84);
}

function drawFly(now){
  fctx.clearRect(0,0,W,H);
  const px=fly.x*W,py=fly.y*H; const s=clamp(Math.min(W,H)/430,.78,1.35)*(fly.state==='escape'?.88:1);
  fctx.save(); fctx.translate(px,py); fctx.rotate(Math.sin(now*.002)*.08 + fly.vx*20);
  const flap=Math.sin(fly.wing)*.85;
  fctx.globalAlpha=.42; fctx.fillStyle='#dffcff';
  fctx.beginPath(); fctx.ellipse(-16*s,-10*s,24*s,(7+Math.abs(flap)*8)*s,-.42,0,Math.PI*2);fctx.fill();
  fctx.beginPath(); fctx.ellipse(16*s,-10*s,24*s,(7+Math.abs(flap)*8)*s,.42,0,Math.PI*2);fctx.fill();
  fctx.globalAlpha=1; fctx.fillStyle='#6f4b2d';fctx.beginPath();fctx.ellipse(0,9*s,11*s,19*s,0,0,Math.PI*2);fctx.fill();
  fctx.fillStyle='#8c5d32';fctx.beginPath();fctx.ellipse(0,-7*s,15*s,14*s,0,0,Math.PI*2);fctx.fill();
  fctx.fillStyle='#d4302c';fctx.beginPath();fctx.arc(-8*s,-10*s,7*s,0,Math.PI*2);fctx.arc(8*s,-10*s,7*s,0,Math.PI*2);fctx.fill();
  fctx.fillStyle='#fff';fctx.beginPath();fctx.arc(-10*s,-12*s,2*s,0,Math.PI*2);fctx.arc(6*s,-12*s,2*s,0,Math.PI*2);fctx.fill();
  fctx.strokeStyle='rgba(255,255,255,.46)';fctx.lineWidth=1.2*s;for(let i=-1;i<=1;i++){fctx.beginPath();fctx.moveTo(-5*s,11*s);fctx.lineTo((-19-i*4)*s,(18+i*8)*s);fctx.stroke();fctx.beginPath();fctx.moveTo(5*s,11*s);fctx.lineTo((19+i*4)*s,(18+i*8)*s);fctx.stroke()}
  if(fly.state==='alert'||fly.state==='escape'){fctx.strokeStyle=fly.state==='escape'?'#ff5a3b':'#dfff55';fctx.lineWidth=2*s;fctx.beginPath();fctx.arc(0,0,31*s,0,Math.PI*2);fctx.stroke()}
  fctx.restore();
}

function setBar(id,v){$('#'+id+'Bar').style.width=Math.round(v*100)+'%';$('#'+id+'Val').textContent=Math.round(v*100)}
function updateUI(threat){
  $('#threatBar').style.width=Math.round(threat*100)+'%';$('#threatValue').textContent=Math.round(threat*100)+'%';
  setBar('motion',sensory.motion);setBar('light',sensory.light);setBar('loom',sensory.loom);setBar('r',neural.r);setBar('lc4',neural.lc4);setBar('lplc2',neural.lplc2);setBar('dnp',neural.dnp);setBar('motor',neural.motor);
  const state=connectome.status==='ready'?(threat>.18?'ESCAPE READY':threat>.08?'ALERT':'CALM'):(threat>.72?'ESCAPE READY':threat>.4?'ALERT':'CALM'); $('#brainState').textContent=lang==='zh'?(state==='CALM'?'平静':state==='ALERT'?'警觉':'即将逃逸'):state; $('#statusPill').textContent=$('#brainState').textContent;
}

function drawMosaic(){
  if(!lastFrame)return; const w=96,h=54,cols=20,rows=11,cw=mosaicCanvas.width/cols,ch=mosaicCanvas.height/rows; mctx.fillStyle='#090909';mctx.fillRect(0,0,mosaicCanvas.width,mosaicCanvas.height);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const sx=Math.floor(x/cols*w),sy=Math.floor(y/rows*h),g=lastFrame[sy*w+sx]||0;const r=Math.min(cw,ch)*.43;mctx.fillStyle=`rgb(${g},${Math.min(255,g*1.08)},${Math.min(255,g*.78)})`;mctx.beginPath();mctx.arc(x*cw+cw/2,y*ch+ch/2,r,0,Math.PI*2);mctx.fill()}
}

function loop(now){if(!running)return;const dt=Math.min(32,now-lastTs);lastTs=now;frameCounter++;if(frameCounter%2===0)analyzeFrame();const threat=connectomeAdapter(now);updateFly(dt,now,threat);drawFly(now);updateUI(threat);if(!$('#flyVisionPanel').classList.contains('hidden')&&frameCounter%4===0)drawMosaic();requestAnimationFrame(loop)}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1600)}

$('#openCamera').onclick=openCamera;$('#retryCamera').onclick=openCamera;$('#resetBtn').onclick=resetFly;$('#againBtn').onclick=()=>{resetFly();$('#result').classList.add('hidden')};
$('#langBtn').onclick=()=>{lang=lang==='en'?'zh':'en';applyLang();updateConnectomeStatus()};
$('#scienceBtn').onclick=()=>$('#scienceDrawer').classList.add('open');$('#closeScience').onclick=()=>$('#scienceDrawer').classList.remove('open');
$('#flyVisionBtn').onclick=()=>{$('#flyVisionPanel').classList.remove('hidden');drawMosaic()};$('#closeVision').onclick=()=>$('#flyVisionPanel').classList.add('hidden');
$('#shareBtn').onclick=async()=>{const data={title:'Fly Eye',text:lang==='zh'?'让一只果蝇的大脑看看你的世界。':'Let a fly brain see your world.',url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast(lang==='zh'?'链接已复制':'Link copied')}}catch{}};

addEventListener('visibilitychange',()=>{if(document.hidden){sensory.motion=sensory.loom=0}});
