# Planet Visual Upgrades Design

## Goal

Improve the close-range realism of every celestial body without replacing the existing shared-sphere architecture, adding runtime dependencies, or materially increasing initial-load cost.

## Confirmed Direction

- Preserve the shared unit-sphere approach for distant bodies.
- Prefer shader and material improvements over imported 3D models.
- Load high-resolution textures and enable high-detail geometry only when a body is selected or otherwise prioritized.
- Keep the current orbital, interaction, grid, POI, holographic, and Mars-surface behavior unchanged.
- Target a balanced desktop experience while retaining the current pixel-ratio cap and avoiding shadow maps in the main solar-system scene.

## Architecture

### Texture preparation

Create a focused texture utility that applies the correct color space and renderer-supported anisotropy. Color maps use `THREE.SRGBColorSpace`; data textures such as alpha maps remain linear/no-color-space. Anisotropy is capped at a conservative value rather than always using the device maximum.

Replace the incorrect low-resolution Moon mapping with a derived, compressed Moon asset generated from the existing repository-owned 8K Moon texture. High-resolution loading continues through the existing `prioritizeHQ()` flow.

### Shared surface material

Move the current planet shader into a material factory with explicit profiles:

- `rocky`: Mercury, Moon, Venus, and Mars. Texture-luminance derivatives create restrained micro-normal detail without extra per-planet normal-map downloads.
- `terrestrial`: Earth. Uses the same physical surface response with lower terrain strength, stronger ocean-like specular response, and day/night blending.
- `gas`: Jupiter and Saturn. Keeps the surface visually smooth with broad, soft highlights.
- `ice`: Uranus and Neptune. Uses smooth shading with a slightly tighter highlight and cool limb response.

The shader keeps the Sun-at-origin lighting model already used by the simulation. It adds roughness-controlled specular response, profile-specific detail, and color-correct texture sampling while preserving night lights where supplied.

### Earth layers

Retain the Earth surface mesh and add two shared-geometry child shells:

- A thin procedural cloud shell with transparent, slowly evolving cloud coverage. It uses deterministic shader noise, so no new cloud image download is required.
- A Fresnel atmosphere shell that produces a thin blue limb and attenuates toward the night side instead of the current uniform transparent blue sphere.

Both layers are decorative, excluded from raycasting, and keep static transforms. Only shader time uniforms change per frame.

### Sun layers

Replace the basic unlit Sun material with a texture-backed animated shader. Low-cost procedural noise modulates brightness and surface granulation. Add a back-facing Fresnel glow shell for the limb/corona; do not introduce post-processing or bloom dependencies.

### Detail levels

Keep the existing shared `48 x 48` sphere for the default scene. Add one shared higher-detail sphere for prioritized close views. `prioritizeHQ(bodyId)` promotes the selected body to high geometry and returns the previously promoted body to the default geometry. Atmosphere and cloud shells continue to use shared geometry and do not require unique buffers.

### Animation integration

Expose a single `updateVisuals(deltaSeconds)` method from the solar-system factory. It advances only the Earth cloud and Sun material uniforms. The existing main animation loop calls it once per frame; orbital calculations remain untouched.

## Upgrade Coverage

1. Correct Moon texture, sRGB handling, and anisotropy configuration.
2. Add texture-derived micro-normal response for rocky bodies.
3. Add Earth clouds, ocean-aware highlight response, and Fresnel atmosphere.
4. Add animated Sun surface and corona shell.
5. Retain texture-led gas/ice giants with material profiles suited to non-solid surfaces.
6. Add shared close-view geometry promoted through `prioritizeHQ()`.

## Error Handling

- Preserve the current fallback texture behavior when a color texture cannot load.
- If a high-resolution texture fails, retain the low-resolution texture; close-view geometry may remain active because it is shared and does not depend on the texture request.
- Decorative layers must not prevent the corresponding planet from being created.
- Generated shader materials and geometries are shared where safe and disposed with the existing scene lifecycle when disposal support is extended.

## Testing

- Unit tests cover texture configuration, profile selection, material uniforms, Moon asset routing, close-detail promotion/demotion, and visual-update time advancement.
- Existing astronomy and matrix-update tests remain unchanged and passing.
- `npm run build` verifies Vue/Vite integration and shader bundling.
- Browser QA verifies app identity, non-blank rendering, absence of framework overlays and relevant console errors, planet selection, close-view geometry promotion, and visible Earth/Sun enhancements at desktop and one narrower viewport.

## Non-goals

- No imported GLB/GLTF planet models.
- No physically exaggerated terrain displacement at solar-system scale.
- No post-processing bloom pipeline, dynamic shadow maps, or new npm dependencies.
- No changes to orbital scale, astronomical calculations, navigation behavior, or Mars ground exploration.
