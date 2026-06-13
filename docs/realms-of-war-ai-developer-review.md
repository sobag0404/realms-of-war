# Realms of War — техническое ревью и план доработки для AI-разработчика

**Роль документа:** рабочее техническое задание для AI-разработчика / Codex / агентной доработки проекта после ревью ZIP-архива `realms-of-war-main`.

**Цель:** довести проект из состояния сильного технического прототипа до более стабильного MVP: исправить блокирующие баги, закрыть базовые security-риски, стабилизировать сохранения, улучшить тесты, инфраструктуру и поддерживаемость.

**Важно:** это конструктивная критика. Проект уже имеет хорошую архитектурную базу: выделенный game engine, rules-слой, ECS, workers, Zustand slices, Prisma/SQLite saves, unit-тесты. Основная проблема не в идее и не в общей структуре, а в незавершённости нескольких критичных сквозных сценариев.

---

## 1. Краткий технический вердикт

Проект — браузерная hex/4X strategy game на **Next.js / React / TypeScript** с кастомным deterministic game engine. В проекте есть карта, юниты, города, исследования, AI, сохранения, web workers и базовый набор unit-тестов.

После исправлений структура стала заметно взрослее: `engine`, `rules`, `ecs`, `save`, `workers`, `store`, `components`, `api` разделены достаточно логично. Это уже не хаотичный прототип, а нормальная база для MVP.

Но до production-ready состояния проект пока не дошёл. Есть минимум два блокера:

1. **Сценарий “сохранить → загрузить” сейчас сломан** из-за несовместимости нового формата `SaveFile` и старого UI-кода загрузки.
2. **Production build-скрипт невоспроизводим**, потому что ожидает `./db/custom.db`, которого нет в репозитории.

Дополнительно есть серьёзный security-риск: API сохранений работает без авторизации и использует общий `ownerId = "local"`. Для локального прототипа это допустимо, для публичного деплоя — нет.

---

## 2. Уровень проекта

| Категория | Оценка /10 | Комментарий |
|---|---:|---|
| Идея и продуктовая ценность | 7.0 | Идея понятная: fantasy 4X/hex strategy. Есть потенциал MVP. |
| Архитектура | 7.0 | Слои разделены неплохо, но есть расхождения между engine и workers. |
| Качество кода | 6.0 | Код читаемый, но есть `@ts-nocheck`, `any`, крупные файлы, silent catch. |
| Безопасность | 4.0 | Нет явных секретов, есть Prisma/Zod, но нет auth, rate limit, server-side checksum validation. |
| Тесты | 5.0 | Есть unit-тесты rules/save/hex, но нет API/e2e/worker regression tests. |
| Документация | 6.0 | README полезный, но отсутствует `.env.example`, слабый deploy/API/security раздел. |
| Производительность | 6.0 | Workers и rendering-слои есть, но fallback может блокировать UI, instancing не везде доведён. |
| Поддерживаемость | 6.5 | Хорошая база, но нужны CI, stricter TS/ESLint и устранение дублирования logic. |
| Готовность к production | 3.0 | Нельзя запускать публично без исправления P0/P1. |
| Общий уровень | 6.0 | Сильный прототип / MVP-кандидат, но не production-grade. |

**Оценочный уровень разработки:** junior+ / middle-.  
**Архитектурная задумка:** ближе к middle.  
**Готовность к клиентскому demo:** после исправления P0.  
**Готовность к production:** нет.  
**Готовность к коммерческому использованию:** нет, сначала нужны auth, save/load stability, CI, тесты, deployment hardening.

---

## 3. Главные сильные стороны

1. **Хорошее разделение структуры.**  
   Основные зоны ответственности разделены по директориям:

   ```text
   src/app/api
   src/components
   src/engine
   src/engine/rules
   src/engine/ecs
   src/engine/save
   src/rendering
   src/store/slices
   src/workers
   prisma
   docs
   ```

2. **Game engine вынесен отдельно от React UI.**  
   `src/engine/core/GameEngine.ts` выступает фасадом для команд, правил и состояния. Это правильное направление.

3. **Есть доменный rules-слой.**  
   Файлы `movementRules.ts`, `combatRules.ts`, `cityRules.ts`, `researchRules.ts` позволяют тестировать бизнес-логику отдельно от UI.

4. **Есть deterministic RNG.**  
   `src/engine/core/GameRng.ts` — хороший фундамент для сохранений, replay, AI-debugging и потенциального multiplayer.

5. **Есть новый формат сохранений.**  
   `src/engine/save/saveGame.ts`, `loadGame.ts`, `migrations.ts`, `src/lib/saveService.ts` — правильный шаг к версионированию и миграциям.

6. **Есть unit-тесты.**  
   Найдены тесты для hex math, movement, combat, city, research, save/load. Это уже сильнее типичного pet-проекта.

7. **API использует Prisma.**  
   Это снижает риск SQL-инъекций относительно ручного SQL.

8. **Есть Zod-валидация API payload.**  
   `src/lib/saveSchemas.ts` — хорошая база, но её нужно усилить.

9. **WorkerManager стал лучше.**  
   Есть `requestId`, timeout, pending requests и fallback-модель. Это хороший фундамент.

10. **README честно фиксирует ограничения.**  
    Это плюс: проект не маскирует alpha-status.

---

## 4. Главные слабые места

### 4.1. Сломан сценарий загрузки сохранений

**Файлы:**

```text
src/components/screens/MainMenuScreen.tsx
src/store/slices/sessionSlice.ts
src/lib/saveService.ts
src/engine/save/loadGame.ts
```

В `sessionSlice.saveGame()` сохраняется новый формат `SaveFile`:

```ts
const saveFile = createSaveFile({ ... });
const { data, checksum } = serializeSaveWithChecksum(saveFile);
```

Но в `MainMenuScreen.tsx` загрузка делает так:

```ts
const gameState: GameState = JSON.parse(data.data);
loadGame(gameState);
```

