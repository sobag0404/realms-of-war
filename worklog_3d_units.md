---
Task ID: 3D-Units
Agent: Main
Task: Replace flat 2D unit silhouettes with 3D isometric figurines (Civilization-style)

Work Log:
- Added 3D rendering primitives: draw3DBase, draw3DSphere, draw3DCylinder, draw3DCone, draw3DShield, draw3DSword, draw3DBow, draw3DSpear
- Added helper functions: lightenColor, blendColors (darkenColor already existed)
- Completely replaced drawUnitIcon with drawUnit3D — 8 unique 3D figurine designs
- Updated drawSpriteUnit to always use 3D figurine (no more flat sprite fallback)
- Increased unit sizes by 2px across the board for better 3D visibility
- All figurines sit on team-colored 3D elliptical base platforms
- Verified: JS syntax OK, all functions present, lint passes

Stage Summary:
- Units now render as 3D isometric figurines with volumetric shading
- Every unit has a team-colored 3D base platform
- Equipment rendered with metallic/wooden gradients
