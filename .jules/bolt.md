## 2025-05-14 - [Memory Allocation Optimization]
**Learning:** High-frequency math functions in Three.js environments (like planetary movement) often create massive amounts of short-lived objects (Quaternions, Vector3s), leading to significant GC pressure and frame stutter.
**Action:** Always use the "scratch variable" pattern and pre-compute static components of transformations in core simulation loops. Provide `target` parameters in utility functions to allow callers to manage their own allocations.
