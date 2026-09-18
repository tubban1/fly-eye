import fs from 'node:fs';
import assert from 'node:assert/strict';
import { EscapeRuntime, validateFlyEyeProfile } from '../public/sdk/flyeye-graphs.js';

const profile=JSON.parse(
  fs.readFileSync(new URL('../public/data/escape-fast-v1.json',import.meta.url),'utf8')
);

assert.equal(validateFlyEyeProfile(profile),true);
assert.equal(profile.profile,'flyeye.escape-fast.v1');
assert.equal(profile.nodes.length,5);
assert.equal(profile.edges.length,21);

const runtime=new EscapeRuntime(profile);
let state=runtime.reset();
assert.equal(state.escape,0);

for(let i=0;i<4;i++) state=runtime.step({looming:.8});

assert.ok(state.loom>.2,'loom group should activate');
assert.ok(Math.max(state.dnLeft,state.dnRight)>.05,'turn/DN groups should activate');
assert.ok(state.flight>.05,'flight output should activate');
assert.ok(state.escape>.2,'escape readout should activate');

const reset=runtime.reset();
assert.equal(reset.escape,0);
assert.equal(reset.loom,0);

console.log('PASS FlyEye Graphs SDK');
