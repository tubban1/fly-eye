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
  en:{eyebrow:'A REAL-WORLD FLY BRAIN EXPERIMENT',hero:'Let a fly brain<br><em>see your world.</em>',desc:"Your camera becomes the fly's visual world. Motion, looming and light are processed locally on your device.",openCamera:'OPEN CAMERA',privacy:'Camera frames stay on your device.',needCamera:'Fly Eye needs camera access',needCameraBody:'We use the live image only inside your browser to estimate motion, looming and brightness. Raw camera frames are not uploaded.',tryAgain:'TRY AGAIN',challenge:'CHALLENGE',sneak:'Sneak up on the fly',challengeBody:'Move your hand slowly toward the fly. Get close without triggering escape.',threat:'THREAT',liveBrain:'LIVE BRAIN',flyVision:'FLY VISION',scienceNote:'Loading the real MaleCNS-derived graph locally…',calm:'CALM',reset:'RESET FLY',escaped:'ESCAPE TRIGGERED',resultTitle:'You woke up<br><em>the escape circuit.</em>',maxThreat:'MAX THREAT',again:'TRY AGAIN',share:'SHARE',whatFlySees:'WHAT THE FLY SEES',visionExplain:'A deliberately simplified compound-eye view used to explain the sensory pipeline.',science:'SCIENCE',scienceTitle:'Camera → sensory signals → fly behavior',scienceBody:'Fly Eye v0.4.10 starts with an embedded escape-fast-v1 pathway graph built from real MaleCNS aggregate connection counts and signed weights between LC4/loom, turning and flight groups. Group-level dynamics and camera-to-neural encoding are modeled. The 70K neuron-level graph is optional and no longer blocks camera interaction.',viewReplay:'VIEW REPLAY',replayEyebrow:'NEURAL REPLAY',replayTitle:'What just happened?',replayBefore:'relative to escape',replayEscapeMark:'ESCAPE',pauseReplay:'PAUSE',playReplay:'PLAY',continueBtn:'CONTINUE',replayPrivacy:'Replay frames and neural samples stay only in this browser tab.'},
  zh:{eyebrow:'现实世界果蝇大脑实验',hero:'让果蝇的大脑<br><em>看见你的世界。</em>',desc:'你的摄像头会成为果蝇的视觉世界。运动、逼近和亮度都在你的设备本地处理。',openCamera:'打开摄像头',privacy:'摄像头画面不会上传。',needCamera:'Fly Eye 需要摄像头权限',needCameraBody:'浏览器只在本地分析运动、逼近和亮度，不上传原始摄像头画面。',tryAgain:'重试',challenge:'挑战',sneak:'慢慢靠近果蝇',challengeBody:'把手慢慢靠近它，尽量接近，但不要触发逃逸。',threat:'威胁',liveBrain:'实时神经活动',flyVision:'果蝇视角',scienceNote:'正在本地加载真实 MaleCNS 衍生连接图…',calm:'平静',reset:'重置果蝇',escaped:'触发逃逸',resultTitle:'你唤醒了<br><em>逃逸回路。</em>',maxThreat:'最高威胁',again:'再试一次',share:'分享',whatFlySees:'果蝇看到的世界',visionExplain:'这是为了解释感觉输入流程而做的简化复眼视图。',science:'科学说明',scienceTitle:'摄像头 → 感觉信号 → 果蝇行为',scienceBody:'Fly Eye v0.4.10 默认使用内置的 escape-fast-v1：它保留 MaleCNS 中 LC4/loom、转向与飞行通路之间真实的聚合连接数量和有符号权重；组级动力学与摄像头到神经输入的编码仍是模型。70K 神经元级图改为可选，不再阻塞摄像头交互。',viewReplay:'查看回放',replayEyebrow:'神经回放',replayTitle:'刚才发生了什么？',replayBefore:'相对逃逸时间',replayEscapeMark:'逃逸',pauseReplay:'暂停',playReplay:'播放',continueBtn:'继续',replayPrivacy:'回放视觉帧和神经采样只保存在当前浏览器标签页内。'}
};
Object.assign(dict.en,{
  calibrating:'CALIBRATING VISION…',loadingHands:'OPTICAL MODE READY · HAND TRACKER WARMING…',waitingGraph:'WAITING FOR CONNECTOME…',
  holdSteady:'CAMERA MOVING — THREAT PAUSED',readyPerception:'READY — BRING YOUR HAND TOWARD THE FLY',handSeen:'HAND DETECTED',
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
  calmState:'CALM',alertState:'ALERT',escapeReadyState:'ESCAPE READY',stabilizing:'STABILIZING — THREAT PAUSED…',cameraStabilizing:'STABILIZING',systemCheck:'SYSTEM CHECK',wizardStabilize:'Preparing your camera…',wizardGesture:'Move one finger toward the fly',wizardReady:'Calibration complete',wizardHoldStill:'Hold the phone naturally for a moment.',wizardMoveFinger:'Now move one fingertip toward the fly once.',wizardDone:'Good — the approach signal responded.',fingertip:'FINGERTIP',opticalTracking:'OPTICAL',flyBrain:'FLY BRAIN',confidence:'CONFIDENCE',skip:'SKIP',checkReady:'READY',checkWait:'WAIT',checkOptical:'OPTICAL READY',checkTracked:'TRACKED',perceptionLayer:'PERCEPTION',brainLayer:'BRAIN',modelTimeline:'MODEL TIMELINE',modelTimelineNote:'Relative to modeled escape trigger',eventTip:'Fingertip enters fly zone',eventApproach:'Approach confidence rises',eventLoom:'Validated looming',eventLc4:'LC4 response',eventDn:'Descending-neuron response',eventFlight:'Flight output',eventEscape:'Modeled escape trigger',modeSneakEyebrow:'MODE A',modeSneakTitle:'Sneak Up',modeSneakBody:'Get as close as possible without making the fly escape.',modeScareEyebrow:'MODE B',modeScareTitle:'Scare Fast',modeScareBody:'Trigger the escape circuit as fast as you can.',scoreLabel:'SCORE',closestApproach:'CLOSEST',roundTime:'TIME',globalLeaderboard:'GLOBAL LEADERBOARD',leaderboardLoading:'Loading leaderboard…',leaderboardUnavailable:'Leaderboard unavailable',yourRank:'YOUR RANK',sneakWinTitle:'You stayed close.<br><em>And kept it calm.</em>',sneakEscapeTitle:'Too close.<br><em>The fly escaped.</em>',scareWinTitle:'Escape triggered.<br><em>Fast.</em>',scareTimeoutTitle:'No escape.<br><em>Try a clearer approach.</em>',sneakResultSafe:'You survived the full round without triggering escape.',sneakResultEscaped:'The fly escaped before the round ended.',scareResultSuccess:'The escape circuit triggered in {time}.',scareResultTimeout:'No validated escape was triggered inside 15 seconds.',roundComplete:'ROUND COMPLETE',shareResultText:'I tried Fly Eye — a camera-driven fly escape-circuit experiment.',shareCardScience:'Real MaleCNS aggregate connectivity + modeled camera encoding/dynamics.',shareCardPrivacy:'No raw camera frame is included in this result card.',shareCopied:'Result link copied'
});
Object.assign(dict.zh,{
  calibrating:'正在校准视觉…',loadingHands:'光流模式已可用 · 手部追踪后台加载中…',waitingGraph:'正在等待连接图…',
  holdSteady:'手机移动中——威胁检测已暂停',readyPerception:'准备完成——把手慢慢靠近果蝇',handSeen:'检测到手',
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
  calmState:'平静',alertState:'警觉',escapeReadyState:'即将逃逸',stabilizing:'正在重新稳定——威胁检测暂停…',cameraStabilizing:'稳定中',systemCheck:'系统自检',wizardStabilize:'正在准备摄像头…',wizardGesture:'把一根手指向果蝇靠近',wizardReady:'校准完成',wizardHoldStill:'自然拿稳手机片刻即可。',wizardMoveFinger:'现在把一根指尖向果蝇靠近一次。',wizardDone:'很好——接近信号已经正常响应。',fingertip:'指尖',opticalTracking:'光学追踪',flyBrain:'果蝇大脑',confidence:'置信度',skip:'跳过',checkReady:'就绪',checkWait:'等待',checkOptical:'光学就绪',checkTracked:'已追踪',perceptionLayer:'感知层',brainLayer:'大脑层',modelTimeline:'模型时间线',modelTimelineNote:'相对模型逃逸触发时间',eventTip:'指尖进入果蝇区域',eventApproach:'接近置信度上升',eventLoom:'确认有效逼近',eventLc4:'LC4 开始响应',eventDn:'下降神经元响应',eventFlight:'飞行输出上升',eventEscape:'模型触发逃逸',modeSneakEyebrow:'模式 A',modeSneakTitle:'潜行靠近',modeSneakBody:'尽可能靠近果蝇，但不要让它逃跑。',modeScareEyebrow:'模式 B',modeScareTitle:'快速惊吓',modeScareBody:'尽快触发果蝇的逃逸回路。',scoreLabel:'得分',closestApproach:'最近距离',roundTime:'时间',globalLeaderboard:'全球排行榜',leaderboardLoading:'正在加载排行榜…',leaderboardUnavailable:'排行榜暂不可用',yourRank:'你的排名',sneakWinTitle:'你靠得很近，<br><em>但它没有逃跑。</em>',sneakEscapeTitle:'太近了，<br><em>果蝇逃跑了。</em>',scareWinTitle:'成功触发逃逸，<br><em>而且很快。</em>',scareTimeoutTitle:'没有触发逃逸，<br><em>再试一次更明确的逼近。</em>',sneakResultSafe:'你完成了整轮挑战，没有触发逃逸。',sneakResultEscaped:'果蝇在本轮结束前逃跑了。',scareResultSuccess:'逃逸回路在 {time} 内被触发。',scareResultTimeout:'15 秒内没有触发有效逃逸。',roundComplete:'本轮完成',shareResultText:'我刚刚体验了 Fly Eye——一个由摄像头驱动的果蝇逃逸回路实验。',shareCardScience:'真实 MaleCNS 聚合连接 + 建模的摄像头编码/动力学。',shareCardPrivacy:'这张结果卡不包含原始摄像头画面。',shareCopied:'结果链接已复制'
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
  triggerTime:0,postRollUntil:0,pendingFinalize:false,speed:.5,showPerception:true,showBrain:true
};
const perceptionEngine=new PerceptionEngine({video,canvas:visionCanvas,getFly:()=>fly,isRear:()=>rear});
let perceptionState=perceptionEngine.last;
let perceptionRuntimeError='';
let wasCameraInteractionStable=false;
const calibrationWizard={
  active:false,
  gestureSeen:false,
  startedAt:0,
  completedAt:0,
  skipped:false
};

function getAnonymousUserId(){
  let id=localStorage.getItem('flyEye_user_id');
  if(id) return id;
  if(globalThis.crypto?.randomUUID) id=crypto.randomUUID();
  else id='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)
  });
  localStorage.setItem('flyEye_user_id',id);
  return id;
}
const userId=getAnonymousUserId();
let gameMode=localStorage.getItem('flyEye_mode')==='scare_fast'?'scare_fast':'sneak_up';
const round={
  active:false,finished:false,startedAt:0,endedAt:0,
  closestApproach:1,dangerMs:0,survivedMs:0,escapeLatencyMs:0,
  escaped:false,score:null,rank:null,submitting:false
};


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
    updateCalibrationWizard();
    };
    connectome.worker.onmessage=(event)=>{
      const msg=event.data||{};
      if(msg.type==='ready'){
        connectome.status='ready';connectome.phase='ready';connectome.profile=msg.profile||connectome.profile;connectome.aggregate=!!msg.aggregate;connectome.groups=msg.groups||0;connectome.aggregateLinks=msg.aggregateLinks||0;connectome.representedNeurons=msg.representedNeurons||msg.neurons||0;connectome.neurons=msg.neurons||0;connectome.edges=msg.edges||0;connectome.escapeTargets=msg.escapeTargetCount||0;connectome.loaded=msg.graphBytes||connectome.loaded;connectome.total=msg.graphBytes||connectome.total;connectome.pending=false;updateConnectomeStatus();updatePerceptionUI(perceptionState);updateCalibrationWizard();
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
const prewarmHands=()=>perceptionEngine.initHands().then(()=>{updatePerceptionUI(perceptionState);updateCalibrationWizard();});
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

function modeConfig(){
  return gameMode==='scare_fast'
    ? {duration:15000,title:t('modeScareTitle'),body:t('modeScareBody')}
    : {duration:20000,title:t('modeSneakTitle'),body:t('modeSneakBody')};
}

function applyModeUI(){
  document.querySelectorAll('.mode-card').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===gameMode));
  const cfg=modeConfig();
  const title=$('#challengeTitle'),body=$('#challengeBody'),mode=$('#roundMode');
  if(title) title.textContent=cfg.title;
  if(body) body.textContent=cfg.body;
  if(mode) mode.textContent=gameMode==='scare_fast'?t('modeScareTitle').toUpperCase():t('modeSneakTitle').toUpperCase();
  localStorage.setItem('flyEye_mode',gameMode);
}

