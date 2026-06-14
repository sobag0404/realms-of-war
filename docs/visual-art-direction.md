# Visual Art Direction: Strategic Map

## Mood

Realms of War should feel like a clear, playable fantasy war table brought to life: grounded, tactical, slightly mythic, and readable at a glance. The map should invite long-session planning rather than cinematic spectacle. Beauty supports decision-making first.

## Shape Language

Use clean hex silhouettes, terraced elevation, strong terrain borders, and readable unit/city silhouettes. Plains and roads should be broad and calm; forests clustered and vertical; hills stepped; mountains angular and weighty; ruins broken and geometric; water smooth with controlled motion. Avoid noisy micro-detail that competes with selection, movement, ownership, fog, or resource signals.

## Terrain Material Language

Terrain materials should be stylized PBR, not photoreal. Surfaces need large readable value blocks plus restrained detail:

- Plains: matte grassland with subtle patch variation.
- Forest: darker canopy masses with grouped tree forms, not individual clutter everywhere.
- Hills: raised, warm earth and grass bands.
- Mountains: cool stone planes with strong facets and snow or light accents only where helpful.
- Desert: dry granular sand and rock with low saturation.
- Swamp: muted wet greens, dark water pockets, sparse reeds.
- Ruins: desaturated stone, broken foundations, ancient map landmarks.
- Water: calm readable blue with soft specular motion, never bright enough to overpower land.

## Color Constraints

Keep terrain colors distinct by hue and value, not saturation alone. The map should avoid a single dominant tint. Reserve the brightest colors for interaction states, faction ownership, warnings, and objectives. Fog-of-war must desaturate and darken without hiding terrain class entirely. Selection, hover, movement, attack, and ownership overlays must remain legible over every terrain type and in common color-blind modes.

## Readability Rules

At normal Windows desktop zoom, a player must identify terrain type, walkability, elevation class, unit presence, city ownership, current selection, reachable tiles, attackable tiles, and fog state within one second. Grid lines should be optional or subtle. Terrain decoration must never obscure units, city banners, resource icons, path previews, or combat highlights. Camera lighting should keep north, east, south, and west terrain recognition stable, with shadows adding depth but not hiding gameplay.

## Reference Boundary

For this project, "Civilization-style quality" means production discipline, not imitation: polished strategic readability, cohesive terrain families, strong silhouettes, elegant camera framing, responsive highlights, attractive lighting, scalable map performance, and a sense that every tile belongs to one authored world. Do not copy Civilization VI, Firaxis, or 2K assets, UI layouts, palettes, icons, screenshots, names, leader presentation, map dressing, or distinctive IP. Use original Realms of War fantasy strategy art direction.

## Rendering Roadmap

1. Terrain readability pass: lock terrain palette, elevation bands, fog states, grid treatment, and selection, hover, movement, and attack overlays against small, medium, and large maps.
2. Material and lighting pass: tune PBR roughness, ambient, directional, hemisphere lighting, shadows, water motion, and color grading for a stable orthographic strategy camera.
3. Decoration and landmark pass: add instanced terrain props, ruins, resource markers, roads, and city footprint readability with strict occlusion rules.
4. Performance pass: keep chunked terrain as the large-map visual path, separate interaction picking from rendered terrain, and validate GPU cleanup and frame-time targets.
5. Polish pass: add camera presets, LOD rules, optional accessibility modes, screenshot review baselines, and regression checks for visual clarity.

## Asset Ownership

All map art must be original, licensed for commercial use, or generated under documented rights compatible with the project. Track source, license, author or tool, modification notes, and intended in-game use for each texture, model, icon, shader snippet, and generated bitmap. Do not import reference-game assets, traced screenshots, lookalike icons, or palette-extracted materials. Keep raw source files and exported runtime assets separate so future contributors can audit provenance.

