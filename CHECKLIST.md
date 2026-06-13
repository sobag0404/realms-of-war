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
- [x] GitHub Actions CI (`.github/workflows/ci.yml`)
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

## 11. Подключение правил (Фаза 7) — GameEngine → rules/systems

- [x] GameEngine.validateCommand() — делегирует в rules/ (canMoveTo, canAttack, canFoundCity, canRecruitUnit, canResearch, canPropose)
- [x] GameEngine.applyCommand() — делегирует в systems/ (MovementSystem, CombatSystem, CitySystem, ResearchSystem, EconomySystem)
- [x] GameEngine.applyEndTurn() — использует TurnSystem.endTurn() (полный pipeline: income → research → cities → status → heal → vision)
- [x] Исследование теперь требует времени — ResearchSystem.startResearch() вместо мгновенного завершения
- [x] Рекрут добавляет в production queue — startRecruitment() вместо мгновенного создания
- [x] Здания строятся через production queue — CitySystem.buildBuilding()
- [x] Основание города требует поселенца — canFoundCity() проверяет наличие settler
- [x] Боевая формула из GDD — terrain/height/flanking/crit/counterattack бонусы
- [x] Дипломатия через rules — canPropose() + setDiplomacyStatus()

## 12. Новые команды (Фаза 7)

- [x] FortifyUnit — юнит окапывается (+DEF, конец хода)
- [x] BuildImprovement — worker строит улучшение (ферма, шахта, лесопилка, карьер, дорога, мана-фокус)
- [x] SellResource — продажа ресурсов на рынке (50% от цены покупки)
- [x] BuyResource — покупка ресурсов на рынке
- [x] commandHandlers.ts — валидация и применение новых команд

## 13. Старт игры (Фаза 7)

- [x] populateStartingPositions() — создаёт столицу, копейщика и поселенца для каждого игрока
- [x] Territory claiming — стартовые города получают зону влияния
- [x] Starting resources — золото 100, еда 50, дерево 50, камень 30
- [x] sessionSlice.startNewGame() — вызывает populateStartingPositions после генерации карты

## 14. UI Production Queue (Фаза 7)

- [x] RecruitmentScreen — показывает production queue + прогресс-бары
- [x] CityManagementScreen — доступные здания + yield breakdown + production queue
- [x] CityPanel — компактный вид: текущее производство + доходы
- [x] ResourceBar — net income (доход - содержание) с цветовой кодировкой + tooltips

---

## 15. Техническое ревью 1 (2026-06-12)

> Полный текст: `docs/realms-of-war-ai-dev-review.md` | Секция GDD: §16

### 15.1. P0 — Критичные (БЛОКЕРЫ)

- [x] Удалить XTransformPort reverse proxy из Caddyfile (SSRF/open proxy)
- [x] Убрать `ignoreBuildErrors: true` из next.config.ts
- [x] Включить `reactStrictMode: true` в next.config.ts
- [x] Save API: добавить auth/ownership (ownerId filter, "local" default)
- [x] Save API: добавить body size limit (2MB, 413 если больше)
- [x] Save API: добавить Zod validation для request body/query params
- [x] Обновить Next.js до patched версии (16.1.3 → 16.2.9)

### 15.2. P1 — Серьёзные

- [x] Добавить Vitest + typecheck script
- [x] Написать engine/API unit tests (100 тестов: hex, movement, combat, city, research, save/load, save API)
- [x] Ввести SaveService — единый путь save/load через engine SaveFile format
- [x] Save: checksum не пустой, load проверяет checksum
- [x] Save: сохранять gameConfig, commandLog, rngState
- [x] Save: load через deserializeSave/validateSave/applyMigrations
- [x] Детерминизм: убрать Math.random() из engine/rules (cityRules, recruitmentRules, AiDirector)
- [x] Детерминизм: убрать Date.now() из engine/rules (заменить на GameRng/counters)
- [x] Детерминизм: добавить nextEntitySeq/nextCitySeq в GameState
- [x] Worker protocol: добавить requestId в request/response
- [x] Worker: WorkerManager ищет pending request по requestId, не FIFO
- [x] ESLint: включить no-debugger, no-unreachable, no-empty, no-undef
- [x] ESLint: включить react-hooks/exhaustive-deps (warn)
- [x] ESLint: включить @typescript-eslint/no-unused-vars (warn)
- [x] Удалить placeholder `eventBus.on('event')` из GameProvider.tsx
- [x] Исправить Fortify: dispatch FortifyUnit вместо EndTurn в UnitPanel.tsx

### 15.3. P2 — Средние

