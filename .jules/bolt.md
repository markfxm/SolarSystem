## 2026-03-01 - [GC Pressure in Simulation hot-paths]
**Learning:** High-frequency simulation loops (60fps) suffer from measurable frame stutters when using `forEach`, array destructuring, or creating `Date` objects per frame. `Object.entries().forEach(([k, v]) => ...)` is particularly expensive in hot paths.
**Action:** Use standard `for` loops with indexed access. Pass raw numeric timestamps (like days-since-J2000) instead of `Date` objects into services.

## 2026-03-01 - [Quaternion Math Optimization]
**Learning:** In Three.js, `qResult.copy(base).multiply(q3).multiply(Q_ADJ)` performs two full quaternion multiplications per call. If `Q_ADJ` is a constant rotation, it can be pre-multiplied into the `base` if you also transform the axis of the dynamic rotation (`q3`).
**Action:** Pre-multiply `Q_ADJ` into `PLANET_QUAT_BASES` and rotate around the transformed axis (Y instead of Z) to save one multiplication per planet per frame.

## 2026-03-01 - [Zombie Lerp Calculations]
**Learning:** `lerp` and `scale.set` calls that run every frame even after reaching the target value still consume CPU and can prevent JS engines from optimizing the loop.
**Action:** Add a threshold check (e.g., `Math.abs(current - target) > 0.001`) to early-exit from per-frame interpolation logic.
