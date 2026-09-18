import assert from 'node:assert/strict';
import { calculateScore, normalizeMetrics, validUuid } from '../server/scoring.js';

assert.equal(validUuid('550e8400-e29b-41d4-a716-446655440000'),true);
assert.equal(validUuid('not-a-uuid'),false);

assert.deepEqual(normalizeMetrics({
  closest_approach:-1,
  max_threat:2,
  escape_latency_ms:999999,
  survived_ms:-20,
  escaped:1
}),{
  closest_approach:0,
  max_threat:1,
  escape_latency_ms:30000,
  survived_ms:0,
  escaped:true
});

assert.equal(calculateScore('scare_fast',{
  escaped:false,escape_latency_ms:1000
}),0);

assert.ok(calculateScore('scare_fast',{
  escaped:true,escape_latency_ms:1000
}) > calculateScore('scare_fast',{
  escaped:true,escape_latency_ms:3000
}));

assert.ok(calculateScore('sneak_up',{
  closest_approach:.1,max_threat:.2,survived_ms:20000,escaped:false
}) > calculateScore('sneak_up',{
  closest_approach:.5,max_threat:.2,survived_ms:20000,escaped:false
}));

assert.ok(calculateScore('sneak_up',{
  closest_approach:.1,max_threat:.2,survived_ms:20000,escaped:false
}) > calculateScore('sneak_up',{
  closest_approach:.1,max_threat:.2,survived_ms:10000,escaped:true
}));

console.log('PASS scoring rules');
