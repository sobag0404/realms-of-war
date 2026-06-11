# Realms of War — Checklist

> Быстрый обзор состояния проекта. Без необходимости читать весь код.
> Обновлять после каждого значимого изменения и пушить в GitHub.

---

## 📋 Как пользоваться

- `[x]` — реализовано и работает
- `[~]` — в процессе / частично реализовано
- `[ ]` — не начато
- `[-]` — заблокировано / отложено

---

## 1. Проектная инфраструктура

- [x] Next.js 16 + TypeScript проект
- [x] GitHub репозиторий (приватный)
- [x] GDD — полная спецификация (`docs/realms-of-war-design-spec.md`)
- [x] PROJECT_CONTEXT.md — контекст проекта
- [x] CHECKLIST.md — этот файл
- [x] .gitignore настроен (db, uploads, worklogs, screenshots)
- [x] Prisma schema + SQLite подключены
- [x] shadcn/ui компоненты подключены

## 2. Игровой движок (src/engine/)

### 2.1 Ядро (core/)

- [x] `types.ts` — базовые типы
- [x] `GameState.ts` — сериализуемое состояние матча
- [x] `GameConfig.ts` — конфигурация игры
- [x] `GameRng.ts` — детерминированный PRNG
- [x] `CommandQueue.ts` — очередь команд
- [x] `EventBus.ts` — типизированная шина событий
- [x] `GameEngine.ts` — главный фасад движка (диспетчеризация команд)

### 2.2 Гексагональная математика (hex/)

- [x] `coordinates.ts` — HexCoord, CubeCoord, конвертации
- [x] `directions.ts` — 6 направлений соседей
- [x] `distance.ts` — гексагональная дистанция
- [x] `rounding.ts` — округление fractional hex
- [x] `layout.ts` — hex↔world конвертация
- [x] `mapStorage.ts` — typed arrays для хранения карты
- [x] `pathfinding.ts` — A* поиск пути
- [ ] `lineOfSight.ts` — линия видимости
- [ ] `regions.ts` — система регионов (провинции, landmass)

### 2.3 ECS-системы (ecs/)

- [x] `Entity.ts` — базовая сущность
- [x] `components.ts` — 14 компонентов (Health, Movement, Combat, Owner, Position, Experience, Upkeep, Abilities, City, Production, Population, Territory, Fortification, Vision)
- [x] `componentStorage.ts` — хранилище компонентов
- [ ] `systems/MovementSystem.ts` — движение юнитов
- [ ] `systems/CombatSystem.ts` — боёвка
- [ ] `systems/VisionSystem.ts` — туман войны
- [ ] `systems/EconomySystem.ts` — экономика
- [ ] `systems/ResearchSystem.ts` — исследование
- [ ] `systems/CitySystem.ts` — города
- [ ] `systems/AiSystem.ts` — AI
- [ ] `systems/StatusEffectSystem.ts` — эффекты статусов
- [ ] `systems/TurnSystem.ts` — управление ходами

### 2.4 Генератор карты (mapgen/)

- [x] `generateMap.ts` — оркестратор генерации
- [x] `noise.ts` — SeededNoise (кастомный, без внешних зависимостей)
- [x] `biomes.ts` — распределение биомов по elevation + moisture
- [x] `rivers.ts` — генерация рек (downhill flow, edge masks)
- [x] `resources.ts` — размещение ресурсов (weighted per terrain)
- [x] `ruins.ts` — размещение руин (biome-border diversity scoring)
- [x] `startingPositions.ts` — стартовые позиции (greedy farthest-point)
- [x] `validation.ts` — валидация карты (connectivity, land%, trapped players)

### 2.5 Правила (rules/)

- [x] `movementRules.ts` — правила движения (terrain cost, roads, rivers, blocking)
- [x] `combatRules.ts` — правила боя (damage formula, terrain bonuses, flanking, crit, counter)
- [x] `economyRules.ts` — правила экономики (hex yields, buildings, upkeep, bankruptcy)
- [x] `researchRules.ts` — правила исследования (prerequisites, era progression)
- [x] `cityRules.ts` — правила городов (founding, territory, growth, buildings)
- [x] `recruitmentRules.ts` — правила найма (building requirements, production queue)
- [x] `diplomacyRules.ts` — правила дипломатии (war/peace/alliance/vassal)
- [x] `victoryRules.ts` — условия победы (conquest/science/economic/cultural/rift)