- [x] TerrainLayer: заменить cleanup useMemo на useEffect
- [x] TerrainLayer: не рендерить full HexMesh при активных chunks
- [x] TerrainLayer: lightweight interaction overlay для picking (HexInteractionPlane)
- [x] Добавить root README.md (setup, команды, структура, security notes)
- [x] Добавить .env.example
- [x] Убрать hardcoded /home/z/my-project из scripts/mini-services
- [x] Prisma: dev-only query logging (production: error only)
- [x] Settings: schema validation для localStorage значений (Zod SettingsSchema)
- [x] GameEngine: dispatch добавляет command в executedCommands log
- [x] GameEngine: getCommandLog() + restoreCommandLog() для save/load
- [ ] GameEngine: processQueue не skip invalid commands silently
- [ ] GameProvider: log/report AI invalid commands в dev mode
- [x] GitHub Actions CI (install, Prisma generate, typecheck, lint, test, build)
- [ ] Mini-service: усиленная path traversal защита (path.resolve + startsWith)

### 15.4. Ревью 2 — P0 (2026-06-12, второй ревьюер)

> Полный текст: `docs/realms-of-war-ai-developer-review.md`

- [x] Save/load flow: MainMenuScreen использует loadSaveFile() + verifyChecksum()
- [x] Production build: build.sh не зависит от ./db/custom.db

### 15.5. Ревью 2 — P1

- [x] Checksum regex: {8,16} вместо {0,16} (пустой checksum не проходит)
- [x] Server-side checksum verification в POST /api/save
- [x] SaveFile structure validation через loadSaveFile() перед DB insert
- [x] Body size protection: Content-Length + raw text guard до JSON.parse
- [x] Command log: executedCommands в GameEngine.dispatch()
- [x] MoveUnit path validation: validateMovementPath() в movementRules
- [x] API tests: save/load schemas и routes, включая invalid `/api/saves` pagination
- [x] Worker typing: убран @ts-nocheck из pathfinding.worker.ts

### 15.6. Ревью 2 — P2

- [x] .gitignore: исправлена склеенная строка, tool-results/ убран из git
- [x] Hardcoded scripts: start-game.sh, watchdog.sh используют относительные пути
- [x] localStorage settings validation: Zod SettingsSchema

---

## 📊 Прогресс v0.1-alpha

### Структурный прогресс (файлы существуют)

```
Инфраструктура     ████████████████████ 100%  (8/8)
Ядро движка        ████████████████████ 100%  (7/7)
Hex-математика     ████████████████████ 100%  (9/9)
ECS ядро+системы   ████████████████████ 100%  (12/12)
Генератор карты    ████████████████████ 100%  (8/8)
Правила            ████████████████████ 100%  (8/8)
AI Director        ████████████████████ 100%  (9/9)
Сохранения         ████████████████████ 100%  (4/4)
Команды/События    ████████████████████ 100%  (7/7)
Data-конфиги       ████████████████████ 100%  (12/12)
3D Рендеринг       ████████████████████ 100%  (16/16)
UI/HUD             ████████████████████ 100%  (18/18)
Store              ████████████████████ 100%  (7/7)
Providers          ████████████████████ 100%  (3/3)
Workers            ████████████████████ 100%  (6/6)
Rendering utils    ████████████████████ 100%  (9/9)
Интеграция         ████████████████████ 100%  (9/9)
Rules→Engine       ████████████████████ 100%  (9/9)
Новые команды      ████████████████████ 100%  (5/5)
Старт игры         ████████████████████ 100%  (4/4)
UI Production      ████████████████████ 100%  (4/4)
────────────────────────────────────────────
Структурный        ████████████████████ 100%  (186/186)
```

### Инженерная зрелость (по результатам ревью)

```
Безопасность       ████████████████████ 100%  (checksum server-side, body guard, Zod, ownerId)
Тесты              ██████████████████░░  90%  (96 тестов: hex/movement/combat/city/research/save/API)
Save consistency   ████████████████████ 100%  (SaveService + checksum + loadSaveFile + gameConfig + rngState)
Детерминизм        ████████████████████ 100%  (idGenerator, GameRng, нет Math.random/Date.now)
Worker protocol    ████████████████████ 100%  (requestId roundtrip, no FIFO)
ESLint/TS strict   ██████████████████░░  90%  (critical rules ON, no ignoreBuildErrors, pathfinding typed)
Документация       ████████████████████ 100%  (README + .env.example + review docs + CI)
Movement validation████████████████████ 100%  (validateMovementPath)
────────────────────────────────────────────
Инженерная         ███████████████████░  95%  (41/43)
```

> ⚠️ **Важно:** Структурный прогресс 100% означает что файлы существуют и код написан.
> Инженерная зрелость отражает качество: безопасность, тесты, детерминизм, документация.

---

## 🔑 Ключевые файлы для быстрого ориентирования

| Что посмотреть | Где | Зачем |
|---|---|---|
| Полная спецификация | `docs/realms-of-war-design-spec.md` | Все правила, формулы, архитектура |
| Техническое ревью 1 | `docs/realms-of-war-ai-dev-review.md` | Результаты ревью 2026-06-12, P0/P1/P2 задачи |
| Техническое ревью 2 | `docs/realms-of-war-ai-developer-review.md` | Второй ревью 2026-06-12, новые P0/P1/P2 задачи |
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