Это старый путь. `JSON.parse(data.data)` теперь возвращает не `GameState`, а `SaveFile`. Поэтому загрузка будет падать или восстанавливать состояние некорректно.

**Почему это критично:** сохранения — базовый пользовательский сценарий. Если игра сохраняется, но не загружается, MVP нельзя считать рабочим.

---

### 4.2. Save API без авторизации

**Файлы:**

```text
src/app/api/save/route.ts
src/app/api/load/route.ts
src/app/api/saves/route.ts
prisma/schema.prisma
```

Сейчас используется общий owner:

```ts
const ownerId = 'local';
const OWNER_ID = 'local';
```

**Для локального single-player прототипа это нормально.**  
**Для публичного сервера это опасно.**

Любой пользователь публичного приложения сможет работать с общим пулом сохранений: создавать, видеть список, загружать и удалять чужие saves.

---

### 4.3. Production build-скрипт невоспроизводим

**Файл:**

```text
.zscripts/build.sh
```

Скрипт ожидает:

```bash
./db/custom.db
```

Но в репозитории такого файла нет. Скрипт завершится ошибкой:

```bash
Error: Test database not found at ./db/custom.db, cannot build production package
```

**Почему это критично:** production artifact нельзя собрать воспроизводимо.

---

### 4.4. README требует `.env.example`, но файла нет

**Файл:**

```text
README.md
```

README предлагает:

```bash
cp .env.example .env
```

Но `.env.example` отсутствует. Новый разработчик сразу упирается в ошибку запуска.

---

### 4.5. Workers отключают TypeScript-проверку

**Файлы:**

```text
src/workers/pathfinding.worker.ts
src/workers/ai.worker.ts
src/workers/mapgen.worker.ts
src/workers/simulation.worker.ts
```

В каждом стоит:

```ts
// @ts-nocheck
```

Это снижает пользу TypeScript именно в самых сложных местах: AI, map generation, simulation, pathfinding.

---

### 4.6. Логика workers дублирует engine/rules

Workers содержат упрощённые копии логики. Это опасно, потому что со временем поведение preview/AI/simulation начнёт расходиться с реальным engine.

Пример риска:

- `engine/rules/combatRules.ts` считает бой одним способом;
- `src/workers/simulation.worker.ts` может считать упрощённым способом;
- UI или AI принимает решение на основе simulation worker;
- реальный `GameEngine` применяет другое поведение.

---

### 4.7. Command log/replay заявлен, но фактически неполный

**Файлы:**

```text
src/engine/core/GameEngine.ts
src/engine/core/CommandQueue.ts
src/store/slices/sessionSlice.ts
```

`sessionSlice.saveGame()` сохраняет:

```ts
commandLog: engine.getCommandQueue().toArray()
```

Но `GameEngine.dispatch()` не добавляет выполненные команды в `CommandQueue`. Поэтому `commandLog` может быть пустым или не отражать реальную историю.

---

### 4.8. Валидация движения недостаточна

**Файлы:**

```text
src/engine/core/GameEngine.ts
src/engine/rules/movementRules.ts
src/engine/ecs/systems/MovementSystem.ts
```

`validateMoveUnit()` проверяет destination через `canMoveTo()`, но `MovementSystem.process()` применяет `command.path`. `applyMovement()` не проверяет строго:

- что path начинается с текущей позиции юнита;
- что каждый шаг соседний;
- что промежуточные hex walkable;
- что путь не проходит через запрещённые клетки;
- что стоимость соответствует реальному маршруту.

Это особенно важно перед future multiplayer/server-authoritative режимом.

---

### 4.9. Checksum сохранений слабый и не проверяется сервером

**Файлы:**

```text
src/lib/saveSchemas.ts
src/app/api/save/route.ts
src/app/api/load/route.ts
src/lib/saveService.ts
```

Сейчас regex допускает пустой checksum:

```ts
checksum: z.string().regex(/^[a-f0-9]{0,16}$/i)
```

Также API принимает checksum от клиента и сохраняет его без серверного пересчёта. При загрузке checksum не проверяется.

---

### 4.10. Body size limit применяется слишком поздно

**Файл:**

```text
src/app/api/save/route.ts
```

Сейчас:

```ts
const body = await request.json();
...
if (data.length > MAX_SAVE_BYTES) { ... }
```

Большой JSON уже будет загружен и распарсен в память до проверки. Это DoS-risk.

---

## 5. Приоритеты исправлений

| Приоритет | Проблема | Почему опасно | Как исправить |
|---|---|---|---|
| P0 | Save/load flow несовместим | Базовый сценарий игры сломан | Перевести UI загрузку на `loadSaveFile()` и `store.loadSaveFile(saveFile)` |
| P0 | Build script требует отсутствующий DB | Production artifact не собирается | Убрать обязательный `./db/custom.db`, перейти на миграции/init DB |
| P1 | Save API без auth | При публичном деплое saves общие для всех | Добавить owner из auth/session или отключить server saves для public mode |
| P1 | Checksum не проверяется сервером | Можно сохранять повреждённые/поддельные данные | Пересчитывать checksum server-side, проверять при load |
| P1 | Нет API/e2e тестов save/load | Регресс уже прошёл незамеченным | Добавить integration/e2e tests |
| P1 | Workers с `@ts-nocheck` | Ошибки типов скрыты в сложной логике | Постепенно типизировать protocol/state subsets |
| P1 | Дублирование engine logic в workers | Preview/AI/simulation будут расходиться с real engine | Вынести shared pure logic или явно ограничить workers preview-only |
| P1 | Command log не отражает dispatch history | Replay/determinism/save promises не выполняются | Ввести executedCommandLog или append в dispatch |
| P2 | Нет `.env.example` | Новый разработчик не запускает проект по README | Добавить `.env.example` с `DATABASE_URL` |
| P2 | `.gitignore` сломан | В репозиторий попадают tool-results/мусор | Исправить строку и удалить `tool-results/` из repo |
| P2 | Hardcoded scripts paths | Скрипты непереносимы | Удалить или переписать `start-game.sh`, `watchdog.sh` |
| P2 | ESLint слишком мягкий | Технический долг растёт | Ужесточать правила поэтапно |

