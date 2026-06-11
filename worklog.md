---
Task ID: 1
Agent: Main
Task: Performance optimization of hex strategy game

Work Log:
- Read full 3067-line index.html file and worklog.md
- Implemented 8 performance optimizations systematically
- Fixed critical bug: `const ctx` → `let ctx` (needed for ctx-swapping in buildTerrainBuffer)
- Fixed critical bug: `loop()` called without timestamp from init(), causing _now=undefined → NaN in color strings → render crash → game loop stops
- Added `if(!ts) ts=performance.now()` guard in loop()
- Verified all optimizations working in browser: terrain buffer builds (300 cached positions), game loop runs at ~60fps, unit selection/movement/combat works

OPTIMIZATIONS APPLIED:

1. **Cache hexToPixel positions** (HIGH impact)
   - Added `_hexPosCache = {}` with numeric key `q*1000+r`
   - `clearHexPosCache()` called in `genMap()`
   - Saves ~300 `Math.sqrt(3)` recalculations per frame

2. **Cache Date.now() per frame** (MODERATE impact)
   - `let _now = 0;` set from rAF timestamp at start of `loop()`
   - Replaced 15+ `Date.now()` calls in rendering code with `_now`
   - Kept `Date.now()` in non-rendering code

3. **Offscreen canvas for terrain** (BIGGEST WIN)
   - `buildTerrainBuffer()` pre-renders all 300 hexes to offscreen canvas
   - Uses ctx-swapping technique (save/restore global `ctx`)
   - `_skipDecor` flag skips animated decorations during buffer build
   - `drawHexHighlights()` extracted for separate highlight rendering
   - `render()` blits terrain buffer, draws decorations/highlights/units on top
   - `_terrainDirty=true` set in `genMap()` and when ruins are cleared
   - **Expected: 60-80% reduction in hex drawing cost per frame**

4. **Throttle minimap rendering** (MODERATE impact)
   - `renderMinimap()` only called every 3rd frame
   - 66% reduction in minimap computation

5. **Throttle pathfinding on hover** (MODERATE impact)
   - `findPath()` throttled to max once per 50ms during mousemove
   - Reduces BFS from ~60/sec to ~20/sec during hover

6. **Optimize BFS** (MODERATE impact)
   - Index-based `qi++` instead of `queue.shift()` (O(n))
   - Applied to both `findReachable()` and `findPath()`

7. **Cache computeThreats** (MODERATE impact)
   - `_threatsDirty` flag skips recomputation when enemies haven't moved
   - Invalidated only on enemy turn and combat

8. **Frame skip for static scenes** (LOW-MODERATE impact)
   - During enemy turn with no animations, renders at ~20fps instead of 60fps

BUGS FIXED:
- `const ctx` → `let ctx` (required for ctx-swapping in terrain buffer)
- `loop(ts)` without timestamp caused `_now=undefined` → NaN in colors → crash
  - Added `if(!ts) ts=performance.now()` guard

Stage Summary:
- All 8 performance optimizations working correctly
- Game loop verified running at 60fps (2900+ frames in ~48 seconds)
- Unit selection, movement, combat, enemy turn all verified working
- No console errors or render crashes
- File: ~3143 lines with all optimizations + bug fixes
