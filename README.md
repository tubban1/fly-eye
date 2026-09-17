# FLY EYE

**Let a fly brain see your world.**

Camera-first browser experiment for turning a phone or webcam into visual sensory input for a virtual fruit fly.

## v0.1

- Mobile-first camera experience
- Rear camera preferred on phones, webcam fallback on desktop
- Raw frames stay local in the browser
- Motion, brightness and looming extraction
- AR-style fly overlay with idle / alert / escape states
- Live sensory + neural activity panel
- Simplified compound-eye view
- `Sneak Up on the Fly` challenge
- English / Chinese UI
- Replaceable `connectomeAdapter()` seam for a future MaleCNS sparse-graph runtime

## Scientific boundary

v0.1 **does not claim to run the full MaleCNS connectome**. The camera pipeline is real, while the controller is currently an explicit modeled adapter. The next technical milestone is local sparse-graph execution in WASM or WebGPU.

## Privacy

Raw camera frames are not uploaded by this version.

## Run

```bash
npm install
npm run dev
```

Production camera access requires HTTPS. `localhost` works for local development.
