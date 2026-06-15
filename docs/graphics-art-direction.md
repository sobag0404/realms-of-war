# Graphics Art Direction: Realms Of War Vertical Slice

## Purpose

This document defines the visual target for the Realms of War graphics vertical slice: a readable, original fantasy 4X strategy map that proves the game can support long-form planning, fast tactical scanning, and attractive close inspection without compromising board-state clarity.

The slice should demonstrate production discipline comparable to modern PC 4X titles, with Civilization VI referenced only as a quality benchmark for polish, readability, and responsiveness. It is not a style target. Realms of War needs its own visual identity: an authored war-table world with large symbolic hexes, crisp terrain families, restrained fantasy richness, and original UI, unit, city, resource, and overlay language.

## Vertical Slice Target

The vertical slice should prioritize a small but complete map presentation over a broad set of unfinished effects. The goal is to prove the core graphics language under real gameplay pressure: mixed terrain, faction ownership, units, roads, resources, fog, selection, movement, attack preview, and camera movement all visible at once.

The slice should include:

- A representative hex map with plains, forest, hills, mountains, desert, swamp or wetland, coast, ocean, and at least one snow or tundra region.
- Clear transitions between terrain families, including coastlines, elevation changes, forest edges, and mountain chains.
- At least two faction ownership treatments shown on cities, borders, units, and banners.
- Roads or paths, rivers or shoreline routes, resources, ruins or landmarks, and one fortified or high-value city.
- A complete interaction overlay pass covering hover, selection, movement range, attack range, invalid targets, path preview, fog of war, and explored-but-not-visible tiles.
- Daylight lighting and camera framing that work in motion, not only in still screenshots.

Defer purely decorative variety until the slice reads well under these conditions. A smaller set of finished, coherent terrain and overlay rules is more valuable than many props with inconsistent readability.

## Visual Pillars

### Strategy First

The player should understand the tactical shape of the frontier before opening tooltips. Terrain class, elevation, ownership, unit presence, routes, resources, fog state, and current interaction mode must be legible at default zoom within one second.

### Authored War Table

The map should feel like a physical fantasy command table brought to life: broad cells, carved elevation, readable symbolic terrain, controlled material richness, and subtle motion. Avoid miniature-diorama clutter, cinematic terrain realism, or noisy procedural dressing that competes with decisions.

### Original Fantasy Language

Use custom silhouettes, faction symbols, resource icons, city architecture, border treatments, and overlay shapes. The world can be colorful and inviting, but it should not echo another 4X game's recognizable palette, tile dressing, city banner language, lens treatments, icons, or UI composition.

## Hex Scale And Camera

Hexes should be broad readable cells, not dense texture patches. At default strategic zoom, each tile needs one dominant terrain identity, enough negative space for gameplay markers, and visible relationships to adjacent tiles.

- Use an orthographic or near-orthographic strategy camera with restrained perspective so distant hexes do not shrink aggressively.
- Keep the camera angle high enough to read the board and low enough to show elevation, cities, and unit silhouettes.
- Preserve tile silhouettes through elevation rims, coastline shapes, slope planes, borders, roads, and rivers.
- Tune the default zoom first; close zoom may add material detail, but it must not introduce a second conflicting style.
- Make the grid readable through form and adjacency before relying on explicit grid lines.
- Keep camera movement smooth and stable, with no visual shimmer on tile edges, icons, or overlays.

## Terrain Readability

Every terrain class needs a distinct combination of hue, value, material, silhouette, elevation, and prop density. Color alone is not sufficient.

- Plains: open medium-green fields, broad grass planes, low prop density, and high negative space for units and overlays.
- Forest: grouped canopy masses with darker values and a vertical rhythm; the hex should read as forest from canopy shape before individual trees are noticed.
- Hills: stepped elevation, exposed warm earth, slope bands, and enough height contrast to imply movement cost without hiding markers.
- Mountains: tall angular ridges, cool stone values, snow or light edge accents where useful, and strong shadow breaks; peaks must not obscure banners or selected units.
- Desert: ochre sand, dry stone, sparse scrub, and clean value contrast against plains, hills, and swamp.
- Swamp or wetland: low wet ground, muted green-gray vegetation, dark water pockets, and soft irregular edges.
- Snow or tundra: cool high-value ground, pale blue-gray shadows, dark rock punctuation, and explicit contrast protection for roads, resources, and selection.
- Coast and ocean: readable shoreline boundaries, calm blue-to-blue-green water, and subtle motion that stays below land decisions in visual priority.
- Ruins and landmarks: desaturated stone or ancient magical forms with simple footprints; use them as map punctuation, not background clutter.

