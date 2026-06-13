# Realms of War — Goal Mode Stabilization Prompt

Дата подготовки: 2026-06-13
Рабочая папка: `C:\Users\pcia0\Documents\STR\realms-of-war-main`
GitHub: `https://github.com/sobag0404/realms-of-war`

## Роль

Ты Codex в Goal Mode. Работай как senior full-stack/game developer. Проект тестовый, можно менять архитектуру, языки, файлы и подходы, если это ведет к стабильному результату. Не добавляй новые gameplay features, пока не восстановлены quality gates и GitHub workflow.

## Обязательный контекст

Сначала прочитай:

1. `PROJECT_CONTEXT.md`
2. `CHECKLIST.md`
3. `README.md`
4. `docs/realms-of-war-design-spec.md`
5. `docs/realms-of-war-ai-dev-review.md`
6. `docs/realms-of-war-ai-developer-review.md`
7. `AI_DEVELOPER_REVIEW.md`
8. `package.json`
9. `tsconfig.json`
10. `eslint.config.mjs`
11. `vitest.config.ts`
12. `prisma/schema.prisma`

Из соседнего диалога `тестировщик str` важный вывод: актуальным считать ревью внутри `realms-of-war-main`, а корневой `C:\Users\pcia0\Documents\STR\AI_DEVELOPER_REVIEW.md` был ранней заглушкой до распаковки проекта.

## Факты текущей проверки

Инструменты были установлены локально:

- Git 2.54.0
- Bun 1.3.14
- GitHub CLI 2.94.0

Команды:

- `bun install --frozen-lockfile` — проходит.
- `bun x prisma generate` при `DATABASE_URL=file:./dev.db` — проходит.
- `bun run lint` — проходит с 144 warnings.
- `bun run typecheck` — проходил после исключения examples/mini-services из root typecheck и исправления TS ошибок.
- `bun run test` — проходил: 100 tests pass.
- `bun run build` — проходил.

## Главная цель

Довести проект до состояния, где clean checkout можно установить, проверить и собрать без ручных скрытых шагов:

1. `bun install --frozen-lockfile`
2. `bun x prisma generate`
3. `bun run typecheck`
4. `bun run lint`
5. `bun run test`
6. `bun run build`

После этого обновить `PROJECT_CONTEXT.md` и `CHECKLIST.md`, сделать commit и push в GitHub.

## Приоритеты

### P0 — GitHub / reproducibility

1. В рабочей папке сейчас нет `.git`. Нужно либо клонировать настоящий приватный repo `sobag0404/realms-of-war`, либо инициализировать git, подключить remote и аккуратно запушить текущий проект.
2. Не использовать токен, засвеченный в чате, в командах или файлах. Для push использовать безопасную локальную авторизацию `gh auth login --with-token` или переменную окружения, заданную вне чата.
3. `.github/workflows/ci.yml` добавлен; поддерживать его зелёным при дальнейших изменениях.

### P1 — зеленые проверки

0. Контракт toolchain закреплён, поддерживать его актуальным.
   - Добавить `packageManager: "bun@1.3.14"` или актуальный проверенный Bun.
   - Добавить `engines.node: ">=20.9"` или Node 22/24, потому README сейчас говорит Node >=18, но Next 16/Vitest 4 требуют Node 20+.
   - Обновить README под фактические требования.
1. `bun run typecheck` был исправлен. Если снова падает, начинать с этих зон:
   - `examples/websocket/frontend.tsx`: нет `socket.io-client`.
   - `examples/websocket/server.ts`: нет `socket.io`.
   - `mini-services/game-server/index.ts`: `import.meta.dir`, `Bun` types.
   - `src/components/hud/ResourceBar.tsx`: неверная типизация breakdown.
   - `src/components/providers/GameProvider.tsx`: unsafe cast в `GameCommand`.
   - `src/components/screens/RecruitmentScreen.tsx`: possible undefined.
   - `src/engine/save/__tests__/save.test.ts`: cast `SaveFile` -> `Record<string, unknown>`.
2. `bun run test` был исправлен; сохранять покрытие для invalid checksum, oversized body и invalid `/api/saves` query.
3. `bun run build` был исправлен; root `tsconfig` не должен снова тащить demo examples/mini-services в production typecheck.

### P1 — docs/env/API

1. `.env.example` добавлен с безопасным минимумом:
   - `DATABASE_URL="file:./dev.db"`
   - `NEXT_TELEMETRY_DISABLED=1`
   - комментарий, что production secrets не коммитятся.
2. `.gitignore` разрешает `.env.example`; не ломать это исключение.
3. Zod schema для `/api/saves?offset&limit` добавлена; invalid query должен возвращать 400, а не 500.
4. Save API сейчас использует общий `ownerId = "local"`. Для тестовой local alpha это допустимо, но публичный VPS деплой нельзя делать без решения:
   - либо local-only guard для server saves,
   - либо auth/session owner model,
   - либо отключить server-side saves в public mode.

### P2 — cleanup после зеленых gates

0. Привести `.zscripts/*` к воспроизводимому виду.
   - `bun install --frozen-lockfile`.
   - `BUILD_ID="${BUILD_ID:-local}"` или временная директория.
   - Убрать hardcoded `/home/z/my-project/mini-services`.
   - Не использовать `npx next` в `watchdog.sh`; держаться Bun/lockfile.
1. Убрать оставшиеся `@ts-nocheck` из:
   - `src/workers/ai.worker.ts`
   - `src/workers/mapgen.worker.ts`
   - `src/workers/simulation.worker.ts`
2. Усилить path traversal защиту в `mini-services/game-server/index.ts`: после `resolve()` проверять, что путь остался внутри `PUBLIC_DIR`.
3. Исправить `useWorkerManager.ts`: один consumer не должен `terminateAll()` singleton workers для всех.
4. Решить user-visible no-op actions в `UnitPanel.tsx`: `Wake` и `Wait` либо реализовать, либо скрыть/disabled с понятным состоянием.
5. `GameEngine.processQueue()` не должен молча пропускать invalid commands: логировать dev diagnostics или возвращать errors.

## Ограничения

- Не переписывай проект целиком без необходимости.
- Не добавляй gameplay features до зеленого CI.
- Не коммить `node_modules`, `.env`, `.next`, DB-файлы, логи, screenshots, tool-results.
- Не сохраняй секреты в repo, docs, shell scripts, remote URL.
- После каждого значимого изменения обновляй `PROJECT_CONTEXT.md` и `CHECKLIST.md`.

## Definition of Done

Готово, когда:

- `.env.example` существует и попадает в git.
- `.github/workflows/ci.yml` существует.
- `bun install --frozen-lockfile` проходит.
- `bun x prisma generate` проходит.
- `bun run typecheck` проходит.
- `bun run lint` проходит без errors.
- `bun run test` проходит.
- `bun run build` проходит.
- `PROJECT_CONTEXT.md` и `CHECKLIST.md` отражают фактический статус, без ложных `[x]`.
- Есть commit с понятным сообщением.
- Изменения запушены в GitHub.
