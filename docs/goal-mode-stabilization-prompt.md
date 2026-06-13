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
- `bun run typecheck` — падает.
- `bun run test` — падает: 77 tests pass, `src/app/api/__tests__/save-api.test.ts` падает на импорте `z.object`.
- `bun run build` — компилирует Next, затем падает на typecheck из-за `examples/websocket/*`.

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
3. Добавить `.github/workflows/ci.yml`, который запускает Bun install, Prisma generate, typecheck, lint, tests, build.

### P1 — зеленые проверки

0. Закрепить контракт toolchain.
   - Добавить `packageManager: "bun@1.3.14"` или актуальный проверенный Bun.
   - Добавить `engines.node: ">=20.9"` или Node 22/24, потому README сейчас говорит Node >=18, но Next 16/Vitest 4 требуют Node 20+.
   - Обновить README под фактические требования.
1. Исправить `bun run typecheck`.
   Текущие ошибки:
   - `examples/websocket/frontend.tsx`: нет `socket.io-client`.
   - `examples/websocket/server.ts`: нет `socket.io`.
   - `mini-services/game-server/index.ts`: `import.meta.dir`, `Bun` types.
   - `src/components/hud/ResourceBar.tsx`: неверная типизация breakdown.
   - `src/components/providers/GameProvider.tsx`: unsafe cast в `GameCommand`.
   - `src/components/screens/RecruitmentScreen.tsx`: possible undefined.
   - `src/engine/save/__tests__/save.test.ts`: cast `SaveFile` -> `Record<string, unknown>`.
2. Исправить `bun run test`.
   - API test suite падает до выполнения тестов на `z.object`.
   - После фикса добавить/сохранить покрытие для invalid checksum, oversized body, invalid query.
3. Исправить `bun run build`.
   - Не тащить demo examples в production typecheck/build или добавить корректные зависимости/типизацию.
   - Сделать build script кроссплатформенным: убрать `cp -r` и inline `NODE_ENV=...` или заменить Node/Bun scripts.
   - Сузить root `tsconfig` до приложения/тестов или исключить `examples/**` и `mini-services/**`; для mini-services сделать отдельный `tsconfig` с `types: ["bun-types"]`.

### P1 — docs/env/API

1. Добавить `.env.example` с безопасным минимумом:
   - `DATABASE_URL="file:./dev.db"`
   - `NEXT_TELEMETRY_DISABLED=1`
   - комментарий, что production secrets не коммитятся.
2. Исправить `.gitignore`: сейчас `.env*` игнорирует `.env.example`; добавить `!.env.example`.
3. Добавить Zod schema для `/api/saves?offset&limit`, чтобы `abc`, `NaN`, отрицательные значения и слишком большие limit возвращали 400, а не 500.
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
