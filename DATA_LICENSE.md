# Data licensing and attribution

FlyEye software is licensed under the MIT License.

MaleCNS-derived graph assets are **not relicensed as MIT**. They retain the
upstream dataset terms documented in each profile manifest.

## Current MaleCNS-derived profiles

- `flyeye.escape-fast.v1`
- `flyeye.escape-neuron.v1`

These profiles derive connectivity from Janelia FlyEM MaleCNS v1.0 and are
distributed under the upstream CC BY 4.0 terms recorded in their manifests.

Attribution recorded by the generated neuron profile:

> Janelia FlyEM MaleCNS — https://male-cns.janelia.org/download/

The FlyEye extraction code, parsers, runtimes, tooling, tests, and documentation
are MIT-licensed unless a file states otherwise.

## Scientific boundary

The neuron-level graph preserves signed edges selected from the pinned
MaleCNS-derived source graph. Task-specific pathway selection, camera sensory
encoding, aggregate group dynamics, thresholds, readouts, and visual
explanations are models unless separately validated.

Redistributors should preserve:

- the profile manifest;
- source repository and pinned source commit;
- source/derived graph hashes;
- dataset attribution;
- scientific-boundary statement.
