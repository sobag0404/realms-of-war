---
Task ID: 1
Agent: Main Agent
Task: Fix click and interaction bugs in Realms of War hex strategy game

Work Log:
- Diagnosed the root cause: coordinate offset bug in mousedown/mousemove handlers
- The handlers subtracted `canvas.width/2` and `60` from world coordinates before calling pixelToHex()
- This was wrong because the rendering uses `ctx.translate(-cam.x, -cam.y)` which is already properly offset
- Fixed by removing the incorrect `ox = canvas.width/2, oy = 60` offsets from both handlers
- Fixed getUnitVisualPos() which had a falsy check `(anim.unit.visualX || anim.unit.visualY)` that would fail when both are 0
- Made sprite loading non-blocking with a 3-second safety timeout
- Fixed clampCam() to allow proper camera centering (was too restrictive with -200 minimum)
- Verified all button handlers (Attack, Build, End Turn) work correctly
- Verified lint passes with `bun run lint`
- Server-side rendering confirmed working with iframe pointing to /prototype/index.html

Stage Summary:
- Fixed 3 critical bugs: coordinate offset, getUnitVisualPos falsy check, sprite loading timeout
- Fixed 1 moderate bug: camera clamp limits
- Game should now properly detect clicks on units and hex tiles
- All buttons and keyboard shortcuts verified in code
