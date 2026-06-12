# Realms of War — Project Context

> Этот файл содержит контекст проекта для AI-ассистентов и разработчиков.
> Обновляется при каждом значимом изменении в проекте.
>
> ⚠️ **ВАЖНО:** При каждой новой сессии AI-ассистент ДОЛЖЕН прочитать этот файл первым,
> а также `CHECKLIST.md` — прежде чем приступать к работе.
> После завершения работы — обновить оба файла и запушить в GitHub.

## Ссылки

- **GitHub:** https://github.com/sobag0404/realms-of-war (приватный)
- **GDD (полная спецификация):** `docs/realms-of-war-design-spec.md` (5531 строк)
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

> Последнее обновление: 2026-06-12 (Фаза 6 — Интеграция и исправления)

### Что реализовано

- ✅ GDD (полная спецификация 5531 строк)
- ✅ Hex-математика (`src/engine/hex/`) — координаты, дистанции, пути, округление, хранение карты, **линия видимости, регионы**
- ✅ Ядро движка (`src/engine/core/`) — GameState, GameConfig, GameRng, CommandQueue, EventBus, типы
- ✅ **GameEngine.ts** — главный фасад движка (диспетчеризация команд, валидация, иммутабельные обновления, **setState для загрузки**)
- ✅ ECS ядро (`src/engine/ecs/`) — Entity, 14 компонентов, ComponentStorage
- ✅ **ECS-системы** (`src/engine/ecs/systems/`) — Movement, Combat, Vision, Economy, Research, City, AI, StatusEffect, Turn
- ✅ Генератор карты (`src/engine/mapgen/`) — шум, биомы, реки, ресурсы, руины, стартовые позиции, валидация
- ✅ Правила игры (`src/engine/rules/`) — движение, бой, экономика, исследование, города, найм, дипломатия, победа
- ✅ **AI Director** (`src/engine/ai/`) — StrategicPlanner, TacticalPlanner, UtilityScoring, BehaviorTree, InfluenceMap, AiMemory, DifficultyModifiers
- ✅ **Сохранения/загрузки** (`src/engine/save/`) — сериализация, десериализация, валидация, миграции
- ✅ **AI автоплей** — GameProvider автоматически выполняет ходы AI игроков с задержкой 800мс
- ✅ **Дипломатия** — ChangeDiplomacy команда, кнопки работают (мир/война/союз)
- ✅ **Save/Load UI** — кнопка "Загрузить" в меню, кнопка "Save" в HUD, API routes, Prisma DB
- ✅ **Zustand Store** (`src/store/`) — 6 слайсов: session, gameView, selection, command, ui, settings
- ✅ **Providers** (`src/components/providers/`) — GameProvider (AI + EventBus), I18nProvider, AudioProvider
- ✅ **3D рендеринг** (`src/components/game3d/`) — Canvas, Camera, Lighting, Terrain, Water, Units, Buildings, Fog, Selection, PathPreview, Decorations, Projectiles, Particles, PostProcessing
- ✅ **UI/HUD** (`src/components/hud/`) — GameHud, ResourceBar, TurnPanel, SelectionPanel, UnitPanel, CityPanel, Minimap, NotificationStack, ControlsHelp
- ✅ **Экраны** (`src/components/screens/`) — MainMenuScreen, NewGameScreen, SettingsScreen, TechTreeScreen, CityManagementScreen, RecruitmentScreen, DiplomacyScreen, EndTurnSummaryScreen
- ✅ **Data-конфиги** (`src/data/`) — юниты, здания, технологии, террейн, ресурсы, враги, эры, биомы, сложность, горячие клавиши
- ✅ **Локализация** (`src/data/localization/`) — ru.ts (265+ записей), en.ts (265+ записей)
- ✅ **Web Workers** (`src/workers/`) — pathfinding, AI, mapgen, simulation + workerProtocol + **WorkerManager (интегрирован)**
- ✅ **Rendering утилиты** (`src/rendering/`) — AssetManifest, AssetLoader, ModelRegistry, buildHexGeometry, buildTerrainChunks, terrainMaterials, InstancedModelPool, HexRaycaster, minimapRenderer — **интегрированы в game3d/**
- ✅ **Three.js PCFShadowMap** — убрано deprecation предупреждение
- ✅ Прототип 2D (Canvas) — `public/prototype/index.html`
- ✅ Next.js проект с shadcn/ui компонентами
- ✅ Prisma schema + SQLite (SaveGame model)

### Что НЕ реализовано (ключевое для v0.1-alpha)

- ❌ Декорации и пост-процессинг — нужны 3D модели/ассеты
- ❌ Звуковое оформление — AudioProvider есть, но нужны реальные звуки
- ❌ Полная игровая механика — бой, найм, строительство пока placeholder логика

---

## Структура проекта

```
realms-of-war/
├── docs/
│   └── realms-of-war-design-spec.md   # GDD — полная спецификация
├── prisma/
│   └── schema.prisma                   # Схема БД
├── public/
│   ├── prototype/index.html            # 2D-прототип (Canvas)
│   └── logo.svg
├── src/
│   ├── app/                            # Next.js App Router
│   ├── components/
│   │   ├── game3d/                     # 3D рендеринг (R3F) — 16 компонентов
│   │   ├── hud/                        # HUD overlay (9 компонентов)
│   │   ├── screens/                    # Экраны (8 экранов)
│   │   ├── providers/                  # React провайдеры (3)
│   │   └── ui/                         # shadcn/ui компоненты
│   ├── data/                           # Data-driven конфиги баланса
│   │   ├── buildings.ts
│   │   ├── resources.ts
│   │   ├── technologies.ts
│   │   ├── terrain.ts
│   │   ├── units.ts
│   │   ├── enemies.ts
│   │   ├── eras.ts
│   │   ├── biomes.ts
│   │   ├── difficulty.ts
│   │   ├── hotkeys.ts
│   │   └── localization/              # ru.ts, en.ts
│   ├── engine/                         # Игровой движок
│   │   ├── ai/                        # AI Director (9 файлов)
│   │   ├── core/                       # Ядро (GameState, EventBus, CommandQueue, RNG)
│   │   ├── ecs/                        # ECS (Entity, Components, Systems)
│   │   ├── hex/                        # Гексагональная математика + LOS + регионы
│   │   ├── mapgen/                     # Генератор карты
│   │   ├── rules/                      # Правила игры
│   │   └── save/                       # Сохранения/загрузки
│   ├── hooks/                          # React хуки
│   ├── rendering/                      # Rendering утилиты (9 файлов)
│   │   ├── assets/                     # AssetManifest, AssetLoader, ModelRegistry
│   │   ├── terrain/                    # buildHexGeometry, buildTerrainChunks, terrainMaterials
│   │   ├── instancing/                 # InstancedModelPool
│   │   ├── picking/                    # HexRaycaster
│   │   └── minimimap/                  # minimapRenderer
│   ├── store/                          # Zustand store (6 слайсов)
│   ├── workers/                        # Web Workers (5 файлов)
│   └── lib/                            # Утилиты
├── mini-services/                      # Микросервисы (WebSocket и т.д.)
├── PROJECT_CONTEXT.md                  # Этот файл
└── package.json
```

---

## Ключевые проектные решения

1. **Pointy-top axial гекс-сетка** — XZ-плоскость, высота по Y, радиус гекса = 1.0
2. **Ортографическая камера** — для читаемости стратегии (как Civilization VI)
3. **Typed arrays для карты** — `Uint8Array`, `Int16Array` и т.д. для предсказуемой памяти и быстрой сериализации
4. **Туман войны** — три слоя: explored, visible, lastSeen
5. **Zustand для UI, не для правил** — движок работает без React (тесты, Worker, replay)
6. **Нет сервера в MVP** — Hotseat локально, онлайн добавляется позже
7. **TechBranch = 'military' | 'economic' | 'science' | 'mystical'** — синхронизировано между engine/types.ts и data/technologies.ts

---

## Приоритеты разработки (следующие шаги)

1. **Полная игровая механика** — заменить placeholder логику в GameEngine на правила из rules/
2. **Звук** — реальные звуки вместо синтезированных (или оставить синтез для MVP)
3. **3D модели** — заменить примитивы на AssetLoader/ModelRegistry
4. **Тестирование и баланс** — playtest, настройка баланса

---

## Заметки для AI-ассистентов

- Вся игровая логика в `src/engine/` — чистый TypeScript, без React/Three.js зависимостей
- Рендеринг в `src/components/game3d/` — только чтение снапшотов + отправка команд
- Баланс в `src/data/` — не зашивать числа в код движка
- GDD содержит исчерпывающую спецификацию — сверяться с ним при реализации
- Язык коммуникации: русский
- Язык кода: английский

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
| 2026-06-11 | **Фаза 1:** GameEngine + ECS ядро + Генератор карты + Правила игры (24 файла, 3 параллельных агента) |
| 2026-06-11 | **Фаза 2:** ECS-системы + Zustand Store + 3D рендеринг + Browser verification (34 файла, 3 параллельных агента) |
| 2026-06-11 | **Фаза 3:** UI/HUD + Экраны + Интеграция (19 файлов, 2 параллельных агента + интеграция) |
| 2026-06-11 | **Фаза 4:** LineOfSight + Regions + Save/Load + AI Director + Data configs + Localization (30 файлов, 3 параллельных агента) |
| 2026-06-11 | **Фаза 5:** 3D Polish + Audio + Workers + Rendering utils (19 файлов, 3 параллельных агента + TS fixes) |
| 2026-06-12 | **Фаза 6:** AI autoplay fix + Save/Load UI + Diplomacy actions + Workers integration + Rendering integration + Three.js fix |
