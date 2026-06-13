# Public Alpha Smoke Checklist

Use this checklist after the release gates pass. Playwright is not part of the
project toolchain yet, so this is a manual smoke test for now.

## Local Development Smoke

```bash
bun install --frozen-lockfile
bun run db:generate
bun run db:push
bun run dev
```

1. Open `http://localhost:3000`.
2. Confirm the `REALMS OF WAR` main menu renders.
3. Click the top new-game button.
4. Keep default settings or choose the smallest map, then start the game.
5. Wait for the loading overlay to disappear and the HUD to show turn 1.
6. End the turn once and confirm the HUD updates.
7. Save the game and confirm the save action succeeds.
8. Return to the main menu, open Load, load the saved game, and confirm the map
   and turn state return.
9. Delete the smoke save from the load menu if desired.

## Production-Start Smoke

Production disables server-side save APIs by default. For a local alpha smoke
with server saves, opt in explicitly:

```bash
REALMS_SERVER_SAVES=local-alpha bun run start
```

CI runs the automated standalone smoke after `bun run build`:

```bash
bun run smoke
```

The smoke starts production standalone twice on loopback: first to verify save
APIs return `403` by default, then with `REALMS_SERVER_SAVES=local-alpha` to
verify `/` and `/api/saves` return `200`.

For public exposure, keep Caddy/Next bound to loopback or add real auth/session
ownership before enabling persistent server saves for multiple users.