### 2.6 AI (ai/)

- [ ] `AiDirector.ts` — директор AI
- [ ] `StrategicPlanner.ts` — стратегический планировщик
- [ ] `TacticalPlanner.ts` — тактический планировщик
- [ ] `UtilityScoring.ts` — utility AI
- [ ] `BehaviorTree.ts` — дерево поведения
- [ ] `InfluenceMap.ts` — карта влияния
- [ ] `AiMemory.ts` — память AI
- [ ] `difficultyModifiers.ts` — модификаторы сложности

### 2.7 Команды (commands/)

- [x] `index.ts` — реэкспорт + утилиты (getCommandPlayerId, isCommandType)

### 2.8 События (events/)

- [x] `index.ts` — реэкспорт + утилиты (filterEventsForPlayer, getRecentEvents)

### 2.9 Сохранения (save/)

- [ ] `saveGame.ts` — сериализация
- [ ] `loadGame.ts` — десериализация
- [ ] `migrations.ts` — миграции формата

## 3. Data-конфиги (src/data/)

- [x] `terrain.ts` — типы террейна
- [x] `units.ts` — параметры юнитов
- [x] `buildings.ts` — параметры зданий
- [x] `technologies.ts` — дерево технологий
- [x] `resources.ts` — типы ресурсов
- [ ] `enemies.ts` — параметры врагов
- [ ] `eras.ts` — эпохи
- [ ] `biomes.ts` — биомы
- [ ] `difficulty.ts` — уровни сложности
- [ ] `hotkeys.ts` — горячие клавиши
- [ ] `localization/ru.ts` — русская локализация
- [ ] `localization/en.ts` — английская локализация

## 4. 3D Рендеринг (src/components/game3d/)

- [ ] `GameCanvas.tsx` — корневой Canvas
- [ ] `SceneRoot.tsx` — корень сцены
- [ ] `CameraRig.tsx` — ортографическая камера
- [ ] `LightingRig.tsx` — освещение
- [ ] `TerrainLayer.tsx` — слой террейна
- [ ] `HexMesh.tsx` — mesh одного гекса
- [ ] `WaterLayer.tsx` — вода
- [ ] `DecorationLayer.tsx` — декорации
- [ ] `UnitLayer.tsx` — юниты
- [ ] `BuildingLayer.tsx` — здания
- [ ] `ProjectileLayer.tsx` — снаряды
- [ ] `ParticleLayer.tsx` — частицы
- [ ] `FogLayer.tsx` — туман войны
- [ ] `SelectionHighlights.tsx` — подсветка выбора
- [ ] `PathPreview.tsx` — предпросмотр пути
- [ ] `PostProcessing.tsx` — пост-процессинг

## 5. UI/HUD (src/components/hud/ + screens/)

- [ ] `GameHud.tsx` — главный HUD
- [ ] `ResourceBar.tsx` — панель ресурсов
- [ ] `TurnPanel.tsx` — панель хода
- [ ] `SelectionPanel.tsx` — панель выбора
- [ ] `UnitPanel.tsx` — панель юнита
- [ ] `CityPanel.tsx` — панель города
- [ ] `EnemyPanel.tsx` — панель врага
- [ ] `Minimap.tsx` — мини-карта
- [ ] `NotificationStack.tsx` — уведомления
- [ ] `MainMenuScreen.tsx` — главное меню
- [ ] `NewGameScreen.tsx` — новая игра
- [ ] `LoadGameScreen.tsx` — загрузка
- [ ] `SettingsScreen.tsx` — настройки
- [ ] `TechTreeScreen.tsx` — дерево технологий
- [ ] `CityManagementScreen.tsx` — управление городом
- [ ] `RecruitmentScreen.tsx` — найм юнитов
- [ ] `DiplomacyScreen.tsx` — дипломатия
- [ ] `EndTurnSummaryScreen.tsx` — итоги хода

## 6. Zustand Store (src/store/)

