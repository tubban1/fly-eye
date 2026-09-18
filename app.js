import { PerceptionEngine } from './perception.js';
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('service worker unavailable',err));}
const $ = (s) => document.querySelector(s);
const video = $('#camera');
const visionCanvas = $('#visionCanvas');
const vctx = visionCanvas.getContext('2d', { willReadFrequently: true });
const fxCanvas = $('#fxCanvas');
const fctx = fxCanvas.getContext('2d');
const mosaicCanvas = $('#mosaicCanvas');
const mctx = mosaicCanvas.getContext('2d');
const replayCanvas = $('#replayCanvas');
const replayCtx = replayCanvas.getContext('2d');
const replaySource = document.createElement('canvas');
replaySource.width = 96; replaySource.height = 54;
const replaySourceCtx = replaySource.getContext('2d');

const dict = {
  en:{eyebrow:'A REAL-WORLD FLY BRAIN EXPERIMENT',hero:'Let a fly brain<br><em>see your world.</em>',desc:"Your camera becomes the fly's visual world. Motion, looming and light are processed locally on your device.",openCamera:'OPEN CAMERA',privacy:'Camera frames stay on your device.',needCamera:'Fly Eye needs camera access',needCameraBody:'We use the live image only inside your browser to estimate motion, looming and brightness. Raw camera frames are not uploaded.',tryAgain:'TRY AGAIN',challenge:'CHALLENGE',sneak:'Sneak up on the fly',challengeBody:'Move your hand slowly toward the fly. Get close without triggering escape.',threat:'THREAT',liveBrain:'LIVE BRAIN',flyVision:'FLY VISION',scienceNote:'Loading the real MaleCNS-derived graph locally…',calm:'CALM',reset:'RESET FLY',escaped:'ESCAPE TRIGGERED',resultTitle:'You woke up<br><em>the escape circuit.</em>',maxThreat:'MAX THREAT',again:'TRY AGAIN',share:'SHARE',whatFlySees:'WHAT THE FLY SEES',visionExplain:'A deliberately simplified compound-eye view used to explain the sensory pipeline.',science:'SCIENCE',scienceTitle:'Camera → sensory signals → fly behavior',scienceBody:'Fly Eye v0.4.7 starts with an embedded escape-fast-v1 pathway graph built from real MaleCNS aggregate connection counts and signed weights between LC4/loom, turning and flight groups. Group-level dynamics and camera-to-neural encoding are modeled. The 70K neuron-level graph is optional and no longer blocks camera interaction.',viewReplay:'VIEW REPLAY',replayEyebrow:'NEURAL REPLAY',replayTitle:'What just happened?',replayBefore:'before escape',replayEscapeMark:'ESCAPE',pauseReplay:'PAUSE',playReplay:'PLAY',continueBtn:'CONTINUE',replayPrivacy:'Replay frames and neural samples stay only in this browser tab.'},
  zh:{eyebrow:'现实世界果蝇大脑实验',hero:'让果蝇的大脑<br><em>看见你的世界。</em>',desc:'你的摄像头会成为果蝇的视觉世界。运动、逼近和亮度都在你的设备本地处理。',openCamera:'打开摄像头',privacy:'摄像头画面不会上传。',needCamera:'Fly Eye 需要摄像头权限',needCameraBody:'浏览器只在本地分析运动、逼近和亮度，不上传原始摄像头画面。',tryAgain:'重试',challenge:'挑战',sneak:'慢慢靠近果蝇',challengeBody:'把手慢慢靠近它，尽量接近，但不要触发逃逸。',threat:'威胁',liveBrain:'实时神经活动',flyVision:'果蝇视角',scienceNote:'正在本地加载真实 MaleCNS 衍生连接图…',calm:'平静',reset:'重置果蝇',escaped:'触发逃逸',resultTitle:'你唤醒了<br><em>逃逸回路。</em>',maxThreat:'最高威胁',again:'再试一次',share:'分享',whatFlySees:'果蝇看到的世界',visionExplain:'这是为了解释感觉输入流程而做的简化复眼视图。',science:'科学说明',scienceTitle:'摄像头 → 感觉信号 → 果蝇行为',scienceBody:'Fly Eye v0.4.7 默认使用内置的 escape-fast-v1：它保留 MaleCNS 中 LC4/loom、转向与飞行通路之间真实的聚合连接数量和有符号权重；组级动力学与摄像头到神经输入的编码仍是模型。70K 神经元级图改为可选，不再阻塞摄像头交互。',viewReplay:'查看回放',replayEyebrow:'神经回放',replayTitle:'刚才发生了什么？',replayBefore:'距离逃逸',replayEscapeMark:'逃逸',pauseReplay:'暂停',playReplay:'播放',continueBtn:'继续',replayPrivacy:'回放视觉帧和神经采样只保存在当前浏览器标签页内。'}
};
Object.assign(dict.en,{
  calibrating:'CALIBRATING VISION…',loadingHands:'OPTICAL MODE READY · HAND TRACKER WARMING…',waitingGraph:'WAITING FOR CONNECTOME…',
  holdSteady:'HOLD CAMERA STEADY',readyPerception:'READY — BRING YOUR HAND TOWARD THE FLY',handSeen:'HAND DETECTED',
  approaching:'APPROACHING',perceptionAlert:'VALID LOOMING DETECTED',trackerError:'OPTICAL MODE ACTIVE · HAND TRACKER OFF',
  graphError:'CONNECTOME FAILED',brainBtn:'BRAIN',connectome:'CONNECTOME',preparingRuntime:'Preparing runtime…',
  hand:'HAND',camera:'CAMERA',approachLabel:'APPROACH',validLoom:'VALID LOOM',details:'DETAILS',hideDetails:'HIDE',
  motion:'MOTION',light:'LIGHT',looming:'LOOMING',network:'NETWORK',dnLeft:'DN LEFT',dnRight:'DN RIGHT',flightDn:'FLIGHT DN',
  escape:'ESCAPE',replayInitial:'Visual motion begins.',replayTimeline:'Replay timeline',
  resultExplainInitial:'Camera looming drove LC4 and propagated through the escape pathway.',
  pipePerception:'GLOBAL MOTION COMPENSATION + HAND LANDMARKS',pipeLoom:'VALIDATED APPROACH / LOOMING',
  pipeGraph:'LC4 + MALECNS AGGREGATE GRAPH',pipeMotor:'DN / FLIGHT READOUT',
  graphReady:'READY',graphLoading:'GRAPH LOADING',fastGraph:'FAST GRAPH',graphErrorBadge:'GRAPH ERROR',
  cameraStable:'STABLE',cameraMoving:'MOVING',handNo:'NO',handWarming:'WARMING',tip:'TIP',
  calmState:'CALM',alertState:'ALERT',escapeReadyState:'ESCAPE READY'
});
Object.assign(dict.zh,{
  calibrating:'正在校准视觉…',loadingHands:'光流模式已可用 · 手部追踪后台加载中…',waitingGraph:'正在等待连接图…',
  holdSteady:'请保持手机稳定',readyPerception:'准备完成——把手慢慢靠近果蝇',handSeen:'检测到手',
  approaching:'正在靠近',perceptionAlert:'确认有效逼近',trackerError:'光流模式可用 · 手部追踪暂不可用',
  graphError:'连接图加载失败',brainBtn:'大脑',connectome:'连接图',preparingRuntime:'正在准备运行环境…',
  hand:'手部',camera:'摄像头',approachLabel:'接近',validLoom:'有效逼近',details:'详情',hideDetails:'收起',
  motion:'运动',light:'亮度',looming:'逼近',network:'网络',dnLeft:'左侧 DN',dnRight:'右侧 DN',flightDn:'飞行 DN',
  escape:'逃逸',replayInitial:'视觉运动开始。',replayTimeline:'回放时间轴',
  resultExplainInitial:'摄像头中的逼近刺激了 LC4，并沿逃逸通路传播。',
  pipePerception:'全局运动补偿 + 手部关键点',pipeLoom:'确认后的接近 / 逼近信号',
  pipeGraph:'LC4 + MaleCNS 聚合连接图',pipeMotor:'DN / 飞行输出',
  graphReady:'已就绪',graphLoading:'图加载中',fastGraph:'快速图',graphErrorBadge:'连接图错误',
  cameraStable:'稳定',cameraMoving:'移动',handNo:'未检测',handWarming:'后台加载',tip:'指尖',
  calmState:'平静',alertState:'警觉',escapeReadyState:'即将逃逸'
});
let lang = localStorage.getItem('flyEye_lang') || 'en';
function t(k){ return dict[lang][k] || dict.en[k] || k }
function applyLang(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
  $('#langBtn').textContent=lang==='en'?'中文':'EN';
  const bt=$('#brainToggle'); if(bt) bt.textContent=document.body.classList.contains('brain-expanded')?t('hideDetails'):t('details');
  localStorage.setItem('flyEye_lang',lang)
}
applyLang();

