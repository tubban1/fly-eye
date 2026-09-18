# @flyeye/graph-core

Low-level data package for FlyEye connectome profiles.

It contains no behavior model. Its responsibilities are:

- parse `FLYGRAPH v1`
- validate neuron-level manifests
- validate aggregate profiles
- load graph + manifest pairs
- expose group/body-ID/original-index helpers
- convert incoming CSR storage to outgoing adjacency

This package is the clean boundary between connectome data and modeled dynamics.
