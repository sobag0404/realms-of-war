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
- **Техническое ревью:** `docs/realms-of-war-ai-dev-review.md` (2298 строк, 2026-06-12)
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

> Последнее обновление: 2026-06-12 (Пост-ревью: стабилизация)

### ⚠️ ТЕКУЩИЙ ПРИОРИТЕТ: стабилизация по результатам ревью

**Ревьюер рекомендует:** НЕ добавлять новые фичи до закрытия P0/P1 проблем.

Приоритетный порядок работ:
1. **Security** (P0) → 2. **Build/TypeCheck** (P0) → 3. **Save/Load consistency** (P1) → 4. **Deterministic engine** (P1) → 5. **Tests** (P1) → 6. **CI** → 7. Rendering → 8. UX cleanup → 9. Новые фичи

### Результаты технического ревью (2026-06-12)

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

**Полный текст ревью:** `docs/realms-of-war-ai-dev-review.md`
**Секция в GDD:** §16 — Результаты технического ревью

### Критичные проблемы P0 (БЛОКЕРЫ)

- [ ] **SSRF/open proxy** — Caddyfile содержит `XTransformPort` dynamic reverse proxy
- [ ] **Save API без auth/ownership** — любой может CRUD любые saves
- [ ] **Нет body size limit** — DoS через большой JSON в `/api/save`
- [ ] **TypeScript errors игнорируются** — `ignoreBuildErrors: true` в next.config.ts

### Серьёзные проблемы P1

- [ ] **Нет тестов** — ни одного unit/integration/e2e теста
- [ ] **Engine save-module не используется** — UI/API обходит SaveFile/checksum/rngState/commandLog
- [ ] **Детерминизм нарушен** — `Math.random()` и `Date.now()` в cityRules, recruitmentRules, AiDirector, simulation.worker
- [ ] **Worker protocol без requestId** — конкурентные запросы могут получить чужой ответ
- [ ] **ESLint обезврежен** — критичные правила выключены
- [ ] **GameProvider placeholder** — `eventBus.on('event')` с несуществующим типом
- [ ] **Fortify вызывает EndTurn** — кнопка Fortify в UnitPanel отправляет EndTurn

### Средние проблемы P2

- [ ] Terrain chunks + per-hex rendering одновременно
- [ ] GPU cleanup через useMemo (не useEffect)
- [ ] Нет root README / .env.example
- [ ] Hardcoded deploy paths (/home/z/my-project)
- [ ] Prisma query logging всегда включён
- [ ] Mini-service path traversal защита слабая
- [ ] localStorage settings без validation

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