let W=innerWidth,H=innerHeight,D=Math.min(devicePixelRatio||1,2);
let stream=null, running=false, rear=false, lastFrame=null, lastTs=performance.now();
let maxThreat=0, escaped=false, frameCounter=0;
const fly={x:.56,y:.55,vx:0,vy:0,state:'idle',escapeUntil:0,wing:0,blink:0};
const sensory={motion:0,light:0,loom:0};
const neural={r:0,lc4:0,lplc2:0,dnp:0,motor:0};
const replay={
  frames:[],samples:[],frozen:null,lastCapture:0,playing:false,raf:0,progress:0,wallStart:0,startProgress:0,
  triggerTime:0,postRollUntil:0,pendingFinalize:false
};
const perceptionEngine=new PerceptionEngine({video,canvas:visionCanvas,getFly:()=>fly,isRear:()=>rear});
let perceptionState=perceptionEngine.last;

const connectome={status:'loading',phase:'manifest',profile:'auto',aggregate:false,groups:0,aggregateLinks:0,representedNeurons:0,loaded:0,total:0,reason:'',startedAt:performance.now(),worker:null,pending:false,lastSent:0,escape:0,escapeDn:0,network:0,spikes:0,neurons:0,edges:0,escapeTargets:0,error:''};
function initConnectome(){
  try{
    connectome.worker=new Worker(new URL('./connectome-worker.js', import.meta.url), {type:'module'});
    connectome.worker.onerror=(event)=>{
      console.error('Connectome worker failed',event);
      connectome.status='error';
      connectome.error='Worker failed to load: '+(event?.message||'unknown error');
      connectome.phase='worker-error';
      connectome.pending=false;
      updateConnectomeStatus();
      updatePerceptionUI(perceptionState);
    };
    connectome.worker.onmessage=(event)=>{
      const msg=event.data||{};
      if(msg.type==='ready'){
        connectome.status='ready';connectome.phase='ready';connectome.profile=msg.profile||connectome.profile;connectome.aggregate=!!msg.aggregate;connectome.groups=msg.groups||0;connectome.aggregateLinks=msg.aggregateLinks||0;connectome.representedNeurons=msg.representedNeurons||msg.neurons||0;connectome.neurons=msg.neurons||0;connectome.edges=msg.edges||0;connectome.escapeTargets=msg.escapeTargetCount||0;connectome.loaded=msg.graphBytes||connectome.loaded;connectome.total=msg.graphBytes||connectome.total;connectome.pending=false;updateConnectomeStatus();updatePerceptionUI(perceptionState);
      }else if(msg.type==='status'){
        connectome.status='loading';connectome.phase=msg.status||'loading';connectome.profile=msg.profile||connectome.profile;connectome.loaded=msg.loaded||0;connectome.total=msg.total||connectome.total;connectome.reason=msg.reason||connectome.reason;updateConnectomeStatus();updatePerceptionUI(perceptionState);
      }else if(msg.type==='state'){
        connectome.pending=false;
        connectome.escape=smooth(connectome.escape,clamp(msg.escape||0),.5);
        connectome.escapeDn=smooth(connectome.escapeDn,clamp(msg.escapeDn||0),.42);
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
function updateConnectomeLoadProgress(){
  const wrap=$('#connectomeLoad'),stage=$('#connectomeLoadStage'),pct=$('#connectomeLoadPct'),bar=$('#connectomeLoadBar'),detail=$('#connectomeLoadDetail');
  if(!wrap||!stage||!pct||!bar||!detail)return;
  let p=0,label=lang==='zh'?'连接图':'CONNECTOME',d='';
  if(connectome.status==='ready'){
    p=100;
    label=connectome.profile==='escape-fast-v1'?'ESCAPE FAST v1':(connectome.profile==='escape-v1'?'ESCAPE v1':'70K');
    d=connectome.aggregate
      ? (lang==='zh'
          ? connectome.groups+' 个通路组 · '+connectome.aggregateLinks+' 条聚合连接 · 已就绪'
          : connectome.groups+' pathway groups · '+connectome.aggregateLinks+' aggregate links · READY')
      : (lang==='zh'
          ? connectome.neurons.toLocaleString()+' 神经元 · '+connectome.edges.toLocaleString()+' 条连接 · 已就绪'
          : connectome.neurons.toLocaleString()+' neurons · '+connectome.edges.toLocaleString()+' edges · READY');
  }else if(connectome.status==='error'){
    p=100;label=lang==='zh'?'加载失败':'LOAD FAILED';d=connectome.error||connectome.reason||'';
  }else if(connectome.phase==='profile-check'){
    p=5;label=lang==='zh'?'快速图检查':'FAST GRAPH CHECK';d=lang==='zh'?'检查 escape-v1 是否可用':'Looking for reusable escape-v1 asset';
  }else if(connectome.phase==='profile-fallback'){
    p=8;label=lang==='zh'?'切换 70K':'FALLBACK → 70K';d=connectome.reason||'escape-v1 unavailable';
  }else if(connectome.phase==='manifest'){
    p=12;label=(connectome.profile==='escape-v1'?'ESCAPE v1':'70K')+' MANIFEST';d=lang==='zh'?'读取节点和分组清单':'Reading graph manifest';
  }else if(connectome.phase==='graph-download'){
    const ratio=connectome.total?connectome.loaded/connectome.total:0;
    p=15+Math.round(clamp(ratio)*70);
    label=connectome.profile==='escape-v1'?'ESCAPE v1':'70K';
    d=(connectome.loaded/1e6).toFixed(2)+' / '+(connectome.total/1e6).toFixed(2)+' MB';
  }else if(connectome.phase==='graph-parse'){
    p=90;label=lang==='zh'?'解析图':'PARSING GRAPH';d=(connectome.total/1e6).toFixed(2)+' MB';
  }else if(connectome.phase==='metadata'){
    p=96;label=lang==='zh'?'建立神经读出':'BUILDING READOUTS';d='LC4 → DN / flight';
  }
  stage.textContent=label;pct.textContent=Math.round(p)+'%';bar.style.width=Math.round(p)+'%';detail.textContent=d;
  wrap.classList.toggle('is-ready',connectome.status==='ready');
}
function updateConnectomeStatus(){
  const el=$('#connectomeStatus'),badge=$('#graphBadge');
  updateConnectomeLoadProgress();
  if(connectome.status==='ready'){
    if(el) el.textContent=connectome.aggregate
      ? (lang==='zh'
          ? '快速逃逸图在线 · MaleCNS 真实聚合连接 · '+connectome.groups+' 个通路组 · '+connectome.aggregateLinks+' 条连接'
          : 'FAST ESCAPE GRAPH ONLINE · real MaleCNS aggregate connections · '+connectome.groups+' pathway groups · '+connectome.aggregateLinks+' links')
      : (lang==='zh'
          ? '真实连接图在线 · '+connectome.profile+' · '+connectome.neurons.toLocaleString()+' 神经元 · '+connectome.edges.toLocaleString()+' 条连接'
          : 'REAL GRAPH ONLINE · '+connectome.profile+' · '+connectome.neurons.toLocaleString()+' neurons · '+connectome.edges.toLocaleString()+' edges');
    if(badge){badge.textContent=connectome.aggregate?(lang==='zh'?'快速图在线':'FAST GRAPH'):(lang==='zh'?'真实图在线':'REAL GRAPH');badge.dataset.state='ready'}
  }else if(connectome.status==='error'){
    if(el) el.textContent=lang==='zh'?'连接图加载失败 · 挑战已暂停':'GRAPH LOAD FAILED · challenge paused';
    if(badge){badge.textContent=lang==='zh'?'连接图错误':'GRAPH ERROR';badge.dataset.state='error'}
  }else{
    let label=lang==='zh'?'正在读取连接图…':'LOADING CONNECTOME…';
    let badgeLabel=lang==='zh'?'图加载中':'GRAPH LOADING';
    if(connectome.phase==='graph-download'){
      const loaded=(connectome.loaded/1e6).toFixed(1),total=(connectome.total/1e6).toFixed(1);
      const profile=connectome.profile==='escape-v1'?'ESCAPE v1':'70K';
      label=lang==='zh'?profile+' 下载 '+loaded+' / '+total+' MB':profile+' · '+loaded+' / '+total+' MB';
      badgeLabel=Math.round((connectome.loaded/Math.max(1,connectome.total))*100)+'%';
    }else if(connectome.phase==='graph-parse'){
      const total=(connectome.total/1e6).toFixed(1);
      label=lang==='zh'?'连接图已下载，正在解析 '+total+' MB…':'GRAPH DOWNLOADED · PARSING '+total+' MB…';
      badgeLabel=lang==='zh'?'解析中':'PARSING';
    }else if(connectome.phase==='metadata'){
      label=lang==='zh'?'正在建立 LC4 / DN 读出…':'BUILDING LC4 / DN READOUTS…';
      badgeLabel=lang==='zh'?'准备中':'PREPARING';
    }else if(connectome.phase==='profile-check'){
      label=lang==='zh'?'正在查找快速 Escape Graph…':'CHECKING FAST ESCAPE GRAPH…';
    }else if(connectome.phase==='profile-fallback'){
      label=lang==='zh'?'快速图暂不可用，切换 70K 图…':'FAST GRAPH UNAVAILABLE · FALLING BACK TO 70K…';
    }else if(connectome.phase==='manifest'){
      label=lang==='zh'?'正在读取 '+(connectome.profile==='escape-v1'?'Escape v1':'70K')+' 清单…':'READING '+(connectome.profile==='escape-v1'?'ESCAPE v1':'70K')+' MANIFEST…';
    }
    if(el) el.textContent=label;
    if(badge){badge.textContent=badgeLabel;badge.dataset.state='loading'}
  }
}
initConnectome();
const prewarmHands=()=>perceptionEngine.initHands().then(()=>updatePerceptionUI(perceptionState));
if('requestIdleCallback' in window) requestIdleCallback(prewarmHands,{timeout:1200});
else setTimeout(prewarmHands,350);

const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === '1';
let debugStart = performance.now();
function startDebugMode(){
  if(!DEBUG_MODE) return;
  $('#landing').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  $('#result').classList.add('hidden');
  document.body.classList.add('debug-mode');
  running=true;
  resetFly();
  lastTs=performance.now();
  requestAnimationFrame(loop);
  toast(lang==='zh'?'DEBUG：自动产生逼近刺激':'DEBUG: synthetic looming pulses enabled');
}

function resize(){W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,2);fxCanvas.width=W*D;fxCanvas.height=H*D;fctx.setTransform(D,0,0,D,0,0)}
addEventListener('resize',resize);resize();

function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v))}
function smooth(prev,next,k=.16){return prev+(next-prev)*k}

