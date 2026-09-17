# FLY EYE

**Let a fly brain see your world.**

Fly Eye is a camera-first browser experiment. Your real environment becomes sensory input for a virtual fruit fly: local motion, brightness and looming signals are converted into neural input, then the fly reacts inside the camera view.

## v0.2

- Mobile-first rear-camera mode and desktop webcam support
- Camera frames stay local in the browser
- Fly-centered motion / looming analysis rather than whole-frame motion triggers
- Simplified compound-eye viewer
- `Sneak up on the fly` challenge
- EN / 中文 interface
- Real MaleCNS-derived signed connectome subgraph loaded in a Web Worker
- Camera looming injected into the real LC4 group
- Local spike propagation through the graph
- Live readouts for LC4, descending-neuron populations, flight descending neurons and network activity
- Transparent fallback controller if the graph cannot be downloaded

## Connectome runtime

Fly Eye currently consumes the prepared browser graph from `dzhng/fly-escape`, pinned to upstream commit:

`bff49a376f0844c918eb7f2be83e95f2699b0d14`

Runtime assets:

- `data/processed/brain/graph.bin`
- `data/processed/brain/manifest.json`

The binary contains a MaleCNS-derived signed sparse graph. Fly Eye loads it locally, converts the incoming CSR representation to source-oriented adjacency inside a Web Worker, and runs a lightweight LIF loop based on the upstream simulator's core parameters.

## Scientific boundary

The **wiring is real connectome-derived data**. The camera-to-neuron encoder and neural dynamics are models.

Fly Eye does **not** claim that camera pixels are biologically exact retinal signals, that its browser dynamics reproduce a living fly, or that the selected graph is the complete 166,700-neuron MaleCNS. The current graph is a selected motor/behavior subgraph prepared by the upstream project.

The `loom` group is source-annotated LC4. Looming from the camera is a modeled input into that group; downstream propagation then follows the real selected signed edges.

## Privacy

Raw camera frames are not uploaded by Fly Eye. Frame analysis occurs in the browser. The connectome graph itself is downloaded as a static public data asset.

## Data attribution

Connectome data derives from **Janelia FlyEM MaleCNS v1.0**. The upstream manifest attributes Janelia FlyEM / MaleCNS and records the prepared graph provenance. MaleCNS data is published under CC BY 4.0; see the upstream source terms for details.

The `dzhng/fly-escape` codebase is used as a technical/data reference; Fly Eye maintains its own browser runtime implementation.

## Run locally

```bash
npm install
npm run dev
```

Camera access requires HTTPS in production or `localhost` during local development.
