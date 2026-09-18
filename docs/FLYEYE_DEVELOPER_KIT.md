# FlyEye Developer Kit

## Current package status

| Package | Version | Purpose | Data/model boundary |
|---|---:|---|---|
| `@flyeye/escape-neuron-v1` | 0.1.0 | 3,376-neuron / 78,797-edge compact escape corridor | real signed neuron-level graph, task-specific selection |
| `@flyeye/graph-core` | 0.1.0 | parser / validator / loaders | data only, no neural dynamics |
| `@flyeye/runtime` | 0.1.0 | group-level escape dynamics | modeled dynamics |
| `flyeye-graphs` Python | 0.1.0 | notebooks / NetworkX / research access | loader/analysis only |
| `@flyeye/connectome-tools` | 0.1.0 | inspect / cut task-specific graph profiles | deterministic tooling |
| `@flyeye/benchmarks` | 0.1.0 | compatibility and integrity vectors | software benchmarks, not biological truth |

The neuron package is self-contained: its npm package directory includes the generated `manifest.json`, `graph.bin`, `report.json`, and README.


The developer surface is split into six deliberately separate packages so that **real connectome data**, **modeled dynamics**, **tooling**, and **benchmarks** do not get mixed together.

## 1. @flyeye/escape-neuron-v1

A compact neuron-level MaleCNS-derived escape corridor.

Generated asset:

```text
/data/escape-neuron-v1/
  graph.bin
  manifest.json
  report.json
  README.md
```

It preserves real signed internal edges, original source indices, MaleCNS body IDs, group annotations, source commit/hash, and extraction parameters.

## 2. @flyeye/graph-core

Generic data layer:

- FLYGRAPH v1 parser
- neuron-manifest validator
- aggregate-profile validator
- graph loader
- body-ID/original-index helpers
- incoming and outgoing adjacency access

It contains no behavior model.

## 3. @flyeye/runtime

Declared modeled group dynamics.

Current runtime:

```js
const runtime = new EscapeRuntime(profile);
const state = runtime.step({ looming: 0.7 });
console.log(state.lc4, state.flight, state.escape);
```

The runtime is intentionally separate from graph data so applications can replace it with LIF, event simulation, Brian2, PyTorch, or another model.

## 4. flyeye-graphs (Python)

Standard-library Python loader for:

- JSON profiles
- FLYGRAPH binaries
- incoming/outgoing edges
- optional NetworkX conversion

This is the main entry point for research / notebooks / graph analysis.

## 5. @flyeye/connectome-tools

Generic CLI:

```bash
flyeye-connectome inspect --manifest M --graph G

flyeye-connectome cut \
  --manifest M \
  --graph G \
  --seed-groups loom \
  --target-groups turnL,turnR,flightL,flightR \
  --max-hops 3 \
  --out-dir ./profile
```

This lets developers create new task-specific profiles without copying Fly Eye application code.

## 6. @flyeye/benchmarks

Compatibility vectors and graph-integrity checks.

Benchmarks protect software contracts, not biological ground truth:

- idle remains calm
- strong looming recruits the declared modeled pathway
- reset clears modeled state
- manifest/binary counts match
- graph indices stay in range

## Data vs model boundary

```text
MaleCNS-derived data
        │
        ▼
@flyeye/graph-core
        │
        ├──────────────► Python / NetworkX / custom simulator
        │
        ▼
@flyeye/runtime
        │
        ▼
product behavior
```

A real graph does not make a downstream dynamics model biologically validated. Each package documents its boundary explicitly.

## Versioning

Graph profile IDs are immutable:

```text
flyeye.escape-fast.v1
flyeye.escape-neuron.v1
```

Breaking graph-selection or schema changes require a new profile ID.