async function openCamera(){
  document.body.classList.remove('brain-expanded');
  $('#permission').classList.add('hidden');
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    const constraints={audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}};
    stream=await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject=stream; await video.play();
    const track=stream.getVideoTracks()[0]; rear=(track.getSettings().facingMode==='environment');
    document.body.classList.toggle('rear-camera',rear);
    $('#landing').classList.add('hidden'); $('#hud').classList.remove('hidden'); $('#result').classList.add('hidden');
    visionCanvas.width=96; visionCanvas.height=54; lastFrame=null; maxThreat=0; escaped=false;
    perceptionEngine.startCalibration(performance.now());
    perceptionEngine.initHands().then(()=>updatePerceptionUI(perceptionState));
    resetFly(); running=true; lastTs=performance.now();
    requestAnimationFrame(loop);
  }catch(err){ console.error(err); $('#permission').classList.remove('hidden'); }
}

function resetFly(){document.body.classList.remove('brain-expanded');const bt=$('#brainToggle');if(bt)bt.textContent=t('details');fly.x=.56;fly.y=.55;fly.vx=fly.vy=0;fly.state='idle';fly.escapeUntil=0;escaped=false;maxThreat=0;connectome.escape=0;connectome.escapeDn=0;connectome.network=0;Object.assign(neural,{r:0,lc4:0,lplc2:0,dnp:0,motor:0});connectome.worker?.postMessage({type:'reset'});resetReplay();$('#result').classList.add('hidden');$('#replayPanel').classList.add('hidden')}