---

# 6. Задачи для AI-разработчика

Ниже — задачи, которые можно поручить AI-агенту. Выполнять строго по приоритетам. Не смешивать всё в один огромный PR.

---

## Задача 1. Исправить загрузку сохранений нового формата

**Приоритет:** P0  
**Сложность:** средняя  
**Риск:** средний  
**Файлы:**

```text
src/components/screens/MainMenuScreen.tsx
src/store/slices/sessionSlice.ts
src/lib/saveService.ts
src/engine/save/loadGame.ts
src/engine/save/__tests__/save.test.ts
```

### Проблема

UI загружает `SaveFile` как `GameState`:

```ts
const gameState: GameState = JSON.parse(data.data);
loadGame(gameState);
```

Нужно использовать новый формат:

1. Получить `data.data` из API.
2. Проверить checksum.
3. Десериализовать через `loadSaveFile()` из `src/lib/saveService.ts`.
4. Передать `LoadResult.saveFile` в `store.loadSaveFile(saveFile)`.

### Что сделать

1. В `MainMenuScreen.tsx` заменить legacy load path.
2. Импортировать нужные функции:

   ```ts
   import { loadSaveFile, verifyChecksum } from '@/lib/saveService';
   ```

3. Из store использовать не `loadGame`, а `loadSaveFile`:

   ```ts
   const loadSaveFileIntoStore = useGameStore((s) => s.loadSaveFile);
   ```

4. Пример целевого поведения:

   ```ts
   const payload = await res.json();

   if (!verifyChecksum(payload.data, payload.checksum)) {
     throw new Error('Save checksum mismatch');
   }

   const result = loadSaveFile(payload.data);
   if (!result.success || !result.saveFile) {
     throw new Error(result.error ?? 'Invalid save file');
   }

   loadSaveFileIntoStore(result.saveFile);
   ```

5. Удалить неиспользуемый импорт `GameState`, если он больше не нужен.
6. Улучшить error message в notification: различать `Load failed`, `Invalid save format`, `Checksum mismatch`.

### Критерии приёмки

- Сохранение, созданное через `sessionSlice.saveGame()`, успешно загружается из главного меню.
- Старый legacy `loadGame(state)` остаётся только как fallback/compat path, но не используется для новых saves.
- При повреждённом `data` пользователь видит понятную ошибку.
- При checksum mismatch загрузка отклоняется.

### Минимальные тесты

Добавить regression test на уровень save service:

```text
createSaveFile → serializeSaveWithChecksum → loadSaveFile → extractGameState
```

Желательно добавить integration test API/UI позже отдельной задачей.

---

## Задача 2. Усилить серверную валидацию checksum и save payload

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** средний  
**Файлы:**

```text
src/lib/saveSchemas.ts
src/app/api/save/route.ts
src/app/api/load/route.ts
src/lib/saveService.ts
src/engine/save/saveGame.ts
```

### Проблема

- checksum может быть пустым;
- checksum присылается клиентом и сохраняется без server-side verification;
- при load checksum не проверяется;
- `data` — просто строка, структура `SaveFile` на API-уровне не проверяется.

### Что сделать

1. Исправить schema:

   ```ts
   checksum: z.string().regex(/^[a-f0-9]{8}$/i)
   ```

   Или, если планируется 64-bit/другой checksum:

   ```ts
   checksum: z.string().regex(/^[a-f0-9]{8,16}$/i)
   ```

   Главное — не `{0,16}`.

2. На сервере в `POST /api/save` пересчитывать checksum по `data`:

   ```ts
   import { calculateChecksum } from '@/engine/save/saveGame';

   const serverChecksum = calculateChecksum(data);
   if (serverChecksum !== checksum) {
     return NextResponse.json({ error: 'Checksum mismatch' }, { status: 400 });
   }
   ```

3. Дополнительно прогонять `data` через `loadSaveFile(data)` или более лёгкий `deserializeSave(data)`, чтобы не сохранять невалидный формат.
4. В `GET /api/load` можно возвращать checksum, как сейчас, но frontend обязан проверять.
5. Не логировать полный save payload при ошибках.

### Критерии приёмки

- API не принимает пустой checksum.
- API не принимает checksum, который не совпадает с `data`.
- API не принимает строку `data`, которая не является валидным `SaveFile`.
- Ошибки возвращают 400/413, не 500.

---

## Задача 3. Исправить body size protection для save API

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** средний  
**Файл:**

```text
src/app/api/save/route.ts
```

### Проблема

Сейчас размер проверяется после `await request.json()`. Это не защищает от большого JSON body.

### Что сделать

Вариант A — через `Content-Length`:

```ts
const contentLength = request.headers.get('content-length');
if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
  return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
}
```

Вариант B — читать raw text с лимитом:

```ts
const raw = await request.text();
if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES) {
  return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
}
const body = JSON.parse(raw);
```

Для Next.js Route Handler можно начать с `Content-Length`, но лучше иметь реальный raw size guard.

### Критерии приёмки

- Большой payload отклоняется до тяжёлой обработки.
- Ошибочный JSON возвращает 400, а не 500.
- Лимиты названы явно:

```ts
const MAX_SAVE_BYTES = 2_000_000;
const MAX_REQUEST_BYTES = 2_200_000;
```

---

## Задача 4. Починить production build flow

**Приоритет:** P0  
**Сложность:** средняя  
**Риск:** высокий  
**Файлы:**

```text
.zscripts/build.sh
.zscripts/start.sh
README.md
prisma/schema.prisma
package.json
```

### Проблема

`.zscripts/build.sh` требует `./db/custom.db`, которого нет в репозитории. Это делает production build невоспроизводимым.

