# Realms of War — Project Context

> Этот файл содержит контекст проекта для AI-ассистентов и разработчиков.
> Обновляется при каждом значимом изменении в проекте.
>
> ⚠️ **ВАЖНО:** При каждой новой сессии AI-ассистент ДОЛЖЕН прочитать этот файл первым,
> а также `CHECKLIST.md` — прежде чем приступать к работе.
> После завершения работы — обновить оба файла и запушить в GitHub.

## Ссылки

- **GitHub:** https://github.com/sobag0404/realms-of-war (приватный)
- **GDD (полная спецификация):** `docs/realms-of-war-design-spec.md` (5644 строки)
- **Техническое ревью 1:** `docs/realms-of-war-ai-dev-review.md` (2298 строк, 2026-06-12)
- **Техническое ревью 2:** `docs/realms-of-war-ai-developer-review.md` (1730 строк, 2026-06-12)
- **Чек-лист:** `CHECKLIST.md` — быстрый обзор состояния проекта

---

## О проекте

**Realms of War** — пошаговая стратегия (4X/TBS) в fantasy-сеттинге.
Целевая версия `v0.1-alpha`: локальная одиночная игра и Hotseat, 3D-клиент без онлайн-сервера.

### Стек технологий

| Слой | Технология |
|---|---|
| Framework | Next.js 16 + App Router + TypeScript 5 |
| 3D Рендеринг | React Three Fiber + Three.js |
| Стили | Tailwind CSS 4 + shadcn/ui (New York) |
| Состояние (клиент) | Zustand |
| База данных | Prisma ORM + SQLite |
| Пакетный менеджер | Bun |
| Играевой движок | Кастомный ECS (TypeScript) |

### Архитектурный подход

1. **Functional core, imperative shell** — правила = чистые функции, рендеринг/ввод = оболочка
2. **ECS** для игровых сущностей (юниты, города, здания, эффекты)
3. **Command pattern** — действия игроков и AI = сериализуемые команды
4. **Data-driven** — баланс загружается из TypeScript-конфигов (`src/data/`)
5. **Детерминизм** — один seed + один список команд = одно состояние

---

## Текущее состояние проекта

> Последнее обновление: 2026-06-12 (Пост-ревью 2: стабилизация)

### ⚠️ ТЕКУЩИЙ ПРИОРИТЕТ: доработка по результатам второго ревью

**Второй ревьюер (2026-06-12):** Оценка выше первого (Overall 6/10 вместо 4/10), но есть новые P0/P1 проблемы.

Приоритетный порядок работ:
1. ✅ **Save/Load flow** (P0) — исправлено: MainMenuScreen → loadSaveFile()
2. ✅ **Production build** (P0) — исправлено: убрана зависимость от ./db/custom.db
3. ✅ **API Security** (P1) — исправлено: checksum, body size, server-side validation
4. ✅ **Command log** (P1) — исправлено: executedCommands в GameEngine
5. ✅ **Movement validation** (P1) — исправлено: validateMovementPath()
6. ✅ **Tests** (P1) — 96 тестов (19 новых API тестов)
7. ✅ **Worker typing** (P1) — pathfinding.worker.ts без @ts-nocheck
8. ✅ **.gitignore** (P2) — исправлено, tool-results/ убран из git
9. ✅ **Scripts** (P2) — убраны hardcoded пути
10. ✅ **Settings validation** (P2) — Zod-схема для localStorage
11. 🔲 **CI pipeline** — GitHub Actions (требует PAT с workflow scope)
12. 🔲 **Остальные workers @ts-nocheck** — ai.worker, mapgen.worker, simulation.worker

### Результаты ревью 1 (2026-06-12, первый ревьюер)

| Категория | Оценка /10 |
|---|---:|
| Идея и продуктовая ценность | 7 |
| Архитектура | 6 |
| Качество кода | 4 |
| **Безопасность** | **2** |
| **Тесты** | **0** |
| Документация | 5 |
| Производительность | 4 |
| Поддерживаемость | 5 |
| Готовность к продакшену | **1** |
| Общий уровень проекта | **4** |

