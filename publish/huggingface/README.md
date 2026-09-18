---
pretty_name: FlyEye Escape Neuron v1
license: cc-by-4.0
tags:
- drosophila
- fruit-fly
- connectome
- neuroscience
- male-cns
- lc4
- looming
- escape-circuit
- neuroinformatics
---

# FlyEye Escape Neuron v1

A compact, reproducible neuron-level Drosophila escape-circuit graph derived
from the pinned MaleCNS source used by FlyEye.

## Dataset summary

| Graph | Neurons | Edges | Bytes |
|---|---:|---:|---:|
| pinned source subset used by builder | 70,000 | 798,715 | 9,864,604 |
| FlyEye escape-neuron-v1 | 3,376 | 78,797 | 959,092 |

The compact graph contains:

- 126 LC4 / looming seed neurons;
- 26 selected direct escape descending-neuron targets;
- directed LC4-to-output pathways within a maximum 3-hop corridor;
- all signed internal edges between retained neurons;
- original source indices;
- MaleCNS body IDs;
- source and derived graph hashes;
- deterministic extraction metadata.

## Files

- `graph.bin` — FLYGRAPH v1 binary
- `manifest.json` — IDs, groups, provenance and scientific boundary
- `report.json` — extraction/compression report
- `escape-fast-v1.json` — lightweight aggregate profile
- `CITATION.cff`
- `DATA_LICENSE.md`

## FLYGRAPH v1 binary format

```text
8 bytes   magic "FLYGRAPH"
u32 LE    version
u32 LE    neuronCount
u32 LE    edgeCount
u32[n+1]  rowOffsets
u32[e]    presynapticIndices
f64[e]    signed weights
```

Rows are postsynaptic neurons.

## Scientific boundary

The retained neuron-level edges are real signed edges selected from the pinned
MaleCNS-derived graph. The pathway selection itself is task-specific.

This dataset does not claim that FlyEye's camera encoding, thresholds, aggregate
runtime dynamics, or behavioral readouts are measured biological physiology.
Those components are modeled unless separately validated.

## Licensing and attribution

MaleCNS-derived graph assets retain the upstream CC BY 4.0 attribution recorded
in the manifest.

Source attribution:

**Janelia FlyEM MaleCNS** — https://male-cns.janelia.org/download/

FlyEye software and extraction tooling are licensed separately under MIT.

## Reproducibility

The source repository pins the upstream graph source and contains the graph
builder, CI workflow, graph integrity tests, JavaScript/TypeScript loaders and
a Python SDK.

Source:

https://github.com/tubban1/fly-eye
