## v0.5.0-alpha.5 — Fly Vision 2.0

- five inspectable perception layers: Human / Stabilized / Motion Evidence / Loom Evidence / LC4 Input
- layers come from the same perception engine used by gameplay
- camera-translation compensation is visible instead of hidden
- looming and LC4 layers are explicitly labeled modeled evidence, not biological imaging
- mobile layer controls stay compact and camera-first

## v0.5.0-alpha.4 — Shareable results

- client-side 1080×1350 result card
- includes mode, score, closest approach, max threat, round time, and rank
- includes scientific boundary disclosure
- raw camera frames are deliberately excluded from the result card
- native file sharing is used when supported, with text/link fallback

## v0.5.0-alpha.2 — Replay 2.0

- replay records fingertip / optical-target position, source, distance, approach, and perception confidence
- perception overlay draws fingertip marker, fly-centered looming zone, and fingertip-to-fly relation
- independent PERCEPTION and BRAIN layer toggles
- replay speed controls: 0.25× / 0.5× / 1×
- generated model timeline for fingertip entry, approach, validated looming, LC4, descending-neuron response, flight output, and modeled escape trigger
- timeline is explicitly labeled as model-relative timing, not biological millisecond precision

## v0.5.0-alpha.1 — Reliability foundation

The first v0.5 milestone is now implemented:

- guided camera self-check: Camera / Fingertip / Optical tracking / Fly brain
- one practice fingertip approach before the real challenge
- practice input is discarded before gameplay so calibration cannot trigger an escape
- unified perception confidence model:
  - camera stability
  - semantic hand confidence
  - fingertip confidence
  - optical looming confidence
  - approach confidence
  - final looming confidence
- optical mode remains a first-class fallback; MediaPipe is not a blocking dependency
- camera shake pauses threat processing and requires stable re-arming
- automated perception regression tests cover static readiness, shake lockout/recovery, optical-only fingertip approach, and clean post-calibration re-arm
- calibration can be skipped and never becomes a permanent blocker

## v0.4.7 — Mobile + replay UX

- replay now redraws the fly at its recorded position/state
- replay camera frames mirror correctly for front-camera sessions
- visible UI copy is bilingual EN / 中文, including perception, brain, replay, and science labels
- mobile challenge HUD is compact and hides graph-loading details after READY
- mobile Brain panel is collapsed by default to LC4 + Flight and expands on demand
- full Brain view remains available as a bottom sheet
- v0.5 productization roadmap: `docs/V0.5_PLAN.md`

# FLY EYE

**Let a fly brain see your world.**

Fly Eye is a camera-first browser experiment. Your real environment becomes sensory input for a virtual fruit fly: local motion, brightness and looming signals are converted into neural input, then the fly reacts inside the camera view.

## v0.4.4 — Zero-download fast graph

Camera mode no longer waits for the 70K neuron graph.

- embedded `escape-fast-v1` starts immediately in the Web Worker
- 5 pathway groups: LC4/loom, turnL, turnR, flightL, flightR
- 21 MaleCNS-derived aggregate links using the upstream group-level edge counts and signed weights
- group-level neural dynamics are modeled; this is **not** neuron-level propagation
- MediaPipe Hand Landmarker is now optional for startup: camera calibration + conservative optical looming can run while hand tracking warms in the background
- the detailed 70K graph is no longer a blocking dependency for the camera challenge
- reusable developer asset: `/data/escape-fast-v1.json`
- optional neuron-level compact graph tooling remains under `scripts/build-escape-graph.mjs`

## v0.4.2 — Reusable fast escape graph

- visible graph progress in the mobile challenge card
- deterministic `escape-v1` graph builder for LC4 → escape pathways
- reusable FLYGRAPH v1 binary + manifest format for external developers
- preserves source graph index and MaleCNS body ID mapping
- runtime prefers `escape-v1` and falls back to the 70k graph only when necessary
- CI builds and publishes `data/escape-v1/graph.bin` and `manifest.json`

## v0.4.1 — Faster cold start and local cache

- MediaPipe version pinned instead of `@latest`
- MediaPipe module/WASM/model and connectome graph exposed through same-origin Fly Eye paths
- heavy runtime assets cached in browser Cache Storage after first successful load
- MediaPipe hand tracker prewarmed in the background before camera interaction
- connectome loader now reports download progress and parsing phases
- current selected graph: 70,000 neurons, 798,715 edges, 9,864,604-byte graph binary

## v0.4 — Perception Layer

The camera no longer sends raw motion directly into the fly brain. Real-world input is filtered first:

- ~1.5 s camera calibration before the fly can react
- global camera-motion compensation for handheld phones
- MediaPipe Hand Landmarker as a semantic gate (with GPU→CPU fallback)
- hand scale growth + hand-to-fly approach + local compensated optical motion
- a cautious optical-only path for partial fingertips / non-hand looming objects
- temporal state machine: CALIBRATING → READY → HAND DETECTED → APPROACHING → ALERT
- connectome must be ready before neural input is armed; the main game no longer silently falls back
- pseudo-AR background anchoring from estimated camera translation
- separate PERCEPTION and FLY BRAIN readouts

MediaPipe is used only to isolate likely player-hand pixels/landmarks. It does **not** decide whether the fly escapes. Validated visual signals are converted into modeled looming input, injected into LC4, and then propagated through the real selected signed MaleCNS-derived graph.

## v0.3 — Neural Replay

- Camera-first mobile experience
- Local motion / looming / brightness sensory encoder
- Real signed MaleCNS-derived connectome subgraph in a Web Worker
- LC4 injection with downstream DN / flight readouts
- Rolling ~2.2 s local replay buffer
- Automatic slow-motion **What just happened?** replay after escape
- Scrubbable neural timeline: Looming → LC4 → DN Left/Right → Flight DN → Escape
- Replay frames and neural samples remain in browser memory only
- `?debug=1` synthetic looming mode for camera-free graph/replay verification
- EN / 中文 UI


## Connectome runtime

Fly Eye camera mode now uses an embedded aggregate escape graph derived from the pinned MaleCNS manifest. The detailed browser graph remains an optional development asset, pinned to upstream commit:

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

Raw camera frames are not uploaded by Fly Eye. Frame analysis, camera-motion compensation, and MediaPipe hand landmark inference occur in the browser. The connectome graph itself is downloaded as a static public data asset.

## Data attribution

Connectome data derives from **Janelia FlyEM MaleCNS v1.0**. The upstream manifest attributes Janelia FlyEM / MaleCNS and records the prepared graph provenance. MaleCNS data is published under CC BY 4.0; see the upstream source terms for details.

The `dzhng/fly-escape` codebase is used as a technical/data reference; Fly Eye maintains its own browser runtime implementation.

## Run locally

```bash
npm install
npm run dev
```

Camera access requires HTTPS in production or `localhost` during local development.