function resetRound(){
  round.active=false;round.finished=false;round.startedAt=0;round.endedAt=0;
  round.closestApproach=1;round.dangerMs=0;round.survivedMs=0;round.escapeLatencyMs=0;
  round.escaped=false;round.score=null;round.rank=null;round.submitting=false;
  const timer=$('#roundTimer'); if(timer) timer.textContent=gameMode==='scare_fast'?'0.0 s':'20.0 s';
  const score=$('#resultScore'); if(score) score.textContent='—';
  const rank=$('#playerRank'); if(rank) rank.textContent='—';
  const list=$('#leaderboardList'); if(list) list.innerHTML='';
  const status=$('#leaderboardStatus'); if(status) status.textContent=t('leaderboardLoading');
}

function startRound(now){
  if(round.active||round.finished)return;
  round.active=true;round.startedAt=now;round.endedAt=0;
  round.closestApproach=1;round.dangerMs=0;round.survivedMs=0;round.escapeLatencyMs=0;round.escaped=false;
}

function localScoreEstimate(){
  const closest=clamp(round.closestApproach);
  if(gameMode==='sneak_up'){
    const proximity=Math.round((1-closest)*7000);
    const survival=Math.round(Math.min(1,round.survivedMs/20000)*2500);
    const control=Math.round((1-clamp(maxThreat))*500);
    return Math.max(0,Math.min(10000,proximity+survival+control-(round.escaped?2500:0)));
  }
  if(!round.escaped||!round.escapeLatencyMs)return 0;
  return Math.max(0,Math.min(10000,10000-Math.round(round.escapeLatencyMs*1.6)));
}

