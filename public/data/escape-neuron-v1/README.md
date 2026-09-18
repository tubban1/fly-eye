# FlyEye Escape Neuron Graph

A compact, reproducible neuron-level MaleCNS-derived graph profile for looming / escape experiments.

- Profile: flyeye.escape-neuron.v1
- Source graph: 70,000 neurons / 798,715 edges / 9.86 MB
- Compact graph: 3,376 neurons / 78,797 edges / 0.959 MB
- Reduction: 90.3%
- LC4/loom seeds: 126
- Direct escape DN targets retained: 26
- Max path length: 3 hops

The graph keeps real signed edge weights from the pinned upstream graph. Selection is task-specific: it is intended for looming / escape experiments, not as a general MaleCNS replacement.

Files:
- graph.bin — FLYGRAPH v1 binary
- manifest.json — remapped groups, motor indices, body IDs, provenance
- report.json — extraction statistics

Data attribution follows the upstream Janelia FlyEM MaleCNS terms.
