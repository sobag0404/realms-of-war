# Static Desktop Readiness

Realms of War is moving toward a Windows PC desktop application with local-first gameplay. The current production web path remains Next standalone. The desktop renderer path must become static/local before adding a Tauri scaffold.

Official constraints checked for this milestone:

- Next static export is enabled with `output: 'export'` and emits static assets from `next build`.
- Tauri's Next.js guide requires static exports and says server-based Next solutions are not supported; Tauri should point `frontendDist` at `../out`.
- Next static export does not support route handlers that rely on request data, non-static server behavior, cookies, redirects, headers, rewrites, or default image optimization.

## Current Status

Implemented in this PR:

- Removed `next/font/google` from `src/app/layout.tsx`.
- Added system/local font stacks in `src/app/globals.css`.
- Added env-gated static export probe mode in `next.config.ts` with `REALMS_DESKTOP_STATIC_EXPORT=1`.
- Marked the simple `src/app/api/route.ts` health route as `dynamic = "force-static"`.
- Added `bun run desktop:static:audit` to detect regressions that would recouple the desktop renderer to Next server routes.
- Added desktop-only App Router entries:
  - `src/app/layout.desktop.tsx`
  - `src/app/page.desktop.tsx`
- In `REALMS_DESKTOP_STATIC_EXPORT=1` mode, `next.config.ts` uses `pageExtensions: ["desktop.tsx", "desktop.ts", "desktop.jsx", "desktop.js"]`. This keeps normal web builds unchanged while excluding `src/app/api/**/route.ts` from the desktop static renderer build.

The normal web build remains `output: 'standalone'`.

## Export Result

Current desktop static export command:

```powershell
$env:REALMS_DESKTOP_STATIC_EXPORT='1'; bun x next build
```

Equivalent package script:

```powershell
bun run desktop:static:build
```

Next clears its work directory during build. Run desktop static export checks before the normal standalone `bun run build`/`bun run smoke` gate pair.

Current result: passes. The route table contains only:

- `/`
- `/_not-found`

The previous `/api/saves` export blocker is removed from the desktop renderer path.

## Preserved Web/API Surface

Server route handlers are still present for normal web/dev standalone builds:

- `src/app/api/save/route.ts` exports `POST`, reads request body, validates payload, and writes through Prisma.
- `src/app/api/load/route.ts` exports `GET` and `DELETE`, reads request query params, and uses Prisma.
- `src/app/api/saves/route.ts` exports `GET`, reads request query params, and uses Prisma.

These routes remain available in the normal `bun run build` standalone output and are intentionally not included in desktop static export mode.

## Residual Blockers

P0 - Tauri filesystem save repository does not exist yet:

- `src/save/browserLocalSaveRepository.ts` is good enough for browser-local proof, but desktop release should store saves under the app data directory with atomic file writes.

P1 - static output needs runtime smoke under a static file server:

- `REALMS_DESKTOP_STATIC_EXPORT=1 bun x next build` emits `out/`.
- Next milestone should serve `out/` locally and verify new game, render, save/list/load/delete through browser-local repository.

## Next Order

1. Keep `src/save/browserLocalSaveRepository.ts` as the default client path.
2. Add a static-output smoke command that serves `out/` and checks the desktop-local save path.
3. Add a Tauri filesystem-backed save repository after `src-tauri` exists.
4. Add the Tauri v2 scaffold with `frontendDist: '../out'`.
