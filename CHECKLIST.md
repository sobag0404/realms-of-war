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
- [x] `lineOfSight.ts` — линия видимости
- [x] `regions.ts` — система регионов (провинции, landmass)

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

### 2.6 AI Director (ai/)

- [x] `AiDirector.ts` — директор AI (11-step pipeline, difficulty fallback)
- [x] `StrategicPlanner.ts` — стратегический планировщик (9 goals, 6 metrics)
- [x] `TacticalPlanner.ts` — тактический планировщик (9 goal-specific planners)
- [x] `UtilityScoring.ts` — utility AI (diminishing returns, influence+assessment modifiers)
- [x] `BehaviorTree.ts` — дерево поведения (Selector, Sequence, Decorator, Condition, Action)
- [x] `InfluenceMap.ts` — карта влияния (exponential decay, territory, contested zones)
- [x] `AiMemory.ts` — память AI (enemy positions, trust, past decisions, features)
- [x] `difficultyModifiers.ts` — модификаторы сложности (4 levels)
- [x] `index.ts` — barrel re-export

### 2.7 Команды (commands/)

- [x] `index.ts` — реэкспорт + утилиты (getCommandPlayerId, isCommandType)

### 2.8 События (events/)

- [x] `index.ts` — реэкспорт + утилиты (filterEventsForPlayer, getRecentEvents)

### 2.9 Сохранения (save/)

- [x] `saveGame.ts` — сериализация (SaveFile, FNV-1a checksum)
- [x] `loadGame.ts` — десериализация + валидация
- [x] `migrations.ts` — миграции формата (CURRENT_SAVE_VERSION = 1)
- [x] `index.ts` — barrel re-export

## 3. Data-конфиги (src/data/)

- [x] `terrain.ts` — типы террейна
- [x] `units.ts` — параметры юнитов
- [x] `buildings.ts` — параметры зданий
- [x] `technologies.ts` — дерево технологий
- [x] `resources.ts` — типы ресурсов
- [x] `enemies.ts` — параметры врагов (12 типов, difficulty 1-5)
- [x] `eras.ts` — эпохи (5 эпох: primitives → rift)
- [x] `biomes.ts` — биомы (12 биомов с Whittaker-классификацией)
- [x] `difficulty.ts` — уровни сложности (settler/easy/normal/hard/deity)
- [x] `hotkeys.ts` — горячие клавиши (32 клавиши, 5 категорий)
- [x] `localization/ru.ts` — русская локализация (265+ записей)
- [x] `localization/en.ts` — английская локализация (265+ записей)

## 4. 3D Рендеринг (src/components/game3d/)

- [x] `GameCanvas.tsx` — корневой Canvas (orthographic, shadows, high-perf GL)
- [x] `SceneRoot.tsx` — корень сцены (13 визуальных слоёв)
- [x] `CameraRig.tsx` — ортографическая камера (WASD, zoom, rotate, edge scroll)
- [x] `LightingRig.tsx` — освещение (ambient + directional sun + hemisphere)
- [x] `TerrainLayer.tsx` — слой террейна (все гексы, terrain colors, click/hover)
- [x] `HexMesh.tsx` — mesh одного гекса (pointy-top ExtrudeGeometry)
- [x] `WaterLayer.tsx` — вода (animated sine-wave, transparent blue)
- [x] `DecorationLayer.tsx` — декорации (instanced meshes, wind sway, fog-aware)
- [x] `UnitLayer.tsx` — юниты (colored shapes + health bars + selection)
- [x] `BuildingLayer.tsx` — здания (box+cone, wall/territory rings)
- [x] `ProjectileLayer.tsx` — снаряды (arrow/magic_bolt/siege_stone, parabolic arc)
- [x] `ParticleLayer.tsx` — частицы (8 типов, BufferGeometry Points, additive blend)
- [x] `FogLayer.tsx` — туман войны (hidden/explored/visible)
- [x] `SelectionHighlights.tsx` — подсветка выбора (selected, hovered, reachable, attackable)
- [x] `PathPreview.tsx` — предпросмотр пути (dashed line + waypoint dots)
- [x] `PostProcessing.tsx` — пост-процессинг (bloom, vignette, tone mapping, 4 presets)

## 5. UI/HUD (src/components/hud/ + screens/)

- [x] `GameHud.tsx` — главный HUD overlay
- [x] `ResourceBar.tsx` — панель ресурсов (8 ресурсов, дельты, адаптивная)
- [x] `TurnPanel.tsx` — панель хода (номер, игрок, фаза, кнопки: меню, технологии, дипломатия, настройки, конец хода)
- [x] `SelectionPanel.tsx` — панель выбора (контекстная: юнит/город/гекс)
- [x] `UnitPanel.tsx` — панель юнита (HP, статы, способности, действия)
- [x] `CityPanel.tsx` — панель города (население, производство, здания)
- [x] `Minimap.tsx` — мини-карта (Canvas, terrain colors, клик)
- [x] `NotificationStack.tsx` — уведомления (info/success/warning/error)
- [x] `ControlsHelp.tsx` — справка по управлению (сворачиваемая)
- [x] `MainMenuScreen.tsx` — главное меню (Новая игра, Загрузить, Настройки)
- [x] `NewGameScreen.tsx` — новая игра (размер карты, игроки, сложность)
- [x] `SettingsScreen.tsx` — настройки (графика, звук, интерфейс)
- [x] `TechTreeScreen.tsx` — дерево технологий (фильтры, эры, прогресс)
- [x] `CityManagementScreen.tsx` — управление городом (население, производство, здания, оборона)
- [x] `RecruitmentScreen.tsx` — найм юнитов (фильтр по зданиям/техам, стоимость)
- [x] `DiplomacyScreen.tsx` — дипломатия (список игроков, статус)
- [x] `EndTurnSummaryScreen.tsx` — итоги хода (модальное окно)
- [x] `page.tsx` — интеграция: меню ↔ игра, overlay panels

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
- [x] `AudioProvider.tsx` — аудио (Web Audio API, 8 SFX, 3 music tracks, 3 ambient, volume controls)
- [x] `I18nProvider.tsx` — локализация (useI18n hook, ru/en словари из data/localization/)

