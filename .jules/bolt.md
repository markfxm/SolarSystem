
## 2026-02-26 - [GC Pressure from Object.entries/values in Render Loops]
**Learning:** Frequent calls to `Object.entries()`, `Object.values()`, or `Object.keys()` inside high-frequency loops (like a 60fps Three.js update loop) create significant GC pressure by allocating multiple arrays every frame. In this codebase, the planet update loop and POI update loop were both allocating arrays for 10+ objects every single frame.
**Action:** Pre-cache the entries or values of stable objects during initialization or whenever they change. Use scratch variables (e.g., `THREE.Vector3`) for repeated mathematical operations instead of creating new instances.
