# Fly Eye Escape Graph v1

A compact, deterministic MaleCNS-derived graph profile for real-time looming / escape experiments.

## Purpose

This profile is intended for:

- camera-driven looming experiments
- web games
- robotics / sensor-to-connectome demos
- education and visualization
- low-latency browser simulations

It is **not** a replacement for the full MaleCNS dataset. It is a selected pathway corridor derived from the larger prepared graph used by Fly Eye.

## Inputs and outputs

Input source:

- MaleCNS-derived 70,000-neuron prepared graph from `dzhng/fly-escape`
- pinned upstream commit: `bff49a376f0844c918eb7f2be83e95f2699b0d14`
- source graph format: `FLYGRAPH` v1

Generated files:

- `graph.bin` — compact signed sparse graph
- `manifest.json` — groups, motor readouts, provenance, source-index mapping and hashes

## Deterministic selection rule

1. Seed set = `loom` group (LC4-annotated input group).
2. Rank descending neurons by summed **positive direct LC4 input weight**.
3. Keep the top 32 direct DN targets.
4. Also retain available `flightL` / `flightR` targets.
5. Compute forward distance from LC4 seeds and reverse distance from escape targets.
6. Keep neurons that lie on a seed-to-target path of at most 3 hops.
7. Preserve all signed edges among selected neurons.
8. Reindex nodes densely and preserve the original source index in `sourceIndexByLocalIndex`.

The result preserves real selected wiring but remains a **task-specific extraction**. Camera encoding, neural dynamics and escape thresholds are modeled separately by consuming applications.

## Binary format

Same as upstream FLYGRAPH v1:

- 8 bytes: ASCII `FLYGRAPH`
- u32 version
- u32 neuron count
- u32 edge count
- u32 rowOffsets[neurons + 1]
- u32 presynapticIndices[edges]
- f64 signed weights[edges]

Rows are postsynaptic targets.

## Build

```bash
python scripts/build_escape_graph.py \
  --graph /path/to/graph.bin \
  --manifest /path/to/manifest.json \
  --out-dir data/escape-v1
```

## Developer usage

Applications should load `manifest.json` first, verify the graph hash / version, then load `graph.bin`.

Do not assume local neuron indices match the larger source graph. Use `sourceIndexByLocalIndex` when source-index identity matters.

## Attribution and scientific boundary

Underlying connectome data derives from Janelia FlyEM MaleCNS and retains its source attribution / license requirements.

This extraction preserves selected connectome edges. It does not imply that the selected pathway alone reproduces a living fly or that modeled browser dynamics are biologically exact.
