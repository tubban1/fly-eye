# FlyEye Graphs

FlyEye Graphs is the reusable connectome-profile layer extracted from the Fly Eye project.

## Quick start

Browser ESM:

```html
<script type="module">
  import {
    loadFlyEyeProfile,
    EscapeRuntime
  } from "/sdk/flyeye-graphs.js";

  const profile = await loadFlyEyeProfile("/data/escape-fast-v1.json");
  const runtime = new EscapeRuntime(profile);

  const state = runtime.step({ looming: 0.7 });
  console.log(state.lc4, state.flight, state.escape);
</script>
```

## Current profile

`flyeye.escape-fast.v1`

The current fast profile contains five pathway groups:

- `loom` — LC4 / approaching-object group
- `turnL`
- `turnR`
- `flightL`
- `flightR`

and the signed aggregate connectivity between them.

## Files

- `/data/escape-fast-v1.json` — data profile
- `/schema/escape-fast-v1.schema.json` — JSON Schema
- `/sdk/flyeye-graphs.js` — zero-dependency browser runtime
- `/sdk/flyeye-graphs.d.ts` — TypeScript definitions

## Scientific boundary

The profile preserves MaleCNS-derived aggregate connection counts and positive/negative weights between annotated groups.

It does **not** claim to be:

- a full MaleCNS simulation
- a neuron-level graph
- a biological recording
- measured camera-to-LC4 physiology

The `EscapeRuntime` dynamics are modeled product dynamics. They use the real aggregate graph as connectivity structure but apply declared group-level update rules.

## Provenance

The profile records:

- source repository
- pinned upstream commit
- source graph hash
- dataset attribution
- scientific-boundary statement

Consumers should preserve attribution when redistributing derived profiles.

## Runtime API

### `loadFlyEyeProfile(url?)`

Loads and validates a supported profile.

### `new EscapeRuntime(profile, options?)`

Optional modeled runtime parameters:

```ts
{
  ticksPerStep?: number; // default 5
  decay?: number;        // default .52
  coupling?: number;     // default .11
  loomDrive?: number;    // default .60
}
```

### `runtime.step({ looming })`

Returns:

```ts
{
  loom,
  dnLeft,
  dnRight,
  flightLeft,
  flightRight,
  flight,
  escapeDn,
  network,
  escape,
  state
}
```

All readouts are normalized product-model values in `[0,1]`.

## Versioning

Profile IDs are immutable semantic assets.

Breaking graph/schema changes get a new profile ID, for example:

```text
flyeye.escape-fast.v1
flyeye.escape-fast.v2
```

Do not silently change the meaning of an existing profile.
