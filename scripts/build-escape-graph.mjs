import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const manifestPath = args[0] || 'source-manifest.json';
const graphPath = args[1] || 'source-graph.bin';
const outDir = args[2] || 'generated/escape';
const MAX_HOPS = Number(process.env.MAX_HOPS || 3);
const TOP_ESCAPE_DNS = Number(process.env.TOP_ESCAPE_DNS || 32);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const buf = fs.readFileSync(graphPath);

const MAGIC = buf.subarray(0, 8).toString('utf8');
if (MAGIC !== 'FLYGRAPH') throw new Error('Unsupported graph magic: ' + MAGIC);

const version = buf.readUInt32LE(8);
const n = buf.readUInt32LE(12);
const edgeCount = buf.readUInt32LE(16);
if (version !== 1) throw new Error('Unsupported graph version ' + version);

const rowByte = 20;
const preByte = rowByte + (n + 1) * 4;
const weightByte = preByte + edgeCount * 4;
const expected = weightByte + edgeCount * 8;
if (buf.length !== expected) {
  throw new Error('Graph bytes mismatch ' + buf.length + ' != ' + expected);
}

const rows = new Uint32Array(n + 1);
for (let i = 0; i <= n; i++) rows[i] = buf.readUInt32LE(rowByte + i * 4);

const presyn = new Uint32Array(edgeCount);
for (let e = 0; e < edgeCount; e++) presyn[e] = buf.readUInt32LE(preByte + e * 4);

const weights = new Float64Array(edgeCount);
for (let e = 0; e < edgeCount; e++) weights[e] = buf.readDoubleLE(weightByte + e * 8);

const groupMap = new Map((manifest.groups || []).map((g) => [g.id, g]));
const loom = Uint32Array.from(groupMap.get('loom')?.indices || []);
if (!loom.length) throw new Error('No loom/LC4 group in manifest');

const dnAll = [...(manifest.motor?.dnL || []), ...(manifest.motor?.dnR || [])];
const dnSet = new Set(dnAll);
const loomSet = new Set(loom);

const direct = [];
for (const target of dnSet) {
  let positiveWeight = 0;
  let negativeWeight = 0;
  let directEdgeCount = 0;
  for (let e = rows[target]; e < rows[target + 1]; e++) {
    if (!loomSet.has(presyn[e])) continue;
    const w = weights[e];
    directEdgeCount++;
    if (w > 0) positiveWeight += w;
    else negativeWeight += Math.abs(w);
  }
  if (positiveWeight > 0) {
    direct.push({ index: target, positiveWeight, negativeWeight, edgeCount: directEdgeCount });
  }
}
direct.sort((a, b) => b.positiveWeight - a.positiveWeight || a.index - b.index);
const escapeTargets = direct.slice(0, TOP_ESCAPE_DNS).map((x) => x.index);

const outputGroups = ['turnL', 'turnR', 'flightL', 'flightR'];
const targetSet = new Set(escapeTargets);
for (const id of outputGroups) {
  for (const i of groupMap.get(id)?.indices || []) targetSet.add(i);
}

const counts = new Uint32Array(n);
for (let e = 0; e < edgeCount; e++) counts[presyn[e]]++;

const outOffsets = new Uint32Array(n + 1);
for (let i = 0; i < n; i++) outOffsets[i + 1] = outOffsets[i] + counts[i];

const cursor = outOffsets.slice(0, n);
const outTargets = new Uint32Array(edgeCount);
for (let target = 0; target < n; target++) {
  for (let e = rows[target]; e < rows[target + 1]; e++) {
    outTargets[cursor[presyn[e]]++] = target;
  }
}

