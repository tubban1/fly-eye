# @flyeye/runtime

Modeled group-level dynamics for FlyEye aggregate profiles.

This package is intentionally separate from `@flyeye/graph-core`:

- `graph-core` = data parsing and provenance
- `runtime` = declared product model

The default `EscapeRuntime` is not a biological recording or validated full-brain simulation.

```js
import { EscapeRuntime } from '@flyeye/runtime';

const runtime=new EscapeRuntime(profile);
const state=runtime.step({looming:0.7});
console.log(state.lc4,state.flight,state.escape);
```
