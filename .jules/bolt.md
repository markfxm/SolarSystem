## 2025-05-15 - [Core Math Optimization]
**Learning:** `Date.UTC` with multiple arguments is significantly more expensive than `Date.getTime()` because it involves date-time part parsing and validation. In a 60fps simulation, this adds up. Also, pre-converting static orbital constants from degrees to radians once at module load (via IIFE) prevents hundreds of redundant multiplications per frame.
**Action:** Always prefer timestamp-based math for time deltas and pre-convert static units (degrees, kilometers) to the engine's internal units (radians, world units) at initialization.

## 2025-05-15 - [Coordinate Math & Trig Reuse]
**Learning:** In the Kepler solver, the final `sinE` and `cosE` are already computed. Re-using them for the true anomaly and distance calculations (denominator `1 - e * cosE`) avoids 2-4 redundant `Math.sin/cos` calls per celestial body per frame.
**Action:** Audit hot-path math functions for opportunities to pass or reuse intermediate trigonometric results.

## 2025-05-15 - [Geometry Batching & Texture Caching in Utilities]
**Learning:** Utility-generated geometry (like planetary grids or POI markers) often creates hundreds of redundant Line and Sprite objects, each adding a draw call. Caching the CanvasTextures and SpriteMaterials based on their content (e.g., degree labels) and merging disparate lines into a single `LineSegments` object dramatically reduces the overhead without changing the visual output.
**Action:** Always check if repeating UI/Grid elements can be batched into a single geometry and if their textures can be shared via a module-level cache.

## 2025-05-15 - [i18n String Lookup & Variable Replacement]
**Learning:** In high-frequency render loops (60fps), calling an i18n `t()` function that performs string splitting, deep object traversal, and `RegExp` creation for every call creates significant GC pressure and CPU overhead. Caching split path parts and fully resolved static strings reduces the lookup to O(1) in the hot path. Using `String.prototype.replaceAll` for variable substitution is faster and more readable than manual splitting or `new RegExp` in a loop.
**Action:** Always cache string lookups and path resolutions for any function called within a `requestAnimationFrame` or high-frequency update loop. Avoid creating `RegExp` objects or temporary arrays inside these functions.

## 2025-05-15 - [Kepler Solver Iteration & Trig Reuse]
**Learning:** A fixed-iteration Kepler solver is inefficient for low-eccentricity orbits (e < 0.05) which converge in 2-3 iterations. Performing additional `Math.sin/cos` calls after the loop for coordinates is also redundant if the final values from the last iteration are captured.
**Action:** Use an early-exit threshold (e.g., `1e-6`) in Newton-Raphson loops. Structure the loop to capture the final `sinE`, `cosE`, and the denominator `1 - e * cosE` to be reused for world-space positioning and distance calculations, saving 4-6 trig calls per body per frame.

## 2025-05-15 - [Direct Buffer Access in Geometry Loops]
**Learning:** Using Three.js convenience methods like `getX`, `getZ`, and `setY` within a tight loop (e.g., iterating over 4,096 vertices in a terrain chunk) introduces significant function call overhead. Accessing the underlying `Float32Array` buffer (`geometry.attributes.position.array`) directly reduces terrain generation time by avoiding these calls.
**Action:** For performance-critical geometry generation or modification, bypass Three.js getters/setters and operate directly on the typed array. Remember to set `needsUpdate = true` on the attribute afterward.

## 2025-05-15 - [Dimension-Specific Noise]
**Learning:** Using a 3D noise function for a 2D heightmap (where `z` is always constant) performs redundant permutations and interpolations for the unused dimension. A specialized `noise2D` function is approximately 30-40% faster as it eliminates all Z-related calculations.
**Action:** Always match the dimensionality of the noise function to the input data. Use `noise2D` for heightmaps and `noise3D` only when the third dimension is required (e.g., volumetric effects or time-varying 2D noise).

## 2025-05-15 - [AuraManager Sync & Material Sharing]
**Learning:** Updating the position of secondary visual elements (like auras) manually in a JavaScript loop every 5 frames causes noticeable jitter (stuttering) as they lag behind the primary bodies moving at 60fps. Parenting these elements to the primary mesh shifts the synchronization to the Three.js scene graph traversal, ensuring perfectly smooth motion. Additionally, sharing materials among sprites with identical properties (e.g., element color) reduces draw-state changes and memory overhead.
**Action:** Always parent secondary visual effects to their target bodies to leverage hierarchical movement. Use shared materials for repeating UI/effect elements that share the same visual state.

## 2025-05-15 - [Spatial Indexing & Key Parsing]
**Learning:** Parsing string keys (e.g., "x,z") in a high-frequency loop (60fps) for spatial indexing (like chunk management) introduces significant string allocation and parsing overhead. Storing the raw numeric coordinates in the object's metadata (e.g., THREE.js `userData`) allows for direct O(1) retrieval without overhead.
**Action:** Avoid string splitting or parsing in any loop that runs per-frame. Prefer storing numeric metadata directly on the objects for indexing and spatial checks.