function finishRound(reason,now=performance.now()){
  if(round.finished)return;
  round.finished=true;round.active=false;round.endedAt=now;
  round.survivedMs=Math.max(0,Math.round((round.startedAt?now-round.startedAt:0)));
  round.escaped=reason==='escape';
  if(round.escaped) round.escapeLatencyMs=Math.max(0,Math.round(now-round.startedAt));
  round.score=localScoreEstimate();

  sensory.motion=0;sensory.loom=0;
  if(!round.escaped){
    connectome.escape=0;connectome.escapeDn=0;connectome.network=0;
    connectome.worker?.postMessage({type:'reset'});
    presentRoundResult(false);
  }
  submitRoundResult();
}

function updateRound(now,dt,threat){
  if(round.finished)return;
  if(!round.active){
    if(!calibrationWizard.active && interactionReady()) startRound(now);
    else return;
  }

  const elapsed=Math.max(0,now-round.startedAt);
  round.survivedMs=Math.round(elapsed);
  if(perceptionState.tipDetected){
    round.closestApproach=Math.min(round.closestApproach,clamp(perceptionState.tipDistance??1));
  }
  if((perceptionState.approach||0)>.25 || threat>.20) round.dangerMs+=dt;

  const timer=$('#roundTimer');
  if(gameMode==='scare_fast'){
    if(timer) timer.textContent=(elapsed/1000).toFixed(1)+' s';
    if(elapsed>=15000) finishRound('timeout',now);
  }else{
    const remaining=Math.max(0,20000-elapsed);
    if(timer) timer.textContent=(remaining/1000).toFixed(1)+' s';
    if(elapsed>=20000) finishRound('survived',now);
  }
}