### Результаты ревью 2 (2026-06-12, второй ревьюер)

| Категория | Оценка /10 |
|---|---:|
| Идея и продуктовая ценность | 7.0 |
| Архитектура | 7.0 |
| Качество кода | 6.0 |
| Безопасность | 4.0 |
| Тесты | 5.0 |
| Документация | 6.0 |
| Производительность | 6.0 |
| Поддерживаемость | 6.5 |
| Готовность к продакшену | 3.0 |
| Общий уровень проекта | **6.0** |

**Полный текст ревью 1:** `docs/realms-of-war-ai-dev-review.md`
**Полный текст ревью 2:** `docs/realms-of-war-ai-developer-review.md`
**Секция в GDD:** §16 — Результаты технического ревью

### P0 из ревью 2 — исправлены ✅

- [x] **Save/load flow несовместим** — MainMenuScreen использует loadSaveFile() + verifyChecksum()
- [x] **Production build требует ./db/custom.db** — build.sh создаёт свежую БД через db:push

### P1 из ревью 2 — исправлены ✅

- [x] **Checksum regex допускает пустой** — изменено на {8,16}
- [x] **Server-side checksum verification** — calculateChecksum() на сервере
- [x] **Body size проверяется после JSON.parse** — Content-Length + raw text guard
- [x] **Command log не записывает dispatch** — executedCommands + getCommandLog() + restoreCommandLog()
- [x] **MoveUnit path validation** — validateMovementPath() в movementRules
- [x] **API tests** — 19 новых тестов для save/load schemas и routes
- [x] **@ts-nocheck в pathfinding.worker** — убран, добавлены типы

### P2 из ревью 2 — исправлены ✅

- [x] **.gitignore сломан** — исправлена склеенная строка, tool-results/ убран из git
- [x] **Hardcoded scripts** — start-game.sh, watchdog.sh используют относительные пути
- [x] **localStorage settings без validation** — Zod-схема SettingsSchema

### Оставшиеся задачи

- [ ] **CI pipeline** — GitHub Actions (требует PAT с workflow scope)
- [ ] **Остальные workers @ts-nocheck** — ai.worker, mapgen.worker, simulation.worker
- [ ] **Auth/ownership модель** — для публичного деплоя (пока local-only mode)
- [ ] **Rate limiting** — для Save API
- [ ] **E2E тесты** — Playwright smoke test

### Что реализовано (структурно)

- ✅ GDD (полная спецификация 5644 строк)
- ✅ Hex-математика (`src/engine/hex/`) — координаты, дистанции, пути, округление, хранение карты, линия видимости, регионы
- ✅ Ядро движка (`src/engine/core/`) — GameState, GameConfig, GameRng, CommandQueue, EventBus, типы
- ✅ **GameEngine.ts** — фасад движка с делегированием в rules/ и systems/
- ✅ ECS ядро (`src/engine/ecs/`) — Entity, 14 компонентов, ComponentStorage
- ✅ **ECS-системы** — Movement, Combat, Vision, Economy, Research, City, AI, StatusEffect, Turn
- ✅ Генератор карты — шум, биомы, реки, ресурсы, руины, стартовые позиции, валидация
- ✅ Правила игры — движение, бой, экономика, исследование, города, найм, дипломатия, победа
- ✅ **AI Director** — StrategicPlanner, TacticalPlanner, UtilityScoring, BehaviorTree, InfluenceMap, AiMemory
- ✅ **Сохранения/загрузки** (engine-level) — сериализация, десериализация, валидация, миграции
- ✅ **GameEngine → rules/systems интеграция** — validate→rules, apply→systems
- ✅ **Новые команды**: FortifyUnit, BuildImprovement, SellResource, BuyResource
- ✅ **Старт игры**: populateStartingPositions() — столица + копейщик + поселенец
- ✅ AI автоплей, дипломатия, Save/Load UI, экономика, исследование, production queue
- ✅ Zustand Store (6 слайсов), Providers, 3D рендеринг, UI/HUD, экраны
- ✅ Data-конфиги, локализация RU/EN, Web Workers, Rendering утилиты

