const UPSTREAM_COMMIT = 'bff49a376f0844c918eb7f2be83e95f2699b0d14';
const FAST_PROFILE = { name:'escape-v1', manifest:'/data/escape-v1/manifest.json', graph:'/data/escape-v1/graph.bin' };
const FULL_PROFILE = { name:'70k', manifest:'/data/brain/manifest.json', graph:'/data/brain/graph.bin' };
const AGGREGATE_PROFILE = {
  name:'escape-fast-v1',
  representedNeurons:192,
  groups:['loom','turnL','turnR','flightL','flightR'],
  links:[
    ['turnL','turnL',34,705,63],['turnL','turnR',24,395,67],['turnL','flightL',5,46,6],['turnL','flightR',6,171,5],
    ['turnR','turnL',26,387,6],['turnR','turnR',21,536,47],['turnR','flightL',6,89,0],['turnR','flightR',4,48,0],
    ['flightL','turnL',3,9,33],['flightL','turnR',4,118,21],['flightL','flightL',9,151,24],['flightL','flightR',4,112,45],
    ['flightR','turnL',3,12,25],['flightR','turnR',3,107,19],['flightR','flightL',7,60,40],['flightR','flightR',7,57,26],
    ['loom','turnL',84,1910,0],['loom','turnR',52,678,0],['loom','flightL',71,1827,0],['loom','flightR',50,665,0],
    ['loom','loom',1387,9814,0]
  ],
  attribution:'Janelia FlyEM MaleCNS aggregate group links'
};
let activeProfile = AGGREGATE_PROFILE;
let runtimeMode = 'aggregate';
let aggregateState = {loom:0,turnL:0,turnR:0,flightL:0,flightR:0};

const PARAMS = Object.freeze({
  tau: 20,
  threshold: 1,
  reset: 0,
  dt: 1,
  refractory: 2,
  inputScale: 0.0002,
  baselineDrive: 0.05,
  ticksPerInput: 7,
});

let ready = false;
let loading = false;
let manifest = null;
let n = 0;
let edgeCount = 0;
let sourceOffsets = null;
let targets = null;
let outWeights = null;
let voltage = null;
let refractory = null;
let spikes = null;
let spikeIndices = null;
let nextSpikeIndices = null;
let spikeCount = 0;
let synaptic = null;
let injectionMask = null; // 1 = LC4 loom, 2 = retained visual group
let groups = Object.create(null);
let motor = null;
let escapeTargets = new Uint32Array(0);

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type === 'init') {
    if (!ready && !loading) await init();
    return;
  }
  if (msg.type === 'init-detailed') {
    if (!ready && !loading) await initDetailed();
    return;
  }
  if (msg.type === 'reset') {
    if (ready) resetState();
    return;
  }
  if (msg.type === 'sensory' && ready) {
    const motion = clamp(Number(msg.motion) || 0);
    const light = clamp(Number(msg.light) || 0);
    const loom = clamp(Number(msg.loom) || 0);
    const out = runtimeMode==='aggregate' ? advanceAggregate({ motion, light, loom }) : advanceSensory({ motion, light, loom });
    self.postMessage({ type: 'state', ...out });
  }
};

