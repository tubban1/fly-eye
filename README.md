# FlyEye

**Let a fly brain see your world — and let developers run real connectome-derived circuits.**

FlyEye is a browser experiment and developer kit built around a real, signed **Drosophila MaleCNS-derived connectome subgraph**. It turns camera-derived looming signals into modeled neural input, propagates activity through a compact escape circuit, and exposes the same graph/runtime stack as reusable JavaScript and Python packages.

> **Scientific boundary:** the wiring is connectome-derived; the camera encoder and neural dynamics are models. FlyEye does not claim to reproduce a living fly or biologically exact retinal processing.

## Try it

- **Live demo:** https://fly-eye-vc2t.vercel.app
- **GitHub:** https://github.com/tubban1/fly-eye
- **Latest release:** https://github.com/tubban1/fly-eye/releases/tag/v0.5.0-alpha.9

## FlyEye Developer Kit

The first public developer-kit packages are now available across npm, PyPI and Hugging Face.

| Channel | Package / dataset | Version | Link |
| --- | --- | ---: | --- |
| npm | `@fly-eye/graph-core` | 0.1.0 | https://www.npmjs.com/package/@fly-eye/graph-core |
| npm | `@fly-eye/runtime` | 0.1.0 | https://www.npmjs.com/package/@fly-eye/runtime |
| npm | `@fly-eye/escape-neuron-v1` | 0.1.0 | https://www.npmjs.com/package/@fly-eye/escape-neuron-v1 |
| npm | `@fly-eye/connectome-tools` | 0.1.0 | https://www.npmjs.com/package/@fly-eye/connectome-tools |
| npm | `@fly-eye/benchmarks` | 0.1.0 | https://www.npmjs.com/package/@fly-eye/benchmarks |
| PyPI | `flyeye-graphs` | 0.1.0 | https://pypi.org/project/flyeye-graphs/0.1.0/ |
| Hugging Face | `Tubban/flyeye-escape-neuron-v1` | dataset | https://huggingface.co/datasets/Tubban/flyeye-escape-neuron-v1 |
| GitHub Releases | FlyEye publication release | v0.5.0-alpha.9 | https://github.com/tubban1/fly-eye/releases/tag/v0.5.0-alpha.9 |
| Zenodo | GitHub integration | pending DOI | DOI link will be added after archival |

The compact neuron-level dataset contains **3,376 neurons / 78,797 signed edges** in a **959,092-byte FLYGRAPH** asset.

## Install

### JavaScript / TypeScript

```bash
npm install @fly-eye/graph-core @fly-eye/escape-neuron-v1
```

Additional packages:

```bash
npm install @fly-eye/runtime
npm install @fly-eye/connectome-tools
npm install @fly-eye/benchmarks
```

### Python

```bash
pip install flyeye-graphs
```

## What each package does

- **`@fly-eye/escape-neuron-v1`** — self-contained 3,376-neuron / 78,797-edge MaleCNS-derived escape corridor.
- **`@fly-eye/graph-core`** — FLYGRAPH parser, validators, loaders and adjacency helpers.
- **`@fly-eye/runtime`** — declared modeled aggregate escape dynamics.
- **`flyeye-graphs`** — Python loader with optional NetworkX conversion.
- **`@fly-eye/connectome-tools`** — inspect/cut CLI for task-specific connectome extraction.
- **`@fly-eye/benchmarks`** — cross-runtime vectors and graph-integrity checks.

Developer documentation: [docs/FLYEYE_DEVELOPER_KIT.md](docs/FLYEYE_DEVELOPER_KIT.md)

## From connectome to executable behavior

```text
Janelia FlyEM MaleCNS
        ↓
signed connectome-derived graph
        ↓
FlyEye compact escape circuit
3,376 neurons / 78,797 edges
        ↓
graph-core + escape-neuron-v1
        ↓
runtime / Python SDK / tooling
        ↓
browser experiments, analysis and prototypes
```