function bfsForward(starts, maxHops) {
  const dist = new Int16Array(n);
  dist.fill(-1);
  let frontier = [...starts];
  for (const s of frontier) dist[s] = 0;

  for (let d = 0; d < maxHops && frontier.length; d++) {
    const next = [];
    for (const source of frontier) {
      for (let e = outOffsets[source]; e < outOffsets[source + 1]; e++) {
        const t = outTargets[e];
        if (dist[t] === -1) {
          dist[t] = d + 1;
          next.push(t);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

function bfsBackward(starts, maxHops) {
  const dist = new Int16Array(n);
  dist.fill(-1);
  let frontier = [...starts];
  for (const s of frontier) dist[s] = 0;

  for (let d = 0; d < maxHops && frontier.length; d++) {
    const next = [];
    for (const target of frontier) {
      for (let e = rows[target]; e < rows[target + 1]; e++) {
        const s = presyn[e];
        if (dist[s] === -1) {
          dist[s] = d + 1;
          next.push(s);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

const fwd = bfsForward(loom, MAX_HOPS);
const back = bfsBackward(targetSet, MAX_HOPS);
const keep = new Uint8Array(n);

for (let i = 0; i < n; i++) {
  if (fwd[i] >= 0 && back[i] >= 0 && fwd[i] + back[i] <= MAX_HOPS) keep[i] = 1;
}
for (const i of loom) keep[i] = 1;
for (const i of targetSet) keep[i] = 1;

const oldIndices = [];
for (let i = 0; i < n; i++) if (keep[i]) oldIndices.push(i);

const remap = new Int32Array(n);
remap.fill(-1);
oldIndices.forEach((oldI, newI) => { remap[oldI] = newI; });

const newN = oldIndices.length;
const newRows = new Uint32Array(newN + 1);
const edgeSources = [];
const edgeWeights = [];

for (let nt = 0; nt < newN; nt++) {
  const oldTarget = oldIndices[nt];
  for (let e = rows[oldTarget]; e < rows[oldTarget + 1]; e++) {
    const ns = remap[presyn[e]];
    if (ns < 0) continue;
    edgeSources.push(ns);
    edgeWeights.push(weights[e]);
  }
  newRows[nt + 1] = edgeSources.length;
}

const newE = edgeSources.length;
fs.mkdirSync(outDir, { recursive: true });

const outBytes = 20 + (newN + 1) * 4 + newE * 4 + newE * 8;
const out = Buffer.allocUnsafe(outBytes);
out.write('FLYGRAPH', 0, 'utf8');
out.writeUInt32LE(1, 8);
out.writeUInt32LE(newN, 12);
out.writeUInt32LE(newE, 16);

let off = 20;
for (const v of newRows) {
  out.writeUInt32LE(v, off);
  off += 4;
}
for (const v of edgeSources) {
  out.writeUInt32LE(v, off);
  off += 4;
}
for (const v of edgeWeights) {
  out.writeDoubleLE(v, off);
  off += 8;
}
fs.writeFileSync(path.join(outDir, 'graph.bin'), out);

const remapList = (arr) => (arr || []).map((i) => remap[i]).filter((i) => i >= 0);
const bodyIds = oldIndices.map((i) => String(manifest.bodyIds?.[i] ?? i));

const directRemapped = direct.slice(0, TOP_ESCAPE_DNS).map((d) => ({
  ...d,
  sourceIndex: d.index,
  index: remap[d.index],
  bodyId: String(manifest.bodyIds?.[d.index] ?? d.index)
})).filter((d) => d.index >= 0);

const keptGroups = [];
for (const id of ['loom', 'turnL', 'turnR', 'flightL', 'flightR']) {
  const src = groupMap.get(id);
  if (!src) continue;
  const indices = remapList(src.indices);
  if (indices.length) {
    keptGroups.push({ id, label: src.label, indices, count: indices.length });
  }
}

const graphSha = crypto.createHash('sha256').update(out).digest('hex');

const outManifest = {
  schemaVersion: 1,
  profile: 'flyeye.escape.v1',
  dataset: manifest.dataset,
  attribution: manifest.attribution,
  license: 'CC BY 4.0 per upstream MaleCNS source terms',
  neuronCount: newN,
  edgeCount: newE,
  graphBytes: outBytes,
  graphHash: graphSha,
  bodyIds,
  originalIndices: oldIndices,
  groups: keptGroups,
  motor: {
    dnL: remapList(manifest.motor?.dnL),
    dnR: remapList(manifest.motor?.dnR),
    mnL: [],
    mnR: []
  },
  escapeTargets: directRemapped,
  binary: manifest.binary,
  source: {
    repository: 'dzhng/fly-escape',
    commit: 'bff49a376f0844c918eb7f2be83e95f2699b0d14',
    graphHash: manifest.graphHash,
    neuronCount: manifest.neuronCount,
    edgeCount: manifest.edgeCount
  },
  extraction: {
    algorithm: 'nodes on directed paths from LC4/loom seeds to escape/turn/flight outputs',
    maxHops: MAX_HOPS,
    topDirectEscapeDNs: TOP_ESCAPE_DNS,
    seedGroup: 'loom',
    outputGroups,
    preservesSignedWeights: true,
    preservesAllInternalEdgesAmongSelectedNodes: true
  },
  pathwayProvenance: 'LC4/loom seeds and motor groups come from the pinned upstream MaleCNS-derived manifest. Direct escape DNs are ranked by positive one-hop LC4 input in the real signed graph.'
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(outManifest, null, 2) + '\n');

const report = {
  source: { neurons: n, edges: edgeCount, bytes: buf.length },
  compact: { neurons: newN, edges: newE, bytes: outBytes },
  compression: {
    neuronFraction: newN / n,
    edgeFraction: newE / edgeCount,
    byteFraction: outBytes / buf.length,
    byteReductionPercent: (1 - outBytes / buf.length) * 100
  },
  directEscapeTargets: directRemapped
};

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');

const readmeLines = [
  '# FlyEye Escape Graph',
  '',
  'A compact, reproducible MaleCNS-derived graph profile for camera-driven looming / escape experiments.',
  '',
  '- Profile: flyeye.escape.v1',
  '- Source graph: ' + n.toLocaleString() + ' neurons / ' + edgeCount.toLocaleString() + ' edges / ' + (buf.length / 1e6).toFixed(2) + ' MB',
  '- Compact graph: ' + newN.toLocaleString() + ' neurons / ' + newE.toLocaleString() + ' edges / ' + (outBytes / 1e6).toFixed(3) + ' MB',
  '- Reduction: ' + (100 * (1 - outBytes / buf.length)).toFixed(1) + '%',
  '- LC4/loom seeds: ' + loom.length,
  '- Direct escape DN targets retained: ' + directRemapped.length,
  '- Max path length: ' + MAX_HOPS + ' hops',
  '',
  'The graph keeps real signed edge weights from the pinned upstream graph. Selection is task-specific: it is intended for looming / escape experiments, not as a general MaleCNS replacement.',
  '',
  'Files:',
  '- graph.bin — FLYGRAPH v1 binary',
  '- manifest.json — remapped groups, motor indices, body IDs, provenance',
  '- report.json — extraction statistics',
  '',
  'Data attribution follows the upstream Janelia FlyEM MaleCNS terms.',
  ''
];

fs.writeFileSync(path.join(outDir, 'README.md'), readmeLines.join('\n'));
console.log(JSON.stringify(report, null, 2));
