# AI Developer Review: Realms of War

Дата ревью: 2026-06-13  
Проверенный источник: `C:\Users\pcia0\Downloads\realms-of-war-main.zip`  
Распакованный проект: `C:\Users\pcia0\Documents\STR\realms-of-war-main`

## 1. Краткий контекст проекта

`Realms of War` - alpha-прототип пошаговой 4X/strategy-игры на hex-карте. Основной стек: Next.js App Router, TypeScript, React Three Fiber/Three.js, Zustand, Prisma/SQLite, Zod, Vitest, Bun. Проект содержит отдельный игровой движок в `src/engine`, React UI в `src/components`, API сохранений в `src/app/api`, workers для тяжёлых операций и прототип статической версии в `public/prototype/index.html`.

Фактически проверено:

- README, `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `.gitignore`, `Caddyfile`.
- API сохранений: `src/app/api/save/route.ts`, `src/app/api/load/route.ts`, `src/app/api/saves/route.ts`.
- Save/load слой: `src/lib/saveSchemas.ts`, `src/lib/saveService.ts`, `src/engine/save/*`.
- Store и движок: `src/store/*`, `src/engine/core/GameEngine.ts`, `src/workers/workerManager.ts`.
- UI entrypoints и ключевые экраны: `src/app/page.tsx`, `src/app/layout.tsx`, `MainMenuScreen`, `NewGameScreen`, `SettingsScreen`, `TurnPanel`.
- Тесты: найдено 7 test files в `src/**/__tests__` и около 119 `describe/it` matches.
- Поиск секретов по типовым паттернам: реальные ключи/токены в коде не обнаружены.

Не удалось проверить автоматически:

- `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`, `bun install`, `prisma db push`.
- Причина: в текущем окружении команды `bun`, `node`, `docker`, `git` не найдены через PATH.

## 2. Краткий технический вердикт

Проект выглядит как серьёзный alpha-прототип, а не как одноразовый демо-скрипт. Сильная часть - разделение игрового движка, правил, ECS-систем, mapgen, workers и UI. Есть валидация API сохранений через Zod, лимиты размера payload, checksum для случайной порчи сохранений и базовый набор unit/API tests.

К production проект не готов. Главные блокеры: нет authentication/authorization, все server-side сохранения принадлежат общему `ownerId = "local"`, отсутствует `.env.example`, нет CI, автоматические проверки не подтверждены, скрипты в `package.json` Unix-specific и плохо воспроизводятся на Windows, нет e2e/smoke/integration проверки реального Next/Prisma сценария. README честно помечает проект как alpha и перечисляет часть этих ограничений.

Технический уровень: уверенный middle / middle+. До senior production-level не хватает эксплуатационной дисциплины: воспроизводимого запуска, CI, security boundaries, release process, e2e, observability и удаления временных/неиспользуемых частей.

## 3. Итоговая оценка

| Категория | Оценка /10 | Комментарий |
| --- | ---: | --- |
| Идея и продуктовая ценность | 7 | Понятная ниша: hex-based 4X стратегия, есть ядро геймплея и визуальная подача. |
| Архитектура | 7 | Хорошее разделение `engine`, `rules`, `ecs`, `workers`, `components`; есть Command pattern. |
| Качество кода | 6 | В целом структурно, но есть silent failures, TODO, неполный undo, unfinished i18n, неиспользуемые зависимости. |
| Безопасность | 4 | Для local alpha приемлемо; для public deployment блокирует отсутствие auth/access isolation/rate limit/CSRF strategy. |
| Тесты | 4 | Есть unit/API тесты, но нет подтверждённого запуска, e2e, real DB integration, load/list/delete API tests. |
| Документация | 6 | README и docs есть, но README ссылается на отсутствующий `.env.example`; документация частично опережает реализацию. |
| Производительность | 5 | Есть workers и Three.js архитектура, но часть fallback идёт sync, unit rendering не инстансирован. |
| Поддерживаемость | 6 | Модульность хорошая, но нужен CI, quality gates, сокращение зависимостей и устранение незавершённых feature seams. |
| Готовность к продакшену | 2 | Нет auth, CI, env example, verified build/test, deployment hardening, rollback/monitoring. |
| Общий уровень проекта | 5.5 | Хороший alpha-прототип, не production-ready продукт. |

Готовность к показу:

- Клиенту/работодателю как alpha/demo: можно, если честно сказать, что это prototype/MVP и показать ограничения.
- Инвестору как production продукт: рано.
- В продакшен: нельзя без P0/P1 задач ниже.
- Коммерческое использование: только после security, CI, тестов, деплоя и проверки core gameplay.

## 4. Сильные стороны

- Чёткая структура проекта описана в README и в основном совпадает с кодом: `src/engine`, `src/components`, `src/workers`, `src/store`, `src/app/api`.
- Игровая логика вынесена из React в `GameEngine`, rules и ECS-системы. UI в основном вызывает команды, а не мутирует правила напрямую.
- `GameEngine.dispatch()` валидирует команды перед применением и сохраняет executed command log.
- Save/load слой централизован через `src/lib/saveService.ts`, а не размазан по UI.
- API `/api/save` имеет pre-parse size guard, JSON parse handling, Zod validation, checksum check и SaveFile validation.
- Web Workers используют `requestId` для маршрутизации ответов и имеют sync fallback.
- Есть unit tests для hex/rules/save и API route tests для `POST /api/save`.
- `.gitignore` исключает `.env*`, database files, logs, screenshots и build artifacts.
- README честно перечисляет alpha-ограничения: no auth, no multiplayer, incomplete i18n, worker fallback jank.
- В `Caddyfile` есть базовые security headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

## 5. Слабые стороны

- **No auth / shared owner.** `src/app/api/save/route.ts:60`, `src/app/api/load/route.ts:5`, `src/app/api/saves/route.ts:4` используют общий owner `"local"`. В публичном деплое все пользователи будут работать в одном пространстве сохранений.
- **README требует `.env.example`, но файла нет.** README строки 26-32 говорят `cp .env.example .env`, при этом `.env.example` отсутствует.
- **Автоматические проверки не воспроизведены.** В текущей среде нет `bun/node`, поэтому test/typecheck/lint/build не подтверждены.
- **Скрипты не кроссплатформенные.** `package.json:6-8` использует `tee`, `cp -r`, `NODE_ENV=production ...`, что ломается в PowerShell без shell-совместимости.
- **Нет CI.** `.github/workflows` отсутствует, quality gates не закреплены.
- **API list pagination валидируется слабо.** `src/app/api/saves/route.ts:10-14` может передать `NaN` в Prisma при `?limit=abc`.
- **Checksum не security mechanism.** FNV-1a в `src/engine/save/saveGame.ts:101-109` годится для accidental corruption, но не для защиты от подмены.
- **Undo заявлен, но не реализован корректно.** `src/store/slices/commandSlice.ts:94-103` удаляет команду из history, но не откатывает `GameState`.
- **i18n не завершён.** `I18nProvider` есть, но не подключён в `layout.tsx`; экраны содержат hardcoded RU strings.
- **Неиспользуемые зависимости расширяют maintenance/audit surface.** `next-auth`, `@tanstack/react-query`, `@mdxeditor/editor`, `@dnd-kit/*` и часть UI-зависимостей в `package.json` не найдены в `src` как используемые runtime imports.
- **Мини-сервис static server проверяет только `..`.** `mini-services/game-server/index.ts:30-35` не проверяет, что resolved path остался внутри `PUBLIC_DIR`.
- **WebSocket example небезопасен как база для production.** `examples/websocket/server.ts:8-10` ставит `cors.origin = "*"`, нет auth/rate limit/input limits.

## 6. Критичные проблемы

| Приоритет | Проблема | Почему опасно | Как исправить |
| --- | --- | --- | --- |
| P0 | Save API без auth и с общим `ownerId = "local"` | При публичном деплое любой пользователь сможет видеть/создавать/удалять общие сохранения | До production добавить owner/session model или отключить server-side saves для anonymous public режима |
| P0 | Нельзя подтвердить production readiness | Build/test/typecheck/lint/db push не запускались, CI отсутствует | Настроить runtime, выполнить проверки локально и в CI |
| P1 | Нет `.env.example` при обязательной `DATABASE_URL` | Новый разработчик не запустит Prisma/SQLite по README | Добавить `.env.example` с `DATABASE_URL="file:./dev.db"` и production notes |
| P1 | `package.json` scripts Unix-specific | Windows/CI запуск будет нестабилен | Сделать scripts cross-platform или явно закрепить Linux/Bun shell environment |
| P1 | `/api/saves` не валидирует `offset/limit` как числа | Некорректный query может давать 500 вместо 400 | Ввести Zod schema с `z.coerce.number().int().finite()` |
| P1 | Нет tests для real DB/API save/list/load/delete flow | Текущие API тесты мокают DB и проверяют только `POST /api/save` | Добавить integration tests с test SQLite DB |
| P1 | Mini-service static path boundary неполный | Если сервис публикуется, возможна ошибка доступа за пределы public при platform-specific path edge cases | После `resolve()` проверять `filePath.startsWith(PUBLIC_DIR + sep)` |
| P2 | i18n state не влияет на основной UI | Настройка языка вводит пользователя в заблуждение | Подключить `I18nProvider` и заменить hardcoded RU strings поэтапно |
| P2 | Undo UI/state некорректен | Пользователь может ожидать откат, которого нет | Скрыть undo или реализовать snapshot/inverse-command mechanism |
| P2 | Performance TODO по unit instancing | На больших картах/армиях вырастет draw-call pressure | Добавить InstancedUnitLayer или benchmark threshold |

## 7. Security Review

### Найденные позитивные моменты

- Реальные секреты по типовым паттернам не обнаружены.
- `.gitignore` исключает `.env*`, `*.pem`, `*.db`, logs.
- `POST /api/save` ограничивает размер body до 2.2 MB до JSON parse.
- Payload валидируется через Zod.
- Prisma используется через ORM, явных raw SQL-инъекций не обнаружено.
- Caddy добавляет базовые security headers.

### Критичные риски

- **No auth/access control.** Общий `ownerId = "local"` подходит только для локального single-player alpha. В public deployment это P0.
- **No rate limiting / abuse protection.** Любой доступный endpoint сохранений может использовать storage/CPU через повторные POST запросы.
- **No CSRF strategy.** Сейчас нет auth cookies, но при добавлении auth mutating routes должны получить CSRF/session protection.

### Серьёзные риски

- **Checksum не защищает от злонамеренной подмены.** Клиент может пересчитать FNV-1a для изменённого save file.
- **Сохранения доверяют клиентскому GameState.** Для single-player это допустимо; для multiplayer/leaderboards/server authority недопустимо.
- **Mini-service static server не должен публиковаться без root-boundary path validation.**
- **WebSocket example не production-ready:** wildcard CORS, нет auth, нет input limits, нет room isolation.

### Средние и мелкие риски

- `X-XSS-Protection` в Caddyfile устарел; лучше добавить CSP, Permissions-Policy, HSTS при HTTPS.
- В dev `PrismaClient` логирует queries, что нормально локально, но требует контроля при sensitive data.
- `SaveIdSchema` ограничивает длину, но не формат id; лучше `cuid`/uuid pattern.

Вывод: проект нельзя безопасно запускать как публичный production service. Для локального alpha/demo риск приемлем, если сервер сохранений не открыт наружу.

## 8. Рекомендации по архитектуре

- Сохранить текущее разделение `engine` / `rules` / `ecs` / `workers` / `components`. Это правильная основа.
- Для save API принять архитектурное решение: local-only saves, anonymous session saves или authenticated user saves.
- Вынести owner/session resolution в отдельный модуль, например `src/lib/sessionOwner.ts`, чтобы не дублировать `"local"` в routes.
- Зафиксировать public API контракт сохранений через schemas и integration tests.
- Для undo/replay выбрать один подход: state snapshots, inverse commands или replay from initial state.
- Для workers не дублировать сложную domain logic вручную без тестов на equivalence с main-thread implementation.

## 9. Рекомендации по качеству кода

- Убрать silent failures там, где пользователь должен видеть результат: save/load/delete, AI command errors, localStorage persistence.
- В `processQueue()` заменить silent skip invalid commands на typed result, warning event или error collection.
- Ввести shared schemas для query params: `SaveListQuerySchema`, `SaveIdSchema` с форматом.
- Удалить или отложить неиспользуемые зависимости, если они не нужны ближайшему milestone.
- Подключить `I18nProvider` только тогда, когда минимум основные экраны используют `t()`. Иначе лучше временно скрыть language selector.
- Заменить emoji labels в игровых кнопках на lucide icons/доступные labels, если цель - polished UI.

## 10. Рекомендации по тестам

Текущий набор тестов полезен, но не закрывает production risks.

Добавить в первую очередь:

- Smoke test запуска приложения.
- Integration tests для `POST /api/save`, `GET /api/load`, `DELETE /api/load`, `GET /api/saves` с SQLite test DB.
- Negative tests для malformed query params `offset/limit/id`.
- Regression tests для checksum mismatch, oversized payload, corrupted SaveFile.
- E2E: start new game -> end turn -> save -> return menu -> load -> state restored.
- Worker equivalence tests: mapgen/pathfinding worker result совпадает с sync fallback на фиксированных seeds.
- Accessibility smoke: keyboard navigation по main menu/new game/settings.

## 11. Рекомендации по документации

- Добавить `.env.example` и привести README к фактическому состоянию.
- Отдельно описать Windows запуск или явно указать Linux/macOS/Bash requirement.
- В README добавить статус проверок: какие команды должны пройти перед PR.
- Документировать, что server-side saves сейчас local-alpha only.
- Сократить/структурировать `docs/*`, чтобы existing AI reviews не конкурировали с актуальным README.

## 12. Рекомендации по инфраструктуре и деплою

- Добавить GitHub Actions или другой CI: install, Prisma generate, typecheck, lint, test, build.
- Сделать scripts cross-platform через `cross-env`, `shx` или Bun-native commands.
- Настроить dependency audit. Сейчас audit не выполнен.
- Для deploy описать `DATABASE_URL`, миграции, backup/restore и rollback.
- Не публиковать `mini-services/game-server` без path boundary hardening.
- Для Caddy production добавить HTTPS/HSTS/CSP или явно указать, что TLS завершается выше.

## 13. Что улучшить в первую очередь

1. Добавить `.env.example`. Влияние: высокое.
2. Настроить Bun/Node окружение и подтвердить `bun install`, `test`, `typecheck`, `lint`, `build`. Влияние: высокое.
3. Сделать scripts кроссплатформенными или зафиксировать Linux shell requirement. Влияние: высокое.
4. Добавить CI quality gates. Влияние: высокое.
5. Вынести owner/session для save API, убрать дублирование `"local"`. Влияние: высокое.
6. Валидировать query params `/api/saves`. Влияние: среднее.
7. Добавить integration tests для save/list/load/delete с SQLite. Влияние: высокое.
8. Добавить e2e happy path нового game session. Влияние: высокое.
9. Исправить/скрыть undo до настоящего state rollback. Влияние: среднее.
10. Подключить или отложить i18n selector. Влияние: среднее.
11. Harden mini-service static path handling. Влияние: среднее.
12. Удалить неиспользуемые зависимости. Влияние: среднее.
13. Добавить performance benchmark для large maps/unit count. Влияние: среднее.
14. Добавить CSP/HSTS/deployment security notes. Влияние: среднее.

## 14. Что можно поручить AI-агенту или Codex

| Задача | Сложность | Риск | Что проверить после выполнения |
| --- | ---: | ---: | --- |
| Добавить `.env.example` и обновить README | low | low | Новый запуск по README работает |
| Исправить `/api/saves` query validation через Zod | low | low | Invalid params дают 400, tests проходят |
| Вынести `OWNER_ID` в helper/session module | medium | medium | API behavior не изменился для local alpha |
| Добавить integration tests для save API | medium | medium | Tests используют isolated SQLite DB |
| Сделать scripts cross-platform | medium | medium | Команды работают в PowerShell и Linux shell |
| Добавить GitHub Actions workflow | medium | medium | CI запускает install/typecheck/lint/test/build |
| Подключить `I18nProvider` и перевести 1-2 экрана | medium | medium | Language switch реально меняет UI |
| Harden mini-service static path | low | medium | Path traversal tests проходят |
| Удалить неиспользуемые зависимости | medium | medium | Build/test не ломаются, bundle не растёт |
| Добавить Playwright e2e smoke | medium | medium | E2E проходит локально и в CI |

Не отдавать AI без ручного контроля:

- Финальное решение по auth модели и ownership semantics.
- Изменение схемы БД с реальными сохранениями.
- Баланс геймплея, AI difficulty, economy/combat tuning.
- Production deployment credentials, domains, TLS, backups.
- Решение о commercial release readiness.

## 15. План доработки

### Быстрые правки на 1 день

- Добавить `.env.example`.
- Исправить README по Windows/Linux требованиям.
- Исправить `/api/saves` query validation.
- Harden mini-service path validation.
- Убрать/пометить undo как not implemented.

### Правки на 3-5 дней

- Настроить CI.
- Подтвердить `test/typecheck/lint/build`.
- Добавить integration tests для Prisma save API.
- Добавить e2e smoke для start/save/load.
- Сократить/проверить зависимости.

### Правки на 1-2 недели

- Решить owner/session/auth для server-side saves.
- Подключить i18n или убрать user-facing language selector до готовности.
- Добавить performance benchmarks для mapgen/pathfinding/rendering.
- Покрыть worker fallback equivalence tests.
- Подготовить deploy/release checklist.

### Перед продакшеном

- Auth/access isolation.
- Rate limit и abuse protection.
- CI green на PR.
- Dependency audit без critical/high blockers.
- E2E для ключевых сценариев.
- Backup/restore для save DB.
- Monitoring/logging.
- Rollback plan.
- HTTPS/HSTS/CSP.

## 16. Backlog задач для AI-разработчика

| ID | Приоритет | Область | Проблема | Рекомендация | Критерий готовности | Риск |
| -- | --------- | ------- | -------- | ------------ | ------------------- | ---- |
| TASK-001 | P0 | security | Shared save owner `"local"` | Ввести owner/session abstraction | Public saves изолированы или public save API отключён | High |
| TASK-002 | P0 | infra | Проверки не воспроизводятся | Настроить runtime и CI | install/typecheck/lint/test/build проходят | High |
| TASK-003 | P1 | docs/infra | Нет `.env.example` | Добавить env template | README запуск работает | Low |
| TASK-004 | P1 | infra | Unix-only scripts | Сделать scripts cross-platform | Команды работают в PowerShell/Linux | Medium |
| TASK-005 | P1 | API/tests | `/api/saves` принимает NaN params | Добавить Zod query schema | Invalid query возвращает 400 | Low |
| TASK-006 | P1 | tests | Нет real DB API tests | Добавить SQLite integration tests | save/list/load/delete покрыты | Medium |
| TASK-007 | P1 | security | Mini-service path boundary неполный | Проверять resolved path inside public | Traversal tests проходят | Medium |
| TASK-008 | P2 | UX/i18n | Language setting не меняет основной UI | Подключить I18nProvider или скрыть selector | RU/EN switch работает на выбранных экранах | Medium |
| TASK-009 | P2 | code quality | Undo удаляет history без отката state | Реализовать snapshot/inverse undo или скрыть | Пользователь не видит ложный undo | Medium |
| TASK-010 | P2 | performance | Unit rendering не инстансирован | Benchmark + InstancedUnitLayer | Large unit count не просаживает FPS критично | Medium |
| TASK-011 | P2 | dependencies | Неиспользуемые deps | Audit/remove unused packages | Build/test проходят после cleanup | Medium |
| TASK-012 | P2 | docs/release | Нет production checklist в проекте | Добавить release/deploy docs | Новый maintainer понимает deploy steps | Low |

## 17. Подробные task cards

### TASK-001: Ввести owner/session модель для save API

**Приоритет:** P0  
**Область:** security / architecture / API  
**Сложность:** high  
**Риск изменений:** high

#### Проблема
API сохранений использует общий owner `"local"` в `src/app/api/save/route.ts`, `src/app/api/load/route.ts`, `src/app/api/saves/route.ts`.

#### Почему это важно
В публичном деплое все пользователи будут видеть и удалять общие сохранения. Это блокирует production.

#### Что нужно сделать
- Принять режим: local-only, anonymous session или authenticated users.
- Вынести получение owner в `src/lib/sessionOwner.ts`.
- Для local alpha сохранить fallback `"local"` только в dev/local режиме.
- Для production требовать session/user id или отключать server-side save API.
- Добавить tests на isolation.

#### Затронутые файлы/модули
- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- `src/app/api/saves/route.ts`
- `prisma/schema.prisma`
- новый `src/lib/sessionOwner.ts`

#### Критерии приёмки
- Два разных owner не видят сохранения друг друга.
- `DELETE` не удаляет чужой save.
- В production нет silent fallback к общему owner.

#### Как проверить
- Integration tests с двумя owner ids.
- Manual API check: create save owner A, list/load/delete as owner B returns 404/empty.

#### Что не менять без согласования
Не менять публичный UX сохранений и схему данных для существующих save files без миграционного решения.

### TASK-002: Настроить воспроизводимые quality gates

**Приоритет:** P0  
**Область:** infra / tests  
**Тип тестов:** smoke / unit / integration / build  
**Сложность:** medium  
**Риск изменений:** medium

#### Что покрыть
- Install dependencies.
- Prisma generate/db push for test DB.
- Typecheck.
- Lint.
- Unit/API tests.
- Next build.

#### Тестовые данные
- Test SQLite DB через временный `DATABASE_URL`.
- Minimal valid SaveFile fixtures.

#### Критерии приёмки
- Одна documented команда запускает все проверки локально.
- CI запускает те же проверки на PR.
- Проверки не требуют реальных секретов.

#### Как проверить
- `bun install`
- `bun run db:generate`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`

#### Что не менять без согласования
Не менять игровую логику ради прохождения CI без отдельной задачи.

### TASK-003: Добавить `.env.example`

**Приоритет:** P1  
**Область:** docs / infra  
**Сложность:** low  
**Риск изменений:** low

#### Проблема
README требует `cp .env.example .env`, но `.env.example` отсутствует.

#### Почему это важно
Проект не запускается новым разработчиком по инструкции.

#### Что нужно сделать
- Добавить `.env.example`.
- Указать `DATABASE_URL="file:./dev.db"`.
- Добавить комментарии для optional auth env, если auth будет внедряться.

#### Затронутые файлы/модули
- `.env.example`
- `README.md`

#### Критерии приёмки
- `cp .env.example .env` работает.
- `bun run db:push` может создать локальную SQLite DB.
- В `.env.example` нет реальных секретов.

#### Как проверить
- Создать свежий checkout.
- Скопировать env.
- Запустить Prisma db push.

#### Что не менять без согласования
Не добавлять реальные credentials.

### TASK-004: Сделать scripts кроссплатформенными

**Приоритет:** P1  
**Область:** infra  
**Сложность:** medium  
**Риск изменений:** medium

#### Проблема
`package.json` использует Unix shell syntax: `tee`, `cp -r`, `NODE_ENV=production`.

#### Почему это важно
Проект распакован на Windows, но команды из README не гарантированно работают в PowerShell.

#### Что нужно сделать
- Использовать `cross-env` для env vars или Bun-compatible альтернативу.
- Заменить `cp -r` на cross-platform copy script.
- Убрать обязательный `tee` из npm scripts или вынести логирование в shell-specific scripts.

#### Затронутые файлы/модули
- `package.json`
- `.zscripts/*`
- `README.md`

#### Критерии приёмки
- `bun run dev`, `bun run build`, `bun run start` работают на Windows и Linux.
- README явно описывает поддерживаемые shell environments.

#### Как проверить
- Запуск в PowerShell.
- Запуск в Linux shell/CI.

#### Что не менять без согласования
Не менять порт и deployment layout без обновления Caddy/deploy docs.

### TASK-005: Валидировать query params `/api/saves`

**Приоритет:** P1  
**Область:** API / code quality / tests  
**Тип тестов:** unit / API / negative  
**Сложность:** low  
**Риск изменений:** low

#### Что покрыть
- `offset` отсутствует.
- `limit` отсутствует.
- `offset=abc`.
- `limit=abc`.
- negative values.
- excessive limit.

#### Тестовые данные
Mocked DB tests и integration DB tests.

#### Критерии приёмки
- Invalid params возвращают 400.
- Valid params нормализуются.
- `limit` ограничен `MAX_LIMIT`.

#### Как проверить
- Добавить tests для `GET /api/saves`.
- Выполнить `bun run test`.

#### Что не менять без согласования
Не менять формат успешного response `{ saves }`.

### TASK-006: Добавить integration tests для save API

**Приоритет:** P1  
**Область:** tests / API / database  
**Тип тестов:** integration / regression / security  
**Сложность:** medium  
**Риск изменений:** medium

#### Что покрыть
- Save creates DB row.
- List returns owner-scoped saves sorted by `updatedAt`.
- Load returns save data/checksum.
- Delete removes only matching owner save.
- Invalid id/params return 400/404, not 500.

#### Тестовые данные
- Temporary SQLite DB.
- Valid SaveFile fixture.
- Two owner fixtures after TASK-001.

#### Критерии приёмки
- Tests run locally and in CI.
- DB is isolated per test run.
- Positive, negative and boundary cases covered.

#### Как проверить
- `DATABASE_URL=file:./test.db bun run test`
- CI job with test DB setup.

#### Что не менять без согласования
Не менять Prisma schema без migration plan.

### TASK-007: Harden mini-service static server path handling

**Приоритет:** P1  
**Область:** security / infra  
**Сложность:** low  
**Риск изменений:** medium

#### Проблема
`mini-services/game-server/index.ts` проверяет `path.includes('..')`, но не проверяет resolved absolute boundary.

#### Почему это важно
Если сервис будет доступен извне, path handling должен быть root-bound.

#### Что нужно сделать
- Decode URL path safely.
- Resolve absolute file path.
- Проверить, что normalized file path starts with normalized `PUBLIC_DIR`.
- Добавить tests для traversal cases.

#### Затронутые файлы/модули
- `mini-services/game-server/index.ts`

#### Критерии приёмки
- Запросы traversal возвращают 403.
- Валидные файлы из `public` продолжают отдаваться.

#### Как проверить
- Unit tests для path resolver helper.
- Manual curl requests с `%2e%2e`, backslashes, absolute paths.

#### Что не менять без согласования
Не менять root route `/` -> `/prototype/index.html`, если mini-service нужен для прототипа.

### TASK-008: Завершить или скрыть i18n

**Приоритет:** P2  
**Область:** UX / i18n  
**Сложность:** medium  
**Риск изменений:** medium

#### Проблема
Language setting сохраняется, но основной UI не использует `I18nProvider/useI18n`.

#### Почему это важно
Настройка языка не должна быть декоративной.

#### Что нужно сделать
- Подключить `I18nProvider` в `layout.tsx`.
- Перевести main menu, settings, new game как первый vertical slice.
- Либо скрыть language selector до готовности.

#### Затронутые файлы/модули
- `src/app/layout.tsx`
- `src/components/providers/I18nProvider.tsx`
- `src/components/screens/*`
- `src/data/localization/*`

#### Критерии приёмки
- Переключение RU/EN меняет основные экраны.
- Missing keys не показываются пользователю в critical UI.

#### Как проверить
- Manual UI check.
- Component tests для `t()` fallback/interpolation.

#### Что не менять без согласования
Не менять игровые термины/локализацию без product review.

### TASK-009: Реализовать корректный undo или убрать из UX

**Приоритет:** P2  
**Область:** code quality / UX  
**Сложность:** high  
**Риск изменений:** high

#### Проблема
`undoLastCommand` удаляет команду из history, но не откатывает состояние.

#### Почему это важно
Ложный undo ломает ожидания пользователя и может создать рассинхрон save/replay.

#### Что нужно сделать
- Выбрать подход: snapshots, inverse commands или replay.
- До реализации скрыть UX action, если она где-то появится.
- Добавить tests.

#### Затронутые файлы/модули
- `src/store/slices/commandSlice.ts`
- `src/engine/core/GameEngine.ts`
- command handlers/rules

#### Критерии приёмки
- Undo реально возвращает previous GameState.
- Save/replay остаются консистентными.

#### Как проверить
- Unit tests: command -> undo -> state equals previous snapshot.

#### Что не менять без согласования
Не менять semantics команд без game design review.

### TASK-010: Добавить e2e smoke для ключевого сценария

**Приоритет:** P1  
**Область:** tests / UX  
**Тип тестов:** e2e / smoke / regression  
**Сложность:** medium  
**Риск изменений:** medium

#### Что покрыть
- Открыть main menu.
- Start new game.
- Дождаться world generation.
- End turn.
- Save.
- Return to menu.
- Load save.

#### Тестовые данные
- Deterministic seed option или test-only config.
- Temporary SQLite DB.

#### Критерии приёмки
- E2E проходит локально.
- E2E запускается в CI.
- Тест не flaky на генерации карты.

#### Как проверить
- Playwright/Cypress command after dev server startup.

#### Что не менять без согласования
Не менять user-facing flow только ради теста; лучше добавить test hooks.

## 18. Acceptance criteria для важных задач

- P0 security: public deployment не использует общий owner; чужие saves недоступны.
- P0 quality gates: CI green на install/typecheck/lint/test/build.
- P1 docs: README запуск воспроизводим на чистой машине.
- P1 API: malformed input даёт 400, не 500.
- P1 tests: save/list/load/delete покрыты real DB integration.
- P2 UX: language selector либо работает, либо скрыт.
- P2 undo: либо настоящий rollback, либо нет ложной команды в UI.

## 19. Что обязательно проверить после задач

- `bun install`
- `bun run db:generate`
- `bun run db:push` на fresh SQLite DB
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`
- Manual smoke: start game, end turn, save, list, load, delete.
- Security smoke: malformed JSON, oversized payload, invalid id, invalid query, cross-owner access.
- UX smoke: keyboard navigation main menu/settings/new game.

## 20. Production Checklist

| Проверка | Статус |
| --- | --- |
| Проект запускается с нуля по README | не проверено |
| Есть `.env.example` без секретов | нет |
| Все секреты вынесены из репозитория | частично проверено, секреты не найдены |
| Зависимости проверены на уязвимости | не проверено |
| lint/typecheck/test проходят локально | не проверено |
| CI запускает проверки на pull request | нет |
| Миграции применяются на чистую БД | не проверено |
| Есть smoke test после деплоя | нет |
| Есть rollback plan | нет |
| Есть backup/restore plan | нет |
| Есть базовое логирование ошибок | частично |
| Есть мониторинг или план мониторинга | нет |
| Публичные endpoint защищены от типовых злоупотреблений | нет |
| Критичные сценарии покрыты e2e или ручным QA checklist | частично docs, e2e нет |
| Документация позволяет новому разработчику запустить проект | нет, из-за `.env.example` и runtime ambiguity |

## 21. QA/Test Strategy

Стратегия должна быть risk-based:

- Unit tests для чистой игровой логики: hex, movement, combat, city, research, economy, victory.
- Integration tests для save API + Prisma + SQLite.
- Worker equivalence tests для async/sync branches.
- E2E smoke для главного пользовательского сценария.
- Negative/boundary tests для API input и save file parsing.
- Accessibility smoke для меню и основных панелей.
- Performance sanity tests для mapgen/pathfinding/rendering на больших картах.

## 22. Test Coverage Matrix

| Область / сценарий | Риск | Сейчас покрыто | Что добавить | Тип теста | Приоритет | Критерий готовности |
| --- | --- | --- | --- | --- | --- | --- |
| Hex math | Medium | есть `hex.test.ts` | regression for edge coordinates | unit | P2 | Все hex invariants стабильны |
| Movement/combat/city/research rules | High | есть unit tests | economy/victory/diplomacy coverage | unit | P1 | Critical rules покрыты boundary/negative |
| Save serialization | High | есть save tests | corrupted/large/future migration cases | unit/regression | P1 | Save load не теряет config/rng/command log |
| `POST /api/save` | High | есть mocked route tests | real DB integration | integration | P1 | DB row создаётся и валидируется |
| `GET /api/load` | High | не найдено | success/404/invalid id | API/integration | P1 | Load возвращает только owner save |
| `DELETE /api/load` | High | не найдено | delete own/not foreign | API/security | P1 | Delete не удаляет чужие saves |
| `GET /api/saves` pagination | Medium | не найдено | invalid offset/limit | API/negative | P1 | Invalid query даёт 400 |
| Start new game | High | не найдено | UI e2e | e2e/smoke | P1 | World generated and HUD visible |
| Save/load user flow | High | не найдено | UI e2e with DB | e2e/regression | P1 | Save can be loaded after returning menu |
| Workers fallback | Medium | не найдено | async vs sync equivalence | unit/integration | P2 | Same seed/result for tested cases |
| Accessibility main screens | Medium | не найдено | keyboard/focus checks | accessibility | P2 | Main flows usable by keyboard |
| Dependency audit | High | не проверено | audit job | security | P1 | No critical/high unresolved advisories |

## 23. Minimal Test Suite

1. Smoke: app builds and starts.
2. Unit: hex, mapgen validation, movement/combat/city/research/economy/victory.
3. Integration: save API with SQLite.
4. Negative: invalid payload, invalid query, malformed save, oversized save.
5. Auth/access: owner isolation after TASK-001.
6. E2E: start -> end turn -> save -> load.
7. Regression: every fixed bug gets a test.
8. Security: dependency audit, secret scan, traversal tests for mini-service.
9. Migration: fresh DB and existing save version.
10. Performance sanity: large mapgen/pathfinding/rendering smoke.

## 24. Regression Checklist

- Existing unit tests pass.
- Save/load still preserves `gameConfig`, `rngState`, `commandLog`.
- Main menu/new game/settings still render.
- No new hardcoded secrets.
- Invalid API inputs return 400/413/404, not 500.
- `.env.example` remains secret-free.
- README commands match `package.json`.

## 25. Release Smoke Checklist

- Fresh checkout.
- Copy `.env.example` to `.env`.
- Install dependencies.
- Generate Prisma client.
- Apply schema to clean DB.
- Run lint/typecheck/test/build.
- Start production server.
- Manual browser smoke: start game, save, load.
- Check logs for unexpected errors.
- Verify rollback plan and DB backup location.

## 26. Test Data Requirements

- Minimal valid `GameState` fixture.
- Minimal valid `GameConfig` fixture.
- Valid SaveFile JSON with deterministic checksum.
- Corrupted SaveFile JSON.
- Oversized payload fixture or generated string.
- Two owner/session fixtures for access isolation.
- Fixed map seeds for deterministic mapgen tests.
- UI test DB with disposable save rows.

## 27. CI Quality Gates

Minimum PR gates:

- Install with lockfile.
- Prisma generate.
- TypeScript typecheck.
- ESLint.
- Vitest unit/API tests.
- Next build.
- Dependency audit.
- Optional: Playwright smoke.
- Optional: coverage threshold for `src/engine`.

## 28. Manual QA Checklist

- Main menu buttons work.
- New game panel works for 2/3/4 players.
- Map generation completes for all map sizes.
- End turn works for human and AI.
- Save success/failure notifications are visible.
- Load panel handles empty, loading, success and error states.
- Settings sliders/selects persist after reload.
- UI remains usable on narrow viewport.
- Keyboard navigation covers modal close, menu actions, form controls.
- Color blind mode has visible effect if exposed.

## 29. Non-functional Testing

- Performance: large map generation, AI turn latency, pathfinding latency, render FPS with many units.
- Security: auth/access, rate limit, malicious save payload, traversal, dependency audit.
- Accessibility: labels, focus state, contrast, keyboard navigation, screen-reader names for icon buttons.
- Compatibility: Chrome/Edge/Firefox, Windows/Linux shell behavior.
- Reliability: worker failure fallback, DB failure, save corruption, localStorage malformed settings.

## 30. Areas Not Verified

- Actual runtime behavior in browser.
- Build output correctness.
- TypeScript/ESLint status.
- Vitest pass/fail.
- Prisma DB creation.
- Dependency vulnerabilities.
- Bundle size.
- Real accessibility behavior.
- Real FPS/performance.
- Production deployment.
- Backup/restore.
- Existing Git history, because archive has no `.git` and `git` is unavailable in PATH.

## 31. Открытые вопросы к владельцу проекта

1. Проект должен остаться local single-player alpha или планируется public web deployment?
2. Нужны ли server-side saves вообще, или достаточно localStorage/IndexedDB для alpha?
3. Если нужны server-side saves, какой owner model ожидается: anonymous session, login, invite-only?
4. Целевой runtime для разработки: Windows PowerShell, WSL/Linux, macOS или container?
5. Нужно ли реально поддерживать RU/EN UI в alpha?
6. Какой минимальный MVP для показа: start/end/save/load или полноценный gameplay loop до победы?
7. Планируется ли multiplayer? Если да, текущая client-authoritative модель сохранений и команд потребует пересмотра.
8. Где предполагается деплой: Vercel, VPS+Bun, Docker, Caddy reverse proxy?
9. Нужны ли требования по сохранению пользовательских данных, backup/restore и privacy?
10. Какие 3-5 пользовательских сценариев являются критичными для демо?