- [ ] `useGameStore.ts` — корневой store
- [ ] `slices/sessionSlice.ts`
- [ ] `slices/gameViewSlice.ts`
- [ ] `slices/selectionSlice.ts`
- [ ] `slices/commandSlice.ts`
- [ ] `slices/uiSlice.ts`
- [ ] `slices/settingsSlice.ts`
- [ ] `slices/assetSlice.ts`
- [ ] `slices/devtoolsSlice.ts`

## 7. Providers (src/components/providers/)

- [ ] `GameProvider.tsx` — провайдер движка
- [ ] `AudioProvider.tsx` — аудио
- [ ] `I18nProvider.tsx` — локализация

## 8. Web Workers (src/workers/)

- [ ] `pathfinding.worker.ts`
- [ ] `ai.worker.ts`
- [ ] `mapgen.worker.ts`
- [ ] `simulation.worker.ts`
- [ ] `workerProtocol.ts`

## 9. Rendering утилиты (src/rendering/)

- [ ] `assets/AssetManifest.ts`
- [ ] `assets/AssetLoader.ts`
- [ ] `assets/ModelRegistry.ts`
- [ ] `terrain/buildHexGeometry.ts`
- [ ] `terrain/buildTerrainChunks.ts`
- [ ] `terrain/terrainMaterials.ts`
- [ ] `instancing/InstancedModelPool.ts`
- [ ] `picking/HexRaycaster.ts`
- [ ] `minimap/minimapRenderer.ts`

---

## 📊 Прогресс v0.1-alpha

```
Инфраструктура     ██████████░░░░░░░░░░  50%  (5/10)
Ядро движка        ████████████████░░░░  80%  (7+1/9)  ← GameEngine.ts добавлен
Hex-математика     ████████████████░░░░  80%  (7/9)
ECS ядро           ████████████████████ 100%  (3/3)   ← Entity, Components, Storage
ECS-системы        ░░░░░░░░░░░░░░░░░░░░   0%  (0/9)
Генератор карты    ████████████████████ 100%  (8/8)   ← Все файлы
Правила            ████████████████████ 100%  (8/8)   ← Все файлы
AI                 ░░░░░░░░░░░░░░░░░░░░   0%  (0/8)
Команды/События    ████████████████████ 100%  (2/2)   ← index.ts barrel files
Data-конфиги       ██████████░░░░░░░░░░  50%  (5/10)
3D Рендеринг       ░░░░░░░░░░░░░░░░░░░░   0%  (0/16)
UI/HUD             ░░░░░░░░░░░░░░░░░░░░   0%  (0/18)
Store              ░░░░░░░░░░░░░░░░░░░░   0%  (0/9)
────────────────────────────────────────────
Общий прогресс     ██████░░░░░░░░░░░░░░  33%  (42/128)
```

---

## 🔑 Ключевые файлы для быстрого ориентирования

| Что посмотреть | Где | Зачем |
|---|---|---|
| Полная спецификация | `docs/realms-of-war-design-spec.md` | Все правила, формулы, архитектура |
| Типы движка | `src/engine/core/types.ts` | Базовые типы игры |
| Конфиг игры | `src/engine/core/GameConfig.ts` | Настройки карты, баланса |
| Баланс юнитов | `src/data/units.ts` | Характеристики юнитов |
| Баланс зданий | `src/data/buildings.ts` | Характеристики зданий |
| Дерево технологий | `src/data/technologies.ts` | Технологии и зависимости |
| Hex-координаты | `src/engine/hex/coordinates.ts` | Вся математика гексов |
| Поиск пути | `src/engine/hex/pathfinding.ts` | A* на гекс-сетке |
| GameEngine | `src/engine/core/GameEngine.ts` | Фасад движка |
| Генератор карты | `src/engine/mapgen/generateMap.ts` | Оркестратор генерации |
| Правила движения | `src/engine/rules/movementRules.ts` | Все правила движения |
| Правила боя | `src/engine/rules/combatRules.ts` | Все правила боя |
| ECS компоненты | `src/engine/ecs/components.ts` | 14 компонент ECS |
| Prisma схема | `prisma/schema.prisma` | Структура БД |