function experienceArmed(){
  return DEBUG_MODE || (
    perceptionState.phase!=='calibrating' &&
    connectome.status==='ready'
  );
}
function interactionReady(){
  return experienceArmed() && (DEBUG_MODE || perceptionState.cameraStable);
}

function analyzeFrame(now){
  perceptionState=perceptionEngine.analyze(now);
  lastFrame=perceptionEngine.frame;

  // Pseudo-AR anchor: compensate small camera translations so the fly follows
  // the background instead of being glued to screen coordinates.
  if(perceptionState.phase!=='calibrating'){
    const sx=perceptionState.shiftX/96, sy=perceptionState.shiftY/54;
    if(Math.hypot(perceptionState.shiftX,perceptionState.shiftY)<3.7){
      fly.x=clamp(fly.x+(rear?-sx:sx)*.82,.08,.92);
      fly.y=clamp(fly.y-sy*.82,.18,.84);
    }
  }

  const gate=interactionReady();
  sensory.motion=gate?perceptionState.localMotion:0;
  sensory.light=perceptionState.light;
  sensory.loom=gate?perceptionState.looming:0;
  updatePerceptionUI(perceptionState);
}

function resetReplay(){
  replay.frames=[]; replay.samples=[]; replay.frozen=null; replay.lastCapture=0; replay.progress=0; replay.playing=false;
  replay.triggerTime=0; replay.postRollUntil=0; replay.pendingFinalize=false;
  if(replay.raf) cancelAnimationFrame(replay.raf);
  replay.raf=0;
}
function replaySample(now,threat,escape=0){
  return {
    t:now,motion:sensory.motion,light:sensory.light,loom:sensory.loom,lc4:neural.lc4,dnL:neural.lplc2,dnR:neural.dnp,
    flight:neural.motor,network:neural.r,threat,escape,spikes:connectome.spikes||0,
    fly:{x:fly.x,y:fly.y,state:fly.state},mirrored:!rear
  };
}
function recordReplay(now,threat){
  if(now-replay.lastCapture<72) return;
  replay.lastCapture=now;
  replay.samples.push(replaySample(now,threat,replay.triggerTime?1:0));
  replay.frames.push({t:now,gray:lastFrame?lastFrame.slice():null});

  if(!replay.triggerTime){
    const cutoff=now-2200;
    while(replay.samples.length&&replay.samples[0].t<cutoff) replay.samples.shift();
    while(replay.frames.length&&replay.frames[0].t<cutoff) replay.frames.shift();
  }else if(replay.pendingFinalize && now>=replay.postRollUntil){
    finalizeReplay(now,threat);
  }
}
function markReplayTrigger(now,threat){
  replay.triggerTime=now;
  replay.postRollUntil=now+1150;
  replay.pendingFinalize=true;
  replay.samples.push(replaySample(now,threat,1));
  replay.frames.push({t:now,gray:lastFrame?lastFrame.slice():null});
}
function finalizeReplay(now,threat){
  if(!replay.pendingFinalize)return;
  replay.pendingFinalize=false;
  replay.samples.push(replaySample(now,threat,1));
  replay.frames.push({t:now,gray:lastFrame?lastFrame.slice():null});
  const start=Math.max(replay.samples[0]?.t??replay.triggerTime-1800,replay.triggerTime-2000);
  const samples=replay.samples.filter(v=>v.t>=start).map(v=>({...v,fly:{...v.fly}}));
  const frames=replay.frames.filter(v=>v.t>=start).map(v=>({t:v.t,gray:v.gray?v.gray.slice():null}));
  replay.frozen={samples,frames,start,end:now,trigger:replay.triggerTime};
  finishEscapeExperience();
}
function finishEscapeExperience(){
  if(!running||!replay.frozen)return;
  $('#maxThreat').textContent=Math.round(maxThreat*100)+'%';
  $('#resultExplain').textContent=connectome.status==='ready'
    ? (lang==='zh'?'摄像头中的有效逼近刺激了 LC4，并沿 MaleCNS 聚合逃逸通路传播到转向/飞行输出。':'Validated camera looming drove LC4 and propagated through the MaleCNS aggregate escape pathway into turning/flight output.')
    : (lang==='zh'?'连接图不可用，无法完成本次神经回放。':'The connectome runtime was unavailable, so this neural replay could not complete.');
  showReplay();
}
function nearestByTime(items,t){
  if(!items?.length) return null;
  let best=items[0],dist=Math.abs(items[0].t-t);
  for(let i=1;i<items.length;i++){const d=Math.abs(items[i].t-t);if(d<dist){best=items[i];dist=d}}
  return best;
}
function setReplayBar(id,v){
  const n=clamp(v||0); $('#'+id).style.width=Math.round(n*100)+'%'; $('#'+id+'Val').textContent=Math.round(n*100);
}
function replayCaption(sample){
  if(!sample) return lang==='zh'?'等待视觉输入。':'Waiting for visual input.';
  if(sample.escape>.5) return lang==='zh'?'逃逸输出越过阈值，果蝇起飞。':'Escape output crosses threshold; the fly launches.';
  if(sample.flight>.08) return lang==='zh'?'活动到达飞行下降神经元。':'Activity reaches flight descending neurons.';
  if(Math.max(sample.dnL,sample.dnR)>.08) return lang==='zh'?'活动沿连接图传播到下降神经元。':'Activity propagates through the graph into descending neurons.';
  if(sample.lc4>.08) return lang==='zh'?'LC4 逼近通路开始明显激活。':'The LC4 looming pathway becomes strongly active.';
  if(sample.loom>.15) return lang==='zh'?'物体在果蝇视觉场中快速变大。':'An object rapidly expands in the fly’s visual field.';
  if(sample.motion>.12) return lang==='zh'?'果蝇附近出现视觉运动。':'Visual motion appears near the fly.';
  return lang==='zh'?'视觉场保持平静。':'The visual field remains calm.';
}
function drawReplayFly(ctx,x,y,state='idle'){
  const s=Math.max(.62,Math.min(replayCanvas.width,replayCanvas.height)/300);
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=.44;ctx.fillStyle='#dffcff';
  ctx.beginPath();ctx.ellipse(-14*s,-8*s,20*s,7*s,-.4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(14*s,-8*s,20*s,7*s,.4,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;ctx.fillStyle='#6f4b2d';ctx.beginPath();ctx.ellipse(0,8*s,10*s,17*s,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8c5d32';ctx.beginPath();ctx.ellipse(0,-7*s,13*s,12*s,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d4302c';ctx.beginPath();ctx.arc(-7*s,-9*s,6*s,0,Math.PI*2);ctx.arc(7*s,-9*s,6*s,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-9*s,-11*s,1.8*s,0,Math.PI*2);ctx.arc(5*s,-11*s,1.8*s,0,Math.PI*2);ctx.fill();
  if(state==='alert'||state==='escape'){ctx.strokeStyle=state==='escape'?'#ff5a3b':'#dfff55';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(0,0,28*s,0,Math.PI*2);ctx.stroke()}
  ctx.restore();
}
function drawReplayTrail(target){
  if(!replay.frozen?.samples?.length)return;
  const cw=replayCanvas.width,ch=replayCanvas.height;
  const pts=replay.frozen.samples.filter(v=>v.t>=replay.frozen.trigger&&v.t<=target&&v.fly);
  if(pts.length<2)return;
  replayCtx.save();
  replayCtx.strokeStyle='rgba(255,141,92,.92)';
  replayCtx.lineWidth=3;
  replayCtx.lineCap='round';
  replayCtx.lineJoin='round';
  replayCtx.beginPath();
  pts.forEach((p,i)=>{
    const x=p.fly.x*cw,y=p.fly.y*ch;
    if(i===0) replayCtx.moveTo(x,y); else replayCtx.lineTo(x,y);
  });
  replayCtx.stroke();
  replayCtx.restore();
}
function drawReplayFrame(frame,sample,target){
  const cw=replayCanvas.width,ch=replayCanvas.height;
  replayCtx.fillStyle='#050505'; replayCtx.fillRect(0,0,cw,ch);
  if(frame?.gray){
    const data=new Uint8ClampedArray(96*54*4);
    for(let i=0;i<frame.gray.length;i++){const g=frame.gray[i];const p=i*4;data[p]=g;data[p+1]=g;data[p+2]=g;data[p+3]=255}
    replaySourceCtx.putImageData(new ImageData(data,96,54),0,0);
    replayCtx.imageSmoothingEnabled=true;
    if(sample?.mirrored){
      replayCtx.save();replayCtx.translate(cw,0);replayCtx.scale(-1,1);replayCtx.drawImage(replaySource,0,0,cw,ch);replayCtx.restore();
    }else replayCtx.drawImage(replaySource,0,0,cw,ch);
  }else{
    const g=replayCtx.createRadialGradient(cw*.5,ch*.5,5,cw*.5,ch*.5,cw*.55);
    g.addColorStop(0,'#39452b');g.addColorStop(1,'#050505');replayCtx.fillStyle=g;replayCtx.fillRect(0,0,cw,ch);
  }
  drawReplayTrail(target);
  if(sample?.fly) drawReplayFly(replayCtx,sample.fly.x*cw,sample.fly.y*ch,sample.fly.state);
  const threat=clamp(sample?.threat||0);
  replayCtx.strokeStyle=threat>.35?'rgba(255,80,56,.85)':'rgba(223,255,85,.62)';
  replayCtx.lineWidth=2+threat*5;
  replayCtx.beginPath();replayCtx.arc((sample?.fly?.x??.5)*cw,(sample?.fly?.y??.5)*ch,28+threat*50,0,Math.PI*2);replayCtx.stroke();
}
function renderReplay(progress){
  if(!replay.frozen) return;
  replay.progress=clamp(progress);
  const {start,end,samples,frames}=replay.frozen;
  const target=start+(end-start)*replay.progress;
  const sample=nearestByTime(samples,target),frame=nearestByTime(frames,target);
  drawReplayFrame(frame,sample,target);
  const rel=target-(replay.frozen.trigger??end);
  $('#replayTime').textContent=Math.abs(rel)<16?'0 ms':(rel<0?'-':'+')+Math.round(Math.abs(rel))+' ms';
  $('#replayCaption').textContent=replayCaption(sample);
  setReplayBar('replayLoom',sample?.loom||0);setReplayBar('replayLc4',sample?.lc4||0);setReplayBar('replayDnL',sample?.dnL||0);setReplayBar('replayDnR',sample?.dnR||0);setReplayBar('replayFlight',sample?.flight||0);setReplayBar('replayEscape',sample?.escape||sample?.threat||0);
  $('#replayScrubber').value=Math.round(replay.progress*1000);
}
function replayTick(now){
  if(!replay.playing||!replay.frozen) return;
  const duration=4800;
  const p=replay.startProgress+(now-replay.wallStart)/duration;
  if(p>=1){replay.playing=false;renderReplay(1);$('#replayPlay').textContent=t('playReplay');return}
  renderReplay(p);replay.raf=requestAnimationFrame(replayTick);
}
function playReplay(fromCurrent=true){
  if(!replay.frozen)return;
  replay.startProgress=fromCurrent?replay.progress:0;
  if(replay.startProgress>=.999) replay.startProgress=0;
  replay.wallStart=performance.now(); replay.playing=true; $('#replayPlay').textContent=t('pauseReplay');
  if(replay.raf)cancelAnimationFrame(replay.raf);
  replay.raf=requestAnimationFrame(replayTick);
}
function pauseReplay(){
  replay.playing=false;if(replay.raf)cancelAnimationFrame(replay.raf);replay.raf=0;$('#replayPlay').textContent=t('playReplay');
}
function showReplay(){
  if(!replay.frozen){$('#result').classList.remove('hidden');return}
  $('#result').classList.add('hidden');$('#replayPanel').classList.remove('hidden');renderReplay(0);playReplay(false);
}
function closeReplay(showResult=true){
  pauseReplay();$('#replayPanel').classList.add('hidden');if(showResult)$('#result').classList.remove('hidden');
}

function modeledFallback(){
  neural.r=smooth(neural.r,clamp(sensory.motion*.62+sensory.light*.25),.2);
  neural.lc4=smooth(neural.lc4,clamp(sensory.loom*1.15+sensory.motion*.18),.32);
  neural.lplc2=smooth(neural.lplc2,clamp(neural.lc4*.72+sensory.loom*.24),.26);
  neural.dnp=smooth(neural.dnp,clamp(neural.lc4*.64-.06),.26);
  neural.motor=smooth(neural.motor,clamp(Math.max(neural.lplc2,neural.dnp)*.72),.24);
  const raw=neural.lc4*.52+Math.max(neural.lplc2,neural.dnp)*.34+neural.motor*.14;
  return clamp((raw-.06)/.52);
}

function connectomeAdapter(now){
  if(!interactionReady() || connectome.status!=='ready' || !connectome.worker){
    connectome.escape=smooth(connectome.escape,0,.25);
    return 0;
  }
  if(!connectome.pending&&now-connectome.lastSent>90){
    connectome.pending=true;connectome.lastSent=now;
    connectome.worker.postMessage({type:'sensory',motion:sensory.motion,light:sensory.light,loom:sensory.loom});
  }
  const threat=connectome.escape;
  maxThreat=Math.max(maxThreat,threat);
  if(!escaped && perceptionState.phase==='alert' && sensory.loom>.20 && threat>.40) triggerEscape(threat);
  return threat;
}

function triggerEscape(threat=connectome.escape){
  const now=performance.now();
  escaped=true; fly.state='escape'; fly.escapeUntil=now+1050;
  const a=Math.random()*Math.PI*2;
  fly.vx=Math.cos(a)*(rear?.008:.007);
  fly.vy=Math.sin(a)*.006-.003;
  markReplayTrigger(now,threat);
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
  if(!DEBUG_MODE&&!experienceArmed()) return;
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
function updatePerceptionUI(p){
  const status=$('#perceptionStatus');
  if(!status)return;
  let key='readyPerception',state='ready';

  if(connectome.status==='error'){key='graphError';state='error'}
  else if(p.phase==='calibrating'){key='calibrating';state='loading'}
  else if(connectome.status!=='ready'){key='waitingGraph';state='loading'}
  else if(p.phase==='camera-moving'){key='holdSteady';state='moving'}
  else if(p.phase==='hand-detected'){key='handSeen';state='ready'}
  else if(p.phase==='approaching'){key='approaching';state='ready'}
  else if(p.phase==='alert'){key='perceptionAlert';state='ready'}
  else if(perceptionEngine.handStatus==='error'){key='trackerError';state='moving'}
  else if(perceptionEngine.handStatus!=='ready'){key='loadingHands';state='ready'}

  status.textContent=t(key); status.dataset.state=state;
  $('#handStatus').textContent=p.tipDetected
    ? ((p.tipSource==='optical'?(lang==='zh'?'视觉指尖 ':'OPT TIP '):t('tip')+' ')+Math.round((p.tipDistance??1)*100)+'%')
    : (perceptionEngine.handStatus==='ready'?t('handNo'):t('handWarming'));
  $('#cameraStatus').textContent=p.cameraStable?t('cameraStable'):(p.phase==='calibrating'?'—':t('cameraMoving'));
  $('#approachValue').textContent=Math.round((p.approach||0)*100)+'%';
  $('#validLoomValue').textContent=Math.round((p.looming||0)*100)+'%';
}

function updateUI(threat){
  $('#threatBar').style.width=Math.round(threat*100)+'%';$('#threatValue').textContent=Math.round(threat*100)+'%';
  setBar('motion',sensory.motion);setBar('light',sensory.light);setBar('loom',sensory.loom);setBar('r',neural.r);setBar('lc4',neural.lc4);setBar('lplc2',neural.lplc2);setBar('dnp',neural.dnp);setBar('motor',neural.motor);
  const state=threat>.46?'escapeReadyState':threat>.16?'alertState':'calmState';
  $('#brainState').textContent=t(state); $('#statusPill').textContent=t(state);
}

function drawMosaic(){
  if(!lastFrame)return; const w=96,h=54,cols=20,rows=11,cw=mosaicCanvas.width/cols,ch=mosaicCanvas.height/rows; mctx.fillStyle='#090909';mctx.fillRect(0,0,mosaicCanvas.width,mosaicCanvas.height);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const sx=Math.floor(x/cols*w),sy=Math.floor(y/rows*h),g=lastFrame[sy*w+sx]||0;const r=Math.min(cw,ch)*.43;mctx.fillStyle=`rgb(${g},${Math.min(255,g*1.08)},${Math.min(255,g*.78)})`;mctx.beginPath();mctx.arc(x*cw+cw/2,y*ch+ch/2,r,0,Math.PI*2);mctx.fill()}
}

function loop(now){
  if(!running)return;
  const dt=Math.min(32,now-lastTs);lastTs=now;frameCounter++;
  if(DEBUG_MODE){
    const phase=((now-debugStart)%4200)/4200;
    const pulse=phase>.28&&phase<.52?Math.sin((phase-.28)/.24*Math.PI):0;
    sensory.loom=smooth(sensory.loom,pulse,.22);
    sensory.motion=smooth(sensory.motion,pulse*.58,.18);
    sensory.light=smooth(sensory.light,.55,.08);
  }else if(frameCounter%2===0){
    analyzeFrame(now);
  }
  const threat=connectomeAdapter(now);
  recordReplay(now,threat);
  updateFly(dt,now,threat);drawFly(now);updateUI(threat);
  if(!$('#flyVisionPanel').classList.contains('hidden')&&frameCounter%4===0)drawMosaic();
  requestAnimationFrame(loop)
}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1600)}

$('#openCamera').onclick=openCamera;$('#retryCamera').onclick=openCamera;$('#resetBtn').onclick=resetFly;$('#againBtn').onclick=()=>{resetFly();$('#result').classList.add('hidden')};
$('#viewReplayBtn').onclick=showReplay;
$('#closeReplay').onclick=()=>closeReplay(true);
$('#replayContinue').onclick=()=>closeReplay(true);
$('#replayPlay').onclick=()=>replay.playing?pauseReplay():playReplay(true);
$('#replayScrubber').oninput=(e)=>{pauseReplay();renderReplay(Number(e.target.value)/1000)};
$('#langBtn').onclick=()=>{lang=lang==='en'?'zh':'en';applyLang();updateConnectomeStatus();updatePerceptionUI(perceptionState)};
$('#scienceBtn').onclick=()=>$('#scienceDrawer').classList.add('open');$('#closeScience').onclick=()=>$('#scienceDrawer').classList.remove('open');
$('#brainToggle').onclick=()=>{
  document.body.classList.toggle('brain-expanded');
  $('#brainToggle').textContent=document.body.classList.contains('brain-expanded')?t('hideDetails'):t('details');
};
$('#flyVisionBtn').onclick=()=>{$('#flyVisionPanel').classList.remove('hidden');drawMosaic()};$('#closeVision').onclick=()=>$('#flyVisionPanel').classList.add('hidden');
$('#shareBtn').onclick=async()=>{const data={title:'Fly Eye',text:lang==='zh'?'让一只果蝇的大脑看看你的世界。':'Let a fly brain see your world.',url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);toast(lang==='zh'?'链接已复制':'Link copied')}}catch{}};

