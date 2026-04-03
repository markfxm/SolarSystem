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

## 2025-05-15 - [Chunk Update Throttling & Movement Scratch Variables]
**Learning:** Even with optimized Map lookups, iterating over a grid of chunks every frame (60fps) to check for missing terrain creates unnecessary overhead and string key allocations. A simple "dirty check" on chunk coordinates reduces this work to almost zero when the player is stationary. Additionally, standard movement logic often allocates multiple `Vector3` and `Quaternion` objects per frame; moving these to the outer closure scope as reusable "scratch" variables eliminates this GC pressure entirely.
**Action:** Always implement coordinate-based dirty checking for spatial systems. Use closure-scoped scratch variables for any math involving `THREE` object instantiations inside a 60fps update loop.

## 2026-03-17 - [Throttled Terrain Chunk Generation]
**Learning:** In procedural 3D environments, generating multiple terrain chunks (including geometry and Perlin noise calculations) in a single frame during rapid movement causes significant frame-time spikes (jank). Even when the logic is "fast," the aggregate cost of multiple `BufferGeometry` allocations and vertex calculations blocks the main thread.
**Action:** Implement a prioritized queue (`chunkQueue`) to process only one chunk creation per frame. Sort the queue by distance to ensure chunks closest to the camera appear first.

## 2025-05-16 - [60fps Reactivity & Object Churn]
**Learning:** In the main solar system loop, updating high-frequency state (like player position or paths) by replacing reactive `ref` objects or using array spreads (`[...path]`) triggers massive garbage collection (GC) pressure and redundant Vue component re-renders.
**Action:** Use `reactive` objects for coordinate state and mutate properties directly. Avoid array spreads in render loops; instead, pass the raw array and use `shallowRef` or manual dirty-checks to control reactivity triggers.

## 2026-03-19 - [Resource Sharing via Mesh Scaling]
**Learning:** In Three.js, creating unique `SphereGeometry` instances for every celestial body (each with its own radius) prevents vertex buffer reuse and increases memory footprint. Using a single shared unit `SphereGeometry(1, 48, 48)` and applying `mesh.scale.setScalar(radius)` allows for 100% geometry reuse. However, this requires updating raycasting/interaction logic to use the original radius (stored in `userData`) and being careful with nested objects (like atmospheres) to avoid double-scaling.
**Action:** Prefer unit geometries and mesh scaling for identical shapes. Store original dimensions in `userData` for navigation/logic and ensure child meshes account for parent scaling.

## 2025-05-15 - [Minimap GC Pressure & Idle Loop Optimization]
**Learning:** The Mars minimap rendering loop in `MarsHUD.vue` was a significant performance bottleneck due to its "always-on" `requestAnimationFrame` and high garbage collection (GC) pressure. Specifically, the `drawMap` function allocated thousands of temporary `{x, y}` objects per frame to transform coordinates when drawing the `explorationPath`.
**Action:** Inline coordinate math (avoiding object creation) and use reactive state watchers to stop animation loops when components are not visible. Always capture reactive props into local variables before entering high-frequency loops to minimize Proxy overhead. Move i18n translation lookups out of the 60fps loop into computed properties.

## 2026-03-20 - [Vue Reactivity & SVG Path Optimization]
**Learning:** In a 60fps projection loop (like POI UI), updating a `ref` with a new object every frame triggers massive GC pressure. Converting the state to a `reactive` object and mutating properties directly eliminates these allocations. Furthermore, inlining coordinate math directly into SVG `d` attribute strings (using template literals) avoids the creation of multiple intermediate "point" objects.
**Action:** For high-frequency UI updates, use `reactive` for state and mutate properties individually. Inline all coordinate-to-string math for SVG paths.

## 2026-03-20 - [Material Update Thresholding]
**Learning:** Assigning values to Three.js material properties (like `opacity`) every frame, even when the value hasn't changed or is "close enough" to the target, can trigger unnecessary GPU state updates and CPU overhead in the renderer's uniform sync logic.
**Action:** Implement a small threshold check (e.g., `Math.abs(target - current) > 0.001`) before updating material properties in an animation loop to early-exit once the visual state is stable.

## 2025-05-16 - [TypedArray Hot-Loop Optimization]
**Learning:** In high-frequency loops (e.g., 1,000+ particles per frame), reading and writing to a `TypedArray` using index access multiple times per iteration creates significant overhead. Reading the values into local variables once at the start, performing all logic (like boundary checks and integration), and writing back once at the end reduces the total number of memory operations by ~60%. Additionally, pre-calculating loop-invariant boundaries (e.g., `PARTICLE_VOLUME / 2`) avoids redundant arithmetic in every iteration.
**Action:** Always cache `TypedArray` values in local variables for complex logic inside loops. Pre-calculate all constants outside the loop. For distance-based triggers, use `distanceToSquared` to avoid `Math.sqrt`.

## 2025-05-16 - [Gaussian Constants for Orbital Mechanics]
**Learning:** Using Gaussian constants (**P** and **Q** vectors) to represent the transformation from the orbital plane to the ecliptic plane is significantly more efficient than performing three successive trigonometric rotations (longitude of node, inclination, argument of periapsis) per body per frame. This optimization reduces the 3D position calculation to a simple linear combination (6 multiplications and 3 additions), eliminating at least 6 trigonometric calls and multiple intermediate matrix operations in the "hot path".
**Action:** Pre-calculate orbital rotation coefficients (Gaussian constants) once per orbital element update. Replace all per-frame orbital-to-ecliptic trigonometric rotations with these constants.
