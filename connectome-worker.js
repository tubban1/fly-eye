const UPSTREAM_COMMIT = 'bff49a376f0844c918eb7f2be83e95f2699b0d14';
const BASE = `https://raw.githubusercontent.com/dzhng/fly-escape/${UPSTREAM_COMMIT}/data/processed/brain`;
const MANIFEST_URL = `${BASE}/manifest.json`;
const GRAPH_URL = `${BASE}/graph.bin`;

const PARAMS = Object.freeze({
  tau: 20,
  threshold: 1,
  reset: 0,
  dt: 1,
  refractory: 2,
  inputScale: 0.0002,
  baselineDrive: 0.05,
  ticksPerInput: 5,
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

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type === 'init') {
    if (!ready && !loading) await init();
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
    const out = advanceSensory({ motion, light, loom });
    self.postMessage({ type: 'state', ...out });
  }
};

async function init() {
  loading = true;
  self.postMessage({ type: 'status', status: 'loading' });
  try {
    const [manifestRes, graphRes] = await Promise.all([fetch(MANIFEST_URL), fetch(GRAPH_URL)]);
    if (!manifestRes.ok) throw new Error(`Manifest download failed (${manifestRes.status})`);
    if (!graphRes.ok) throw new Error(`Graph download failed (${graphRes.status})`);
    manifest = await manifestRes.json();
    const buffer = await graphRes.arrayBuffer();
    parseGraph(buffer);
    buildMetadata();
    resetState();
    ready = true;
    loading = false;
    self.postMessage({
      type: 'ready',
      neurons: n,
      edges: edgeCount,
      loomCount: groups.loom?.length || 0,
      visionCount: (groups.visionL?.length || 0) + (groups.visionR?.length || 0),
      upstreamCommit: UPSTREAM_COMMIT,
      attribution: manifest.attribution || 'Janelia FlyEM MaleCNS',
    });
  } catch (error) {
    loading = false;
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
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
}

function resetState() {
  voltage = new Float32Array(n);
  refractory = new Uint8Array(n);
  spikes = new Uint8Array(n);
  spikeIndices = new Uint32Array(n);
  nextSpikeIndices = new Uint32Array(n);
  spikeCount = 0;
  synaptic = new Float32Array(n);
  self.postMessage({ type: 'reset-done' });
}

function advanceSensory(input) {
  const loomCurrent = input.loom * 0.78;
  const visualCurrent = clamp(input.motion * 0.24 + Math.max(0, input.light - 0.42) * 0.08, 0, 0.34);
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
  const escape = clamp(flight * 0.62 + dn * 0.28 + lc4 * 0.10);
  return {
    lc4,
    dnLeft: last.dnL,
    dnRight: last.dnR,
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