### Что сделать

1. Убрать обязательную проверку:

   ```bash
   if [ -f "./db/custom.db" ]; then ... else exit 1
   ```

2. Не копировать dev/test DB в production artifact по умолчанию.
3. В production startup использовать `DATABASE_URL` из env.
4. Добавить отдельную команду init/migrate DB:

   ```bash
   bun run db:push
   ```

   или лучше:

   ```bash
   bunx prisma migrate deploy
   ```

   если будут нормальные migrations.

5. README обновить:

   ```text
   For local development:
   DATABASE_URL="file:./dev.db"

   For production:
   DATABASE_URL must be provided by environment.
   ```

### Критерии приёмки

- `bun run build` не зависит от наличия локального `./db/custom.db`.
- Production start не создаёт неожиданно пустую БД без явного решения.
- README содержит понятные dev/prod DB инструкции.

---

## Задача 5. Добавить `.env.example`

**Приоритет:** P2  
**Сложность:** низкая  
**Риск:** низкий  
**Файл:**

```text
.env.example
```

### Что добавить

```env
# SQLite database for local development
DATABASE_URL="file:./dev.db"

# Optional: disable telemetry in local/dev environments
NEXT_TELEMETRY_DISABLED=1

# Future auth variables should be documented only when auth is implemented.
```

### Критерии приёмки

- Команда из README `cp .env.example .env` работает.
- `.env.example` не содержит реальных секретов.
- README и `.env.example` согласованы.

---

## Задача 6. Исправить `.gitignore` и убрать мусорные артефакты

**Приоритет:** P2  
**Сложность:** низкая  
**Риск:** низкий  
**Файлы:**

```text
.gitignore
tool-results/
```

### Проблема

В `.gitignore` есть склеенная строка:

```text
game-screenshot.pngtool-results/
```

Из-за этого `tool-results/` попал в репозиторий.

### Что сделать

Исправить на:

```gitignore
game-screenshot.png
tool-results/
```

Удалить tracked `tool-results/` из репозитория:

```bash
git rm -r --cached tool-results
```

### Критерии приёмки

- `tool-results/` больше не отслеживается git.
- `.gitignore` корректно разделяет строки.

---

## Задача 7. Сделать API tests для save/load/list/delete

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** средний  
**Файлы:**

```text
src/app/api/save/route.ts
src/app/api/load/route.ts
src/app/api/saves/route.ts
src/lib/saveSchemas.ts
src/engine/save/__tests__/
vitest.config.ts
```

### Что покрыть

Минимальный набор:

1. `POST /api/save` принимает валидный save.
2. `POST /api/save` отклоняет:
   - пустое имя;
   - слишком большой save;
   - invalid checksum;
   - invalid JSON data;
   - invalid SaveFile shape.
3. `GET /api/saves` возвращает список без поля `data`.
4. `GET /api/load?id=...` возвращает конкретный save.
5. `DELETE /api/load?id=...` удаляет save.
6. Невалидный `id` возвращает 400.
7. Несуществующий `id` возвращает 404.

### Примечание

Для тестов API route handlers можно вызывать handlers напрямую с mock `NextRequest`, но лучше отделить DB слой и использовать test DB.

### Критерии приёмки

- Regression save/load больше нельзя сломать незаметно.
- Все ошибки возвращают предсказуемые коды.
- Тесты не используют production DB.

---

## Задача 8. Подготовить auth/ownership модель для saves

**Приоритет:** P1 для public deployment, P2 для local-only  
**Сложность:** высокая  
**Риск:** высокий  
**Файлы:**

```text
prisma/schema.prisma
src/app/api/save/route.ts
src/app/api/load/route.ts
src/app/api/saves/route.ts
package.json
```

### Текущая проблема

Все saves имеют owner:

```ts
ownerId: 'local'
```

### Варианты решения

#### Вариант A. Local-only mode

Если проект пока только локальный:

- явно задокументировать, что server-side saves не предназначены для public deployment;
- добавить env flag:

```env
ALLOW_LOCAL_SAVE_API=true
```

- в production без auth отключать write/delete endpoints.

#### Вариант B. Реальная auth-модель

Если проект будет публичным:

1. Подключить auth.
2. Получать `ownerId` из session/user.
3. В Prisma добавить User model или хранить external user ID.
4. Все queries фильтровать по текущему user ID.
5. DELETE/GET разрешать только владельцу.

### Критерии приёмки

- В публичном режиме один пользователь не видит saves другого.
- Без session write/delete endpoints возвращают 401.
- Нет fallback на общий `local` в production.

---

## Задача 9. Исправить command log / replay contract

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** средний  
**Файлы:**

```text
src/engine/core/GameEngine.ts
src/engine/core/CommandQueue.ts
src/store/slices/sessionSlice.ts
src/engine/save/saveGame.ts
src/engine/save/__tests__/save.test.ts
```

### Проблема

`commandLog` заявлен как часть save/replay, но `GameEngine.dispatch()` не сохраняет выполненные команды в log.

### Что сделать

Рекомендуемый вариант:

1. Не использовать `CommandQueue` как executed history. Queue — это pending commands.
2. Добавить отдельное поле:

```ts
private executedCommands: GameCommand[] = [];
```

3. В `dispatch()` после успешного apply:

```ts
this.state = this.applyCommand(command);
this.executedCommands.push(structuredClone(command));
return this.state;
```

4. Добавить метод:

```ts
getCommandLog(): readonly GameCommand[] {
  return this.executedCommands;
}
```

5. В save использовать:

```ts
commandLog: engine.getCommandLog() as GameCommand[]
```

6. При `loadSaveFile()` восстановить command log, если нужен replay/undo.

### Критерии приёмки

- После 3 dispatch-команд save содержит 3 executed commands.
- Invalid command не попадает в log.
- Command log не является ссылкой на mutable internal array.

---

## Задача 10. Усилить валидацию MoveUnit path

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** средний  
**Файлы:**

