# Realms of War

A hex-based strategy game built with Next.js 16, Three.js, and a custom deterministic game engine. Players explore procedurally generated maps, build cities, research technologies, and engage in tactical combat across procedurally generated terrain.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript 5
- **3D Rendering**: Three.js via React Three Fiber
- **Styling**: Tailwind CSS 4 with shadcn/ui component library
- **State Management**: Zustand (client state), TanStack Query (server state)
- **Database**: Prisma ORM with SQLite
- **Validation**: Zod
- **Package Manager**: Bun

## Requirements

- [Bun](https://bun.sh/) 1.3.x (`packageManager` is pinned to `bun@1.3.14`)
- Node.js >= 20.9 for the Next.js/Prisma/Vitest toolchain

## Windows Playtest

The current unsigned Windows playtest is published as a GitHub pre-release:
[`v0.2.0-unsigned-playtest.10`](https://github.com/sobag0404/realms-of-war/releases/tag/v0.2.0-unsigned-playtest.10).
Player download, install, save, and uninstall steps are documented in
[`download/README.md`](download/README.md).

Unsigned Windows desktop artifacts are built manually with the `Windows Desktop
Artifact` GitHub Actions workflow when a fresh handoff is needed.

Players do not need Bun, Node.js, Prisma, or a local development server to run
the downloaded desktop artifact.

The desktop playtest is local-first: core gameplay and local saves do not require
a server or VPS after the artifact has been downloaded.

## Installation

```bash
bun install
bun run db:generate
```

## Environment

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

Server-side save APIs are a local-alpha feature. In development and tests they
are enabled by default. In production they are disabled unless explicitly opted
in with:

```bash
REALMS_SERVER_SAVES=local-alpha
```

## Database

Push the Prisma schema to create/migrate the SQLite database:

```bash
bun run db:push
```

The default local database URL is `file:./dev.db`.

## Development

Start the development server:

```bash
bun run dev
```

The app runs on `http://localhost:3000` by default.

## Build

```bash
bun run build
```

The build uses Next.js standalone output and does not require extra copy steps.

The VPS packaging scripts live in `.zscripts/`. The default release package is
the Next.js app only; `mini-services/` are prototype services and are excluded
unless `INCLUDE_MINI_SERVICES=1` is set explicitly.

By default `Caddyfile` binds to `127.0.0.1:81`. Set `REALMS_SITE_BIND` to a real
hostname only after the deployment boundary and save API policy are intentional.

## Test

```bash
bun run test
```

Run tests in watch mode:

```bash
bun run test:watch
```

## Type Check

```bash
bun run typecheck
```

## Lint

```bash
bun run lint
```

## Project Structure

```
src/
  app/                  # Next.js App Router pages and API routes
    api/                # REST API endpoints (save, load, saves)
  components/
    game3d/             # Three.js 3D scene components (TerrainLayer, HexMesh, etc.)
    hud/                # In-game HUD (ResourceBar, Minimap, TurnPanel, etc.)
    screens/            # Game screens (MainMenu, NewGame, CityManagement, etc.)
    providers/          # React context providers (Game, Audio, i18n)
    ui/                 # shadcn/ui component library
  engine/
    ai/                 # AI director, behavior trees, strategic/tactical planners
    core/               # GameEngine, GameState, CommandQueue, EventBus, RNG
    ecs/                # Entity-component-system (components, systems)
    hex/                # Hex grid math (coordinates, pathfinding, line of sight)
    mapgen/             # Procedural map generation (noise, biomes, rivers, ruins)
    rules/              # Game rules (combat, movement, economy, city, research)
    save/               # Save/load system with migrations
  rendering/
    assets/             # Asset loader, model registry, manifest
    instancing/         # Instanced model pool for performance
    minimap/            # Minimap renderer
    picking/            # Hex raycaster
    terrain/            # Hex geometry builder, terrain chunks, materials
  store/                # Zustand store slices (session, selection, UI, settings)
  workers/              # Web Workers (pathfinding, mapgen, AI, simulation)
  lib/                  # Shared utilities (db, saveService, saveSchemas)
  hooks/                # Custom React hooks
  data/                 # Static game data (units, buildings, terrain, techs)
mini-services/          # Independent Bun services (game-server)
prisma/                 # Prisma schema and database
docs/                   # Design specs and security review
```

## Known Limitations

- **Alpha software**: This project is in early development. Expect bugs and incomplete features.
- **No authentication**: All save data is associated with a hardcoded `"local"` owner. Multi-user access control is not implemented.
- **Local-alpha saves**: Server-side saves are intentionally scoped to a local alpha owner abstraction and disabled by default in production. Do not expose the save API as a public multi-user service until auth/session ownership is added.
- **No multiplayer**: Only single-player and hotseat modes are supported. Online multiplayer does not exist yet.
- **No i18n runtime**: Localization strings exist for Russian and English, but the language switching system is not fully wired.
- **Worker fallbacks**: Web Workers fall back to synchronous execution when threading is unavailable, which may cause UI jank on large maps.

## Security Notes

For a full security audit, see [`docs/realms-of-war-ai-dev-review.md`](docs/realms-of-war-ai-dev-review.md).

Key points:

- Save API endpoints validate input with Zod and enforce body size limits (2 MB).
- Save data is owner-scoped; without auth, all saves use the `"local"` owner, and production must opt in with `REALMS_SERVER_SAVES=local-alpha`.
- No secrets or credentials are stored in the repository.
- Dependency audit is tracked in [`docs/dependency-audit.md`](docs/dependency-audit.md). Current direct unused packages were removed and remaining vulnerable transitives are handled with package overrides.
- Worker messages include `requestId` for correct concurrent request handling.
- The game engine uses deterministic RNG for reproducible game states.

Manual smoke coverage is tracked in [`docs/smoke-checklist.md`](docs/smoke-checklist.md).
Local save recovery behavior is documented in [`docs/local-save-recovery.md`](docs/local-save-recovery.md).