Terrain decoration must not cover unit bases, city footprints, resource icons, path previews, attack markers, selection rings, or ownership marks. If a prop competes with a gameplay marker, the marker loses detail or moves; the marker never loses priority.

## Palette

Use a broad but controlled fantasy strategy palette. Terrain should separate through hue and value, while the strongest chroma is reserved for factions, alerts, and interaction states.

- Plains: medium warm green with matte grass variation.
- Forest: deeper green, cooler shadow masses, and small warm highlights only where needed.
- Hills: green-gold grass, warm brown soil, and stone accents.
- Mountains: blue-gray, neutral stone, charcoal shadow, and light ridge accents.
- Desert: ochre, pale gold, dry beige, and muted red-brown rock.
- Swamp: olive, gray-green, dark teal water, and low-saturation reed colors.
- Snow: off-white, pale blue-gray, charcoal rock, and restrained cold shadows.
- Ocean: blue, blue-green, and deeper offshore values with lower saturation near fog.

Avoid letting the map collapse into a single color cast. Bright cyan, orange, magenta, saturated red, and high-saturation yellow should be reserved for UI feedback, objective emphasis, danger, and faction identity rather than base terrain.

## Lighting, Materials, And Depth

Lighting should give the world shape without hiding the board state. Use a consistent sun direction, soft ambient fill, and readable contact shadows. Terrain should feel dimensional through elevation bands, slope shading, rim accents, and material roughness rather than heavy bloom or dramatic contrast.

- Keep shadows soft enough that terrain type, occupancy, and roads remain readable.
- Use ambient occlusion to ground forests, mountains, cities, and units, but cap darkness inside playable cells.
- Let elevation create depth through stacked rims, slope planes, cliff edges, and controlled parallax.
- Keep water specular restrained; shimmer should never overpower coastlines or selection overlays.
- Apply color grading lightly so faction colors and interaction states remain accurate.
- Prefer crisp stylized materials over noisy photo texture detail.

## Fog, Hover, And Selection

Fog of war, hover, selection, movement, and attack states must function as one overlay system. These states need to work on every terrain type and remain understandable in common color-blind viewing conditions through value, shape, pattern, and motion.

- Unexplored fog: darkened, desaturated, simplified silhouettes with terrain identity mostly hidden.
- Explored but not visible: desaturated terrain with reduced contrast, still showing broad terrain class and known infrastructure.
- Visible tiles: full terrain palette, material detail, ownership, routes, resources, and unit status.
- Hover: thin luminous hex edge, slight rim lift, or subtle pulse; avoid opaque fills that hide terrain.
- Selection: clear primary ring, raised outline, or animated edge around the selected cell and selected unit.
- Movement range: calm cool tint, dotted edge, or transparent fill that does not resemble attack or selection.
- Attack range: warmer warning color plus a distinct edge pattern or marker shape.
- Invalid target: low-saturation red, barred edge pattern, or broken outline that reads without relying only on hue.
- Path preview: segmented line, chevrons, or arrow markers above terrain and below final confirmation UI.

Overlay priority should be predictable: selection overrides hover, attack overrides movement where both apply, invalid target overrides attack, and fog reduces terrain detail before it reduces critical gameplay icons.

## Cities, Units, Roads, And Resources

Cities should read as owned strategic anchors, not decorative villages lost in terrain. Units should remain identifiable against every tile type through silhouettes, bases, banners, and status marks.

- City footprints need clean boundaries, faction-readable ownership, and a recognizable center of power at default zoom.
- City architecture should express Realms of War factions through original massing, rooflines, banners, fortifications, and magical or military details.
- Roads and rivers must support route planning at a glance; keep their values and widths distinct from terrain cracks, roots, coast foam, and decorative trails.
- Resource icons should be original, simple, scalable, and consistent in outline, shadow, and anchor position.
- Unit bases should separate units from terrain without becoming oversized UI plates.
- Banners, health bars, and status marks should occupy predictable positions and avoid terrain-dependent contrast failures.
- Unit silhouettes should favor strong faction-readable shapes over small equipment detail at default zoom.

## V3 Biome And Resource Readability Pass

The v3 pass adds a second visual layer on top of the vertical slice: low-profile procedural surface accents, original resource markers, and cheaper water/fog batching. These are renderer-only treatments using existing tile data.