The goal of FlyEye is not merely to distribute connectome files. It provides a small developer layer for turning a measured neural wiring graph into something inspectable and runnable.

## Browser experiment

FlyEye is also a camera-first experiment. Your environment becomes sensory input for a virtual fruit fly.

The current perception pipeline includes:

- camera calibration before neural input is armed
- global camera-motion compensation
- semantic hand/fingertip tracking when available
- optical looming fallback
- modeled LC4 input
- signed graph propagation through the selected escape circuit
- descending-neuron / flight readouts
- local neural replay
- bilingual EN / 中文 UI

Raw camera frames are processed locally in the browser and are not uploaded by FlyEye.

## Data and provenance

Connectome data derives from **Janelia FlyEM MaleCNS v1.0** and is attributed in the published manifests. MaleCNS source data is published under **CC BY 4.0**; FlyEye code is released under the repository's **MIT License**.

The compact public developer dataset contains:

- graph binary
- manifest
- report
- aggregate fast profile
- citation metadata
- license metadata

Dataset: https://huggingface.co/datasets/Tubban/flyeye-escape-neuron-v1

## Release assets

Current publication release:

**FlyEye v0.5.0-alpha.9 — Publication & Citation Release**

https://github.com/tubban1/fly-eye/releases/tag/v0.5.0-alpha.9

The release includes versioned graph assets, manifests, reports, checksums and the developer-kit archive.

## Local development

```bash
git clone https://github.com/tubban1/fly-eye.git
cd fly-eye
npm install
npm run dev
```

Camera access requires HTTPS in production or `localhost` during local development.

## Current architecture

FlyEye keeps the lightweight gameplay path and the detailed developer graph separate:

- **fast browser path** — embedded aggregate escape profile for immediate interaction
- **detailed graph path** — optional neuron-level compact graph for inspection and development
- **published SDK layer** — npm + PyPI packages for reuse outside the demo

This separation keeps the public experience fast while preserving a reproducible developer path to the underlying connectome-derived data.

## Selected milestones

### v0.5.0-alpha.9 — Publication & citation release

- GitHub publication release
- npm developer packages
- PyPI Python SDK
- Hugging Face dataset
- Zenodo integration enabled

### v0.5.0-alpha.8 — Developer Kit

- reusable graph/runtime/tooling packages
- compact neuron-level escape dataset
- cross-runtime benchmarks
- publication metadata and provenance

### v0.5.0-alpha.7 — Optional neuron-level advanced mode

- detailed graph loads only on explicit request
- gameplay remains on the zero-download fast profile
- graph progress and metadata shown independently
- advanced graph failures do not block gameplay

### v0.5.0-alpha.6 — FlyEye Graphs SDK

- reusable `flyeye.escape-fast.v1` developer profile
- browser SDK
- schema and TypeScript definitions
- provenance documentation
- automated SDK regression tests

### v0.5.0-alpha.5 — Fly Vision 2.0

- Human / Stabilized / Motion Evidence / Loom Evidence / LC4 Input views
- camera-translation compensation
- inspectable modeled perception layers

### v0.5.0-alpha.4 — Shareable results

- client-side result card
- mode, score, closest approach, threat and round metrics
- scientific-boundary disclosure
- native sharing when available

### v0.5.0-alpha.2 — Replay 2.0

- fingertip/optical target replay
- perception + brain layer toggles
- model-relative neural event timeline
- 0.25× / 0.5× / 1× replay speeds

### v0.4 — Perception layer

- calibration
- camera-motion compensation
- hand landmark gating
- optical looming fallback
- perception state machine
- separate perception and neural readouts

## Citation

A permanent Zenodo DOI will be added here as soon as the enabled GitHub integration completes archival.

Until then, cite the tagged GitHub release and the Hugging Face dataset above.

---

**FlyEye: a developer kit for turning real Drosophila connectome data into runnable neural circuits.**