async function init() {
  loading = true;
  self.postMessage({ type:'status', status:'embedded', profile:AGGREGATE_PROFILE.name });
  activeProfile = AGGREGATE_PROFILE;
  runtimeMode = 'aggregate';
  resetAggregateState();
  ready = true;
  loading = false;
  self.postMessage({
    type:'ready',
    profile:AGGREGATE_PROFILE.name,
    aggregate:true,
    groups:AGGREGATE_PROFILE.groups.length,
    aggregateLinks:AGGREGATE_PROFILE.links.length,
    representedNeurons:AGGREGATE_PROFILE.representedNeurons,
    neurons:AGGREGATE_PROFILE.representedNeurons,
    edges:AGGREGATE_PROFILE.links.length,
    loomCount:126,
    visionCount:0,
    escapeTargetCount:4,
    graphBytes:0,
    upstreamCommit:UPSTREAM_COMMIT,
    attribution:AGGREGATE_PROFILE.attribution
  });
}
async function initDetailed() {
  loading=true;
  try{
    activeProfile=FULL_PROFILE;
    const loaded=await loadProfile(FULL_PROFILE);
    manifest=loaded.manifest;

    self.postMessage({
      type:'status',
      status:'graph-parse',
      profile:FULL_PROFILE.name,
      loaded:loaded.buffer.byteLength,
      total:loaded.buffer.byteLength
    });
    parseGraph(loaded.buffer);

    self.postMessage({
      type:'status',
      status:'metadata',
      profile:FULL_PROFILE.name,
      loaded:loaded.buffer.byteLength,
      total:loaded.buffer.byteLength
    });
    buildMetadata();

    runtimeMode='neuron';
    ready=true;
    loading=false;
    resetState();

    self.postMessage({
      type:'ready',
      profile:FULL_PROFILE.name,
      aggregate:false,
      neurons:n,
      edges:edgeCount,
      loomCount:groups.loom?.length||0,
      visionCount:(groups.visionL?.length||0)+(groups.visionR?.length||0),
      escapeTargetCount:escapeTargets.length,
      graphBytes:loaded.buffer.byteLength,
      upstreamCommit:UPSTREAM_COMMIT,
      attribution:manifest.attribution||''
    });
  }catch(err){
    loading=false;
    ready=false;
    self.postMessage({
      type:'error',
      profile:FULL_PROFILE.name,
      message:String(err?.message||err)
    });
  }
}

async function loadProfile(profile) {
  self.postMessage({ type: 'status', status: 'manifest', profile: profile.name });
  const manifestRes = await fetch(profile.manifest, { cache: 'force-cache' });
  if (!manifestRes.ok) throw new Error(`${profile.name} manifest failed (${manifestRes.status})`);
  const profileManifest = await manifestRes.json();
  const expected = Number(profileManifest.graphBytes) || expectedGraphBytes(profileManifest);
  self.postMessage({ type: 'status', status: 'graph-download', profile: profile.name, loaded: 0, total: expected });
  const buffer = await fetchArrayBufferWithProgress(profile.graph, expected, profile.name);
  return { manifest: profileManifest, buffer };
}

function expectedGraphBytes(m) {
  const neurons = Number(m?.neuronCount) || 0;
  const edges = Number(m?.edgeCount) || 0;
  return 20 + (neurons + 1) * 4 + edges * 12;
}