- Terrain accents should reinforce biome identity without becoming labels: plains use low warm grass strokes, desert uses pale dune bands, swamp uses dark wet pools, hills use warm contour/rock marks, mountains use light caps, forests use darker canopy shadow, and ruins use desaturated stone fragments.
- Resource markers should use small original 3-D glyphs anchored near the hex perimeter so they do not compete with units, cities, selection rings, or path previews.
- Water should be visually owned by the water layer, with calm blue-green surface, darker depth, and light shore highlights. The animation budget should stay at shared or instanced motion, not one animated React mesh per tile.
- Fog should preserve broad explored terrain contrast while hiding unexplored information. Hidden fog can remain uniform; explored fog should be lighter and less flattening.
- Coastline treatment should come from actual water adjacency. Missing map neighbors are map bounds, not beaches.

Existing resource data is sufficient for marker rendering through `HexTile.resource`. Generic feature rendering is still blocked by data shape: `HexTile` does not currently carry durable `features`, `riverMask`, `biome`, moisture/elevation bands, or ruin metadata. Future feature art should add explicit tile fields before adding visual rules, rather than inferring gameplay features from renderer-only heuristics.

## V4 City, Unit, And Tactical Readability Pass

The v4 pass prioritizes gameplay markers over the richer map surface added in v3. Units, cities, ownership, selected objects, attack targets, and paths should stay readable on busy terrain/resource clusters without adding UI panels or changing game rules.

- Units should have a dark tactical footprint, faction-colored base language, a stronger banner, and a health bar that reads at default PC zoom.
- Cities should read as owned anchors through a larger city plinth, faction-color perimeter, wall ring, banner, and selected-city outline.
- Selection and hover states should rely on bright rings plus dark under-rings, not only transparent fills that can disappear over forests, hills, water, or resources.
- Path preview should float above terrain elevation and use a dark under-line plus a bright dashed route so it remains visible across biomes.
- These treatments remain renderer-only and original: no copied 4X UI icon shapes, unit flags, city banners, or selection language from Civilization VI.

## V5 Lighting, Atmosphere, And Performance Pass

The v5 pass unifies the richer terrain and tactical marker work with a calmer strategic-map lighting model. The target is a bright fantasy command-table scene with stronger depth cues, softer shadowing, restrained atmosphere, and predictable performance at desktop PC viewports.

- Lighting should use one warm primary sun, cool fill, and a low-intensity rim so forests, hills, cities, and units feel grounded without darkening selection, health, ownership, or path markers.
- Shadow quality should favor stable readable contact over maximum resolution. A wider 2048 shadow atlas and balanced ambient fill reduce harsh contrast and cost while still giving cities, terrain props, and units a visible footprint.
- Post-processing should remain an accent layer. Bloom and vignette are reduced from v4 so faction colors and overlay colors stay accurate; expensive bloom blur is reserved for ultra settings.
- Water should read deeper through darker underlay and subtle specular material changes, with shared group motion instead of per-tile animation.
- Fog should sit behind board readability: distant atmospheric fog can widen slightly, but explored terrain, ownership, unit bases, city rings, and selection/path outlines must remain visible.
- The desktop budget assumes PC viewports from 1366x768 through 2560x1440. DPR is capped below 2x for the 3-D canvas to avoid fill-rate spikes on high-resolution monitors while preserving readable large hexes.
- Per-frame renderer work should remain bounded and instanced. Decorative vegetation sway reuses transform objects and only updates a limited subset, avoiding object allocation inside the frame loop.

This pass remains renderer-only and original. It does not copy another 4X game's lighting grade, fog color, shoreline treatment, bloom signature, camera mood, or protected presentation language.

## V6 Roads, Improvements, And Landmark Readability Pass

The v6 pass makes existing strategic infrastructure data readable without adding new rules. Roads, forts, tile improvements, and rift portals should become map objects the player can scan at default PC zoom while terrain, resources, units, cities, ownership, and selection remain visually dominant.

- Roads should be low-profile trails with a dark underlay and warm worn surface. Adjacent road tiles may visually connect, but the renderer must not invent movement rules or road masks that are not present in data.
- Improvements should use small original procedural silhouettes near the hex interior edge: farm strips, mine or quarry stonework, lumber logs, and mana-focus crystals. They should not hide resources, unit bases, city plinths, selection rings, or path previews.
- Forts should read as defensive infrastructure through compact palisade or tower forms, but city walls and selected-unit rings keep higher visual priority.
- Rift portals should use restrained magical geometry and owner color when `riftPortalOwner` exists, avoiding large animated effects until gameplay needs them.
- Infrastructure visibility follows fog knowledge. Hidden tiles should not reveal infrastructure; explored tiles may keep silhouettes under fog so known strategic routes remain legible.
- The pass should remain instanced and static per state update: no per-frame road, fort, improvement, or portal animation is needed for this vertical slice.