### Что НЕ реализовано (ключевое для v0.1-alpha)

- ❌ Декорации и пост-процессинг — нужны 3D модели/ассеты
- ❌ Звуковое оформление — AudioProvider есть, но нужны реальные звуки
- ❌ Полная торговля между городами — trade route formula из GDD §10.5
- ❌ Чудеса света — wonders из GDD §9.8 (данные есть, но нет специальных эффектов)
- ❌ Rift порталы — контроль и victory condition
- ❌ Culture pressure — территориальная экспансия через культуру (§9.5)

---

## Структура проекта

```
realms-of-war/
├── docs/
│   ├── realms-of-war-design-spec.md      # GDD — полная спецификация
│   └── realms-of-war-ai-dev-review.md    # Техническое ревью (2026-06-12)
├── prisma/
│   └── schema.prisma                      # Схема БД
├── public/
│   ├── prototype/index.html               # 2D-прототип (Canvas)
│   └── logo.svg
├── src/
│   ├── app/                               # Next.js App Router + API routes
│   ├── components/
│   │   ├── game3d/                        # 3D рендеринг (R3F) — 16 компонентов
│   │   ├── hud/                           # HUD overlay (9 компонентов)
│   │   ├── screens/                       # Экраны (8 экранов)
│   │   ├── providers/                     # React провайдеры (3)
│   │   └── ui/                            # shadcn/ui компоненты
│   ├── data/                              # Data-driven конфиги баланса
│   │   ├── buildings.ts, resources.ts, technologies.ts
│   │   ├── terrain.ts, units.ts, enemies.ts
│   │   ├── eras.ts, biomes.ts, difficulty.ts, hotkeys.ts
│   │   └── localization/                  # ru.ts, en.ts
│   ├── engine/                            # Игровой движок
│   │   ├── ai/                            # AI Director (9 файлов)
│   │   ├── core/                          # Ядро (GameState, EventBus, CommandQueue, RNG)
│   │   ├── ecs/                           # ECS (Entity, Components, Systems)
│   │   ├── hex/                           # Гексагональная математика + LOS + регионы
│   │   ├── mapgen/                        # Генератор карты
│   │   ├── rules/                         # Правила игры
│   │   └── save/                          # Сохранения/загрузки
│   ├── hooks/                             # React хуки
│   ├── rendering/                         # Rendering утилиты (9 файлов)
│   ├── store/                             # Zustand store (6 слайсов)
│   ├── workers/                           # Web Workers (5 файлов)
│   └── lib/                               # Утилиты (db.ts и пр.)
├── mini-services/                         # Микросервисы (WebSocket и т.д.)
├── PROJECT_CONTEXT.md                     # Этот файл
├── CHECKLIST.md                           # Чек-лист проекта
└── package.json
```

---

## Ключевые проектные решения

1. **Pointy-top axial гекс-сетка** — XZ-плоскость, высота по Y, радиус гекса = 1.0
2. **Ортографическая камера** — для читаемости стратегии (как Civilization VI)
3. **Typed arrays для карты** — `Uint8Array`, `Int16Array` для предсказуемой памяти
4. **Туман войны** — три слоя: explored, visible, lastSeen
5. **Zustand для UI, не для правил** — движок работает без React
6. **Нет сервера в MVP** — Hotseat локально, онлайн добавляется позже
7. **TechBranch = 'military' | 'economic' | 'science' | 'mystical'**

---

## Приоритеты разработки (СЛЕДУЮЩИЕ ШАГИ)

### ⚠️ ТЕКУЩИЙ ПРИОРИТЕТ: стабилизация (по результатам ревью)

**День 1 — Emergency Hardening:**
1. Удалить XTransformPort из Caddyfile
2. Убрать ignoreBuildErrors из next.config.ts, включить reactStrictMode
3. Исправить GameProvider placeholder (eventBus.on('event'))
4. Исправить UnitPanel Fortify (dispatch FortifyUnit вместо EndTurn)
5. Отключить Prisma query logging в production
6. Добавить .env.example
7. Добавить root README.md
8. Добавить typecheck script

