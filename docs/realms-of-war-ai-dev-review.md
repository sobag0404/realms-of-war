# Realms of War — техническое ревью и ТЗ для AI-разработчика

**Проект:** `realms-of-war-main`  
**Архив:** `realms-of-war-main.zip`  
**Дата ревью:** 2026-06-12  
**Формат ревью:** статический анализ ZIP-архива  
**Роль ревьюера:** senior developer / architect / security reviewer / QA  

---

## 0. Важный контекст для AI-разработчика

Этот файл предназначен как рабочее ТЗ для AI-разработчика/Codex. Его цель — не просто описать проблемы, а дать порядок исправлений, файлы, критерии приёмки и ограничения.

Перед началом работы AI-разработчик должен прочитать:

1. `PROJECT_CONTEXT.md`
2. `CHECKLIST.md`
3. `docs/realms-of-war-design-spec.md`
4. `package.json`
5. `next.config.ts`
6. `eslint.config.mjs`
7. `prisma/schema.prisma`
8. `src/app/api/save/route.ts`
9. `src/app/api/load/route.ts`
10. `src/app/api/saves/route.ts`
11. `src/store/slices/sessionSlice.ts`
12. `src/engine/core/GameEngine.ts`
13. `src/engine/save/saveGame.ts`
14. `src/engine/save/loadGame.ts`
15. `src/components/providers/GameProvider.tsx`
16. `src/components/game3d/TerrainLayer.tsx`
17. `src/workers/workerManager.ts`
18. `Caddyfile`

**Критически важно:** не начинать с добавления новых игровых фич. Сначала закрыть безопасность, сборку, сохранения, тесты и детерминизм.

---

## 1. Краткий вердикт

`Realms of War` — амбициозный alpha-прототип fantasy 4X/TBS-игры на **Next.js + TypeScript + React Three Fiber + Zustand + Prisma/SQLite**.

Проект выглядит значительно серьёзнее обычного учебного CRUD: есть игровой engine, hex-математика, ECS-подход, command pattern, EventBus, mapgen, AI, workers, 3D-рендеринг, HUD, save/load, GDD и project context.

Но по engineering discipline проект пока не production-ready. Основные блокеры:

- публичные save/load/delete API без авторизации и ownership;
- опасный Caddy reverse proxy через query-параметр `XTransformPort`;
- `next.config.ts` игнорирует TypeScript build errors;
- ESLint фактически обезврежен;
- реальных тестов нет;
- save/load в UI/API обходит engine-level save-модуль;
- детерминизм заявлен в архитектуре, но нарушен через `Math.random()` и `Date.now()` в engine/rules/workers;
- есть placeholders в пользовательских действиях;
- нет полноценного root `README.md`, `.env.example`, CI/CD и production-инструкции.

**Текущий уровень:** сильный WIP/alpha-прототип, ближе к `junior+ / middle-` по зрелости реализации. Архитектурная задумка местами тянет на `middle/middle+`, но безопасность, тесты, build discipline и deploy-подход ниже production-уровня.

---

## 2. Объём изученного проекта

Статически изучено:

- **251 файл** в архиве;
- **199 TypeScript/TSX файлов** в `src`;
- примерно **40 281 строка TypeScript/TSX**;
- основные зоны:
  - `src/engine` — около 16k строк;
  - `src/components` — около 13.7k строк;
  - `src/data` — около 3.5k строк;
  - `src/rendering` — около 2.6k строк;
  - `src/workers` — около 2.3k строк;
  - `src/store` — около 1.1k строк;
  - `src/app` — около 237 строк.

Не было подтверждено фактическим запуском:

- `bun install`;
- `bun run build`;
- `bun run lint`;
- `bunx tsc --noEmit`;
- browser smoke test;
- Prisma migration/apply;
- runtime save/load.

Причина: анализ выполнялся по ZIP без установленного окружения и `node_modules`. Все выводы по сборке — статические, по конфигам и коду.

---

## 3. Итоговая оценка

| Категория | Оценка /10 | Комментарий |
|---|---:|---|
| Идея и продуктовая ценность | 7 | Понятная fantasy 4X/TBS-идея. Есть GDD, core loop, data configs. Нужна фокусировка MVP. |
| Архитектура | 6 | Слои в целом есть: engine/data/store/UI/rendering/workers/API. Но есть несостыковки между engine save и API save, worker protocol и worker manager, UI actions и commands. |
| Качество кода | 4 | Есть сильные модули, но много masking-подходов: выключены TS/ESLint checks, placeholders, silent catches, hardcoded deploy paths. |
| Безопасность | 2 | Save API публичные, Caddy SSRF/open-proxy риск, нет auth/rate limit/body limit/schema validation. |
| Тесты | 0 | Реальных unit/integration/e2e тестов не найдено. |
| Документация | 5 | Есть GDD и `PROJECT_CONTEXT.md`, но нет нормального root README, env-документации и production runbook. |
| Производительность | 4 | Есть workers и chunked rendering, но terrain фактически рендерится неэффективно на больших картах, есть риск GPU leaks. |
| Поддерживаемость | 5 | Структура поддерживаемая, но отсутствие тестов/CI/strict checks быстро приведёт к деградации. |
| Готовность к продакшену | 1 | Публично запускать нельзя. |
| Общий уровень проекта | 4 | Сильный alpha-прототип, слабый production-hardening. |

**Готовность к показу клиенту:** только как WIP/alpha demo.  
**Готовность к инвестору:** можно показывать идею и демо, но честно обозначать technical debt.  
**Готовность к работодателю:** можно показывать как амбициозный pet project, если рядом есть список известных проблем и план исправлений.  
**Готовность к production:** нет.  
**Готовность к коммерческому использованию:** нет.

---

## 4. Сильные стороны проекта

### 4.1. Хорошая доменная декомпозиция

Сильные директории:

```text
src/engine/
src/data/
src/store/
src/components/game3d/
src/components/hud/
src/components/screens/
src/rendering/
src/workers/
prisma/
docs/
```

Это уже не хаотичный single-file prototype. Проект пытается отделять правила игры от UI, состояние от рендера, данные баланса от логики.

### 4.2. Есть настоящий игровой engine-слой

`src/engine/core/GameEngine.ts` — правильная идея: внешний код dispatch-ит команды, engine валидирует и применяет их.

Хорошо:

- `dispatch(command)`;
- `validate(command)`;
- `setState(state)` для save/load;
- `EventBus`;
- `CommandQueue`;
- delegation в `rules` и `systems`.

### 4.3. Command pattern подходит для стратегии

`src/engine/core/CommandQueue.ts` описывает сериализуемые команды:

- `MoveUnit`;
- `Attack`;
- `FoundCity`;
- `BuildBuilding`;
- `RecruitUnit`;
- `ResearchTechnology`;
- `ChangeDiplomacy`;
- `EndTurn`;
- `FortifyUnit`;
- `BuildImprovement`;
- `SellResource`;
- `BuyResource`.

Это правильная база для replay, undo, save compatibility и потенциального multiplayer.

### 4.4. Data-driven подход

Баланс вынесен в `src/data`:

- `units.ts`;
- `buildings.ts`;
- `technologies.ts`;
- `resources.ts`;
- `terrain.ts`;
- `biomes.ts`;
- `difficulty.ts`;
- `hotkeys.ts`;
- `localization/ru.ts`;
- `localization/en.ts`.

Для 4X/TBS это правильнее, чем hardcode в UI.

### 4.5. Есть worker infrastructure

`src/workers` содержит:

- `pathfinding.worker.ts`;
- `mapgen.worker.ts`;
- `ai.worker.ts`;
- `simulation.worker.ts`;
- `workerManager.ts`;
- `workerProtocol.ts`.

Идея верная: pathfinding, map generation, AI и simulation не должны блокировать main thread.

### 4.6. UI не выглядит пустой заглушкой

Есть:

- main menu;
- new game screen;
- settings;
- HUD;
- resource bar;
- turn panel;
- city panel;
- unit panel;
- minimap;
- diplomacy screen;
- tech tree;
- recruitment screen.

Для alpha-прототипа это хороший объём.

### 4.7. Есть документация продукта

`docs/realms-of-war-design-spec.md`, `PROJECT_CONTEXT.md`, `CHECKLIST.md` дают много контекста. Это помогает AI-разработчику и человеку быстрее понять намерение проекта.

---

## 5. Главные слабые места

### 5.1. TypeScript build errors игнорируются

Файл: `next.config.ts`

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["21.0.15.156"],
};
```

Проблема:

- production build может проходить со сломанной типизацией;
- реальные ошибки маскируются;
- AI-разработчик может добавлять несовместимый код, а проект всё равно “соберётся”.

Найден пример, который likely должен ловиться типизацией:

Файл: `src/components/providers/GameProvider.tsx`

```ts
const unsubKilled = eventBus.on('event') as () => void; // placeholder
```

`'event'` не входит в `GameEventType`. Это placeholder, замаскированный отключёнными проверками.

### 5.2. ESLint обезврежен

Файл: `eslint.config.mjs`

Выключены правила:

```js
"@typescript-eslint/no-explicit-any": "off",
"@typescript-eslint/no-unused-vars": "off",
"react-hooks/exhaustive-deps": "off",
"no-console": "off",
"no-debugger": "off",
"no-empty": "off",
"no-undef": "off",
"no-unreachable": "off",
```

Это не просто “ослабленный lint”. Это почти отсутствие safety net.

### 5.3. Реальных тестов нет

Не найдено:

- `*.test.ts`;
- `*.spec.ts`;
- `__tests__`;
- Vitest/Jest config;
- Playwright config;
- test script в `package.json`.

Для game engine это критично: правила движения, боя, экономики, исследований и save/load легко сломать незаметно.

### 5.4. Save/load архитектура раздвоена

Есть хороший engine-level модуль:

- `src/engine/save/saveGame.ts`;
- `src/engine/save/loadGame.ts`;
- `src/engine/save/migrations.ts`.

Он поддерживает:

- `SaveFile.version`;
- `timestamp`;
- `gameState`;
- `gameConfig`;
- `commandLog`;
- `rngState`;
- checksum;
- migrations.

Но фактический UI/API save его не использует.

Файл: `src/store/slices/sessionSlice.ts`

```ts
body: JSON.stringify({
  name: saveName,
  turn: gameState.turn,
  players: playerNames,
  data: JSON.stringify(gameState),
  checksum: '',
}),
```

Проблема:

- checksum пустой;
- `SaveFile` не используется;
- `gameConfig` не сохраняется полностью;
- `commandLog` не сохраняется;
- `rngState` не сохраняется;
- migrations не используются;
- engine reconstruct в `loadGame` собирает config приблизительно.

### 5.5. Публичные API сохранений небезопасны

Файлы:

- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- `src/app/api/saves/route.ts`

Проблемы:

- нет auth;
- нет owner/user/session ID;
- нет проверки владельца сохранения;
- `GET /api/saves` отдаёт все сохранения;
- `GET /api/load?id=...` читает любое сохранение;
- `DELETE /api/load?id=...` удаляет любое сохранение;
- `POST /api/save` пишет произвольный JSON в БД;
- нет body size limit;
- нет Zod validation;
- нет rate limit.

### 5.6. Caddyfile содержит SSRF/open proxy риск

Файл: `Caddyfile`

```caddy
@transform_port_query {
  query XTransformPort=*
}