function formatClosest(){
  if(round.closestApproach>=.999)return '—';
  return Math.round(round.closestApproach*100)+'%';
}

function formatTime(){
  if(gameMode==='scare_fast' && round.escaped) return (round.escapeLatencyMs/1000).toFixed(2)+' s';
  return (round.survivedMs/1000).toFixed(1)+' s';
}

function updateResultUI(){
  const escapedRound=round.escaped;
  $('#resultScore').textContent=round.score==null?'—':String(round.score);
  $('#maxThreat').textContent=Math.round(maxThreat*100)+'%';
  $('#closestApproach').textContent=formatClosest();
  $('#resultTime').textContent=formatTime();

  if(gameMode==='sneak_up'){
    $('#resultEyebrow').textContent=escapedRound?t('escaped'):t('roundComplete');
    $('#resultTitle').innerHTML=escapedRound?t('sneakEscapeTitle'):t('sneakWinTitle');
    $('#resultExplain').textContent=escapedRound?t('sneakResultEscaped'):t('sneakResultSafe');
  }else{
    $('#resultEyebrow').textContent=escapedRound?t('escaped'):t('roundComplete');
    $('#resultTitle').innerHTML=escapedRound?t('scareWinTitle'):t('scareTimeoutTitle');
    $('#resultExplain').textContent=escapedRound
      ? t('scareResultSuccess').replace('{time}',formatTime())
      : t('scareResultTimeout');
  }
  $('#viewReplayBtn').classList.toggle('hidden',!replay.frozen);
}

function presentRoundResult(showReplayButton=true){
  updateResultUI();
  $('#viewReplayBtn').classList.toggle('hidden',!showReplayButton||!replay.frozen);
  $('#replayPanel').classList.add('hidden');
  $('#result').classList.remove('hidden');
}

async function submitRoundResult(){
  if(round.submitting)return;
  round.submitting=true;
  try{
    const resp=await fetch('/api/score',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        user_id:userId,
        mode:gameMode,
        closest_approach:round.closestApproach,
        max_threat:maxThreat,
        escape_latency_ms:round.escapeLatencyMs,
        survived_ms:round.survivedMs,
        escaped:round.escaped,
        model_version:'0.5.0-alpha.3',
        graph_profile:connectome.profile||'escape-fast-v1'
      })
    });
    if(!resp.ok) throw new Error('score '+resp.status);
    const data=await resp.json();
    round.score=data.score;
    round.rank=data.rank;
    updateResultUI();
    $('#playerRank').textContent=t('yourRank')+' #'+data.rank;
    await loadLeaderboard();
  }catch(err){
    console.warn('score submit failed',err);
    $('#leaderboardStatus').textContent=t('leaderboardUnavailable');
  }finally{
    round.submitting=false;
  }
}

async function loadLeaderboard(){
  try{
    const resp=await fetch('/api/leaderboard?mode='+encodeURIComponent(gameMode)+'&limit=8');
    if(!resp.ok) throw new Error('leaderboard '+resp.status);
    const data=await resp.json();
    const host=$('#leaderboardList'); host.innerHTML='';
    for(const entry of data.entries||[]){
      const row=document.createElement('div');
      row.className='leaderboard-row'+(entry.user_id===userId?' me':'');
      const rank=document.createElement('b'); rank.textContent='#'+entry.rank;
      const who=document.createElement('span'); who.textContent=entry.user_id===userId?'YOU / 你':'Fly '+entry.user_id.slice(0,4).toUpperCase();
      const score=document.createElement('strong'); score.textContent=String(entry.score);
      row.append(rank,who,score);host.appendChild(row);
    }
    $('#leaderboardStatus').textContent='';
  }catch(err){
    console.warn('leaderboard load failed',err);
    $('#leaderboardStatus').textContent=t('leaderboardUnavailable');
  }
}

function resetCalibrationWizard(now=performance.now()){
  calibrationWizard.active=true;
  calibrationWizard.gestureSeen=false;
  calibrationWizard.startedAt=now;
  calibrationWizard.completedAt=0;
  calibrationWizard.skipped=false;
  document.body.classList.add('calibration-flow');
  $('#calibrationWizard')?.classList.remove('hidden');
  updateCalibrationWizard();
}

function setWizardCheck(id,value,state){
  const row=$('#'+id),label=$('#'+id+'Value');
  if(row) row.dataset.state=state;
  if(label) label.textContent=value;
}

function completeCalibrationWizard(skipped=false){
  if(!calibrationWizard.active)return;
  calibrationWizard.skipped=skipped;
  calibrationWizard.active=false;
  calibrationWizard.completedAt=performance.now();
  document.body.classList.remove('calibration-flow');

  // Start the actual challenge from a clean state after the practice gesture.
  perceptionEngine.rearmAfterPractice(performance.now());
  perceptionState=perceptionEngine.last;
  resetReplay();
  maxThreat=0;
  sensory.motion=0;sensory.loom=0;
  connectome.escape=0;connectome.escapeDn=0;connectome.network=0;connectome.spikes=0;
  Object.assign(neural,{r:0,lc4:0,lplc2:0,dnp:0,motor:0});
  connectome.worker?.postMessage({type:'reset'});

  const title=$('#wizardTitle'),hint=$('#wizardHint');
  if(title) title.textContent=t('wizardReady');
  if(hint) hint.textContent=skipped?t('readyPerception'):t('wizardDone');
  setTimeout(()=>$('#calibrationWizard')?.classList.add('hidden'),skipped?180:520);
}

