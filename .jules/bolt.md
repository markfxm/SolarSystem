# Bolt's Journal - Critical Learnings

## 2025-05-15 - [GC Pressure in Astrology Loop]
**Learning:** The astrology update loop in `SolarSystem.vue` (running every 5 frames) triggers multiple `Object.entries` calls and array allocations (36+ per loop), causing measurable GC pressure. Redundant `Date` object creation and string splitting in `t()` also add overhead.
**Action:** Pre-cache object keys/values and mapping objects outside of high-frequency functions. Use `for` loops instead of `forEach` where possible.