handle @transform_port_query {
  reverse_proxy localhost:{query.XTransformPort} {
    header_up Host {host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Real-IP {remote_host}
  }
}
```

Проблема: пользовательский query-параметр управляет локальным портом reverse proxy. Это потенциальный SSRF/open local proxy.

### 5.7. Детерминизм нарушен

Архитектурная цель из `PROJECT_CONTEXT.md`:

> один seed + один список команд = одно состояние

Но в engine/rules/workers используются `Date.now()` и `Math.random()`:

- `src/engine/core/GameConfig.ts` — default seed через `Date.now()`;
- `src/engine/rules/cityRules.ts` — city id через `Date.now()` + `Math.random()`;
- `src/engine/rules/recruitmentRules.ts` — unit id через `Date.now()` + `Math.random()`;
- `src/engine/ai/AiDirector.ts` — mistake probability через `Math.random()`;
- `src/workers/simulation.worker.ts` — city/unit ids через `Date.now()` + `Math.random()`;
- `src/components/screens/NewGameScreen.tsx` — seed через `Date.now()`.

UI/audio particles могут использовать `Math.random()` — это нормально, если не влияет на game state. Но engine/rules/simulation — нельзя.

### 5.8. Worker protocol не содержит requestId

Файлы:

- `src/workers/workerProtocol.ts`
- `src/workers/workerManager.ts`

`WorkerManager` создаёт `requestId`, но не отправляет его в worker message и не получает обратно в response. Ответы мапятся по типу и FIFO:

```ts
for (const [requestId] of this.pendingRequests) {
  if (
    (responseType === 'findPathResult' && requestId.startsWith('pathfinding-')) ||
    ...
  ) {
    matchedId = requestId;
    break;
  }
}
```

Это хрупко для конкурентных запросов одного типа. Правильно: request/response должны содержать `requestId`.

### 5.9. Terrain chunk rendering реализован неполно

Файл: `src/components/game3d/TerrainLayer.tsx`

При больших картах строятся chunks:

```tsx
{terrainChunks.length > 0 && (
  <ChunkedTerrain chunks={terrainChunks} />
)}
```

Но затем всё равно рендерятся индивидуальные `HexMesh` для всех tiles:

```tsx
{tiles.map((tile) => {
  return (
    <group key={key}>
      <HexMesh ... />
    </group>
  );
})}
```

То есть оптимизация частично нивелирована.

Плюс cleanup сделан через `useMemo`, а не `useEffect`:

```tsx
useMemo(() => {
  return () => {
    if (terrainChunks.length > 0) {
      disposeChunks(terrainChunks);
    }
  };
}, [terrainChunks]);
```

Возвращаемая функция из `useMemo` не является React cleanup. Это риск GPU/resource leaks.

### 5.10. UI содержит placeholder-действия

Файл: `src/components/hud/UnitPanel.tsx`

```ts
const handleFortify = useCallback(() => {
  if (!isOwnedByActive) return;
  dispatchCommand({
    type: 'EndTurn', // placeholder — real fortify command would be different
    playerId: activePlayerId,
  });
}, [dispatchCommand, activePlayerId, isOwnedByActive]);
```

Кнопка Fortify фактически завершает ход. Это прямой UX/gameplay bug.

### 5.11. Deploy scripts завязаны на конкретную среду

Файлы:

- `.zscripts/build.sh`;
- `.zscripts/start.sh`;
- `start-game.sh`;
- `watchdog.sh`;
- `mini-services/game-server/index.ts`.

Примеры:

```bash
NEXTJS_PROJECT_DIR="/home/z/my-project"
```

```bash
cd /home/z/my-project/mini-services/game-server
```

```ts
const PUBLIC_DIR = '/home/z/my-project/public';
```

Это не переносимо и не production-friendly.

---

## 6. Критичные проблемы P0/P1/P2

| Приоритет | Проблема | Файлы | Почему опасно | Как исправить |
|---|---|---|---|---|
| P0 | User-controlled Caddy reverse proxy | `Caddyfile` | SSRF/open proxy на localhost-порты | Удалить `XTransformPort` handler. Оставить фиксированный `reverse_proxy 127.0.0.1:3000`. |
| P0 | Save/load/delete API без auth/ownership | `src/app/api/*` | Любой может прочитать/удалить/создать saves | Добавить auth/session/ownerId или сделать saves strictly local-only. |
| P0 | Нет body size limit на `/api/save` | `src/app/api/save/route.ts` | DB/disk/memory DoS через большой JSON | Добавить лимит payload, Zod validation, rate limit. |
| P0 | TypeScript errors игнорируются | `next.config.ts` | Broken code может уйти в build | Убрать `ignoreBuildErrors`, исправить TS errors. |
| P1 | Нет тестов engine/rules/save | весь проект | Любая правка может сломать правила игры | Добавить Vitest unit tests + Playwright smoke tests. |
| P1 | Engine save-module не используется | `sessionSlice.ts`, API routes | Save compatibility, checksum, rng, commandLog не работают | Сделать единый `SaveService`. |
| P1 | Детерминизм нарушен | `cityRules.ts`, `recruitmentRules.ts`, `AiDirector.ts`, `simulation.worker.ts` | Replay/save/network sync невозможны | Перевести IDs/random на `GameRng` и counters в `GameState`. |
| P1 | Worker responses без requestId | `workerProtocol.ts`, `workerManager.ts`, workers | Конкурентные запросы могут получить чужой ответ | Добавить `requestId` в request/response protocol. |
| P1 | ESLint выключает критичные правила | `eslint.config.mjs` | Ошибки hooks/dead code/unreachable остаются | Включать правила поэтапно. |
| P1 | `GameProvider` placeholder event subscription | `GameProvider.tsx` | Маскированная TS/runtime проблема | Удалить `eventBus.on('event')`; оставить конкретный `UnitKilled`. |
| P1 | `UnitPanel` Fortify вызывает EndTurn | `UnitPanel.tsx` | Пользовательская кнопка делает не то действие | Dispatch `FortifyUnit`. |
| P2 | Terrain chunks + per-hex rendering одновременно | `TerrainLayer.tsx` | Большие карты будут тормозить | Разделить visual chunk layer и interaction overlay. |
| P2 | GPU cleanup через `useMemo` | `TerrainLayer.tsx` | Риск утечек geometries/materials | Использовать `useEffect` cleanup. |
| P2 | Нет root README / `.env.example` | root | Сложный onboarding | Добавить setup docs. |
| P2 | Hardcoded deploy paths | scripts, mini-services | Непереносимый деплой | Перейти на relative paths/env vars. |

---

## 7. Security review

### 7.1. Критичные security-риски

#### 7.1.1. SSRF/open proxy через Caddy

**Файл:** `Caddyfile`

Текущий код позволяет клиенту задать порт:

```caddy
reverse_proxy localhost:{query.XTransformPort}
```

**Сценарий атаки:**

1. Атакующий отправляет запрос с `?XTransformPort=12345`.
2. Caddy проксирует на `localhost:12345`.
3. Если на localhost есть internal service/admin/debug endpoint, он может быть доступен извне через Caddy.

**Что сделать:**

```caddy
:81 {
  encode zstd gzip

  header {
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
  }

  reverse_proxy 127.0.0.1:3000 {
    header_up Host {host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Real-IP {remote_host}
  }
}
```

Если нужен transform proxy для dev-инфраструктуры — вынести его в отдельный dev-only Caddyfile, не в production.

#### 7.1.2. Save API без ownership

**Файлы:**

- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- `src/app/api/saves/route.ts`
- `prisma/schema.prisma`

Текущая Prisma model:

```prisma
model SaveGame {
  id        String   @id @default(cuid())
  name      String
  turn      Int
  players   String
  data      String
  checksum  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Нет владельца.

**Минимальный production-вариант:**

```prisma
model User {
  id        String     @id @default(cuid())
  email     String?    @unique
  name      String?
  saves     SaveGame[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model SaveGame {
  id        String   @id @default(cuid())
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name      String
  turn      Int
  players   String
  data      String
  checksum  String
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId, updatedAt])
}
```

Если проект должен быть strictly local single-player, то лучше вообще убрать server-side saves и хранить saves в IndexedDB/local file export. Но если приложение публичное и API остаются — нужен owner.

#### 7.1.3. Нет body limit и schema validation

Текущий endpoint:

```ts
const body = await request.json();
const { name, turn, players, data, checksum } = body;
```

Нужно:

- ограничить body size;
- валидировать `name`, `turn`, `players`, `data`, `checksum`, `version`;
- reject unknown format;
- reject huge saves;
- reject malformed JSON;
- validate loaded save through engine save module.

Пример направления:

```ts
import { z } from 'zod';

const MAX_SAVE_BYTES = 2_000_000;

const SavePayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  turn: z.number().int().min(0).max(100_000),
  players: z.string().max(500),
  data: z.string().min(2).max(MAX_SAVE_BYTES),
  checksum: z.string().regex(/^[a-f0-9]{8}$/i),
  version: z.number().int().min(1).max(100).optional(),
});
```

Важно: FNV checksum не является security mechanism. Он годится для accidental corruption, но не для защиты от malicious tampering.

### 7.2. Серьёзные security-риски

#### 7.2.1. Prisma query logging всегда включён

**Файл:** `src/lib/db.ts`

```ts
new PrismaClient({
  log: ['query'],
})
```

В production SQL-запросы и потенциально чувствительные данные могут попасть в логи. Исправить:

```ts
new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
```

#### 7.2.2. Next.js lock version требует security update

В `bun.lock` фактически зафиксирован `next@16.1.3`. Для Next.js есть GitHub advisory `GHSA-q4gf-8mx6-v5v3`: affected range включает `>=16.0.0-beta.0 <16.2.3`, patched version — `16.2.3`.

На практике лучше обновляться до актуальной patched 16.x-версии и прогонять полный regression test.

Также в `package.json` указан `next-auth: ^4.24.11`, а в `bun.lock` фактически стоит `next-auth@4.24.13`. Advisory `GHSA-5jpx-9hw9-2fx4` затрагивает `<4.24.12`; lock уже выше, но manifest лучше поднять минимум до `^4.24.12` или актуального безопасного диапазона.

#### 7.2.3. CSRF будущих mutation endpoints

Сейчас auth нет. Если будет cookie-based auth, endpoints `POST /api/save` и `DELETE /api/load` должны иметь CSRF strategy:

- SameSite cookies;
- CSRF token для mutating requests;
- Origin/Referer validation;
- server-side auth check внутри каждого handler.

### 7.3. Средние security-риски

#### 7.3.1. Mini-service static server path traversal protection слабая

**Файл:** `mini-services/game-server/index.ts`

```ts
if (path.includes('..')) {
  return new Response('Forbidden', { status: 403 });
}

const filePath = PUBLIC_DIR + path;
```

Нужно использовать safe path normalization и проверку, что итоговый путь остаётся внутри `PUBLIC_DIR`.

#### 7.3.2. localStorage settings без schema validation

Проверить `src/store/slices/settingsSlice.ts`: настройки из localStorage должны валидироваться через schema/defaults, чтобы повреждённые значения не ломали UI.

#### 7.3.3. `dangerouslySetInnerHTML`

Найден в `src/components/ui/chart.tsx`. Если это shadcn-generated style injection без user input — ок. Но нужно зафиксировать правило: туда не должен попадать пользовательский ввод.

---

## 8. Архитектура: целевое состояние

### 8.1. Текущая архитектура

Текущая архитектура условно такая:

```text
Next.js App Router
  ├─ UI screens / HUD
  ├─ Zustand store
  │   ├─ sessionSlice -> GameEngine
  │   ├─ commandSlice
  │   ├─ selectionSlice
  │   └─ settingsSlice
  ├─ GameEngine
  │   ├─ rules
  │   ├─ systems
  │   ├─ EventBus
  │   ├─ CommandQueue
  │   └─ GameRng
  ├─ rendering / React Three Fiber
  ├─ Web Workers
  └─ API routes + Prisma + SQLite
```

Идея правильная, но есть нарушение слоёв:

- UI/API сохраняют raw `GameState`, обходя `src/engine/save`;
- `sessionSlice.loadGame` приблизительно реконструирует `GameConfig`;
- worker simulation имеет simplified duplicate rules;
- AI может silent-skip invalid commands;
- UI знает детали API сохранений напрямую.

### 8.2. Целевая архитектура save/load

Нужно сделать единый путь:

```text
UI
  ↓
SaveClient / store action
  ↓
SaveService
  ├─ engine.saveGame(...)
  ├─ serializeSave(...)
  ├─ calculateChecksum(...)
  ├─ validate size/schema
  ↓
/api/save
  ├─ auth/owner check
  ├─ zod validation
  ├─ DB write
  ↓
Prisma SaveGame
```

Load:

```text
/api/load
  ├─ auth/owner check
  ├─ DB read
  ↓
SaveService
  ├─ deserializeSave(...)
  ├─ validateSave(...)
  ├─ applyMigrations(...)
  ├─ verify checksum
  ↓
sessionSlice.loadSaveFile(saveFile)
  ├─ new GameEngine(saveFile.gameConfig)
  ├─ engine.setState(saveFile.gameState)
  ├─ rng.setState(saveFile.rngState.position/state)
  ├─ restore commandLog if supported
```

### 8.3. Целевая архитектура determinism

Запретить в `src/engine`, `src/workers/simulation.worker.ts`, `src/engine/rules`:

- `Math.random()`;
- `Date.now()` для game-state decisions;
- random ID generation without seeded RNG/counter.

Добавить в `GameState`:

```ts
nextEntitySeq: number;
nextCitySeq: number;
rngState: number;
```

Или отдельный `IdGenerator`:

```ts
function nextCityId(state: GameState): { state: GameState; id: CityId } {
  const seq = state.nextCitySeq ?? 1;
  return {
    state: { ...state, nextCitySeq: seq + 1 },
    id: `city-${seq}`,
  };
}
```

Для random:

- engine owns `GameRng`;
- systems/rules получают RNG или random decisions как аргумент;
- save stores rng internal state;
- load restores rng state.

---

## 9. Конкретные задачи по приоритету

### P0-1. Удалить опасный Caddy proxy

**Файл:** `Caddyfile`

**Сделать:**

- удалить matcher `@transform_port_query`;
- удалить `reverse_proxy localhost:{query.XTransformPort}`;
- оставить только фиксированный upstream;
- добавить базовые security headers.

**Acceptance criteria:**

- запросы с `?XTransformPort=...` не меняют upstream;
- `caddy validate --config Caddyfile` проходит;
- приложение доступно через порт 81;
- нет dynamic reverse_proxy на user-controlled input.

---

### P0-2. Убрать игнор TypeScript ошибок

**Файл:** `next.config.ts`

**Сделать:**

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};
```

`allowedDevOrigins` убрать или вынести в dev-only config/env, если реально нужен.

**Acceptance criteria:**

- `typescript.ignoreBuildErrors` отсутствует;
- `reactStrictMode: true`;
- `bunx tsc --noEmit` проходит;
- `bun run build` проходит без ignored TS errors.

---

### P0-3. Исправить API сохранений

**Файлы:**

- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- `src/app/api/saves/route.ts`
- `prisma/schema.prisma`
- новый `src/lib/saveService.ts` или `src/server/saveService.ts`

**Сделать минимум:**

- Zod validation;
- max payload size;
- owner/session model;
- safe errors;
- no global list all saves;
- no delete without owner check.

**Если нет полноценного auth:**

Временно можно сделать `ownerKey` через signed cookie или local anonymous session. Но это временный вариант. Для production лучше NextAuth/session.

**Acceptance criteria:**

- пользователь A не может получить/удалить save пользователя B;
- invalid payload возвращает 400;
- oversized payload возвращает 413 или 400;
- save list фильтруется по owner;
- raw server errors не отдаются клиенту;
- тесты API покрывают positive/negative cases.

---

### P0-4. Обновить Next.js и security-sensitive deps

**Файлы:**

- `package.json`
- `bun.lock`

**Сделать:**

- обновить `next` до patched/current 16.x;
- обновить `eslint-config-next` совместимо с Next;
- поднять lower bound `next-auth` минимум выше vulnerable range;
- прогнать audit.

**Acceptance criteria:**

- `bun.lock` больше не фиксирует `next@16.1.3`;
- `bun run build` проходит;
- UI smoke test проходит;
- API routes работают;
- R3F canvas загружается.

---

### P1-1. Исправить `GameProvider` placeholder subscription

**Файл:** `src/components/providers/GameProvider.tsx`

Удалить:

```ts
const unsubKilled = eventBus.on('event') as () => void; // placeholder
```

И убрать `unsubKilled` из массива `unsubscribeRefs.current`.

**Acceptance criteria:**

- нет подписки на несуществующий event type;
- TypeScript больше не ругается;
- `UnitKilled` notification остаётся через `unsubUnitKilled`;
- нет fake cast `as () => void`.

---

### P1-2. Исправить Fortify в UI

**Файл:** `src/components/hud/UnitPanel.tsx`

Заменить:

```ts
 dispatchCommand({
   type: 'EndTurn',
   playerId: activePlayerId,
 });
```

На:

```ts
 dispatchCommand({
   type: 'FortifyUnit',
   playerId: activePlayerId,
   entityId: entity.id,
 });
```

**Acceptance criteria:**

- кнопка Fortify добавляет `fortified` status;
- не завершает ход;
- movementPoints становится 0;
- hasActed становится true;
- тест или ручной сценарий подтверждает поведение.

---

### P1-3. Ввести единый SaveService

**Файлы:**

- `src/engine/save/saveGame.ts`
- `src/engine/save/loadGame.ts`
- `src/store/slices/sessionSlice.ts`
- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- новый `src/lib/saveService.ts` или `src/server/saveService.ts`

**Сделать:**

- UI больше не отправляет raw `JSON.stringify(gameState)` как финальный формат;
- сохраняется `SaveFile`;
- checksum считается;
- load проверяет checksum;
- load прогоняет `deserializeSave`;
- migrations используются;
- sessionSlice умеет load by SaveFile, а не только raw GameState.

**Acceptance criteria:**

- save JSON содержит `version`, `timestamp`, `name`, `gameState`, `gameConfig`, `commandLog`, `rngState`;
- checksum не пустой;
- corrupted save не загружается;
- старый формат либо мигрируется, либо явно rejected с понятной ошибкой;
- unit tests покрывают serialize/deserialize/checksum/migration.

---

### P1-4. Детерминированные ID и RNG

**Файлы:**

- `src/engine/core/GameState.ts`
- `src/engine/core/GameEngine.ts`
- `src/engine/rules/cityRules.ts`
- `src/engine/rules/recruitmentRules.ts`
- `src/engine/ai/AiDirector.ts`
- `src/workers/simulation.worker.ts`
- `src/engine/save/*`

**Сделать:**

- убрать `Date.now()` и `Math.random()` из game-state logic;
- добавить deterministic counters;
- прокинуть `GameRng` туда, где нужна случайность;
- сохранить/восстановить RNG state.

**Acceptance criteria:**

- `rg "Math\.random|Date\.now" src/engine src/workers/simulation.worker.ts` не находит state-affecting usage;
- два запуска с одним seed и одним command list дают одинаковый state hash;
- save/load не меняет дальнейшую последовательность random outcomes.

---

### P1-5. Worker protocol requestId

**Файлы:**

- `src/workers/workerProtocol.ts`
- `src/workers/workerManager.ts`
- `src/workers/pathfinding.worker.ts`
- `src/workers/mapgen.worker.ts`
- `src/workers/ai.worker.ts`
- `src/workers/simulation.worker.ts`

**Сделать:**

- добавить `requestId` в base request;
- workers возвращают тот же `requestId`;
- `WorkerManager.handleWorkerMessage` ищет pending request строго по `data.requestId`;
- ошибки тоже несут `requestId`.

**Acceptance criteria:**

- concurrent 10 pathfinding requests возвращают корректные результаты своим callers;
- FIFO matching удалён;
- timeout продолжает работать;
- fallback продолжает работать.

---

### P1-6. Включить базовые ESLint правила

**Файл:** `eslint.config.mjs`

Первый этап:

```js
"no-debugger": "error",
"no-unreachable": "error",
"no-empty": "error",
"no-undef": "error",
"react-hooks/exhaustive-deps": "warn",
"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
```

Потом вторым этапом:

```js
"@typescript-eslint/no-explicit-any": "warn"
```

**Acceptance criteria:**

- `bun run lint` проходит;
- нет `debugger`;
- нет unreachable code;
- hooks deps warnings разобраны или осознанно suppress с комментарием.

---

### P1-7. Добавить тестовую инфраструктуру

**Файлы:**

- `package.json`
- `vitest.config.ts`
- `tests/` или `src/**/*.test.ts`
- optional `playwright.config.ts`

**Сделать:**

Добавить dev dependencies:

- `vitest`;
- `@vitest/coverage-v8`;
- optional `happy-dom` для UI hooks;
- `playwright` для e2e.

Scripts:

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "e2e": "playwright test"
}
```

Минимальные unit tests:

1. hex distance/coordinates;
2. movement can/cannot move;
3. combat can/cannot attack;
4. city canFound/foundCity;
5. recruitment canRecruit/start/process;
6. research canResearch/start/process;
7. turn end pipeline;
8. save serialize/deserialize/checksum;
9. deterministic replay smoke;
10. workerManager requestId mapping.

**Acceptance criteria:**

- `bun run test` проходит;
- minimum coverage для `src/engine` хотя бы 40% на первом этапе;
- critical rules покрыты negative cases;
- CI запускает tests.

---

### P2-1. Исправить TerrainLayer performance/cleanup

**Файл:** `src/components/game3d/TerrainLayer.tsx`

Сделать:

- заменить cleanup `useMemo` на `useEffect`;
- если `terrainChunks.length > 0`, не рендерить full `HexMesh` visual для каждого tile;
- оставить lightweight interaction layer, например invisible planes/hex outlines только для picking;
- dispose `GridOverlay` geometry.

Пример cleanup:

```tsx
useEffect(() => {
  return () => {
    if (terrainChunks.length > 0) {
      disposeChunks(terrainChunks);
    }
  };
}, [terrainChunks]);
```

**Acceptance criteria:**

- на large map нет одновременного full chunk terrain + full per-hex visual terrain;
- geometries/materials disposed при смене карты;
- FPS/performance не хуже текущего на small map;
- визуально terrain остаётся кликабельным.

---

### P2-2. README и env docs

**Файлы:**

- `README.md`
- `.env.example`

README должен содержать:

- что это за проект;
- стек;
- требования;
- установка;
- env vars;
- команды запуска;
- Prisma setup;
- build;
- tests;
- project structure;
- known limitations;
- security notes.

`.env.example`:

```env
DATABASE_URL="file:./dev.db"
NEXT_TELEMETRY_DISABLED=1
```

Если будет auth:

```env
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
```

**Acceptance criteria:**

- новый разработчик может запустить проект по README;
- README не содержит выдуманных команд;
- все env vars описаны.

---

### P2-3. CI/CD

**Файл:** `.github/workflows/ci.yml`

Pipeline:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx prisma generate
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
```

**Acceptance criteria:**

- PR cannot merge if typecheck/lint/test/build fails;
- CI uses lockfile;
- Prisma client generated;
- artifacts/cache optional but not required initially.

---

## 10. Задачи, которые можно поручить AI/Codex

| Задача | Сложность | Риск | Что проверить после выполнения |
|---|---:|---:|---|
| Удалить `XTransformPort` из Caddyfile | Низкая | Низкий | Caddyfile не содержит dynamic reverse proxy; `caddy validate` проходит. |
| Исправить `next.config.ts` | Низкая | Средний | Build/typecheck проходят после исправления TS ошибок. |
| Удалить placeholder `eventBus.on('event')` | Низкая | Низкий | `GameProvider` компилируется, notifications работают. |
| Исправить Fortify button | Низкая | Низкий | Fortify не завершает ход, а dispatch-ит `FortifyUnit`. |
| Добавить root README | Низкая | Низкий | Команды соответствуют package scripts. |
| Добавить `.env.example` | Низкая | Низкий | Не содержит реальных секретов. |
| Добавить Vitest config и первые engine tests | Средняя | Средний | Тесты deterministic, не зависят от time/random. |
| Добавить SaveService вокруг engine save/load | Средняя | Средний | Save format совпадает с `SaveFile`, checksum работает. |
| Добавить Zod validation для save API | Средняя | Средний | Invalid payload returns 400, oversized rejected. |
| Добавить worker `requestId` protocol | Средняя | Средний | Concurrent worker tests проходят. |
| Исправить TerrainLayer cleanup | Средняя | Средний | Нет dispose активных chunks, visual не ломается. |
| Убрать hardcoded paths из scripts | Средняя | Средний | Scripts работают из project root. |
| Включить часть ESLint rules | Средняя | Средний | Lint проходит без массового suppress. |
| Добавить GitHub Actions CI | Средняя | Низкий | Workflow проходит на clean checkout. |

---

## 11. Задачи, которые НЕ стоит отдавать AI без ручного контроля

### 11.1. Полная auth-модель

AI может написать код, но владелец проекта должен решить продуктово:

- нужны ли user accounts;
- нужны ли anonymous sessions;
- нужны ли cloud saves;
- можно ли хранить saves локально;
- какой privacy model.

### 11.2. Баланс игры

Не давать AI самостоятельно менять:

- damage formulas;
- unit costs;
- tech costs;
- economy yields;
- victory thresholds;
- AI difficulty modifiers.

AI может написать тесты и рефакторинг, но balance changes должны проходить ручной product/game-design review.

### 11.3. Save migrations

Миграции могут сломать существующие saves. AI должен писать migration tests, но решение о breaking changes принимает человек.

### 11.4. Production deploy/security config

Caddy, auth, cookies, headers, DB backup, rate limit, deployment topology — только с ручным ревью.

### 11.5. Детерминизм engine

Перенос RNG/IDs влияет на:

- saves;
- replay;
- AI;
- simulation;
- tests;
- future multiplayer.

AI может подготовить PR, но нужен ручной diff review.

---

## 12. План доработки

### 12.1. День 1 — emergency hardening

1. Удалить `XTransformPort` reverse proxy из `Caddyfile`.
2. Убрать `ignoreBuildErrors` из `next.config.ts`.
3. Включить `reactStrictMode`.
4. Исправить `GameProvider` placeholder `eventBus.on('event')`.
5. Исправить `UnitPanel` Fortify.
6. Отключить Prisma query logging в production.
7. Добавить `.env.example`.
8. Добавить root `README.md`.
9. Добавить `typecheck` script.
10. Обновить Next.js до patched/current 16.x и прогнать build.

### 12.2. 3–5 дней — базовая инженерная стабилизация

1. Добавить Vitest.
2. Написать первые tests для `src/engine/hex`.
3. Написать tests для city/recruitment/combat/movement/research.
4. Добавить Zod validation для API routes.
5. Добавить body limit для saves.
6. Ввести `SaveService`.
7. Использовать engine save format в UI/API.
8. Добавить checksum validation.
9. Добавить worker `requestId`.
10. Исправить TerrainLayer cleanup.
11. Включить базовые ESLint rules.
12. Добавить GitHub Actions CI.

### 12.3. 1–2 недели — production readiness foundation

1. Добавить auth/owner модель или перевести saves в local-only storage.
2. Добавить Prisma migrations.
3. Перевести engine IDs на deterministic counters.
4. Перевести AI random decisions на `GameRng`.
5. Добавить deterministic replay test.
6. Добавить save/load compatibility tests.
7. Добавить Playwright smoke e2e.
8. Разобрать hardcoded deployment scripts.
9. Провести dependency audit.
10. Добавить manual QA checklist.
11. Добавить error boundaries и понятные UI error states.
12. Провести performance smoke на small/medium/large map.

### 12.4. Перед production

Production checklist:

- [ ] `bun install --frozen-lockfile` проходит на clean checkout.
- [ ] `bunx prisma generate` проходит.
- [ ] `bun run typecheck` проходит.
- [ ] `bun run lint` проходит.
- [ ] `bun run test` проходит.
- [ ] `bun run build` проходит.
- [ ] Dependency audit без high/critical vulnerabilities.
- [ ] Caddyfile без dynamic upstream.
- [ ] Save API защищены auth/ownership или отключены публично.
- [ ] Payload size limits включены.
- [ ] Rate limit включён.
- [ ] Prisma migrations используются.
- [ ] DB backup/restore documented.
- [ ] Logs не содержат sensitive data.
- [ ] Manual QA core loop пройден.
- [ ] Save/load после refresh работает.
- [ ] Large map не фризит UI.
- [ ] Error states показываются пользователю.

---

## 13. Минимальный план тестирования

### 13.1. Unit tests — engine/hex

Файлы:

- `src/engine/hex/coordinates.ts`
- `src/engine/hex/distance.ts`
- `src/engine/hex/pathfinding.ts`

Проверить:

- distance symmetry;
- distance from hex to itself = 0;
- neighbors count = 6;
- path avoids impassable terrain;
- path returns null if unreachable;
- reachable hexes respect movement points.

### 13.2. Unit tests — movement

Файл: `src/engine/rules/movementRules.ts`

Проверить:

- cannot move enemy unit;
- cannot move when not enough movement;
- cannot move to water/mountain;
- can move on road cheaper if road rules есть;
- moving updates hex and movement points;
- invalid path rejected.

### 13.3. Unit tests — combat

Файлы:

- `src/engine/rules/combatRules.ts`
- `src/engine/ecs/systems/CombatSystem.ts`

Проверить:

- cannot attack own unit;
- cannot attack out of range;
- damage is deterministic;
- death removes unit;
- counterattack rules;
- city attack rules if implemented.

### 13.4. Unit tests — city

Файлы:

- `src/engine/rules/cityRules.ts`
- `src/engine/ecs/systems/CitySystem.ts`

Проверить:

- cannot found without settler;
- cannot found on water/mountain;
- cannot found on occupied city hex;
- founding consumes settler;
- city gets territory;
- city ownership updates tiles.

### 13.5. Unit tests — recruitment

Файл: `src/engine/rules/recruitmentRules.ts`

Проверить:

- cannot recruit unknown/enemy unit;
- cannot recruit without resources;
- cannot recruit without required tech/building;
- recruitment deducts resources;
- production queue progresses;
- completed unit appears near city;
- no-space case is handled predictably.

### 13.6. Unit tests — research

Файлы:

- `src/engine/rules/researchRules.ts`
- `src/engine/ecs/systems/ResearchSystem.ts`

Проверить:

- cannot research unknown tech;
- cannot research without prerequisites;
- start research sets currentResearch;
- progress accumulates per turn;
- completed tech appears in `player.techs`;
- era progression if implemented.

### 13.7. Unit tests — save/load

Файлы:

- `src/engine/save/saveGame.ts`
- `src/engine/save/loadGame.ts`
- `src/engine/save/migrations.ts`

Проверить:

- serialize/deserialize roundtrip;
- invalid JSON rejected;
- invalid version rejected;
- future version rejected;
- checksum mismatch rejected;
- migration missing throws clear error;
- save includes config/commandLog/rngState.

### 13.8. API integration tests

Файлы:

- `src/app/api/save/route.ts`
- `src/app/api/load/route.ts`
- `src/app/api/saves/route.ts`

Проверить:

- unauthenticated behavior;
- authenticated save create;
- list only own saves;
- load only own save;
- delete only own save;
- invalid body returns 400;
- oversized body rejected;
- missing id returns 400;
- not found returns 404.

### 13.9. E2E smoke test

Playwright сценарий:

1. Открыть `/`.
2. Нажать “Новая игра”.
3. Стартовать игру с seed фиксированным, 2 players.
4. Дождаться карты.
5. Выбрать unit.
6. Выполнить move или Fortify.
7. End turn.
8. Save.
9. Вернуться в меню.
10. Load save.
11. Проверить turn/state сохранились.

---

## 14. Manual QA checklist

### Core gameplay

- [ ] Новая игра создаётся без ошибок.
- [ ] Карта генерируется с фиксированным seed.
- [ ] На карте есть стартовые города/юниты.
- [ ] Можно выбрать hex.
- [ ] Можно выбрать unit.
- [ ] Movement preview работает.
- [ ] Unit move обновляет позицию.
- [ ] Attack доступен только по валидным целям.
- [ ] Found city работает только с settler.
- [ ] Recruitment добавляет production item.
- [ ] End turn запускает income/research/production.
- [ ] AI ход не softlock-ит игру.
- [ ] Victory/gameOver не ломает UI.

### Save/load

- [ ] Save создаётся.
- [ ] Save появляется в списке.
- [ ] Load восстанавливает карту, turn, active player, units, cities.
- [ ] Corrupted save не загружается.
- [ ] Delete удаляет только выбранный save.
- [ ] Refresh страницы не ломает load.

### UI

- [ ] Main menu responsive.
- [ ] Settings открываются/закрываются.
- [ ] Tech tree не падает на empty state.
- [ ] Diplomacy screen не падает при 1/2/4 players.
- [ ] City panel показывает production queue.
- [ ] UnitPanel Fortify не завершает ход.
- [ ] Error notifications видны пользователю.

### Performance

- [ ] Small map FPS приемлемый.
- [ ] Medium map FPS приемлемый.
- [ ] Large map не зависает при загрузке.
- [ ] Workers fallback не фризит UI слишком долго.
- [ ] Memory не растёт бесконечно после reset/new game.

---

## 15. Рекомендованные issue prompts для AI/Codex

### Issue 1 — Remove unsafe Caddy dynamic proxy

```text
Task: Remove the unsafe user-controlled Caddy reverse proxy from Caddyfile.

Context:
- Current Caddyfile contains query matcher XTransformPort and reverse_proxy localhost:{query.XTransformPort}.
- This is an SSRF/open proxy risk.

Requirements:
1. Delete the @transform_port_query matcher and its handle block.
2. Keep only a fixed reverse_proxy to 127.0.0.1:3000 or localhost:3000.
3. Add basic security headers if safe.
4. Do not add any user-controlled upstream selection.

Acceptance:
- grep XTransformPort Caddyfile returns nothing.
- caddy validate passes.
- App remains reachable through Caddy.
```

### Issue 2 — Re-enable TypeScript build safety

```text
Task: Remove TypeScript build error ignoring and fix resulting type errors.

Files:
- next.config.ts
- src/components/providers/GameProvider.tsx
- any files reported by tsc

Requirements:
1. Remove typescript.ignoreBuildErrors from next.config.ts.
2. Set reactStrictMode true.
3. Run bunx tsc --noEmit.
4. Fix real type errors, do not suppress them with any/ts-ignore unless justified.
5. Remove placeholder eventBus.on('event') from GameProvider.

Acceptance:
- bunx tsc --noEmit passes.
- bun run build passes.
- No new ts-ignore added without explanation.
```

### Issue 3 — Fix Fortify button behavior

```text
Task: Make UnitPanel Fortify dispatch FortifyUnit instead of EndTurn.

File:
- src/components/hud/UnitPanel.tsx

Requirements:
1. handleFortify must dispatch { type: 'FortifyUnit', playerId, entityId }.
2. Do not end the turn.
3. Add/update a small test if test infra exists.

Acceptance:
- Clicking Fortify adds fortified status to the unit.
- The active player's turn remains active.
- movementPoints becomes 0 and hasActed is true.
```

### Issue 4 — Add SaveService and use engine save format

```text
Task: Unify save/load around src/engine/save SaveFile format.

Files:
- src/engine/save/*
- src/store/slices/sessionSlice.ts
- src/app/api/save/route.ts
- src/app/api/load/route.ts
- new src/lib/saveService.ts or src/server/saveService.ts

Requirements:
1. Store SaveFile, not raw GameState only.
2. Include version, timestamp, name, gameState, gameConfig, commandLog, rngState.
3. Calculate checksum for serialized save.
4. Verify checksum on load.
5. Run deserializeSave/validateSave/applyMigrations on load.
6. Keep error messages user-safe.

Acceptance:
- checksum is not empty.
- corrupted save is rejected.
- save/load roundtrip test passes.
- sessionSlice no longer sends checksum: ''.
```

### Issue 5 — Secure save API with validation and owner checks

```text
Task: Harden save/load/list/delete API routes.

Files:
- src/app/api/save/route.ts
- src/app/api/load/route.ts
- src/app/api/saves/route.ts
- prisma/schema.prisma

Requirements:
1. Add Zod validation for request body/query params.
2. Add max save payload size.
3. Add ownerId/session/user model or documented local-only alternative.
4. List only current owner's saves.
5. Load/delete only current owner's save.
6. Return 400/401/403/404 appropriately.
7. Do not leak internal error details.

Acceptance:
- Unauthorized access cannot read/delete another user's save.
- Invalid payload returns 400.
- Oversized payload rejected.
- Tests cover create/list/load/delete negative cases.
```

### Issue 6 — Add deterministic IDs and RNG

```text
Task: Remove non-deterministic Date.now()/Math.random() from engine state logic.

Files:
- src/engine/core/GameState.ts
- src/engine/core/GameEngine.ts
- src/engine/rules/cityRules.ts
- src/engine/rules/recruitmentRules.ts
- src/engine/ai/AiDirector.ts
- src/workers/simulation.worker.ts
- src/engine/save/*

Requirements:
1. Add deterministic counters for city/entity IDs.
2. Use GameRng for AI/gameplay randomness.
3. Persist and restore rng state.
4. Keep UI-only visual randomness untouched if it does not affect game state.

Acceptance:
- Same seed + same command list => identical serialized GameState.
- rg "Math.random|Date.now" src/engine src/workers/simulation.worker.ts finds no gameplay state usage.
- Deterministic replay test passes.
```

### Issue 7 — Add requestId to Worker protocol

```text
Task: Make WorkerManager match worker responses by requestId.

Files:
- src/workers/workerProtocol.ts
- src/workers/workerManager.ts
- src/workers/*.worker.ts

Requirements:
1. Add requestId to every request type.
2. Add requestId to every response/error type.
3. WorkerManager sends requestId with postMessage.
4. Workers echo requestId.
5. handleWorkerMessage resolves pendingRequests.get(data.requestId).
6. Remove FIFO/prefix matching.

Acceptance:
- Multiple concurrent requests of same worker type resolve correctly.
- Timeout cleanup still works.
- Fallback behavior still works.
```

### Issue 8 — Add test infrastructure and first tests

```text
Task: Add Vitest and initial engine tests.

Files:
- package.json
- vitest.config.ts
- tests or src/**/*.test.ts

Requirements:
1. Add typecheck/test/test:coverage scripts.
2. Add tests for hex distance, movement, city founding, recruitment, save/load.
3. Tests must be deterministic.
4. Do not rely on real time/random/network.

Acceptance:
- bun run test passes.
- bun run typecheck passes.
- CI can run tests.
```

### Issue 9 — Fix TerrainLayer cleanup and large-map rendering

```text
Task: Fix TerrainLayer chunk cleanup and avoid double-rendering terrain on large maps.

File:
- src/components/game3d/TerrainLayer.tsx

Requirements:
1. Replace cleanup useMemo with useEffect cleanup.
2. When chunked terrain is active, do not render full visual HexMesh for every tile.
3. Preserve click/hover/select behavior through lightweight interaction layer.
4. Dispose grid geometry when it changes/unmounts.

Acceptance:
- Large map does not render both chunked terrain and per-hex full meshes.
- No memory/GPU resource leak on new game/reset.
- Selection/hover still works.
```

### Issue 10 — Add CI workflow

```text
Task: Add GitHub Actions CI for Bun + Prisma + Next.js.

File:
- .github/workflows/ci.yml

Requirements:
1. checkout
2. setup bun
3. bun install --frozen-lockfile
4. bunx prisma generate
5. bun run typecheck
6. bun run lint
7. bun run test
8. bun run build

Acceptance:
- Workflow passes on clean checkout.
- PR fails if typecheck/lint/test/build fails.
```

---

## 16. Конкретные файлы с замечаниями

### `next.config.ts`

Проблемы:

- `ignoreBuildErrors: true`;
- `reactStrictMode: false`;
- hardcoded `allowedDevOrigins`.

Рекомендация:

- убрать ignore;
- включить StrictMode;
- dev origins вынести в env/dev-only.

### `eslint.config.mjs`

Проблемы:

- отключены критичные правила;
- нет quality gate.

Рекомендация:

- включать правила по этапам;
- не пытаться включить всё сразу, иначе PR будет слишком большой.

### `Caddyfile`

Проблемы:

- SSRF/open proxy через `XTransformPort`.

Рекомендация:

- удалить полностью;
- добавить headers;
- separate dev/prod Caddyfile if needed.

### `prisma/schema.prisma`

Проблемы:

- `SaveGame` без owner;
- no indexes;
- no version field в DB;
- no size strategy;
- no migration history in repo.

Рекомендация:

- добавить owner model или local-only альтернативу;
- migration-based workflow;
- index by owner/update time.

### `src/lib/db.ts`

Проблемы:

- query logging всегда включён.

Рекомендация:

- dev-only query logs;
- production только `error`/`warn`.

### `src/app/api/save/route.ts`

Проблемы:

- raw `request.json()`;
- no validation;
- no auth;
- no body limit;
- accepts empty checksum;
- stores arbitrary JSON.

Рекомендация:

- Zod schema;
- SaveService;
- owner checks;
- size limit;
- structured error responses.

### `src/app/api/load/route.ts`

Проблемы:

- `findUnique({ where: { id } })` без owner;
- `DELETE` удаляет любой save by id;
- no validation of `id` format;
- no checksum validation;
- raw save data returned.

Рекомендация:

- `findFirst({ where: { id, ownerId } })`;
- validate `id`;
- load through SaveService;
- delete only own save.

### `src/app/api/saves/route.ts`

Проблемы:

- returns all saves globally;
- no auth;
- no pagination;
- no owner filtering.

Рекомендация:

- owner filtering;
- pagination/limit;
- no raw data field in list.

### `src/store/slices/sessionSlice.ts`

Проблемы:

- save sends raw `GameState`;
- checksum empty;
- load reconstructs config approximately;
- catches often return false without error details;
- command history not reliably integrated with engine save.

Рекомендация:

- integrate SaveService;
- expose user-visible error state;
- save command log/rng/config;
- add `loadSaveFile` not just `loadGame(state)`.

### `src/engine/save/saveGame.ts`

Плюсы:

- good SaveFile concept;
- includes config/commandLog/rngState;
- checksum function documented as non-crypto;
- deterministic serialization attempt.

Проблемы:

- `timestamp: Date.now()` makes serialized save non-deterministic. Это нормально для metadata, но не для state hash/replay. Нужно отделить metadata timestamp от deterministic state hash.
- `rngState` interface `{ seed, position }`, но `GameRng.getState()` возвращает internal state, not position. Термины надо синхронизировать.

### `src/engine/save/loadGame.ts`

Плюсы:

- есть validation;
- есть migration hook;
- future version rejected.

Проблемы:

- нет checksum verification;
- validation shallow для deep game state;
- не восстанавливает engine/rng/commandQueue само.

### `src/engine/save/migrations.ts`

Плюсы:

- структура миграций нормальная.

Проблемы:

- если version missing => `currentVersion = 0`, а migration 0→1 отсутствует, значит старый raw save format не загрузится. Это может быть нормально, но нужно explicit migration or explicit error.

### `src/engine/core/GameEngine.ts`

Плюсы:

- facade pattern;
- validate/apply split;
- delegates to systems/rules;
- custom `EngineError`.

Проблемы:

- `dispatch` не добавляет command в command log;
- `CommandQueue` не используется для normal dispatch history;
- `processQueue` skips invalid commands silently;
- no replay API;
- no deterministic command hash update.

### `src/engine/core/CommandQueue.ts`

Плюсы:

- typed command union;
- commands serializable.

Проблемы:

- `toArray()` возвращает internal array reference as readonly, но объект всё ещё тот же;
- command history in store and queue are separate concepts;
- no command ID/timestamp/turn metadata.

### `src/components/providers/GameProvider.tsx`

Проблемы:

- placeholder `eventBus.on('event')`;
- AI invalid commands skipped silently;
- fallback can force `endTurn()` if AI fails completely — avoids softlock, but hides AI bugs;
- dependencies on full `gameState` in effects can cause frequent resubscriptions.

Рекомендация:

- remove placeholder;
- log/report AI invalid commands in dev;
- add AI error notification or dev-only diagnostics;
- test AI turn smoke.

### `src/components/hud/UnitPanel.tsx`

Проблемы:

- Fortify dispatches `EndTurn`;
- Wake/Wait are TODO placeholders;
- status effects are parsed from strings. Long-term better typed status model.

### `src/components/game3d/TerrainLayer.tsx`

Проблемы:

- chunked + individual full rendering;
- cleanup through useMemo;
- grid geometry not disposed;
- imported unused utilities/materials.

### `src/workers/workerManager.ts`

Проблемы:

- no requestId roundtrip;
- FIFO matching by prefix;
- `terminateAll` from `useWorkerManager` can kill singleton workers used elsewhere;
- sync simulation fallback only pushes fake events and does not actually apply commands.

### `src/hooks/useWorkerManager.ts`

Проблема:

```ts
return () => {
  manager.terminateAll();
};
```

Если несколько consumers используют singleton, unmount одного consumer может terminate workers для всех. Нужно reference counting или не terminate globally in hook cleanup.

### `mini-services/game-server/index.ts`

Проблемы:

- hardcoded `/home/z/my-project/public`;
- simplistic path traversal check;
- Bun-only mini server дублирует Next static serving;
- no logging/security headers.

### `.zscripts/build.sh`

Проблемы:

- hardcoded `/home/z/my-project`;
- Chinese comments/logs mixed with project language;
- requires `./db/custom.db` for production package;
- uses `db push` in build artifact flow;
- packages DB from dev/test into production artifact.

Рекомендация:

- separate dev/prod scripts;
- migrations instead of db push;
- do not package mutable DB as default production data unless intentional demo artifact.

---

## 17. Product/MVP рекомендации

### 17.1. Сфокусировать MVP

Сейчас проект пытается охватить:

- 4X;
- tactical combat;
- AI Director;
- diplomacy;
- tech tree;
- economy;
- city management;
- 3D rendering;
- particles/audio;
- save/load;
- workers;
- deployment.

Для MVP лучше выбрать минимальный polished core loop:

1. New game with fixed seed.
2. Generate map.
3. Select unit.
4. Move unit.
5. Found city.
6. Produce one unit/building.
7. Research one tech.
8. Basic AI turn.
9. Save/load.
10. Victory placeholder or simple conquest.

Всё остальное можно оставить как disabled/experimental.

### 17.2. Что лучше убрать/скрыть временно

До стабилизации:

- hide broken Wait/Wake buttons;
- mark Diplomacy as experimental if incomplete;
- hide settings that do not persist/affect anything;
- hide features from GDD that are not implemented;
- remove or clearly label mini-services if not used.

### 17.3. Что важно для коммерческого demo

- стабильный first 5 minutes gameplay;
- no console errors;
- save/load works;
- clear UX for current turn/action;
- no broken buttons;
- performance acceptable;
- README with launch instructions;
- known limitations documented.

---

## 18. Definition of Done для ближайшей стабилизации

Считать проект стабилизированным до уровня “можно показывать как alpha demo”, когда выполнено:

- [ ] Caddy SSRF удалён.
- [ ] TypeScript build errors не игнорируются.
- [ ] `bunx tsc --noEmit` проходит.
- [ ] `bun run lint` проходит с базовыми правилами.
- [ ] `bun run build` проходит.
- [ ] Есть root `README.md`.
- [ ] Есть `.env.example`.
- [ ] Fortify исправлен.
- [ ] `GameProvider` placeholder удалён.
- [ ] Save API имеет validation and size limit.
- [ ] Save/load использует engine save format.
- [ ] Есть минимум 20 unit tests по engine/save.
- [ ] Есть хотя бы один e2e smoke.
- [ ] Worker protocol имеет requestId.
- [ ] Deterministic replay smoke проходит.
- [ ] Next.js обновлён до безопасной версии.
- [ ] Prisma query logs dev-only.

---

## 19. Команды для AI-разработчика

После каждого PR запускать:

```bash
bun install --frozen-lockfile
bunx prisma generate
bun run typecheck
bun run lint
bun run test
bun run build
```

Если тестовая инфраструктура ещё не добавлена:

```bash
bunx tsc --noEmit
bun run lint
bun run build
```

Для поиска недетерминированности:

```bash
rg "Math\.random|Date\.now" src/engine src/workers/simulation.worker.ts
```

Для поиска placeholders:

```bash
rg "placeholder|TODO|FIXME|ts-ignore|ts-nocheck|any" src
```

Для поиска dangerous proxy/config:

```bash
rg "XTransformPort|reverse_proxy localhost:\{query|ignoreBuildErrors|reactStrictMode: false" .
```

Для поиска save API security issues:

```bash
rg "request\.json\(|findUnique\(|delete\(|findMany\(" src/app/api prisma src/lib
```

---

## 20. Вопросы к владельцу проекта

AI-разработчику не нужно блокироваться на этих вопросах для P0/P1 технических правок, но ответы помогут выбрать правильную архитектуру:

1. Saves должны быть локальными или cloud saves?
2. Будут ли аккаунты пользователей?
3. Игра single-player only, hotseat, или планируется multiplayer?
4. Где проект должен деплоиться: Vercel, VPS + Caddy, Docker, desktop wrapper?
5. SQLite — временно или production target?
6. Нужно ли сохранять compatibility с текущими raw `GameState` saves?
7. Что важнее для ближайшего demo: gameplay stability, 3D visuals, AI или save/load?
8. Нужно ли поддерживать русский и английский UI одинаково полно уже в alpha?
9. Можно ли удалить mini-services, если они не используются основным Next app?
10. Какие карты должны быть целевыми для performance: small/medium/large размеры?

---

## 21. Финальный вывод для AI-разработчика

Проект не нужно переписывать с нуля. У него есть хорошая основа:

- engine layer;
- data configs;
- command pattern;
- ECS systems;
- workers;
- React UI;
- 3D rendering;
- GDD.

Но сейчас нельзя продолжать наращивать features поверх текущего состояния без стабилизации. Приоритет:

1. security;
2. build/typecheck;
3. save/load consistency;
4. deterministic engine;
5. tests;
6. CI;
7. rendering performance;
8. UX cleanup;
9. only then new gameplay features.

Самая правильная стратегия — делать маленькие PR с чётким acceptance criteria. Не объединять security, save/load, rendering и gameplay balance в один большой PR.