function updateCalibrationWizard(){
  if(!calibrationWizard.active)return;
  const p=perceptionState||{};
  const c=p.confidence||{};
  const cameraReady=!!p.cameraStable;
  const brainReady=connectome.status==='ready';
  const opticalReady=!!perceptionEngine.frame && p.phase!=='calibrating';
  const fingertipReady=perceptionEngine.handStatus==='ready' || opticalReady;

  setWizardCheck('wizardCamera',cameraReady?t('checkReady'):t('checkWait'),cameraReady?'ready':'wait');
  setWizardCheck('wizardBrain',brainReady?t('checkReady'):t('checkWait'),brainReady?'ready':'wait');
  setWizardCheck('wizardOptical',opticalReady?t('checkReady'):t('checkWait'),opticalReady?'ready':'wait');
  setWizardCheck(
    'wizardTip',
    p.tipDetected?t('checkTracked'):(fingertipReady?t('checkOptical'):t('checkWait')),
    p.tipDetected?'tracked':(fingertipReady?'ready':'wait')
  );

  const baseReady=[cameraReady,brainReady,opticalReady,fingertipReady].filter(Boolean).length;
  $('#wizardProgress').textContent=baseReady+'/4';

  const combined=clamp(
    (c.cameraStable||0)*.34 +
    (Math.max(c.fingertipConfidence||0,.55*(opticalReady?1:0)))*.20 +
    (c.opticalLoomConfidence||0)*.12 +
    (brainReady?1:0)*.34
  );
  $('#wizardConfidenceBar').style.width=Math.round(combined*100)+'%';
  $('#wizardConfidenceValue').textContent=Math.round(combined*100)+'%';

  const allBase=baseReady===4;
  if(allBase){
    $('#wizardTitle').textContent=t('wizardGesture');
    $('#wizardHint').textContent=t('wizardMoveFinger');
    const gesture=(p.approach||0)>.14 || (p.tipDetected && (p.tipApproach||0)>.12);
    if(gesture){
      calibrationWizard.gestureSeen=true;
      completeCalibrationWizard(false);
    }
  }else{
    $('#wizardTitle').textContent=t('wizardStabilize');
    $('#wizardHint').textContent=t('wizardHoldStill');
  }
}

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
    const calibrationNow=performance.now();
    perceptionEngine.startCalibration(calibrationNow);
    resetCalibrationWizard(calibrationNow);
    perceptionEngine.initHands().then(()=>updatePerceptionUI(perceptionState));
    resetFly(); running=true; lastTs=performance.now();
    requestAnimationFrame(loop);
  }catch(err){ console.error(err); $('#permission').classList.remove('hidden'); }
}

function resetFly(){resetRound();wasCameraInteractionStable=false;document.body.classList.remove('brain-expanded');const bt=$('#brainToggle');if(bt)bt.textContent=t('details');fly.x=.56;fly.y=.55;fly.vx=fly.vy=0;fly.state='idle';fly.escapeUntil=0;escaped=false;maxThreat=0;connectome.escape=0;connectome.escapeDn=0;connectome.network=0;Object.assign(neural,{r:0,lc4:0,lplc2:0,dnp:0,motor:0});connectome.worker?.postMessage({type:'reset'});resetReplay();$('#result').classList.add('hidden');$('#replayPanel').classList.add('hidden')}

function experienceArmed(){
  return DEBUG_MODE || (
    perceptionState.phase!=='calibrating' &&
    connectome.status==='ready'
  );
}
function interactionReady(){
  return experienceArmed() && !calibrationWizard.active && (DEBUG_MODE || perceptionState.cameraStable);
}

function analyzeFrame(now){
  try{
    perceptionState=perceptionEngine.analyze(now);
    perceptionRuntimeError='';
    lastFrame=perceptionEngine.frame;

    const cameraNowStable=!!perceptionState.cameraStable;
    if(wasCameraInteractionStable && !cameraNowStable){
      connectome.escape=0; connectome.escapeDn=0; connectome.network=0; connectome.spikes=0;
      neural.r=0; neural.lc4=0; neural.lplc2=0; neural.dnp=0; neural.motor=0;
      connectome.pending=false;
      if(connectome.worker) connectome.worker.postMessage({type:'reset'});
    }
    wasCameraInteractionStable=cameraNowStable;

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
    updateCalibrationWizard();
  }catch(err){
    perceptionRuntimeError=String(err?.message||err);
    console.error('Perception frame failed',err);
    sensory.motion=0;sensory.loom=0;
    const status=$('#perceptionStatus');
    if(status){
      status.dataset.state='error';
      status.textContent=lang==='zh'
        ? '感知模块错误：'+perceptionRuntimeError
        : 'PERCEPTION ERROR: '+perceptionRuntimeError;
    }
  }
}