## 8. Web Workers (src/workers/)

- [x] `workerProtocol.ts` — протокол обмена сообщениями
- [x] `pathfinding.worker.ts` — A* pathfinding (self-contained)
- [x] `ai.worker.ts` — AI turn generation (self-contained)
- [x] `mapgen.worker.ts` — генерация карты (self-contained)
- [x] `simulation.worker.ts` — симуляция ходов (self-contained)

## 9. Rendering утилиты (src/rendering/)

- [x] `assets/AssetManifest.ts` — манифест ассетов (~30 записей)
- [x] `assets/AssetLoader.ts` — загрузчик с прогрессом и кэшем
- [x] `assets/ModelRegistry.ts` — реестр моделей (30+ primitive definitions)
- [x] `terrain/buildHexGeometry.ts` — оптимизированная геометрия гекса
- [x] `terrain/buildTerrainChunks.ts` — система чанков (16×16)
- [x] `terrain/terrainMaterials.ts` — материалы террейна с кэшем
- [x] `instancing/InstancedModelPool.ts` — пул инстансированных моделей
- [x] `picking/HexRaycaster.ts` — raycasting для пикинга гексов
- [x] `minimap/minimapRenderer.ts` — рендерер мини-карты (Canvas 2D)

## 10. Интеграция (Фаза 6)

- [x] AI автоплей — GameProvider автоматически выполняет AI ходы с задержкой 800мс
- [x] Save/Load UI — кнопка "Загрузить" в меню + кнопка "Save" в HUD
- [x] Save/Load API — /api/save, /api/load, /api/saves routes + Prisma SaveGame model
- [x] Дипломатия — ChangeDiplomacy команда + рабочие кнопки (мир/война/союз)
- [x] Workers интеграция — WorkerManager + useWorkerManager hook + fallback к sync
- [x] Rendering интеграция — buildHexGeometry в HexMesh, terrainMaterials, ModelRegistry, MinimapRenderer
- [x] GameEngine.setState — для загрузки сохранений
- [x] Three.js PCFShadowMap — убрано deprecation предупреждение
- [x] GameProvider в layout — подключён к React-дереву

---

## 📊 Прогресс v0.1-alpha

```
Инфраструктура     ████████████████████ 100%  (8/8)
Ядро движка        ████████████████████ 100%  (7/7)
Hex-математика     ████████████████████ 100%  (9/9)
ECS ядро+системы   ████████████████████ 100%  (12/12)
Генератор карты    ████████████████████ 100%  (8/8)
Правила            ████████████████████ 100%  (8/8)
AI Director        ████████████████████ 100%  (9/9)
Сохранения         ████████████████████ 100%  (4/4)
Команды/События    ████████████████████ 100%  (3/3)
Data-конфиги       ████████████████████ 100%  (12/12)
3D Рендеринг       ████████████████████ 100%  (16/16)
UI/HUD             ████████████████████ 100%  (18/18)
Store              ████████████████████ 100%  (7/7)
Providers          ████████████████████ 100%  (3/3)
Workers            ████████████████████ 100%  (6/6)
Rendering utils    ████████████████████ 100%  (9/9)
Интеграция         ████████████████████ 100%  (9/9)
────────────────────────────────────────────
Общий прогресс     ████████████████████ 100%  (148/148)
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
| Враги | `src/data/enemies.ts` | 12 типов врагов |
| Биомы | `src/data/biomes.ts` | 12 биомов + determineBiome() |
| Сложность | `src/data/difficulty.ts` | 5 уровней сложности |
| Hex-координаты | `src/engine/hex/coordinates.ts` | Вся математика гексов |
| Линия видимости | `src/engine/hex/lineOfSight.ts` | LOS правила |
| Регионы | `src/engine/hex/regions.ts` | BFS flood-fill регионов |
| Поиск пути | `src/engine/hex/pathfinding.ts` | A* на гекс-сетке |
| GameEngine | `src/engine/core/GameEngine.ts` | Фасад движка |
| AI Director | `src/engine/ai/AiDirector.ts` | Главный AI оркестратор |
| Сохранения | `src/engine/save/saveGame.ts` | Сериализация + FNV-1a |
| Генератор карты | `src/engine/mapgen/generateMap.ts` | Оркестратор генерации |
| Правила боя | `src/engine/rules/combatRules.ts` | Все правила боя |
| ECS компоненты | `src/engine/ecs/components.ts` | 14 компонент ECS |
| Локализация RU | `src/data/localization/ru.ts` | 265+ записей |
| Prisma схема | `prisma/schema.prisma` | Структура БД |
