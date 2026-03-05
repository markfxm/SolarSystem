## 2025-05-15 - [Core Math Optimization]
**Learning:** `Date.UTC` with multiple arguments is significantly more expensive than `Date.getTime()` because it involves date-time part parsing and validation. In a 60fps simulation, this adds up. Also, pre-converting static orbital constants from degrees to radians once at module load (via IIFE) prevents hundreds of redundant multiplications per frame.
**Action:** Always prefer timestamp-based math for time deltas and pre-convert static units (degrees, kilometers) to the engine's internal units (radians, world units) at initialization.

## 2025-05-15 - [Coordinate Math & Trig Reuse]
**Learning:** In the Kepler solver, the final `sinE` and `cosE` are already computed. Re-using them for the true anomaly and distance calculations (denominator `1 - e * cosE`) avoids 2-4 redundant `Math.sin/cos` calls per celestial body per frame.
**Action:** Audit hot-path math functions for opportunities to pass or reuse intermediate trigonometric results.

## 2025-05-15 - [Geometry Batching & Texture Caching in Utilities]
**Learning:** Utility-generated geometry (like planetary grids or POI markers) often creates hundreds of redundant Line and Sprite objects, each adding a draw call. Caching the CanvasTextures and SpriteMaterials based on their content (e.g., degree labels) and merging disparate lines into a single `LineSegments` object dramatically reduces the overhead without changing the visual output.
**Action:** Always check if repeating UI/Grid elements can be batched into a single geometry and if their textures can be shared via a module-level cache.
