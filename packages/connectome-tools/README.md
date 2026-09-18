# @flyeye/connectome-tools

Generic FLYGRAPH inspection and pathway extraction CLI.

## Inspect

```bash
flyeye-connectome inspect \
  --manifest manifest.json \
  --graph graph.bin
```

## Cut a pathway corridor

```bash
flyeye-connectome cut \
  --manifest manifest.json \
  --graph graph.bin \
  --seed-groups loom \
  --target-groups turnL,turnR,flightL,flightR \
  --max-hops 3 \
  --profile flyeye.my-profile.v1 \
  --out-dir ./my-profile
```

Selection keeps neurons lying on directed paths from any seed group to any target group within the declared hop budget, then preserves all internal signed edges among selected nodes.
