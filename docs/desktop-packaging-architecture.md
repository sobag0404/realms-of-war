# Desktop Packaging Architecture

Date: 2026-06-14

Status: Accepted direction, implementation not yet production-ready

## Decision

Use Tauri v2 as the recommended production desktop shell for the Windows PC release path, but do not add a `src-tauri` scaffold in this PR.

The current app is a Next 16 standalone SSR build with API routes and Prisma-backed server save endpoints. Tauri's official Next.js guidance requires static export (`output: 'export'`) and states that Tauri does not support server-based Next solutions. Adding Tauri configuration now would be misleading because it would either fail to build or require bundling a local HTTP server as a sidecar. That would preserve the current server-shaped architecture instead of moving the game to a true local-first desktop runtime.

This PR therefore adds:

- this ADR and implementation plan;
- a lightweight `desktop:doctor` prerequisite check;
- no heavy packaging dependency and no fake installer scaffold.

## Source Notes

Verified official docs on 2026-06-14:

- Tauri v2 supports existing web frontends, cross-platform apps, Rust-backed system integration, native OS web renderer, and small app size claims: https://v2.tauri.app/
- Tauri v2 Windows installers can be distributed as `.msi` via WiX or `-setup.exe` via NSIS. Building on Windows uses `tauri build`; WebView2 install mode must be chosen deliberately: https://v2.tauri.app/distribute/windows-installer/
- Tauri v2 + Next.js requires static export and `frontendDist` pointing at `out`; server-based Next solutions are not supported: https://v2.tauri.app/start/frontend/nextjs/
- electron-builder supports Windows target configuration, MSI options, artifact naming, and publish/release metadata: https://www.electron.build/docs/configuration/

## Decision Matrix

| Option | Fit | Strengths | Risks |
| --- | --- | --- | --- |
| Tauri v2 | Recommended target | Small installer/runtime, native WebView2, strong local filesystem integration, Rust commands for local saves, good `.exe`/MSI path through NSIS/WiX, lower bundled attack surface than Electron | Requires Rust/MSVC/WebView2 tooling, requires static-export-compatible frontend or explicit sidecar design, WebView2 GPU/WebGL testing needed |
| Electron + electron-builder | Useful fallback/prototype | Fastest way to wrap the existing Next standalone server, mature NSIS installer flow, Chromium/WebGL consistency, all-JS toolchain | Large app size, bundles Chromium and Node, more memory use, easier to accidentally keep a local server architecture, larger security/update surface |
| Native wrapper | Deferred | Maximum control | Not pragmatic for current React/Three/Next codebase; would require rewriting the renderer or embedding webview manually |

## Current Architecture Findings

- Core gameplay loop is mostly client-side: `GameEngine`, rules, mapgen, command dispatch, Zustand state, R3F rendering.
- New game flow does not require the remote server. It can generate maps in a worker with sync fallback.
- Save/load UI now goes through `SaveRepository`:
  - default browser-local implementation stores validated saves in IndexedDB, with localStorage fallback;
  - `ServerSaveRepository` preserves `/api/save`, `/api/saves`, and `/api/load` for web/dev compatibility;
  - server API routes still use Prisma SQLite through `src/lib/db.ts`.
- Server saves are intentionally disabled by default in production unless `REALMS_SERVER_SAVES=local-alpha` is set. This is correct for public web deployment, but not sufficient for a packaged offline PC game.
- Settings already persist through browser `localStorage`; this is acceptable for preferences, not for primary campaign saves.

## Local-First Target Architecture

Desktop gameplay must not require a VPS, remote HTTP API, or externally managed database for the core loop.

Target save abstraction:

```ts
interface SaveRepository {
  list(): Promise<SaveSummary[]>;
  load(id: string): Promise<SaveFile>;
  save(input: SaveWriteInput): Promise<SaveSummary>;
  delete(id: string): Promise<void>;
}
```

Implementations:

- `ServerSaveRepository`: current web/API path for local-alpha development or future authenticated web deployment.
- `DesktopSaveRepository`: Tauri command or plugin-backed filesystem storage under the app data directory.
- Optional `BrowserLocalSaveRepository`: IndexedDB fallback for static browser builds, useful for testing local-first save behavior before Tauri.

Recommended desktop save format:

- store one validated `SaveFile` JSON per save slot;
- keep checksum validation from `saveService`;
- write atomically: temp file, fsync/flush if available, rename;
- keep a small `index.json` for save list metadata;
- reserve migrations for save format versions, not Prisma migrations;
- use `localStorage` only for settings and UI preferences.

## Packaging Plan

Phase 1: local-first web boundary.

Status: implemented for the browser-local milestone. The UI now routes save/list/load/delete through
`SaveRepository`. The default browser implementation uses IndexedDB and falls
back to localStorage only when IndexedDB is unavailable. The existing server API
implementation remains available through `NEXT_PUBLIC_REALMS_SAVE_REPOSITORY=server`
for web/dev compatibility.

1. Introduce `SaveRepository` interface and move UI save/load calls away from direct `fetch('/api/...')`.
2. Add an IndexedDB or file-like browser implementation for local saves.
3. Keep current API implementation for web/dev compatibility.
4. Add tests proving new game, save, load, delete work without Next API routes.

Phase 2: static desktop renderer.

Status: static export build is available. `next/font/google` is removed, a guarded static export probe is
available through `REALMS_DESKTOP_STATIC_EXPORT=1`, and `bun run desktop:static:audit`
checks that the desktop renderer stays isolated from direct server API fetches.
Desktop export mode uses `*.desktop.tsx` App Router entries through `pageExtensions`
so `src/app/api/**/route.ts` remains available in normal standalone builds but is
not part of the desktop static renderer output. Because Next clears its work
directory during builds, run static export checks before the normal standalone
build/smoke pair in local gate order.

1. Keep the existing `next build` standalone path for web/VPS until desktop build is verified.
2. Keep API route usage isolated behind repository implementations.
3. Use `bun run desktop:static:smoke` to serve `out/` and validate new game, render, save/list/load/delete without Next server/API.
4. Decide whether to promote static smoke into CI after browser provisioning is standardized.

Phase 3: Tauri scaffold.

Status: minimal scaffold added for GitHub Windows artifact verification. Local
build remains blocked until Rust/Cargo/MSVC are installed. See
`docs/tauri-toolchain-readiness.md`.

1. Install prerequisites on Windows:
   - Rust stable toolchain with Cargo;
   - MSVC C++ Build Tools / Visual Studio Build Tools;
   - WebView2 runtime;
   - NSIS if producing `-setup.exe`, WiX v3 if producing MSI.
2. Keep `src-tauri` configured with `frontendDist` pointing at `../out`.
3. Use `bun run desktop:tauri:build` or the manual `Windows Desktop Artifact` workflow for unsigned artifact verification.
4. Add Tauri filesystem commands or plugins for save storage.

Phase 4: release workflow.

1. GitHub Actions `windows-latest` job:
   - checkout;
   - setup Bun;
   - setup Rust stable;
   - install/build frontend;
   - run tests;
   - run Tauri build.
2. Artifact naming:
   - `RealmsOfWar-${version}-windows-x64-setup.exe`;
   - optional `RealmsOfWar-${version}-windows-x64.msi`.
3. Add signing later using GitHub secrets. Do not add signing keys, certs, passwords, or tokens to the repo.
4. Updater, cloud saves, multiplayer, auth, payments, and VPS deployment remain out of scope.

## Local Tooling Check

Current local check on this machine:

- Bun is available: `1.3.14`.
- WebView2 Runtime is available: `149.0.4022.69`.
- `winget.exe` is available.
- Rust/Cargo are not on `PATH`.
- MSVC `cl.exe` is not on `PATH`.
- Visual Studio Build Tools / MSVC C++ toolset are not detected by `vswhere.exe`.
- NSIS/WiX are not on `PATH`; optional until installer target is chosen.

Run:

```powershell
bun run desktop:doctor
```

This reports prerequisites without failing normal web gates.

## Risks

- Tauri + WebView2 WebGL performance must be tested with the R3F scene on target PCs.
- Static export may expose assumptions currently hidden by Next standalone SSR.
- Save migration must stay independent from Prisma if the desktop path uses file saves.
- Electron remains the fallback if Tauri/WebView2 GPU behavior is unacceptable, but it should not be the first production choice because it increases app size and keeps a server-like runtime tempting.

## Non-Goals

- No production installer in this PR.
- No auth, multiplayer, cloud saves, updater, payment, or code signing in this PR.
- No removal of the current web/dev flow.
- No remote server required for the future desktop core gameplay loop.
