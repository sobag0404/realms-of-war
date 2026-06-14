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

The normal web build remains `output: 'standalone'`.

## Export Blockers

P0 - server route handlers are still in the app router:

- `src/app/api/save/route.ts` exports `POST`, reads request body, validates payload, and writes through Prisma.
- `src/app/api/load/route.ts` exports `GET` and `DELETE`, reads request query params, and uses Prisma.
- `src/app/api/saves/route.ts` exports `GET`, reads request query params, and uses Prisma.

These routes must remain for web/dev compatibility for now, but they cannot be part of the future Tauri static renderer bundle.

The simple `src/app/api/route.ts` health route is static-compatible now. The next export probe reaches `/api/saves`, which confirms the remaining blocker is the preserved server save API surface.

P1 - server save compatibility still depends on Prisma:

- `src/lib/db.ts` creates `PrismaClient`.
- `src/lib/saveService.ts` and API routes remain valid for web/server mode but are not the desktop local-first persistence path.

P2 - static export probe is available but not yet expected to pass:

- Manual probe command: `REALMS_DESKTOP_STATIC_EXPORT=1 bun x next build`.
- Expected current blocker: server API routes preserved under `src/app/api/**`.

## Next Order

1. Keep `src/save/browserLocalSaveRepository.ts` as the default client path.
2. Move web/server save APIs out of the desktop renderer build, either by route-group separation, a dedicated web config, or later by migrating the desktop renderer away from Next API routes entirely.
3. Add a Tauri filesystem-backed save repository after `src-tauri` exists.
4. Make `REALMS_DESKTOP_STATIC_EXPORT=1 bun x next build` pass.
5. Add the Tauri v2 scaffold with `frontendDist: '../out'`.
