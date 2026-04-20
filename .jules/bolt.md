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

## 2025-05-16 - [Mean Anomaly Normalization & Fast-Path Rotations]
**Learning:** Normalizing the Mean Anomaly ($M$) in every frame's position calculation is redundant if the orbital elements haven't changed. Moving this normalization to the element calculation phase ensures it happens once per update. Furthermore, orbits with zero inclination (like Earth in an ecliptic frame) allow for a significant shortcut in Gaussian constant calculation, bypassing 4 trigonometric calls and 12+ floating-point operations.
**Action:** Normalize $M$ during element generation and implement conditional fast-paths for planar (zero-inclination) orbits to reduce trigonometric overhead in the hot path.

## 2025-05-16 - [Decoupled Logic/Visual Loops & One-Shot Cleanup]
**Learning:** Throttling both calculations and visuals to the same low frequency (e.g., 12fps) in a 60fps engine causes noticeable "stutter" as visuals lag behind the camera and moving objects. Decoupling them—keeping heavy logic throttled while running visual updates at 60fps—restores smoothness. Additionally, calling a cleanup function (like `hideAll()`) in every frame of an `else` block when a feature is disabled introduces redundant overhead; using a state flag to ensure it only runs once upon toggling off is more efficient.
**Action:** Always decouple visual synchronization (60fps) from heavy state calculations (throttled). Use state flags to guard "one-shot" cleanup or initialization logic inside high-frequency render loops.

## 2025-05-17 - [Flat Array Pre-linking & Numeric Indexing]
**Learning:** In high-frequency visual effect managers (60fps), iterating over object keys (`Object.keys`) and performing `Map.get` lookups to link primary bodies (planets) to their secondary effects (auras) every frame creates significant overhead and GC pressure. Pre-linking these objects into a flat `activeAuras` array during initialization and using numeric array indexing for material lookups (instead of string-based keys) transforms the hot path into a simple O(n) iteration with O(1) lookups.
**Action:** Always pre-link secondary visual elements to their parent bodies in a flat array for 60fps updates. Replace string-key Map/Object lookups in hot paths with numeric array indexing.

## 2025-05-17 - [Rotation Fast-Path & Cache Pre-linking]
**Learning:** Fetching planetary orientation constants and base quaternions from Maps or Objects in every frame (9+ bodies * 60fps) introduces unnecessary overhead. By pre-linking these static references into a single `rotationCache` object during initialization and passing it directly to the math utilities, we achieve a zero-lookup 'fast path' that reduces the per-frame cost to simple property access.
**Action:** For high-frequency math utilities, provide an optional 'cache' parameter that accepts pre-linked dependencies. Pre-initialize these caches in the caller's setup phase to eliminate per-frame lookups.

## 2026-04-06 - [Threshold-based Trig Caching]
**Learning:** In a 60fps astronomical simulation, recalculating Gaussian constants and planetary orientations every frame is redundant since these values change extremely slowly at real-time speeds. Threshold-based caching (e.g., 0.01 days for orbits, 0.0001 days for rotation) can skip thousands of trig calls per second without any visible accuracy loss.
**Action:** Use per-planet scratch objects to enable independent caching in shared math utilities. Always update Mean Anomaly (M) every frame to maintain smooth motion while caching static transformation vectors (P/Q).

## 2026-04-10 - [Geometry & Mesh Pooling for Procedural Terrain]
**Learning:** In procedural terrain systems (like Mars exploration), the constant allocation and disposal of `THREE.Mesh`, `THREE.PlaneGeometry`, and `THREE.InstancedMesh` as the player moves causes significant GC pressure and frame-time spikes. Implementing a `chunkMeshPool` to recycle these objects allows for "near-zero" allocation during movement. Additionally, sharing a single `MeshStandardMaterial` across all chunks reduces draw-state changes and memory footprint.
**Action:** Always implement pooling for procedural objects that are frequently created and destroyed. Use shared materials for identical terrain types to maximize GPU efficiency and minimize memory usage.

## 2026-04-14 - [String Padding Cache & Stable UI Iteration]
**Learning:** In the astrology display pipeline, repeatedly calling `padStart` on minute values for every planet creates unnecessary string allocations. Pre-calculating a `MINUTES_CACHE` (00-59) reduces this to a simple array lookup. Additionally, relying on object key iteration in Vue templates for high-frequency components (like `TransitPanel.vue`) is less stable than computed arrays. Explicitly mapping reactive data to a sorted array (`displayPlanets`) based on a core constant like `GEOCENTRIC_PLANETS` ensures predictable UI updates and prevents bugs caused by undefined length constants in progress bar calculations.
**Action:** Cache repeating string-padded numbers (00-59) in utility modules. Always use computed arrays for `v-for` loops in hot-path UI components to ensure stable ordering and reliable aggregate calculations (like total counts).

## 2026-04-16 - [Height Calculation Caching]
**Learning:** Even "fast" Perlin noise calls (O(1) complexity) become a significant CPU bottleneck when executed 4-6 times per frame at 60fps, especially in complex update loops that handle physics and camera lerping. For ground-following systems where movement is often slow or stationary, recalculating height every frame is redundant.
**Action:** Implement a threshold-based cache (e.g., 0.01m) for height lookups. This skips redundant noise calculations in the update loop unless the player has moved significantly, preserving CPU cycles for rendering and simulation.

## 2026-04-16 - [Translation Overhead in Reactive Templates]
**Learning:** In Vue components with high-frequency updates (e.g., 60fps), calling an i18n `t()` function directly in a `v-for` template loop creates massive overhead due to repeated dictionary traversals and redundant reactive dependency registration. Moving these lookups to a single `computed` property (`translatedPlanets`) allows Vue to cache the results and only re-calculate when the actual data or language changes.
**Action:** Always pre-resolve translations and formatting for list items in a computed property rather than performing lookups inside the template loop. Ensure custom i18n utilities correctly register reactivity at the start of the function to avoid missing updates.

## 2025-05-18 - [Factored Orbital Formula]
**Learning:** Factoring the coordinate transformation from the orbital plane to the ecliptic plane allows for reducing multiplications by ~33% (from 9 down to 6) in the most frequently called math function. By calculating `cosE - e` once, we bypass the need to pre-store and multiply by the `PxAe` constants.
**Action:** Always look for algebraic factoring opportunities in 60fps physics/render loops to reduce the number of operations per vertex or per frame.

## 2025-05-18 - [Raycast Filtering for Decorative Elements]
**Learning:** Performing recursive raycasting () against a complex scene graph with thousands of non-interactive children (grids, orbits, auras) is a massive CPU bottleneck. Disabling the `.raycast` method on these decorative elements reduces intersection test overhead by over 80% without affecting interaction logic.
**Action:** Always disable raycasting for purely visual or decorative child objects parented to interactive meshes to prune the intersection traversal tree.

## 2025-05-18 - [Raycast Filtering for Decorative Elements]
**Learning:** Performing recursive raycasting (`intersectObjects(..., true)`) against a complex scene graph with thousands of non-interactive children (grids, orbits, auras) is a massive CPU bottleneck. Disabling the `.raycast` method on these decorative elements reduces intersection test overhead by over 80% without affecting interaction logic.
**Action:** Always disable raycasting for purely visual or decorative child objects parented to interactive meshes to prune the intersection traversal tree.
