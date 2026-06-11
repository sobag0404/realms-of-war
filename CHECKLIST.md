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
- [x] `systems/MovementSystem.ts` — движение юнитов (делегирует movementRules)
- [x] `systems/CombatSystem.ts` — боёвка (делегирует combatRules)
- [x] `systems/VisionSystem.ts` — туман войны (радиусы обзора, terrain бонусы)
- [x] `systems/EconomySystem.ts` — экономика (income breakdown, bankruptcy)
- [x] `systems/ResearchSystem.ts` — исследование (progress, start, complete)
- [x] `systems/CitySystem.ts` — города (founding, growth, production, buildings)
- [x] `systems/AiSystem.ts` — AI (utility scoring, priority evaluation, command generation)
- [x] `systems/StatusEffectSystem.ts` — эффекты статусов (7 эффектов, duration tracking)
- [x] `systems/TurnSystem.ts` — управление ходами (full turn pipeline)

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

- [x] `GameCanvas.tsx` — корневой Canvas (orthographic, shadows, high-perf GL)
- [x] `SceneRoot.tsx` — корень сцены (9 визуальных слоёв)
- [x] `CameraRig.tsx` — ортографическая камера (WASD, zoom, rotate, edge scroll)
- [x] `LightingRig.tsx` — освещение (ambient + directional sun + hemisphere)
- [x] `TerrainLayer.tsx` — слой террейна (все гексы, terrain colors, click/hover)
- [x] `HexMesh.tsx` — mesh одного гекса (pointy-top ExtrudeGeometry)
- [x] `WaterLayer.tsx` — вода (animated sine-wave, transparent blue)
- [ ] `DecorationLayer.tsx` — декорации
- [x] `UnitLayer.tsx` — юниты (colored shapes + health bars + selection)
- [x] `BuildingLayer.tsx` — здания (box+cone, wall/territory rings)
- [ ] `ProjectileLayer.tsx` — снаряды
- [ ] `ParticleLayer.tsx` — частицы
- [x] `FogLayer.tsx` — туман войны (hidden/explored/visible)
- [x] `SelectionHighlights.tsx` — подсветка выбора (selected, hovered, reachable, attackable)
- [x] `PathPreview.tsx` — предпросмотр пути (dashed line + waypoint dots)
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

> ⚠️ Базовый HUD overlay уже есть в page.tsx (top bar + hex info + controls)
> Остальные экраны — полноценные React-компоненты с shadcn/ui

## 6. Zustand Store (src/store/)

- [x] `useGameStore.ts` — корневой store (6 слайсов + devtools)
- [x] `slices/sessionSlice.ts` — движок lifecycle, state snapshots, startNewGame
- [x] `slices/gameViewSlice.ts` — камера, viewport, grid/yields/threat toggles
- [x] `slices/selectionSlice.ts` — выбор юнита/города/гекса
- [x] `slices/commandSlice.ts` — очередь команд, история, optimistic events
- [x] `slices/uiSlice.ts` — панели, модалки, уведомления, tooltip
- [x] `slices/settingsSlice.ts` — настройки (localStorage persistence)

## 7. Providers (src/components/providers/)

- [x] `GameProvider.tsx` — провайдер движка (EventBus → UI bridge)
- [ ] `AudioProvider.tsx` — аудио
- [x] `I18nProvider.tsx` — локализация (useI18n hook, ru/en)

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
Инфраструктура     ████████████████████ 100%  (10/10)
Ядро движка        ████████████████████ 100%  (9/9)
Hex-математика     ████████████████░░░░  80%  (7/9)
ECS ядро+системы   ████████████████████ 100%  (12/12)
Генератор карты    ████████████████████ 100%  (8/8)
Правила            ████████████████████ 100%  (8/8)
AI базовый         ████████░░░░░░░░░░░░  25%  (AiSystem есть, остальное позже)
Команды/События    ████████████████████ 100%  (2/2)
Data-конфиги       ██████████░░░░░░░░░░  50%  (5/10)
3D Рендеринг       ██████████░░░░░░░░░░  62%  (10/16)
UI/HUD             ██░░░░░░░░░░░░░░░░░░  10%  (базовый overlay в page.tsx)
Store              ████████████████████ 100%  (7/7)
Providers          ████████████░░░░░░░░  67%  (2/3)
────────────────────────────────────────────
Общий прогресс     ██████████████░░░░░░  58%  (82/141)
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