```text
src/engine/core/GameEngine.ts
src/engine/rules/movementRules.ts
src/engine/ecs/systems/MovementSystem.ts
src/engine/rules/__tests__/movement.test.ts
```

### Проблема

Сейчас destination проверяется, но переданный `command.path` применяется недостаточно строго.

### Что сделать

Добавить функцию:

```ts
validateMovementPath(state, entityId, path): MovementResult
```

Она должна проверять:

1. `path.length >= 2`.
2. `path[0]` равен текущему `entity.hex`.
3. Каждый шаг соседний:

   ```ts
   hexDistance(path[i - 1], path[i]) === 1
   ```

4. Каждый промежуточный hex существует.
5. Каждый hex walkable для данного unit.
6. Нельзя проходить через enemy-occupied hex.
7. Нельзя завершать путь на friendly-occupied hex.
8. Total cost <= movementPoints.
9. Destination совпадает с последним hex.

Затем использовать эту проверку в `GameEngine.validateMoveUnit()` или `MovementSystem.process()`.

### Минимальные тесты

Добавить tests:

- rejects path not starting at current hex;
- rejects non-adjacent jump;
- rejects path through mountain/water;
- rejects ending on friendly unit;
- rejects moving through enemy unit;
- deducts exact total cost for multi-step path.

### Критерии приёмки

- Нельзя телепортироваться через `[start, target]`, если target не соседний.
- Нельзя подменить UI-calculated path на более дешёвый fake path.
- Movement tests покрывают happy path и exploit cases.

---

## Задача 11. Постепенно убрать `@ts-nocheck` из workers

**Приоритет:** P1/P2  
**Сложность:** высокая  
**Риск:** средний  
**Файлы:**

```text
src/workers/pathfinding.worker.ts
src/workers/ai.worker.ts
src/workers/mapgen.worker.ts
src/workers/simulation.worker.ts
src/workers/workerProtocol.ts
```

### Подход

Не пытаться типизировать всё сразу. Делать по одному worker.

Порядок:

1. `pathfinding.worker.ts` — самый простой.
2. `mapgen.worker.ts`.
3. `simulation.worker.ts`.
4. `ai.worker.ts` — самый сложный.

### Что сделать

1. Вынести локальные типы request/response из `workerProtocol.ts` или продублировать строго.
2. Заменить `any` на минимальные структурные типы.
3. Убрать `// @ts-nocheck`.
4. Добавить tests для worker pure functions, если функции можно экспортировать отдельно.

### Критерии приёмки

- Worker компилируется без `@ts-nocheck`.
- Нет массового `as any` вместо реальной типизации.
- Поведение не изменилось.

---

## Задача 12. Уменьшить расхождение между workers и engine/rules

**Приоритет:** P1/P2  
**Сложность:** высокая  
**Риск:** высокий  
**Файлы:**

```text
src/engine/rules/*
src/workers/*
src/workers/workerProtocol.ts
```

### Проблема

Workers self-contained, поэтому логика переписана заново. Это создаёт drift.

### Возможные варианты

#### Вариант A. Shared pure modules

Вынести минимальные pure utility modules, которые можно импортировать и в main bundle, и в worker bundle:

```text
src/shared/hex
src/shared/rules-lite
src/shared/types
```

#### Вариант B. Explicit preview-only workers

Если workers не должны быть authoritative, документировать это:

```ts
// This worker returns approximate preview only. Authoritative validation is GameEngine.
```

Тогда UI не должен использовать worker result как источник истины.

#### Вариант C. Server/engine-authoritative simulation

Для future multiplayer — не доверять worker simulation вообще, а применять команды только через authoritative `GameEngine`.

### Критерии приёмки

- Чётко указано, какая логика authoritative.
- AI/preview не может принять решение, которое engine потом массово отклоняет.
- Уменьшено дублирование terrain costs, hex math, combat formula.

---

## Задача 13. Добавить CI pipeline

**Приоритет:** P1  
**Сложность:** средняя  
**Риск:** низкий  
**Файлы:**

```text
.github/workflows/ci.yml
package.json
```

### Что сделать