function resetReplay(){
  replay.frames=[]; replay.samples=[]; replay.frozen=null; replay.lastCapture=0; replay.progress=0; replay.playing=false;
  replay.triggerTime=0; replay.postRollUntil=0; replay.pendingFinalize=false;
  if(replay.raf) cancelAnimationFrame(replay.raf);
  replay.raf=0;
}
function replaySample(now,threat,escape=0){
  const p=perceptionState||{};
  return {
    t:now,motion:sensory.motion,light:sensory.light,loom:sensory.loom,lc4:neural.lc4,dnL:neural.lplc2,dnR:neural.dnp,
    flight:neural.motor,network:neural.r,threat,escape,spikes:connectome.spikes||0,
    fly:{x:fly.x,y:fly.y,state:fly.state},mirrored:!rear,
    perception:{
      tipDetected:!!p.tipDetected,
      tipSource:p.tipSource||'none',
      tipX:Number.isFinite(p.tipX)?p.tipX:.5,
      tipY:Number.isFinite(p.tipY)?p.tipY:.5,
      tipDistance:p.tipDistance??1,
      tipApproach:p.tipApproach??0,
      cameraStable:!!p.cameraStable,
      approach:p.approach??0,
      looming:p.looming??0,
      confidence:{...(p.confidence||{})}
    }
  };
}
function recordReplay(now,threat){
  if(now-replay.lastCapture<72) return;
  replay.lastCapture=now;
  replay.samples.push(replaySample(now,threat,fly.state==='escape'?1:0));
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
  const samples=replay.samples.filter(v=>v.t>=start).map(v=>({...v,fly:{...v.fly},perception:{...v.perception,confidence:{...(v.perception?.confidence||{})}}}));
  const frames=replay.frames.filter(v=>v.t>=start).map(v=>({t:v.t,gray:v.gray?v.gray.slice():null}));
  replay.frozen={samples,frames,start,end:now,trigger:replay.triggerTime};
  finishEscapeExperience();
}
function finishEscapeExperience(){
  if(!running||!replay.frozen)return;
  updateResultUI();
  showReplay();
}
function buildModelTimeline(){
  if(!replay.frozen?.samples?.length)return [];
  const samples=replay.frozen.samples;
  const trigger=replay.frozen.trigger;
  const find=(predicate)=>samples.find(predicate);
  const events=[];
  const add=(key,sample,value='')=>{
    if(!sample)return;
    events.push({key,t:sample.t,rel:Math.round(sample.t-trigger),value});
  };
  add('eventTip',find(v=>v.perception?.tipDetected));
  add('eventApproach',find(v=>(v.perception?.approach||0)>.14));
  add('eventLoom',find(v=>(v.loom||0)>.16));
  add('eventLc4',find(v=>(v.lc4||0)>.08));
  add('eventDn',find(v=>Math.max(v.dnL||0,v.dnR||0)>.08));
  add('eventFlight',find(v=>(v.flight||0)>.08));
  add('eventEscape',nearestByTime(samples,trigger));
  const seen=new Set();
  return events
    .filter(e=>{const k=e.key+'@'+e.rel;if(seen.has(k))return false;seen.add(k);return true})
    .sort((a,b)=>a.t-b.t);
}
function renderModelTimeline(){
  const host=$('#modelTimelineEvents');
  if(!host)return;
  const events=buildModelTimeline();
  host.innerHTML='';
  for(const event of events){
    const row=document.createElement('div');
    row.className='model-event';
    row.dataset.time=String(event.t);
    const time=document.createElement('b');
    time.textContent=(event.rel===0?'0':(event.rel>0?'+':'')+event.rel)+' ms';
    const label=document.createElement('span');
    label.textContent=t(event.key);
    row.append(time,label);
    host.appendChild(row);
  }
}
function updateModelTimelineActive(target){
  document.querySelectorAll('.model-event').forEach(el=>{
    el.classList.toggle('active',Number(el.dataset.time)<=target);
  });
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
  const afterTrigger=replay.frozen?.trigger&&sample.t>replay.frozen.trigger+140;
  if(afterTrigger&&sample.fly?.state==='escape') return lang==='zh'?'果蝇正在沿逃逸轨迹移动。':'The fly is moving along its escape trajectory.';
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
function drawReplayPerception(sample){
  if(!replay.showPerception||!sample?.perception)return;
  const p=sample.perception;
  const cw=replayCanvas.width,ch=replayCanvas.height;
  const flyX=(sample.fly?.x??.5)*cw,flyY=(sample.fly?.y??.5)*ch;

  const loom=clamp(p.looming||sample.loom||0);
  if(loom>0){
    replayCtx.save();
    replayCtx.strokeStyle='rgba(223,255,85,'+(0.18+loom*.62)+')';
    replayCtx.lineWidth=1.5+loom*4;
    replayCtx.setLineDash([7,6]);
    replayCtx.beginPath();
    replayCtx.arc(flyX,flyY,42+loom*72,0,Math.PI*2);
    replayCtx.stroke();
    replayCtx.restore();
  }

  if(p.tipDetected){
    const tx=(sample.mirrored?1-p.tipX:p.tipX)*cw;
    const ty=p.tipY*ch;
    replayCtx.save();
    replayCtx.strokeStyle=p.tipSource==='optical'?'rgba(98,221,255,.95)':'rgba(223,255,85,.95)';
    replayCtx.fillStyle=p.tipSource==='optical'?'rgba(98,221,255,.18)':'rgba(223,255,85,.18)';
    replayCtx.lineWidth=2;
    replayCtx.beginPath();replayCtx.arc(tx,ty,10,0,Math.PI*2);replayCtx.fill();replayCtx.stroke();
    replayCtx.setLineDash([5,5]);
    replayCtx.beginPath();replayCtx.moveTo(tx,ty);replayCtx.lineTo(flyX,flyY);replayCtx.stroke();
    replayCtx.setLineDash([]);
    replayCtx.font='700 9px system-ui,sans-serif';
    replayCtx.fillStyle='#fff';
    replayCtx.fillText((p.tipSource==='optical'?'OPT TIP':'TIP')+' '+Math.round((1-(p.tipDistance||1))*100)+'%',tx+13,ty-8);
    replayCtx.restore();
  }
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
  drawReplayPerception(sample);
  if(sample?.fly) drawReplayFly(replayCtx,sample.fly.x*cw,sample.fly.y*ch,sample.fly.state);
  const threat=replay.showBrain?clamp(sample?.threat||0):0;
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
  updateModelTimelineActive(target);
}
function replayTick(now){
  if(!replay.playing||!replay.frozen) return;
  const modelDuration=Math.max(1,replay.frozen.end-replay.frozen.start);
  const duration=modelDuration/Math.max(.1,replay.speed);
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
  $('#result').classList.add('hidden');$('#replayPanel').classList.remove('hidden');
  $('#replayPanel').classList.toggle('hide-brain-layer',!replay.showBrain);
  renderModelTimeline();renderReplay(0);playReplay(false);
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
  if(round.active && !round.finished && !escaped && perceptionState.phase==='alert' && perceptionState.cameraStable && !perceptionState.motionBlocked && (perceptionState.stableFor||0)>=320 && (perceptionState.globalMotion||0)<.30 && sensory.loom>.20 && threat>.40) triggerEscape(threat);
  return threat;
}

function triggerEscape(threat=connectome.escape){
  const now=performance.now();
  escaped=true; fly.state='escape'; fly.escapeUntil=now+1050;
  const a=Math.random()*Math.PI*2;
  fly.vx=Math.cos(a)*(rear?.008:.007);
  fly.vy=Math.sin(a)*.006-.003;
  markReplayTrigger(now,threat);
  finishRound('escape',now);
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
  else if(p.phase==='stabilizing'){key='stabilizing';state='moving'}
  else if(p.phase==='hand-detected'){key='handSeen';state='ready'}
  else if(p.phase==='approaching'){key='approaching';state='ready'}
  else if(p.phase==='alert'){key='perceptionAlert';state='ready'}
  else if(perceptionEngine.handStatus==='error'){key='trackerError';state='moving'}
  else if(perceptionEngine.handStatus!=='ready'){key='loadingHands';state='ready'}

  status.textContent=t(key); status.dataset.state=state;
  $('#handStatus').textContent=p.tipDetected
    ? ((p.tipSource==='optical'?(lang==='zh'?'视觉指尖 ':'OPT TIP '):t('tip')+' ')+Math.round((p.tipDistance??1)*100)+'%')
    : (perceptionEngine.handStatus==='ready'?t('handNo'):t('handWarming'));
  $('#cameraStatus').textContent=p.cameraStable
    ? t('cameraStable')
    : (p.phase==='calibrating'?'—':(p.phase==='stabilizing'?t('cameraStabilizing'):t('cameraMoving')));
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
  updateRound(now,dt,threat);
  recordReplay(now,threat);
  updateFly(dt,now,threat);drawFly(now);updateUI(threat);
  if(!$('#flyVisionPanel').classList.contains('hidden')&&frameCounter%4===0)drawMosaic();
  requestAnimationFrame(loop)
}

function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight){
  const words=String(text).split(/\s+/);
  let line='',cy=y;
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width>maxWidth && line){
      ctx.fillText(line,x,cy);line=word;cy+=lineHeight;
    }else line=test;
  }
  if(line)ctx.fillText(line,x,cy);
  return cy;
}