addEventListener('visibilitychange',()=>{if(document.hidden&&!DEBUG_MODE){sensory.motion=sensory.loom=0}});

if(DEBUG_MODE){
  const diag=document.createElement('div');
  diag.id='debugStatus';
  diag.style.cssText='position:absolute;z-index:99;left:10px;top:56px;padding:8px 10px;background:#000;color:#dfff55;font:11px monospace;border:1px solid #dfff55;border-radius:8px';
  document.body.appendChild(diag);
  setInterval(()=>{diag.textContent=`perception=${perceptionState.phase} hand=${perceptionState.handDetected} tipSource=${perceptionState.tipSource} tip=${(perceptionState.tipDistance??1).toFixed(2)} tipApproach=${(perceptionState.tipApproach??0).toFixed(2)} camera=${perceptionState.cameraStable} graph=${connectome.status} n=${connectome.neurons} e=${connectome.edges} loom=${sensory.loom.toFixed(2)} lc4=${neural.lc4.toFixed(2)} dnL=${neural.lplc2.toFixed(2)} dnR=${neural.dnp.toFixed(2)} escapeDN=${connectome.escapeDn.toFixed(2)} flight=${neural.motor.toFixed(2)} threat=${connectome.escape.toFixed(2)} spikes=${connectome.spikes}`},120);
  startDebugMode();
}
