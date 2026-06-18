# Graphics Evidence And Performance Guardrails

This checklist keeps future strategic-map graphics work reviewable without colliding with UI/HUD, units/combat, save, Tauri, release, or handoff tracks. It covers renderer evidence, screenshot discipline, and lightweight performance expectations for PC desktop graphics PRs.

## Evidence Inventory

Recent graphics evidence lives outside the repository under `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts`:

- `graphics-v12`: biome material and texture-depth before/after screenshots.
- `graphics-v13`: strategic terrain depth and readability before/after screenshots.
- `graphics-v14`: water, snow/frost hint, fog, and atmosphere before/after screenshots.
- `graphics-v15`: settlement, improvement, road, ownership, and world-detail composition before/after screenshots.

These folders contain verification artifacts only. Do not commit screenshots, generated image logs, browser profiles, static build output, or binary captures.

## Required Screenshot Set

Each graphics PR that changes map rendering should capture the default playable map screen at:

- `1366x768`
- `1920x1080`
- `2560x1440`

Use a pass-specific artifact folder, for example `C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\graphics-v16-name\before` and `...\after`. File names should include the pass name and viewport, such as `terrain-guardrails-1920x1080.png`.

PR bodies should list exact evidence paths and short observations:

- viewport size and whether the pixel/nonblank check passed;
- whether the screenshot is generated-start evidence or authored-scenario evidence;
- whether roads, forts, improvements, portals, rivers, snow/frost, water/coast, resources, cities, units, fog, selection, and paths are visible in-frame;
- any sparse-data blockers, such as generated starts not naturally showing forts, portals, or mature improvements.

## Performance Guardrails

Graphics passes should keep the renderer predictable at desktop PC viewports:

- Preserve the 3-D canvas DPR cap unless a dedicated performance pass proves another cap is safe.
- Keep large-map terrain on chunked or merged geometry paths.
- New static map detail should be instanced, batched, or merged; avoid one React mesh per tile for repeated features.
- Avoid per-frame texture generation, per-tile animation loops, material churn, or object allocation for static details.
- Keep new draw-call groups bounded and explain any intentional increase in the PR body.
- Keep gameplay signals above decoration: resources, cities, units, fog, selection, attack, and path overlays must remain legible.

Visual scripts may collect extra observations when available, such as frame-sample timing, renderer info, layer counts, or draw-call counts. These are guardrails, not acceptance theater: document exact blockers instead of fabricating metrics.

## Reference Boundary

Civilization VI and similar PC 4X screenshots are quality references only. Evidence should discuss production traits such as readability, lighting depth, terrain integration, and composition. Do not copy, trace, sample, extract, or recreate protected assets, UI, icons, palettes, silhouettes, city/district language, labels, or map dressing.

## Next Graphics Backlog Prompt

Use this prompt when the graphics track is idle and should continue without duplicating UI/HUD or units/combat work:

```text
Goal: Realms of War graphics v16 authored showcase scenario and renderer performance evidence pass.

Context: v12-v15 improved biome material depth, strategic terrain depth, water/snow/fog atmosphere, and settlement/improvement world detail. Evidence exists under C:\Users\pcia0\Documents\STR\realms-of-war-artifacts\graphics-v12 through graphics-v15. The remaining review problem is that generated opening maps are sparse and evidence scripts only prove nonblank screenshots, not a representative art target or renderer budget.

Scope:
- Do not touch UI/HUD, units/combat, save, Tauri, release, or docs-handoff files.
- Add or document an authored graphics showcase fixture/workflow that puts coast, water, river, mountain, forest, plains/desert, resources, roads, improvements, city ownership, fog, selection, and path affordances in one default PC camera frame.
- Add lightweight renderer evidence collection where safe: frame timing sample, renderer info, or bounded layer/object/draw-call notes.
- Keep all screenshots and logs outside the repository.
- Preserve original art direction; do not copy Civilization VI assets, UI, icons, palette, exact silhouettes, or IP.

Acceptance:
- Evidence at 1366x768, 1920x1080, and 2560x1440 uses a representative scene, not only a random generated start.
- PR body includes exact evidence paths, performance observations, and honest remaining art-pipeline gaps.
- Local checks and CI are green before merge.
```