**3–5 дней — Базовая стабилизация:**
1. Vitest + engine tests (hex, movement, combat, city, recruitment, research, save/load)
2. Zod validation для API routes
3. SaveService (единый путь save/load через engine save format)
4. Worker requestId protocol
5. TerrainLayer cleanup (useEffect вместо useMemo)
6. Базовые ESLint rules
7. GitHub Actions CI

**1–2 недели — Production readiness:**
1. Auth/owner модель или local-only saves
2. Deterministic counters и RNG
3. Playwright e2e
4. Dependency audit
5. Error boundaries

### Будущие фичи (ПОСЛЕ стабилизации):
1. Trade routes (§10.5)
2. Culture pressure (§9.5)
3. Wonders (§9.8)
4. Rift portals
5. 3D модели (AssetLoader/ModelRegistry)
6. Звук (реальные звуки)

---

## Вопросы к владельцу проекта (от ревьюера)

1. Saves должны быть локальными или cloud saves?
2. Будут ли аккаунты пользователей?
3. Игра single-player only, hotseat, или планируется multiplayer?
4. Где проект должен деплоиться?
5. SQLite — временно или production target?
6. Нужно ли сохранять compatibility с текущими raw saves?
7. Что важнее для ближайшего demo: gameplay stability, 3D visuals, AI или save/load?
8. Нужно ли поддерживать RU/EN UI одинаково в alpha?
9. Можно ли удалить mini-services, если не используются?
10. Какие размеры карт целевые для performance?

---

## Заметки для AI-ассистентов

- Вся игровая логика в `src/engine/` — чистый TypeScript, без React/Three.js зависимостей
- Рендеринг в `src/components/game3d/` — только чтение снапшотов + отправка команд
- Баланс в `src/data/` — не зашивать числа в код движка
- GDD содержит исчерпывающую спецификацию — сверяться с ним при реализации
- Язык коммуникации: русский
- Язык кода: английский
- **КРИТИЧЕСКИ ВАЖНО:** Не добавлять новые фичи до закрытия P0/P1 проблем из ревью

### ⚠️ Обязательный порядок работы

1. **Прочитать** `PROJECT_CONTEXT.md` и `CHECKLIST.md` — понять текущее состояние
2. **Сделать работу** — реализовать фичу / исправить баг
3. **Обновить** `PROJECT_CONTEXT.md` и `CHECKLIST.md` — отметить что сделано
4. **Запушить** изменения в GitHub — `git add -A && git commit -m "..." && git push`

### История сессий

| Дата | Что делали |
|---|---|
| 2026-06-11 | Начальная настройка: GDD, hex-математика, ядро движка, data-конфиги, 2D-прототип |
| 2026-06-11 | Настройка GitHub: cleanup репо, добавление PROJECT_CONTEXT.md, приватный режим |
| 2026-06-11 | **Фаза 1:** GameEngine + ECS ядро + Генератор карты + Правила игры (24 файла) |
| 2026-06-11 | **Фаза 2:** ECS-системы + Zustand Store + 3D рендеринг + Browser verification (34 файла) |
| 2026-06-11 | **Фаза 3:** UI/HUD + Экраны + Интеграция (19 файлов) |
| 2026-06-11 | **Фаза 4:** LineOfSight + Regions + Save/Load + AI Director + Data configs + Localization (30 файлов) |
| 2026-06-11 | **Фаза 5:** 3D Polish + Audio + Workers + Rendering utils (19 файлов) |
| 2026-06-12 | **Фаза 7:** GameEngine → rules/systems интеграция + новые команды + старт игры + UI production queue |
| 2026-06-12 | **Security cleanup:** Удалены screenshots из git, убран PAT из remote URL |
| 2026-06-12 | **Ревью:** Добавлено техническое ревью в docs/, обновлён GDD §16, PROJECT_CONTEXT, CHECKLIST |
| 2026-06-12 | **Ревью 2:** Добавлено второе ревью, исправлены все P0/P1/P2: save/load flow, build.sh, checksum, body size, command log, move validation, API tests, worker typing, .gitignore, scripts, settings validation |