async function buildShareCard(){
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');
  const mode=gameMode==='scare_fast'?t('modeScareTitle'):t('modeSneakTitle');

  ctx.fillStyle='#090909';ctx.fillRect(0,0,canvas.width,canvas.height);
  const grad=ctx.createRadialGradient(810,180,20,810,180,720);
  grad.addColorStop(0,'rgba(223,255,85,.16)');
  grad.addColorStop(1,'rgba(223,255,85,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle='#f6f0e4';ctx.font='900 72px system-ui,sans-serif';
  ctx.fillText('FLY',70,115);
  ctx.fillStyle='#dfff55';ctx.fillText('EYE',225,115);

  ctx.fillStyle='rgba(246,240,228,.62)';ctx.font='800 24px system-ui,sans-serif';
  ctx.fillText(mode.toUpperCase(),72,205);

  ctx.fillStyle='#f6f0e4';ctx.font='900 210px system-ui,sans-serif';
  ctx.fillText(String(round.score??localScoreEstimate()),65,440);
  ctx.font='800 26px system-ui,sans-serif';ctx.fillStyle='rgba(246,240,228,.60)';
  ctx.fillText(t('scoreLabel').toUpperCase(),75,495);

  const stats=[
    [t('closestApproach'),formatClosest()],
    [t('maxThreat'),Math.round(maxThreat*100)+'%'],
    [t('roundTime'),formatTime()],
    [t('yourRank'),round.rank?'#'+round.rank:'—']
  ];
  let sy=595;
  for(const [label,value] of stats){
    ctx.fillStyle='rgba(246,240,228,.52)';ctx.font='800 22px system-ui,sans-serif';ctx.fillText(label.toUpperCase(),75,sy);
    ctx.fillStyle='#f6f0e4';ctx.font='900 42px system-ui,sans-serif';ctx.fillText(value,430,sy+3);
    sy+=86;
  }

  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(70,950);ctx.lineTo(1010,950);ctx.stroke();

  ctx.fillStyle='rgba(246,240,228,.72)';ctx.font='700 23px system-ui,sans-serif';
  wrapCanvasText(ctx,t('shareCardScience'),72,1015,900,34);
  ctx.fillStyle='rgba(246,240,228,.46)';ctx.font='600 20px system-ui,sans-serif';
  wrapCanvasText(ctx,t('shareCardPrivacy'),72,1100,900,30);

  ctx.fillStyle='#dfff55';ctx.font='900 26px system-ui,sans-serif';
  ctx.fillText((location.hostname||'fly.fde.fan').toUpperCase(),72,1260);

  return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.94));
}