Добавить GitHub Actions:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
```

### Критерии приёмки

- PR не проходит, если ломаются typecheck/lint/test/build.
- Используется Bun, потому что проект ориентирован на Bun.
- CI не требует локального `./db/custom.db`.

---

## Задача 14. Ужесточить ESLint/TypeScript поэтапно

**Приоритет:** P2  
**Сложность:** средняя  
**Риск:** средний  
**Файл:**

```text
eslint.config.mjs
tsconfig.json
```

### Текущая проблема

Много правил выключено или ослаблено:

```js
"@typescript-eslint/no-explicit-any": "warn"
"no-console": "off"
"@typescript-eslint/no-non-null-assertion": "off"
"@typescript-eslint/ban-ts-comment": "off"
```

### Что сделать

Не включать всё сразу в error. Ввести staged hardening:

#### Stage 1

- `no-console`: warn, кроме явно разрешённых server scripts.
- `@typescript-eslint/no-explicit-any`: warn.
- запретить новые `@ts-nocheck`.

#### Stage 2

- `no-explicit-any`: error для `src/engine/**`, кроме исключений.
- `ban-ts-comment`: warn/error.

#### Stage 3

- `no-non-null-assertion`: warn.
- tighter worker typing.

### Критерии приёмки

- Нет новых `@ts-nocheck`.
- Existing technical debt снижается постепенно.
- CI фиксирует нарушения.

---

## Задача 15. Улучшить error handling в UI и store

**Приоритет:** P2  
**Сложность:** средняя  
**Риск:** низкий  
**Файлы:**

```text
src/components/screens/MainMenuScreen.tsx
src/store/slices/sessionSlice.ts
src/components/providers/GameProvider.tsx
src/store/slices/settingsSlice.ts
```

### Проблемы

Есть silent catches:

```ts
catch {
  // Silently fail
}
```

И случаи, где AI commands silently skipped.

### Что сделать

1. Для пользовательских операций показывать notification.
2. Для debug/dev логировать warning в development.
3. Для AI invalid commands собирать summary, но не спамить UI.
4. Для localStorage parse errors использовать fallback + dev warning.

### Критерии приёмки

- Пользователь понимает, почему save/load/delete failed.
- Ошибки не ломают игру молча.
- Production logs не содержат чувствительных данных.

---

## Задача 16. Добавить валидацию localStorage settings

**Приоритет:** P2  
**Сложность:** низкая/средняя  
**Риск:** низкий  
**Файл:**

```text
src/store/slices/settingsSlice.ts
```

### Проблема

Настройки читаются так:

```ts
return JSON.parse(raw) as Partial<typeof DEFAULT_SETTINGS>;
```

Любые значения из localStorage попадут в state.

### Что сделать

Добавить Zod schema или ручную нормализацию:

```ts
language: z.enum(['ru', 'en']).default('ru')
masterVolume: z.number().min(0).max(1).default(0.8)
graphicsPreset: z.enum(['low', 'medium', 'high', 'ultra']).default('high')
...
```

### Критерии приёмки

- Повреждённый localStorage не ломает UI.
- Некорректные значения заменяются defaults.
- Settings tests покрывают malformed JSON и invalid values.

---

## Задача 17. Удалить или переписать непереносимые scripts

**Приоритет:** P2  
**Сложность:** низкая  
**Риск:** низкий  
**Файлы:**

```text
start-game.sh
watchdog.sh
.zscripts/*.sh
```

### Проблема

Есть hardcoded paths:

```bash
/home/z/my-project
/home/z/my-project/mini-services/game-server
```

### Что сделать

1. Если скрипты не нужны — удалить.
2. Если нужны — вычислять project root относительно скрипта:

```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
```

3. Убрать Chinese/Russian mixed operational logs или привести к одному языку.

### Критерии приёмки

- Скрипты работают после clone в любую директорию.
- Нет `/home/z/...`.
- README описывает, какие scripts актуальны.

---

## Задача 18. Добавить smoke/e2e тест для основного игрового сценария

**Приоритет:** P1/P2  
**Сложность:** средняя/высокая  
**Риск:** средний  
**Файлы:**

```text
package.json
playwright.config.ts
src/components/screens/*
src/app/page.tsx
```

### Минимальный сценарий

1. Открыть `/`.
2. Нажать “Новая игра”.
3. Стартовать игру с default settings.
4. Дождаться gameState/HUD.
5. Сделать save.
6. Вернуться в меню / reload page.
7. Открыть load panel.
8. Загрузить save.
9. Проверить, что HUD показывает тот же turn/player.

### Критерии приёмки

- E2E ловит regressions save/load.
- Тест стабилен и не зависит от случайных seed без контроля.
- Можно запускать в CI.

---

# 7. Security review

## 7.1. Критичные / серьёзные риски

### Save endpoints без auth

**Файлы:**

```text
src/app/api/save/route.ts
src/app/api/load/route.ts
src/app/api/saves/route.ts
```

**Риск:** общий доступ к save data.  
**Severity:** P1 для public deployment.  
**Исправление:** auth/session owner или отключение API в public mode.

---

### DELETE endpoint доступен без авторизации

**Файл:**

```text
src/app/api/load/route.ts
```

**Риск:** любой публичный пользователь может удалить saves общего `ownerId = local`.  
**Исправление:** auth + ownership check + CSRF/rate-limit strategy.

---

### Body parsing DoS

**Файл:**

```text
src/app/api/save/route.ts
```

**Риск:** большой body парсится до проверки размера.  
**Исправление:** Content-Length/raw size guard до JSON parse.

---

### Weak checksum contract

**Файлы:**

```text
src/lib/saveSchemas.ts
src/app/api/save/route.ts
src/lib/saveService.ts
```

**Риск:** повреждённые/поддельные saves принимаются и загружаются.  
**Исправление:** server-side recalculation + strict schema + load verification.

---

## 7.2. Средние риски

### Нет rate limiting

Save API может быть заспамлен большим количеством save objects. Даже с SQLite это быстро станет проблемой.

**Исправление:** rate limit по IP/user/session, max saves per owner, cleanup policy.

---

### Нет CSRF-стратегии

Если в будущем появится cookie-based auth, POST/DELETE endpoints должны учитывать CSRF.

**Исправление:** SameSite cookies, CSRF token или auth header strategy.

---

### Логи ошибок могут стать чувствительными

Сейчас ошибки логируются через `console.error`. Полные payload не логируются — это хорошо. Но важно не добавлять save data в logs.

**Исправление:** structured logs без sensitive payload.

---

## 7.3. Низкие риски

### Caddy headers неполные

`Caddyfile` уже содержит хорошие базовые headers:

```text
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
```

Но можно добавить CSP после стабилизации assets/scripts. Не добавлять CSP слепо: Three.js/Next может требовать настройки.

---

## 7.4. Перед production обязательно

1. Auth/ownership для saves.
2. Rate limit для API.
3. Server-side checksum validation.
4. Request body size guard.
5. API tests на error cases.
6. Dependency audit в CI.
7. Удалить hardcoded scripts и local artifacts.
8. Настроить migrations/deploy DB.
9. Добавить production env documentation.
10. Проверить CORS/CSRF model.

---

# 8. Тестирование: текущая картина и план

## Уже есть

Найдены unit tests:

```text
src/engine/hex/__tests__/hex.test.ts
src/engine/rules/__tests__/city.test.ts
src/engine/rules/__tests__/combat.test.ts
src/engine/rules/__tests__/movement.test.ts
src/engine/rules/__tests__/research.test.ts
src/engine/save/__tests__/save.test.ts
```

Это хороший старт. Покрыты:

- hex distance/neighbors/pathfinding;
- movement rules;
- combat rules;
- city founding;
- research;
- save serialization/validation/checksum basics.

## Чего не хватает

1. API integration tests.
2. Save/load UI regression test.
3. Worker tests.
4. GameEngine command tests.
5. Mapgen determinism tests.
6. Store slice tests.
7. E2E smoke test.
8. Error cases for corrupted saves.
9. Performance tests for large maps.
10. Security tests for auth/ownership once auth exists.

## Минимальный план тестов

### P0/P1 tests

```text
save/load new format regression
POST /api/save invalid checksum
POST /api/save oversized body
GET /api/load missing save
DELETE /api/load missing save
MoveUnit rejects fake path jump
MoveUnit rejects path through impassable terrain
command log records successful dispatches
```

### P2 tests

```text
settings localStorage malformed JSON
workerManager timeout/fallback
mapgen same seed => same map summary
AI invalid command handling
```

---

# 9. Инфраструктура и зависимости

## Package manager

Проект ориентирован на **Bun**:

```json
"scripts": {
  "dev": "next dev -p 3000 ...",
  "build": "next build ...",
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "lint": "eslint ."
}
```

В ревью окружении Bun отсутствовал, поэтому команды не были выполнены:

```bash
bun run test
bun run lint
bun run typecheck
bun run build
```

Попытка установить зависимости через npm не завершилась успешно. Поэтому обязательно проверить pipeline локально/в CI.

## Direct dependencies

В `package.json` много зависимостей. Часть может быть лишней для core-game MVP:

- `next-auth` есть, но рабочей auth-модели не видно;
- `@mdxeditor/editor`, `react-markdown`, `react-syntax-highlighter` могут быть не нужны в runtime игры;
- большое число UI/Radix/shadcn dependencies нормально для UI kit, но увеличивает surface.

## Рекомендации

1. Добавить CI с Bun.
2. Добавить dependency audit step.
3. Проверить, какие dependencies реально используются.
4. Удалить unused packages.
5. Зафиксировать strategy обновлений.

---

# 10. UX/UI рекомендации

## Что уже хорошо

- Есть main menu.
- Есть load panel.
- Есть HUD.
- Есть settings screen.
- Есть notifications.
- Есть 3D canvas background.

## Что улучшить

1. **Save/load ошибки должны быть понятными.**  
   Сейчас часть ошибок silent. Пользователь должен видеть: save corrupted, checksum mismatch, network error, server error.

2. **Нужен явный loading state для генерации карты.**  
   Он есть, но стоит добавить progress/seed/map size details, если mapgen долгий.

3. **Нужен onboarding.**  
   Игроку непонятно, что делать первым: основать город, двигать юнит, исследовать tech.

4. **Нужны empty/error states.**  
   Load panel уже показывает “Нет сохранений”, это хорошо. Нужно то же для city/recruitment/tech when unavailable.

5. **Настройки языка пока не полностью wired.**  
   README честно говорит, что i18n runtime не завершён. Нужно либо завершить, либо скрыть language switch до готовности.

6. **Accessibility.**  
   Проверить keyboard navigation, focus states, aria labels для icon buttons, contrast.

---

# 11. План доработки

## Быстрые правки на 1 день

1. Исправить `MainMenuScreen.tsx` загрузку через `loadSaveFile()`.
2. Добавить `.env.example`.
3. Исправить `.gitignore`.
4. Удалить `tool-results/` из tracked files.
5. Убрать hardcoded `/home/z/...` или пометить scripts как local-only.
6. Исправить checksum regex.
7. Добавить понятные notifications для save/load/delete errors.

## Правки на 3–5 дней

1. Server-side checksum recalculation.
2. Save API pre-parse body size protection.
3. API tests для save/load/list/delete.
4. Regression test нового save/load формата.
5. Исправить production build flow без `./db/custom.db`.
6. Добавить CI pipeline.
7. Добавить strict movement path validation.
8. Починить command log contract.

## Правки на 1–2 недели

1. Auth/ownership модель для saves или local-only mode guard.
2. Worker typing: убрать `@ts-nocheck` хотя бы из pathfinding/mapgen worker.
3. Уменьшить дублирование worker logic и engine rules.
4. Добавить e2e smoke test.
5. Добавить settings localStorage validation.
6. Провести dependency cleanup.
7. Добавить basic performance tests для large map/pathfinding.
8. Улучшить UX onboarding и error states.

## Перед production

1. Auth + per-user saves.
2. Rate limiting.
3. CSRF/CORS strategy.
4. Real migrations вместо `db:push` в production.
5. CI green: typecheck/lint/test/build.
6. Dependency audit green или documented exceptions.
7. E2E smoke tests.
8. Logging policy.
9. Backup/retention policy для saves.
10. Monitoring/healthcheck.
11. CSP/security headers tuned.
12. Load/performance check на больших картах.

---

# 12. Что можно поручить AI-агенту / Codex

| Задача | Сложность | Риск | Что проверить после выполнения |
|---|---:|---:|---|
| Исправить загрузку `SaveFile` в `MainMenuScreen.tsx` | Средняя | Средний | Save после создания реально загружается; checksum mismatch отклоняется |
| Добавить `.env.example` | Низкая | Низкий | README-команда работает; нет секретов |
| Исправить `.gitignore` и удалить `tool-results/` | Низкая | Низкий | `git status` чистый, tool-results ignored |
| Исправить checksum regex | Низкая | Низкий | Empty checksum не проходит тесты |
| Server-side checksum validation | Средняя | Средний | API rejects wrong checksum |
| Добавить API tests save/load | Средняя | Средний | Тесты используют test DB и проходят в CI |
| Добавить CI workflow | Средняя | Низкий | CI запускает Bun scripts |
| Добавить movement path validation tests | Средняя | Средний | Fake jump больше невозможен |
| Исправить command log recording | Средняя | Средний | Save содержит executed command log |
| Добавить settings localStorage schema | Низкая/средняя | Низкий | Malformed localStorage не ломает UI |
| Убрать `@ts-nocheck` из pathfinding worker | Средняя | Средний | Typecheck проходит, behavior unchanged |
| Удалить unused hardcoded scripts | Низкая | Низкий | README не ссылается на удалённые scripts |

---

# 13. Что НЕ стоит отдавать AI без ручного контроля

1. **Auth architecture.**  
   Нужно вручную решить продуктовую модель: local-only, accounts, guest saves, cloud saves, multiplayer.

2. **Production deployment strategy.**  
   Нужен ручной выбор: SQLite или Postgres, где хранить saves, как делать backup/migrations.

3. **Game balance.**  
   AI может предложить числа, но баланс 4X-игры требует playtesting.

4. **Полное переписывание workers.**  
   Риск сломать gameplay preview/AI. Делать маленькими PR.

5. **Combat/economy rule changes.**  
   Любое изменение правил должно сопровождаться тестами и игровым решением.

6. **Security hardening “вслепую”.**  
   CSP, CSRF, auth, CORS надо настраивать под реальный deployment.

7. **Удаление зависимостей.**  
   AI может ошибочно удалить package, который используется динамически. Нужна проверка build/runtime.

---

# 14. Рекомендуемый порядок PR

## PR 1 — Save/load hotfix

- Исправить `MainMenuScreen.tsx` load flow.
- Проверять checksum на frontend.
- Добавить save service regression test.

## PR 2 — Save API hardening

- Strict checksum schema.
- Server-side checksum verification.
- Validate `SaveFile` before DB insert.
- Better JSON/413 errors.

## PR 3 — Build/dev hygiene

- `.env.example`.
- `.gitignore`.
- Remove `tool-results/`.
- Fix/remove hardcoded scripts.
- Fix build script DB dependency.

## PR 4 — CI

- GitHub Actions with Bun.
- Run typecheck/lint/test/build.

## PR 5 — Movement validation

- Add `validateMovementPath()`.
- Add exploit regression tests.

## PR 6 — Command log

- Add executed command log.
- Save/load command log correctly.

## PR 7 — Worker typing phase 1

- Remove `@ts-nocheck` from `pathfinding.worker.ts`.
- Add worker-related tests where practical.

## PR 8 — Auth/ownership decision

- Either implement auth-based owner IDs.
- Or block save API in production unless local-only flag is enabled.

---

# 15. Definition of Done для ближайшей стабилизации MVP

Проект можно считать стабилизированным MVP-кандидатом, когда выполнено:

- [ ] `save → load` работает для нового `SaveFile`.
- [ ] Corrupted save не загружается.
- [ ] Invalid checksum отклоняется.
- [ ] `POST /api/save` не принимает oversized payload.
- [ ] Production build не зависит от отсутствующего `./db/custom.db`.
- [ ] Есть `.env.example`.
- [ ] CI запускает typecheck/lint/test/build.
- [ ] API tests покрывают save/load/list/delete.
- [ ] Movement fake path exploit закрыт тестами.
- [ ] Command log либо работает, либо документация честно говорит, что replay пока не поддерживается.
- [ ] Public deployment либо защищён auth, либо save API отключён.
- [ ] Нет новых `@ts-nocheck`.
- [ ] `tool-results/` и локальные артефакты не попадают в git.

---

# 16. Пример промпта для AI-разработчика

Можно использовать такой промпт для Codex/AI-агента:

```text
Ты работаешь с проектом Realms of War: Next.js 16, React, TypeScript, Zustand, Prisma SQLite, custom game engine.

Твоя задача — сделать маленький безопасный PR, не переписывая проект целиком.

Сначала прочитай:
- README.md
- src/components/screens/MainMenuScreen.tsx
- src/store/slices/sessionSlice.ts
- src/lib/saveService.ts
- src/engine/save/saveGame.ts
- src/engine/save/loadGame.ts
- src/lib/saveSchemas.ts
- src/app/api/save/route.ts
- src/app/api/load/route.ts

Главный приоритет: исправить несовместимость save/load.

Требования:
1. Новые сохранения создаются как SaveFile.
2. UI загрузки должен использовать loadSaveFile() из saveService и store.loadSaveFile(saveFile).
3. Не использовать legacy store.loadGame() для новых saves.
4. Проверять checksum перед загрузкой.
5. Добавить или обновить tests для save/load regression.
6. Не менять правила игры, UI дизайн, Prisma schema без необходимости.
7. После изменений запустить: bun run typecheck, bun run test, bun run lint.
8. В ответе указать изменённые файлы, почему изменения безопасны, какие тесты прошли.
```

---

# 17. Конкретные вопросы владельцу проекта

Перед production/security доработкой нужно уточнить:

1. Проект должен быть **локальной single-player игрой** или публичным web-приложением?
2. Сохранения должны храниться **локально в браузере**, на сервере или в cloud account?
3. Нужны ли пользовательские аккаунты?
4. Планируется ли multiplayer?
5. SQLite остаётся целевой БД или будет Postgres?
6. Нужны ли replay/undo как реальные функции или это пока архитектурный задел?
7. Нужно ли поддерживать старые сохранения после изменения save format?
8. Какой MVP-сценарий главный: exploration, city building, combat, research или AI battles?
9. Какие платформы целевые: desktop browser only или mobile/tablet тоже?
10. Нужно ли готовить проект к показу работодателю/клиенту/инвестору?

---

## Финальный вывод для AI-разработчика

Проект имеет хорошую основу, и его не нужно переписывать с нуля. Основная задача — не “улучшить всё”, а стабилизировать критические сквозные сценарии.

Сначала исправить сохранения и build. Затем закрыть API security basics. Потом добавить CI и regression tests. После этого можно заниматься worker typing, performance, UX и production hardening.

Самая важная мысль: **GameEngine должен быть authoritative source of truth. UI, workers и API не должны расходиться с ним по формату данных и правилам.**