Current schema supports `HexTile.hasRoad`, `HexTile.hasFort`, `HexTile.improvement`, `HexTile.hasRiftPortal`, `HexTile.riftPortalOwner`, and `HexTile.owningCityId`. Directional road masks, rivers, durable landmark categories, and multi-tile improvement footprints remain future schema work and should not be inferred in renderer-only code.

## V7 Zoom, Readability, And Evidence Hardening Pass

The v7 pass protects the richer v2-v6 map presentation across desktop PC camera distances and common viewports. The goal is not to add a new gameplay layer, but to make existing terrain, water, resources, cities, units, roads, improvements, fog, selection, and path signals keep their intended priority when the player zooms, pans, or plays on 1366x768, 1920x1080, and 2560x1440 displays.

- Use a clear vertical priority ladder: terrain and water at the base, low-profile infrastructure above terrain, resources above infrastructure, cities and units above resources, fog as a readability veil, and selection/path overlays as the clearest interaction language.
- Roads should be slightly wider and have a dark underlay, but remain low and non-depth-writing so they do not block resources, unit bases, city plinths, or selection rings.
- Improvements and landmarks should reuse stable procedural geometry definitions. They may add silhouette detail, but they should not allocate new geometry per tile or introduce per-frame animation for this vertical slice.
- Selection and attack rings should use explicit overlay depth policy so they remain visible over forests, hills, cities, roads, resources, water, and fog. Transparent fills must stay light enough that terrain and ownership are still readable underneath.
- Path previews should sit below unit silhouettes and health markers while remaining above terrain and infrastructure. A dark under-line plus bright dashed route should remain legible without cutting through unit bodies at close zoom.
- Water and coastline highlights should sit above the rendered water terrain surface, with restrained transparency and depth writes disabled, so water reads as water instead of buried color under terrain chunks.
- Resource marker geometry should be shared and only built for resource types that are actually visible. This keeps the readability layer cheap enough for large desktop maps.
- Visual evidence should be saved outside the repository under a sibling evidence/artifact directory. Screenshots and logs are verification artifacts, not source assets, and must not be committed.

Generated maps may still contain sparse `hasRoad`, `hasFort`, `improvement`, and `hasRiftPortal` data. When a screenshot does not naturally include those fields, the verification note should say so explicitly and separate renderer readiness from future map-generation or scenario-authoring needs. The renderer must use existing schema only and must not invent infrastructure gameplay rules to make prettier screenshots.

## Originality And Reference Boundary

Civilization VI may be used only as a general benchmark for production quality in the PC 4X genre: polished strategic readability, responsive feedback, cohesive terrain families, and map-scale clarity. It must not be used as a source of visual solutions.

Do not copy, trace, sample, extract, recreate, or imitate:

- Civilization VI assets, textures, models, animations, screenshots, promotional art, leaders, wonders, districts, or map dressing.
- Civilization VI UI layouts, panels, buttons, minimap treatment, selection rings, unit flags, city banners, lens overlays, icons, or typography.
- Civilization VI palette choices, distinctive terrain silhouettes, resource icon language, wonder shapes, improvement shapes, or hex decoration patterns.
- Any names, symbols, faction identities, leader presentation, audio-visual motifs, or other protected IP from Civilization VI or related Firaxis, 2K, or Take-Two properties.

Reference work should be transformed into principles, not replicas. Build Realms of War around its own fantasy war-table identity: larger symbolic hexes, carved terrain readability, original faction and resource language, and a palette designed for this world.

## Slice Acceptance Checks

Before the vertical slice graphics pass is considered ready, verify:

- At default zoom, terrain class, elevation, roads, resources, city ownership, unit presence, selected tile, reachable tiles, attackable tiles, invalid targets, and fog state are identifiable within one second.
- The map remains readable on dense continents, mixed coastlines, mountain chains, forest-heavy regions, and city-adjacent clutter.
- Interaction overlays are visible over plains, forest, hills, mountains, desert, swamp, snow, coast, and ocean.
- Faction colors remain distinguishable across terrain, fog, hover, selection, movement, and attack overlays.
- No decoration obscures core gameplay markers, including unit bases, banners, resource icons, selection rings, path previews, city labels, or ownership borders.
- Camera movement, water motion, fog transitions, and overlay animation remain stable and do not create shimmer or ambiguous states.
- Screenshots cannot be reasonably mistaken for Civilization VI assets, UI, palette, terrain silhouettes, icon language, or branded presentation.
- All imported, generated, or commissioned assets have documented source and usage rights compatible with the project.