async function fetchArrayBufferWithProgress(url, expectedTotal = 0, profile = 'graph') {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Graph download failed (${response.status})`);
  const total = Number(response.headers.get('content-length')) || expectedTotal || 0;
  if (!response.body?.getReader) return response.arrayBuffer();

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let lastReport = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const now = performance.now();
    if (now - lastReport > 120) {
      lastReport = now;
      self.postMessage({ type: 'status', status: 'graph-download', profile, loaded, total });
    }
  }
  self.postMessage({ type: 'status', status: 'graph-download', profile, loaded, total });
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

function parseGraph(buffer) {
  const view = new DataView(buffer);
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 8));
  if (magic !== 'FLYGRAPH') throw new Error(`Unsupported graph magic: ${magic}`);
  const version = view.getUint32(8, true);
  n = view.getUint32(12, true);
  edgeCount = view.getUint32(16, true);
  if (version !== 1) throw new Error(`Unsupported graph version: ${version}`);
  const expected = 20 + (n + 1) * 4 + edgeCount * 12;
  if (buffer.byteLength !== expected) throw new Error(`Truncated graph: ${buffer.byteLength} != ${expected}`);

  const rowOffsetByte = 20;
  const preByte = rowOffsetByte + (n + 1) * 4;
  const weightByte = preByte + edgeCount * 4;
  const rows = new Uint32Array(buffer.slice(rowOffsetByte, preByte));
  const presyn = new Uint32Array(buffer.slice(preByte, weightByte));
  const weightBytes = buffer.slice(weightByte);
  const incomingWeights = new Float64Array(weightBytes);

  const counts = new Uint32Array(n);
  for (let e = 0; e < edgeCount; e++) counts[presyn[e]]++;
  sourceOffsets = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) sourceOffsets[i + 1] = sourceOffsets[i] + counts[i];
  const cursor = sourceOffsets.slice(0, n);
  targets = new Uint32Array(edgeCount);
  outWeights = new Float64Array(edgeCount);

  for (let target = 0; target < n; target++) {
    for (let e = rows[target]; e < rows[target + 1]; e++) {
      const source = presyn[e];
      const pos = cursor[source]++;
      targets[pos] = target;
      outWeights[pos] = incomingWeights[e];
    }
  }
}

function buildMetadata() {
  groups = Object.create(null);
  for (const group of manifest.groups || []) groups[group.id] = Uint32Array.from(group.indices || []);
  motor = {
    dnL: Uint32Array.from(manifest.motor?.dnL || []),
    dnR: Uint32Array.from(manifest.motor?.dnR || []),
    mnL: Uint32Array.from(manifest.motor?.mnL || []),
    mnR: Uint32Array.from(manifest.motor?.mnR || []),
  };
  injectionMask = new Uint8Array(n);
  for (const i of groups.loom || []) injectionMask[i] |= 1;
  for (const id of ['visionL', 'visionR']) for (const i of groups[id] || []) injectionMask[i] |= 2;

  // Derive an escape-specific descending-neuron readout directly from the
  // published graph: rank DNs by positive one-hop LC4 input weight.
  const dnSet = new Set([...motor.dnL, ...motor.dnR]);
  const scores = new Map();
  for (const source of groups.loom || []) {
    for (let e = sourceOffsets[source]; e < sourceOffsets[source + 1]; e++) {
      const target = targets[e], w = outWeights[e];
      if (w > 0 && dnSet.has(target)) scores.set(target, (scores.get(target) || 0) + w);
    }
  }
  escapeTargets = Uint32Array.from(
    [...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 32).map(([i])=>i)
  );
}

function resetState() {
  if(runtimeMode==='aggregate'){ resetAggregateState(); self.postMessage({type:'reset-done'}); return; }
  voltage = new Float32Array(n);
  refractory = new Uint8Array(n);
  spikes = new Uint8Array(n);
  spikeIndices = new Uint32Array(n);
  nextSpikeIndices = new Uint32Array(n);
  spikeCount = 0;
  synaptic = new Float32Array(n);
  self.postMessage({ type: 'reset-done' });
}

function resetAggregateState(){
  aggregateState={loom:0,turnL:0,turnR:0,flightL:0,flightR:0};
}

function aggregateCoefficient(edge){
  const [, , count, positive, negative]=edge;
  const meanNet=(positive-negative)/Math.max(1,count);
  return Math.tanh(meanNet/18);
}

function advanceAggregate(input){
  const names=AGGREGATE_PROFILE.groups;
  const looming=Math.pow(clamp(input.loom),.82);
  let st={...aggregateState};

  // Group-level dynamics are modeled. Coupling coefficients preserve the sign
  // and relative mean strength of real MaleCNS aggregate group connections.
  for(let tickIndex=0;tickIndex<5;tickIndex++){
    const drive={loom:0,turnL:0,turnR:0,flightL:0,flightR:0};
    for(const edge of AGGREGATE_PROFILE.links){
      const [source,target]=edge;
      drive[target]+=st[source]*aggregateCoefficient(edge);
    }
    const next={};
    for(const name of names){
      const external=name==='loom'?looming*.60:0;
      next[name]=clamp(st[name]*.52+drive[name]*.11+external);
    }
    st=next;
  }
  aggregateState=st;

  const dnLeft=clamp(st.turnL);
  const dnRight=clamp(st.turnR);
  const flightLeft=clamp(st.flightL);
  const flightRight=clamp(st.flightR);
  const flight=clamp((flightLeft+flightRight)*.5);
  const escapeDn=clamp((dnLeft+dnRight)*.5);
  const network=clamp((st.loom+dnLeft+dnRight+flightLeft+flightRight)/5);
  const rawEscape=st.loom*.45+escapeDn*.25+flight*.30;
  const escape=clamp((rawEscape-.08)/.50);

  return {
    lc4:clamp(st.loom),
    dnLeft,
    dnRight,
    escapeDn,
    flight,
    network,
    escape,
    spikeCount:Math.round(network*AGGREGATE_PROFILE.representedNeurons),
    motorTurn:clampSigned((flightRight-flightLeft)*1.4),
    aggregate:true
  };
}

function advanceSensory(input) {
  // Camera looming is a modeled sensory encoder. A mildly nonlinear gain gives
  // short real-world approach gestures enough duration to traverse the graph.
  const loomCurrent = Math.pow(input.loom, 0.78) * 1.18;
  const visualCurrent = clamp(input.motion * 0.28 + Math.max(0, input.light - 0.42) * 0.08, 0, 0.38);
  let cumulativeSpikes = 0;
  let last = null;
  for (let t = 0; t < PARAMS.ticksPerInput; t++) {
    tick(loomCurrent, visualCurrent);
    cumulativeSpikes += spikeCount;
    last = readout();
  }
  const network = clamp(Math.log1p(cumulativeSpikes) / Math.log(5000));
  const lc4 = last.lc4;
  const dn = clamp((last.dnL + last.dnR) * 0.5);
  const flight = clamp((last.flightL + last.flightR) * 0.5);
  const escapeDn = escapeTargets.length ? last.escapeDn : dn;
  // Calibrated behavioral readout: LC4 and its actual strong DN targets are the
  // primary escape evidence; generic flight activity is supporting evidence.
  // Connectivity is real; this gain/threshold mapping remains explicitly modeled.
  const rawEscape = lc4 * 0.44 + escapeDn * 0.36 + Math.max(dn, flight) * 0.20;
  const escape = clamp((rawEscape - 0.035) / 0.30);
  return {
    lc4,
    dnLeft: last.dnL,
    dnRight: last.dnR,
    escapeDn,
    flight,
    network,
    escape,
    spikeCount: cumulativeSpikes,
    motorTurn: clampSigned((last.flightR - last.flightL) * 1.4),
  };
}

function tick(loomCurrent, visualCurrent) {
  synaptic.fill(0);
  for (let sPos = 0; sPos < spikeCount; sPos++) {
    const source = spikeIndices[sPos];
    for (let e = sourceOffsets[source]; e < sourceOffsets[source + 1]; e++) {
      synaptic[targets[e]] += outWeights[e];
    }
  }

  let nextCount = 0;
  for (let i = 0; i < n; i++) {
    const canSpike = refractory[i] === 0;
    let external = PARAMS.baselineDrive;
    const mask = injectionMask[i];
    if (mask & 1) external += loomCurrent;
    if (mask & 2) external += visualCurrent;
    const dv = (-voltage[i] / PARAMS.tau + synaptic[i] * PARAMS.inputScale + external) * PARAMS.dt;
    if (canSpike) voltage[i] += dv;
    const didSpike = canSpike && voltage[i] > PARAMS.threshold;
    spikes[i] = didSpike ? 1 : 0;
    if (didSpike) {
      voltage[i] = PARAMS.reset;
      refractory[i] = PARAMS.refractory;
      nextSpikeIndices[nextCount++] = i;
    }
    if (refractory[i] > 0) refractory[i]--;
    if (voltage[i] > 2) voltage[i] = 2;
    else if (voltage[i] < -2) voltage[i] = -2;
  }

  const tmp = spikeIndices;
  spikeIndices = nextSpikeIndices;
  nextSpikeIndices = tmp;
  spikeCount = nextCount;
}

function readout() {
  return {
    lc4: groupActivity(groups.loom),
    dnL: groupActivity(motor.dnL),
    dnR: groupActivity(motor.dnR),
    flightL: groupActivity(groups.flightL),
    flightR: groupActivity(groups.flightR),
    escapeDn: groupActivity(escapeTargets),
  };
}

function groupActivity(indices) {
  if (!indices || indices.length === 0) return 0;
  let v = 0;
  let s = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    v += Math.max(0, voltage[i]);
    s += spikes[i];
  }
  const meanV = v / indices.length;
  const spikeFraction = s / indices.length;
  return clamp(meanV * 1.15 + spikeFraction * 10);
}

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function clampSigned(v) { return Math.max(-1, Math.min(1, v)); }