async function shareRoundResult(){
  const text=t('shareResultText')+' '+(gameMode==='scare_fast'?t('modeScareTitle'):t('modeSneakTitle'))+' · '+t('scoreLabel')+' '+String(round.score??localScoreEstimate());
  try{
    const blob=await buildShareCard();
    if(blob && typeof File!=='undefined'){
      const file=new File([blob],'fly-eye-result.png',{type:'image/png'});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({title:'Fly Eye',text,files:[file]});
        return;
      }
    }
    if(navigator.share){
      await navigator.share({title:'Fly Eye',text,url:location.href});
      return;
    }
    await navigator.clipboard.writeText(text+' '+location.href);
    toast(t('shareCopied'));
  }catch(err){
    if(err?.name!=='AbortError')console.warn('share failed',err);
  }
}

function prepareNextRound(){
  perceptionEngine.rearmAfterPractice(performance.now());
  perceptionState=perceptionEngine.last;
  resetFly();
}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),1600)}

document.querySelectorAll('.mode-card').forEach(btn=>{
  btn.onclick=()=>{
    if(!$('#landing').classList.contains('hidden')){
      gameMode=btn.dataset.mode==='scare_fast'?'scare_fast':'sneak_up';
      applyModeUI();resetRound();
    }
  };
});
applyModeUI();
resetRound();

$('#openCamera').onclick=openCamera;$('#retryCamera').onclick=openCamera;$('#wizardSkip').onclick=()=>completeCalibrationWizard(true);$('#resetBtn').onclick=prepareNextRound;$('#againBtn').onclick=()=>{prepareNextRound();$('#result').classList.add('hidden')};
$('#viewReplayBtn').onclick=showReplay;
$('#closeReplay').onclick=()=>closeReplay(true);
$('#replayContinue').onclick=()=>closeReplay(true);
$('#replayPerceptionToggle').onclick=()=>{
  replay.showPerception=!replay.showPerception;
  $('#replayPerceptionToggle').classList.toggle('active',replay.showPerception);
  renderReplay(replay.progress);
};
$('#replayBrainToggle').onclick=()=>{
  replay.showBrain=!replay.showBrain;
  $('#replayBrainToggle').classList.toggle('active',replay.showBrain);
  $('#replayPanel').classList.toggle('hide-brain-layer',!replay.showBrain);
  renderReplay(replay.progress);
};
document.querySelectorAll('.replay-speed [data-speed]').forEach(btn=>{
  btn.onclick=()=>{
    replay.speed=Number(btn.dataset.speed)||.5;
    document.querySelectorAll('.replay-speed [data-speed]').forEach(b=>b.classList.toggle('active',b===btn));
    if(replay.playing) playReplay(true);
  };
});
$('#replayPlay').onclick=()=>replay.playing?pauseReplay():playReplay(true);
$('#replayScrubber').oninput=(e)=>{pauseReplay();renderReplay(Number(e.target.value)/1000)};
$('#langBtn').onclick=()=>{lang=lang==='en'?'zh':'en';applyLang();applyModeUI();updateConnectomeStatus();updatePerceptionUI(perceptionState);updateCalibrationWizard();if(!$('#result').classList.contains('hidden'))updateResultUI()};
$('#scienceBtn').onclick=()=>$('#scienceDrawer').classList.add('open');$('#closeScience').onclick=()=>$('#scienceDrawer').classList.remove('open');
$('#brainToggle').onclick=()=>{
  document.body.classList.toggle('brain-expanded');
  $('#brainToggle').textContent=document.body.classList.contains('brain-expanded')?t('hideDetails'):t('details');
};
$('#flyVisionBtn').onclick=()=>{$('#flyVisionPanel').classList.remove('hidden');drawMosaic()};$('#closeVision').onclick=()=>$('#flyVisionPanel').classList.add('hidden');
$('#shareBtn').onclick=shareRoundResult;

addEventListener('visibilitychange',()=>{if(document.hidden&&!DEBUG_MODE){sensory.motion=sensory.loom=0}});

if(DEBUG_MODE){
  const diag=document.createElement('div');
  diag.id='debugStatus';
  diag.style.cssText='position:absolute;z-index:99;left:10px;top:56px;padding:8px 10px;background:#000;color:#dfff55;font:11px monospace;border:1px solid #dfff55;border-radius:8px';
  document.body.appendChild(diag);
  setInterval(()=>{diag.textContent=`perception=${perceptionState.phase} hand=${perceptionState.handDetected} tipSource=${perceptionState.tipSource} tip=${(perceptionState.tipDistance??1).toFixed(2)} tipApproach=${(perceptionState.tipApproach??0).toFixed(2)} camera=${perceptionState.cameraStable} graph=${connectome.status} n=${connectome.neurons} e=${connectome.edges} loom=${sensory.loom.toFixed(2)} lc4=${neural.lc4.toFixed(2)} dnL=${neural.lplc2.toFixed(2)} dnR=${neural.dnp.toFixed(2)} escapeDN=${connectome.escapeDn.toFixed(2)} flight=${neural.motor.toFixed(2)} threat=${connectome.escape.toFixed(2)} spikes=${connectome.spikes}`},120);
  startDebugMode();
}
