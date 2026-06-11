# Realms of War: полная спецификация разработки

Версия документа: 0.1  
Дата: 2026-06-11  
Целевая версия игры: `v0.1-alpha` локальная одиночная игра и Hotseat, 3D-клиент без онлайн-сервера  
Язык документа: русский  

## Базовые проектные решения

1. Игра создается заново на TypeScript, React, Next.js, React Three Fiber и Three.js.
2. Код прототипа на Canvas 2D не переносится напрямую. Переносятся правила, термины, базовые сущности и игровой темп.
3. Вся игровая логика должна быть детерминированной. Один и тот же seed и один и тот же список команд должны давать одинаковое состояние.
4. Рендеринг не имеет права изменять игровое состояние напрямую. Он только читает снапшоты состояния и отправляет пользовательские команды.
5. MVP не требует сервера. Hotseat реализуется локально. Онлайн-мультиплеер добавляется позже через синхронизацию команд.
6. Все численные значения ниже являются стартовым балансом версии `v0.1-alpha`. Их нужно хранить в data-driven конфигурациях, а не зашивать в код.

---

# 1. Архитектура проекта

## 1.1. Структура директорий и файлов

```text
realms-of-war/
  README.md
  package.json
  pnpm-lock.yaml
  next.config.mjs
  tsconfig.json
  eslint.config.mjs
  prettier.config.mjs
  vitest.config.ts
  playwright.config.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  public/
    assets/
      models/
        units/
        buildings/
        terrain/
        decorations/
        resources/
        vfx/
      textures/
        terrain/
        ui/
        skybox/
        particles/
      audio/
        music/
        sfx/
        ambience/
      fonts/
      icons/
  docs/
    realms-of-war-design-spec.md
    balance/
      units.md
      buildings.md
      technologies.md
    asset-pipeline.md
    multiplayer-protocol.md
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      game/
        page.tsx
      settings/
        page.tsx
    components/
      ui/
        Button.tsx
        IconButton.tsx
        Panel.tsx
        Modal.tsx
        Tooltip.tsx
        Tabs.tsx
        Slider.tsx
        Select.tsx
        ProgressBar.tsx
        ResourceBadge.tsx
      hud/
        GameHud.tsx
        ResourceBar.tsx
        TurnPanel.tsx
        SelectionPanel.tsx
        UnitPanel.tsx
        CityPanel.tsx
        EnemyPanel.tsx
        Minimap.tsx
        NotificationStack.tsx
      screens/
        MainMenuScreen.tsx
        NewGameScreen.tsx
        LoadGameScreen.tsx
        SettingsScreen.tsx
        TechTreeScreen.tsx
        CityManagementScreen.tsx
        RecruitmentScreen.tsx
        DiplomacyScreen.tsx
        EndTurnSummaryScreen.tsx
      game3d/
        GameCanvas.tsx
        SceneRoot.tsx
        CameraRig.tsx
        LightingRig.tsx
        PostProcessing.tsx
        TerrainLayer.tsx
        HexMesh.tsx
        WaterLayer.tsx
        DecorationLayer.tsx
        UnitLayer.tsx
        BuildingLayer.tsx
        ProjectileLayer.tsx
        ParticleLayer.tsx
        FogLayer.tsx
        SelectionHighlights.tsx
        PathPreview.tsx
      providers/
        GameProvider.tsx
        AudioProvider.tsx
        I18nProvider.tsx
    data/
      index.ts
      terrain.ts
      units.ts
      enemies.ts
      buildings.ts
      technologies.ts
      resources.ts
      eras.ts
      biomes.ts
      difficulty.ts
      hotkeys.ts
      localization/
        ru.ts
        en.ts
    engine/
      core/
        GameEngine.ts
        GameState.ts
        GameConfig.ts
        GameRng.ts
        GameClock.ts
        CommandQueue.ts
        EventBus.ts
        selectors.ts
        serialization.ts
        validation.ts
      ecs/
        Entity.ts
        components.ts
        componentStorage.ts
        systems/
          MovementSystem.ts
          CombatSystem.ts
          VisionSystem.ts
          EconomySystem.ts
          ResearchSystem.ts
          CitySystem.ts
          AiSystem.ts
          StatusEffectSystem.ts
          TurnSystem.ts
      hex/
        coordinates.ts
        directions.ts
        distance.ts
        rounding.ts
        layout.ts
        pathfinding.ts
        lineOfSight.ts
        regions.ts
        mapStorage.ts
      mapgen/
        generateMap.ts
        noise.ts
        biomes.ts
        rivers.ts
        resources.ts
        ruins.ts
        startingPositions.ts
        validation.ts
      rules/
        movementRules.ts
        combatRules.ts
        economyRules.ts
        researchRules.ts
        cityRules.ts
        recruitmentRules.ts
        diplomacyRules.ts
        victoryRules.ts
      ai/
        AiDirector.ts
        StrategicPlanner.ts
        TacticalPlanner.ts
        UtilityScoring.ts
        BehaviorTree.ts
        InfluenceMap.ts
        AiMemory.ts
        difficultyModifiers.ts
      commands/
        GameCommand.ts
        MoveUnitCommand.ts
        AttackCommand.ts
        FoundCityCommand.ts
        BuildBuildingCommand.ts
        RecruitUnitCommand.ts
        ResearchTechnologyCommand.ts
        EndTurnCommand.ts
        HotseatSwitchCommand.ts
      events/
        GameEvent.ts
        eventTypes.ts
      save/
        saveGame.ts
        loadGame.ts
        migrations.ts
    rendering/
      assets/
        AssetManifest.ts
        AssetLoader.ts
        ModelRegistry.ts
        TextureRegistry.ts
        AudioRegistry.ts
      terrain/
        buildHexGeometry.ts
        buildTerrainChunks.ts
        terrainMaterials.ts
        waterMaterial.ts
        heightBlending.ts
      instancing/
        InstancedModelPool.ts
        DecorationInstanceBuilder.ts
        ResourceInstanceBuilder.ts
      animation/
        UnitAnimationController.ts
        AnimationStateMachine.ts
        ProjectileAnimator.ts
        CameraAnimator.ts
      shaders/
        terrain.vert.glsl
        terrain.frag.glsl
        water.vert.glsl
        water.frag.glsl
        fog.frag.glsl
        particles.vert.glsl
        particles.frag.glsl
      picking/
        HexRaycaster.ts
        SelectionResolver.ts
      minimap/
        minimapRenderer.ts
      debug/
        DebugOverlay.tsx
        DrawCallPanel.tsx
    store/
      useGameStore.ts
      slices/
        sessionSlice.ts
        gameViewSlice.ts
        selectionSlice.ts
        commandSlice.ts
        uiSlice.ts
        settingsSlice.ts
        assetSlice.ts
        devtoolsSlice.ts
    workers/
      pathfinding.worker.ts
      ai.worker.ts
      mapgen.worker.ts
      simulation.worker.ts
      workerProtocol.ts
    server/
      index.ts
      socket/
        lobbySocket.ts
        matchSocket.ts
        protocol.ts
      matches/
        MatchRoom.ts
        MatchState.ts
        TurnRelay.ts
      ratings/
        elo.ts
    db/
      prisma.ts
      repositories/
        saveRepository.ts
        profileRepository.ts
        matchRepository.ts
    lib/
      math/
        clamp.ts
        lerp.ts
        priorityQueue.ts
        seededShuffle.ts
      logger.ts
      assertNever.ts
      ids.ts
      perf.ts
    tests/
      unit/
        hex.test.ts
        combat.test.ts
        economy.test.ts
        research.test.ts
        pathfinding.test.ts
        mapgen.test.ts
      integration/
        deterministicReplay.test.ts
        saveLoad.test.ts
        hotseat.test.ts
      e2e/
        newGame.spec.ts
        unitMovement.spec.ts
        cityRecruitment.spec.ts
```

## 1.2. Назначение ключевых файлов

| Файл | Назначение |
|---|---|
| `src/engine/core/GameEngine.ts` | Главный фасад игровой логики. Принимает команды, валидирует, вызывает системы, публикует события. |
| `src/engine/core/GameState.ts` | Полное сериализуемое состояние матча без Three.js, React, DOM и функций. |
| `src/engine/core/GameRng.ts` | Детерминированный PRNG. Все случайные события получают числа только отсюда. |
| `src/engine/core/CommandQueue.ts` | Очередь команд игрока, ИИ, replay и сетевого слоя. |
| `src/engine/core/EventBus.ts` | Типизированная внутриигровая шина событий. Используется для логов, аудио, VFX и UI-уведомлений. |
| `src/engine/ecs/*` | Entity Component System для юнитов, зданий, городов, эффектов и временных статусов. |
| `src/engine/hex/*` | Математика гексов, поиск пути, регионы, линия видимости, хранение карты. |
| `src/engine/mapgen/*` | Генерация карты по seed, включая биомы, реки, ресурсы, руины и стартовые позиции. |
| `src/engine/rules/*` | Чистые функции правил. Они не знают о React и Three.js. |
| `src/engine/ai/*` | Стратегический и тактический ИИ. Может выполняться в Web Worker. |
| `src/engine/commands/*` | Командная модель. Каждое действие игрока является сериализуемой командой. |
| `src/rendering/*` | Низкоуровневые Three.js-утилиты, материалы, шейдеры, instancing, picking. |
| `src/components/game3d/*` | React Three Fiber-компоненты сцены. Они читают снапшоты и создают визуальные объекты. |
| `src/store/useGameStore.ts` | Zustand store для клиентского состояния: UI, выделение, камера, настройки, очередь команд. |
| `src/workers/*` | Тяжелые вычисления: pathfinding, AI, генерация карт, симуляции баланса. |
| `src/server/*` | Будущий онлайн-сервер. В `v0.1-alpha` не участвует в локальной игре. |
| `prisma/schema.prisma` | Локальная SQLite-схема сохранений, профилей, настроек и будущих матчей. |
| `src/data/*` | Data-driven конфиги баланса. Любая таблица из этого документа должна попасть сюда. |

## 1.3. Архитектурные паттерны

### Основной подход

Используется гибридная архитектура:

1. **Functional core, imperative shell**: правила игры представлены чистыми функциями, а ввод, рендеринг, звук, сохранения и сеть являются оболочкой.
2. **ECS для игровых сущностей**: юниты, города, здания, эффекты и временные статусы имеют компоненты, а логика живет в системах.
3. **Command pattern**: пользовательские и AI-действия представлены командами. Это нужно для undo в devtools, replay, Hotseat и онлайн-синхронизации.
4. **Flux/Zustand для клиентского состояния**: Zustand хранит UI и вид, но не является единственным источником истины для правил.
5. **Data-driven balancing**: юниты, здания, технологии, террейны и эффекты загружаются из TypeScript-конфигов и позднее могут быть вынесены в JSON.

### Почему не чистый MVC

MVC плохо разделяет долгоживущие игровые системы: движение, бой, экономика, видимость и ИИ пересекают много сущностей. ECS лучше подходит для пошаговой стратегии, потому что системы могут обрабатывать одинаковые компоненты массово и детерминированно.

### Почему не хранить все в Zustand

Zustand удобен для React-интерфейса, но игровой движок должен работать без React: в симуляторе, тестах, серверном валидаторе, Web Worker и replay. Поэтому `GameState` хранится в engine-слое, а Zustand держит ссылку на текущий снапшот и клиентские настройки.

## 1.4. Схема взаимодействия модулей

```text
User Input
  |
  v
React UI / R3F Picking
  |
  v
Zustand commandSlice
  |
  v
CommandQueue
  |
  v
GameEngine.dispatch(command)
  |
  +--> validation.ts
  +--> ECS Systems
  |     +--> MovementSystem
  |     +--> CombatSystem
  |     +--> EconomySystem
  |     +--> ResearchSystem
  |     +--> VisionSystem
  |     +--> AiSystem
  |
  v
GameState snapshot
  |
  +--> Zustand sessionSlice stores snapshot version
  +--> EventBus publishes events
  |     +--> AudioProvider
  |     +--> ParticleLayer
  |     +--> NotificationStack
  |
  v
React Three Fiber scene reads selectors
  |
  v
Three.js render frame
```

## 1.5. Zustand store

### `sessionSlice`

| Поле | Тип | Назначение |
|---|---:|---|
| `engine` | `GameEngine | null` | Локальный экземпляр движка. |
| `gameState` | `GameState | null` | Последний опубликованный снапшот состояния. |
| `snapshotVersion` | `number` | Монотонный счетчик обновлений. |
| `mode` | `'menu' | 'single' | 'hotseat' | 'online' | 'replay'` | Текущий режим. |
| `activePlayerId` | `PlayerId` | Игрок, которому разрешен ввод. |
| `localPlayerIds` | `PlayerId[]` | Игроки на данном клиенте. Для Hotseat содержит всех людей. |
| `isProcessingCommand` | `boolean` | Блокировка UI во время применения команды. |
| `lastError` | `GameError | null` | Последняя ошибка валидации или движка. |

### `gameViewSlice`

| Поле | Тип | Назначение |
|---|---:|---|
| `cameraTarget` | `Vector3Tuple` | Точка на карте, на которую смотрит камера. |
| `cameraZoom` | `number` | Ортографический zoom от 4 до 28. |
| `cameraRotation` | `number` | Поворот вокруг Y в радианах. |
| `isDraggingCamera` | `boolean` | Флаг drag-pan. |
| `visibleChunkIds` | `string[]` | Чанки, которые сейчас видны камере. |
| `hoveredHex` | `HexCoord | null` | Гекс под курсором. |
| `hoveredEntityId` | `EntityId | null` | Сущность под курсором. |
| `showGrid` | `boolean` | Отображение сетки. |
| `showYields` | `boolean` | Отображение урожайности гексов. |
| `showThreat` | `boolean` | Отображение карты угроз. |

### `selectionSlice`

| Поле | Тип | Назначение |
|---|---:|---|
| `selectedEntityId` | `EntityId | null` | Выбранный юнит, город или здание. |
| `selectedHex` | `HexCoord | null` | Выбранный гекс. |
| `movementPath` | `HexCoord[]` | Предпросмотр пути. |
| `attackTargets` | `EntityId[]` | Валидные цели атаки. |
| `buildOptions` | `BuildingTypeId[]` | Доступные постройки для города. |
| `recruitOptions` | `UnitTypeId[]` | Доступные юниты для найма. |

### `commandSlice`

| Поле | Тип | Назначение |
|---|---:|---|
| `pendingCommand` | `GameCommand | null` | Команда, ожидающая подтверждения. |
| `commandHistory` | `GameCommand[]` | История локальных команд для debug/replay. |
| `optimisticEvents` | `GameEvent[]` | События для анимаций до финального снапшота. |

### `uiSlice`

| Поле | Тип | Назначение |
|---|---:|---|
| `openPanel` | `PanelId | null` | Открытая панель. |
| `modal` | `ModalState | null` | Активное модальное окно. |
| `notifications` | `UiNotification[]` | Очередь уведомлений. |
| `tooltip` | `TooltipState | null` | Текущий tooltip. |
| `techTreeFilter` | `TechBranch | 'all'` | Фильтр дерева технологий. |

### `settingsSlice`

| Поле | Тип | Значение по умолчанию |
|---|---:|---|
| `language` | `'ru' | 'en'` | `'ru'` |
| `masterVolume` | `number` | `0.8` |
| `musicVolume` | `number` | `0.55` |
| `sfxVolume` | `number` | `0.8` |
| `ambienceVolume` | `number` | `0.45` |
| `graphicsPreset` | `'low' | 'medium' | 'high' | 'ultra'` | `'medium'` |
| `shadowQuality` | `0 | 1 | 2 | 3` | `2` |
| `maxFps` | `30 | 60 | 120 | 0` | `60` |
| `colorBlindMode` | `'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'` | `'none'` |
| `uiScale` | `number` | `1.0` |

## 1.6. Разделение логики и рендеринга

### Запрещено

1. `src/rendering` и `src/components/game3d` не импортируют `src/engine/ecs/systems`.
2. Three.js-объекты не хранятся в `GameState`.
3. Компоненты React не рассчитывают урон, видимость, доход, pathfinding или эффекты технологий.
4. Анимация не решает, произошло ли попадание. Она только визуализирует событие `CombatResolved`.

### Разрешено

1. UI вызывает `engine.dispatch(command)`.
2. Рендеринг использует selectors: `selectVisibleUnits`, `selectHexRenderData`, `selectFogForPlayer`.
3. `EventBus` отправляет события для VFX и звука: `UnitMoved`, `AttackStarted`, `DamageApplied`, `TechnologyCompleted`.
4. Debug overlay может читать performance-данные engine и renderer.

## 1.7. Система событий

### Тип события

```ts
type GameEvent = {
  id: string;
  turn: number;
  phase: TurnPhase;
  type: GameEventType;
  payload: unknown;
  visibility: {
    playerIds: PlayerId[] | 'all';
    revealInReplay: boolean;
  };
};
```

### Основные события

| Событие | Payload | Использование |
|---|---|---|
| `TurnStarted` | `{ playerId, turn }` | HUD, музыка, автосейв. |
| `ResourcesChanged` | `{ playerId, deltaByResource }` | ResourceBar, лог хода. |
| `UnitMoved` | `{ unitId, from, to, path }` | Анимация движения, звук шагов. |
| `AttackStarted` | `{ attackerId, defenderId, attackType }` | Запуск боевой анимации. |
| `DamageApplied` | `{ targetId, amount, hpAfter, damageType }` | Цифры урона, звук попадания. |
| `UnitKilled` | `{ unitId, killerId }` | Анимация смерти, XP. |
| `CityFounded` | `{ cityId, hex, playerId }` | UI-уведомление, VFX основания. |
| `BuildingCompleted` | `{ cityId, buildingTypeId }` | Панель города, звук завершения. |
| `TechnologyCompleted` | `{ playerId, techId }` | TechTreeScreen, unlock-уведомление. |
| `FogUpdated` | `{ playerId, changedHexes }` | FogLayer, Minimap. |

### Правило доставки

1. Engine публикует события синхронно после успешного применения команды.
2. UI получает уже примененное состояние.
3. Анимации могут проигрываться асинхронно, но не блокируют изменение `GameState`, кроме команд, где требуется UX-подтверждение.

---

# 2. Гексагональная система

## 2.1. Тип гекс-сетки

Используется pointy-top axial-сетка. В Three.js карта лежит в плоскости XZ, высота идет по Y.

```text
World axes:
  X - вправо
  Y - вверх
  Z - вперед/вниз по экрану

Hex orientation:
  pointy-top
  axial coordinates: q, r
  cube coordinates: x=q, z=r, y=-x-z
```

Базовый радиус гекса:

```ts
HEX_RADIUS = 1.0;              // расстояние от центра до угла
HEX_WIDTH = sqrt(3) * R;       // 1.732
HEX_HEIGHT = 2 * R;            // 2.0
HEX_VERTICAL_STEP = 1.5 * R;   // 1.5
```

## 2.2. Axial координаты

```ts
export type HexCoord = Readonly<{
  q: number;
  r: number;
}>;

export type CubeCoord = Readonly<{
  x: number;
  y: number;
  z: number;
}>;
```

Axial to cube:

```ts
function axialToCube(hex: HexCoord): CubeCoord {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}
```

Cube to axial:

```ts
function cubeToAxial(cube: CubeCoord): HexCoord {
  return { q: cube.x, r: cube.z };
}
```

## 2.3. Hex to world

Для pointy-top:

```ts
function hexToWorld({ q, r }: HexCoord, radius = HEX_RADIUS): Vector3Tuple {
  const x = radius * Math.sqrt(3) * (q + r / 2);
  const z = radius * 1.5 * r;
  const y = getHexVisualHeight(q, r);
  return [x, y, z];
}
```

## 2.4. World to hex

```ts
function worldToFractionalHex(x: number, z: number, radius = HEX_RADIUS): HexCoord {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / radius;
  const r = (2 / 3 * z) / radius;
  return { q, r };
}
```

## 2.5. Округление fractional hex

```ts
function roundAxial(frac: HexCoord): HexCoord {
  let x = frac.q;
  let z = frac.r;
  let y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}
```

## 2.6. Направления соседей

```ts
const HEX_DIRECTIONS: HexCoord[] = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

function neighbor(hex: HexCoord, direction: number): HexCoord {
  const d = HEX_DIRECTIONS[((direction % 6) + 6) % 6];
  return { q: hex.q + d.q, r: hex.r + d.r };
}
```

## 2.7. Дистанция

```ts
function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z),
  );
}
```

## 2.8. Хранение карты в памяти

Карта хранится в плотных typed arrays. Для прямоугольной axial-карты 20x15 используется `width=20`, `height=15`, `q=0..19`, `r=0..14`.

```ts
type HexIndex = number;

function toIndex(q: number, r: number, width: number): HexIndex {
  return r * width + q;
}

function fromIndex(index: HexIndex, width: number): HexCoord {
  return { q: index % width, r: Math.floor(index / width) };
}
```

```ts
type MapStorage = {
  id: string;
  seed: string;
  width: number;
  height: number;
  terrainId: Uint8Array;       // TerrainTypeId enum
  biomeId: Uint8Array;         // BiomeTypeId enum
  elevation: Int16Array;       // logical elevation, centimeters in game scale
  moisture: Uint8Array;        // 0..255
  temperature: Uint8Array;     // 0..255
  riverMask: Uint8Array;       // bitmask by edge direction 0..5
  roadMask: Uint8Array;        // bitmask by edge direction 0..5
  resourceId: Uint16Array;     // 0 means none
  regionId: Uint16Array;
  ownerPlayerId: Int16Array;   // -1 means neutral
  cityIdByHex: Int32Array;     // -1 means none
  unitIdByHex: Int32Array;     // -1 means none for one unit per tile MVP
};
```

### Обоснование typed arrays

1. Быстрый обход всей карты.
2. Предсказуемый размер памяти.
3. Удобная сериализация в base64 или бинарный save.
4. Worker-friendly передача через `Transferable`.

## 2.9. Формат карты в БД

В SQLite карта хранится как сжатый JSON для простоты разработки. В онлайн-версии large arrays переводятся в binary blobs.

```prisma
model SaveGame {
  id          String   @id
  name        String
  version     Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  gameMode    String
  currentTurn Int
  activePlayerId String
  seed        String
  stateJson   String
  commandLog  String
}

model MapSnapshot {
  id          String @id
  saveGameId  String
  width       Int
  height      Int
  seed        String
  terrainBlob Bytes
  elevationBlob Bytes
  featureBlob Bytes
  ownerBlob   Bytes
  metaJson    String
}
```

## 2.10. Система высот

Логическая высота влияет на бой и движение. Визуальная высота влияет на Y-координату.

| Террейн | `elevationBase` | `visualY` | Боевой уровень | Комментарий |
|---|---:|---:|---:|---|
| Вода | -20 | -0.18 | -1 | Ниже берегов, прозрачная кромка. |
| Болото | -8 | -0.06 | 0 | Низкая, влажная поверхность. |
| Равнина | 0 | 0.00 | 0 | Базовый уровень. |
| Пустыня | 2 | 0.02 | 0 | Небольшие дюны через normal map. |
| Лес | 5 | 0.05 | 0 | Земля почти равнинная, высоту дают деревья. |
| Руины | 8 | 0.08 | 0 | Плиты и обломки. |
| Холмы | 24 | 0.24 | 1 | Тактическое преимущество высоты. |
| Горы | 62 | 0.62 | 2 | Непроходимы для обычных юнитов. |

`visualY` вычисляется:

```ts
visualY = elevationBase / 100 + terrainVisualOffset + riverBankOffset + roadFlattenOffset
```

## 2.11. Интерполяция высот

Чтобы карта не выглядела как набор отдельных плит, геометрия гекса строится по высотам углов.

### Ключ угла

Каждый угол принадлежит трем соседним гексам. Его стабильный ключ вычисляется из центра гекса и номера угла, затем нормализуется сортировкой трех adjacent hex indices.

```ts
type CornerKey = `${number}:${number}:${number}`;
```

### Высота угла

```ts
cornerHeight = weightedAverage(adjacentHexHeights, weights)

weights:
  current hex: 0.50
  neighbor A: 0.25
  neighbor B: 0.25

if one neighbor missing:
  current hex: 0.70
  existing neighbor: 0.30
```

### Ограничение резких перепадов

Если разница `maxAdjacentHeight - minAdjacentHeight > 0.45`, применяется террасирование:

```ts
function terraceHeight(low: number, high: number, t: number): number {
  const steps = 3;
  const stepped = Math.floor(t * steps) / steps;
  return lerp(low, high, stepped);
}
```

Горы должны иметь ступенчатые склоны, вода и равнина - плавные края.

## 2.12. Система регионов

Регион - связная группа гексов с общим стратегическим смыслом.

### Типы регионов

| Тип | Правило формирования | Использование |
|---|---|---|
| `landmass` | Flood fill по суше, вода блокирует. | Баланс стартовых позиций. |
| `waterbody` | Flood fill по воде. | Моря, озера, будущие корабли. |
| `biomeRegion` | Flood fill по биому с допуском соседних террейнов. | Декорации, ambient-звук. |
| `province` | Voronoi от городов и стратегических центров. | Владение, налоги, UI-подписи. |
| `dangerZone` | Динамическая карта угроз от врагов. | ИИ и подсветка угрозы. |

### Алгоритм провинций

1. Взять seed-точки: города, руины, ресурсные кластеры, перевалы.
2. Запустить multi-source BFS.
3. Стоимость перехода:
   - равнина: 1
   - лес: 2
   - холмы: 2
   - болото: 3
   - пустыня: 2
   - руины: 1
   - вода: 5 для береговой провинции, блок для сухопутной
   - горы: блок
4. Ограничить размер провинции: минимум 6 гексов, максимум 18 гексов для карты 20x15.
5. Малые провинции присоединить к соседу с самым длинным общим контуром.

## 2.13. Туман войны

Для каждого игрока хранятся три слоя:

```ts
type FogState = {
  explored: BitSet;             // игрок видел гекс хотя бы раз
  visible: BitSet;              // игрок видит гекс сейчас
  lastSeenTurn: Uint16Array;    // последний ход, когда гекс был виден
  lastSeenTerrainId: Uint8Array;
  lastSeenOwnerId: Int16Array;
  lastSeenCityLevel: Uint8Array;
  lastSeenUnitTypeId: Uint16Array; // 0 if no visible unit when last seen
};
```

### Что скрывать

| Данные | Не исследовано | Исследовано, не видно | Видно |
|---|---|---|---|
| Террейн | скрыт | показывается last seen | актуальный |
| Ресурс | скрыт | показывается, если был открыт технологией | актуальный |
| Владелец | скрыт | last seen | актуальный |
| Город | скрыт | last seen уровень и владелец | актуальный |
| Юниты | скрыты | не показываются | актуальные |
| Строительство города | скрыто | скрыто | актуальное |
| Передвижение врага | скрыто | не показывается | актуальное |

### Радиус обзора

| Источник | Радиус |
|---|---:|
| Обычный юнит | 2 |
| Разведчик | 4 |
| Герой | 3 |
| Город уровень 1 | 3 |
| Город уровень 2 | 4 |
| Башня | +2 к городу |
| Гора рядом с юнитом | +1 к обзору, если юнит стоит на холме или горе |
| Лес | блокирует линию видимости дальше 2 гексов |
| Горы | блокируют линию видимости, кроме обзора с холма/горы |

---

# 3. 3D рендеринг

## 3.1. Сцена Three.js

```tsx
<Canvas
  shadows
  dpr={[1, 2]}
  gl={{
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  }}
>
  <SceneRoot>
    <CameraRig />
    <LightingRig />
    <TerrainLayer />
    <WaterLayer />
    <DecorationLayer />
    <BuildingLayer />
    <UnitLayer />
    <ProjectileLayer />
    <ParticleLayer />
    <FogLayer />
    <SelectionHighlights />
    <PathPreview />
    <PostProcessing />
  </SceneRoot>
</Canvas>
```

## 3.2. Renderer settings

| Параметр | Значение |
|---|---|
| Color space | `SRGBColorSpace` |
| Tone mapping | `ACESFilmicToneMapping` |
| Tone mapping exposure | `1.05` день, `0.75` ночь/event |
| Shadow map | `PCFSoftShadowMap` |
| DPR low | `1` |
| DPR medium | `min(window.devicePixelRatio, 1.5)` |
| DPR high | `min(window.devicePixelRatio, 2)` |
| Clear color | `#91a9c7` для дневной сцены |

## 3.3. Камера

### Выбор

Основная камера: **ортографическая**.

Обоснование:

1. Пошаговая стратегия требует читаемости расстояний.
2. Размер юнитов и гексов не должен сильно меняться в зависимости от позиции.
3. Легче делать picking и миниатюрную тактическую читаемость.
4. Вид ближе к Civilization VI: декоративный 3D, но стратегическая карта остается плоско-читаемой.

### Параметры

| Параметр | Значение |
|---|---:|
| `near` | 0.1 |
| `far` | 200 |
| начальный zoom | 12 |
| min zoom | 4 |
| max zoom | 28 |
| pitch | 55 градусов |
| yaw | 45 градусов |
| rotation step | 15 градусов |
| pan speed | `0.018 * zoom` world units per pixel |
| edge scroll zone | 20 px |
| edge scroll speed | `6.0` world units/sec at zoom 12 |

### Ограничение камеры

```ts
cameraTarget.x = clamp(cameraTarget.x, mapBounds.minX - 4, mapBounds.maxX + 4);
cameraTarget.z = clamp(cameraTarget.z, mapBounds.minZ - 4, mapBounds.maxZ + 4);
cameraZoom = clamp(cameraZoom, 4, 28);
```

## 3.4. Освещение

| Источник | Параметры | Назначение |
|---|---|---|
| `AmbientLight` | color `#9fb1c8`, intensity `0.45` | Базовая читаемость теней. |
| `DirectionalLight` | color `#fff1d2`, intensity `2.2`, position `[20, 35, 15]` | Солнце, основные тени. |
| `HemisphereLight` | sky `#a7c8ff`, ground `#6a573f`, intensity `0.7` | Мягкий fantasy-объем. |
| `PointLight` | только для VFX, max 12 одновременно | Магия, огонь, руины. |

## 3.5. Пост-процессинг

MVP:

1. FXAA или SMAA.
2. Bloom только для магии, руин и UI world markers.
3. Vignette отключена по умолчанию.
4. Color grading LUT по эпохам: Примитивы теплее, Раскол холоднее и контрастнее.

Ограничения:

| Preset | AA | Bloom | SSAO | Shadows |
|---|---|---|---|---|
| Low | FXAA | off | off | 1024 |
| Medium | SMAA | low | off | 2048 |
| High | SMAA | medium | low | 2048 |
| Ultra | SMAA | high | medium | 4096 |

## 3.6. LOD для террейна

Карта делится на чанки 8x8 гексов.

| LOD | Дистанция от камеры | Террейн | Декорации | Юниты |
|---|---:|---|---|---|
| LOD0 | 0-10 гексов | полный mesh с vertex height | 100% | GLB full |
| LOD1 | 11-18 гексов | mesh с упрощенными склонами | 60% | GLB reduced или impostor |
| LOD2 | 19-30 гексов | плоские hex tiles | 20% крупные | billboard/impostor |
| LOD3 | >30 гексов | только цветовые пятна/minimap texture | 0% | скрыты, кроме маркеров |

## 3.7. Frustum culling

1. Каждый chunk имеет `Box3` в world coordinates.
2. На каждый кадр вычисляется camera frustum.
3. Если `frustum.intersectsBox(chunkBox) === false`, chunk не рендерится.
4. UnitLayer и DecorationLayer наследуют видимость chunk.
5. Для анимированных юнитов используется расширенный bounding sphere радиусом `0.9`.

## 3.8. Occlusion culling

Полноценный GPU occlusion query в WebGL усложняет pipeline. Для `v0.1-alpha` используется CPU-стратегия:

1. Объекты за горами скрываются только если они дальше 8 гексов и полностью в fog.
2. Декорации на невидимых гексах не рендерятся.
3. Внутри леса дальние деревья объединяются в impostor-группу.
4. Вода под сушей не рендерится через river/lake masks.

## 3.9. Шейдер террейна

### Входные атрибуты

```glsl
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute float terrainId;
attribute float biomeId;
attribute float moisture;
attribute float temperature;
attribute float fogAmount;
```

### Uniforms

```glsl
uniform sampler2D terrainAtlas;
uniform sampler2D noiseTexture;
uniform vec3 playerTint;
uniform float time;
uniform float snowLine;      // 0.52 visualY
uniform float gridOpacity;
```

### Правила материала

| Террейн | Base color | Roughness | Особенность |
|---|---|---:|---|
| Равнина | `#6fa34f` | 0.85 | Шум травы, легкий wind sway через vertex offset. |
| Лес | `#2f6b3d` | 0.9 | Темнее по краям, проецируемые пятна крон. |
| Гора | `#7b7f86` | 0.95 | Tri-planar каменная текстура, снег выше `visualY=0.52`. |
| Вода | `#2b79a3` | 0.25 | Отдельный water material. |
| Пустыня | `#caa765` | 0.88 | Normal map дюн. |
| Болото | `#4f6541` | 0.92 | Темные лужи, зеленоватый emissive почти 0.03. |
| Холмы | `#7a8f4e` | 0.9 | Каменно-травяные полосы. |
| Руины | `#77716a` | 0.82 | Плитка, трещины, мох. |

## 3.10. Вода

### Geometry

Вода рисуется отдельной плоскостью внутри водных гексов на `Y=-0.16`. Береговая кромка получает alpha fade 0.0-1.0 на расстоянии 0.15 от края.

### Vertex shader

```glsl
float wave1 = sin(position.x * 3.2 + time * 1.4) * 0.018;
float wave2 = sin(position.z * 4.1 - time * 1.1) * 0.012;
transformed.y += wave1 + wave2;
```

### Fragment shader

1. Normal map scroll A: `[time * 0.025, time * 0.010]`.
2. Normal map scroll B: `[-time * 0.015, time * 0.020]`.
3. Fresnel на углах: `pow(1.0 - dot(viewDir, normal), 3.0)`.
4. Цвет мелководья: `#3aa0b8`.
5. Цвет глубины: `#1d4f7a`.

## 3.11. Particle system

Используется instanced billboard system.

```ts
type ParticleEmitterConfig = {
  maxParticles: number;
  textureId: string;
  spawnRate: number;
  lifetime: [number, number];
  startSize: [number, number];
  endSize: [number, number];
  startColor: ColorRgba;
  endColor: ColorRgba;
  velocity: Vec3Range;
  gravity: number;
  blendMode: 'alpha' | 'additive' | 'multiply';
};
```

| Эффект | Частицы | Blend | Max |
|---|---:|---|---:|
| Дым от руин | серые soft circles | alpha | 120 |
| Огонь здания | flame sprites + light flicker | additive | 80 |
| Магический снаряд | core + trail | additive | 60 |
| Пыль при ходьбе | tan puffs | alpha | 40 |
| Попадание стрелы | splinters | alpha | 24 |
| Лечение | green/gold motes | additive | 70 |

## 3.12. Instancing

Обязательные instanced-группы:

| Объект | Ожидаемое количество на карте 20x15 | Метод |
|---|---:|---|
| Деревья | 250-600 | `InstancedMesh` по типу дерева |
| Камни | 80-180 | `InstancedMesh` |
| Кусты | 150-350 | `InstancedMesh` |
| Трава clumps | 400-1200 | merged geometry или instancing |
| Руинные колонны | 20-80 | `InstancedMesh` |
| Ресурсные props | 30-90 | `InstancedMesh` |

Каждый instance хранит:

```ts
type DecorationInstance = {
  modelId: string;
  matrix: Matrix4;
  colorVariant: Color;
  windStrength: number;
  visibilityMask: number;
};
```

## 3.13. Тени

| Preset | Shadow map | Дальность | Dynamic casters |
|---|---:|---:|---:|
| Low | 1024 | 18 world units | только юниты |
| Medium | 2048 | 26 world units | юниты, здания |
| High | 2048 | 34 world units | юниты, здания, крупные деревья |
| Ultra | 4096 | 42 world units | все крупные объекты |

Правила:

1. Мелкая трава не отбрасывает тени.
2. Деревья в LOD1 не отбрасывают индивидуальные тени.
3. Вода принимает только мягкую fake-shadow от берегов.
4. UI markers не участвуют в shadow pass.

## 3.14. Skybox и атмосфера

1. Skybox: статический gradient cube или HDRI 1K, дневной fantasy sky.
2. Легкий height fog: плотность `0.012`, цвет `#b8c7d5`.
3. Дальность fog зависит от zoom: на дальнем zoom плотность ниже.
4. Погодные эффекты в MVP не влияют на геймплей. Визуальные пресеты: clear, mist, storm.

## 3.15. Системные требования

### Минимальные

| Компонент | Требование |
|---|---|
| CPU | 2 ядра, 2.5 GHz |
| RAM | 4 GB |
| GPU | Intel UHD 620 или GeForce GT 1030 |
| VRAM | 1 GB |
| OS | Windows 10 64-bit, Linux, macOS 12 |
| Browser/WebView | Chromium 116+ или Tauri WebView2 |
| FPS target | 30 fps на 1280x720, Low |

### Рекомендуемые

| Компонент | Требование |
|---|---|
| CPU | 4 ядра, 3.0 GHz |
| RAM | 8 GB |
| GPU | GTX 1050 Ti / RX 560 / Apple M1 |
| VRAM | 2 GB |
| OS | Windows 11 64-bit |
| FPS target | 60 fps на 1920x1080, Medium/High |

---

# 4. 3D модели и анимации

## 4.1. Формат и пайплайн

| Параметр | Решение |
|---|---|
| Основной формат | `.glb` |
| Исходники | `.blend` хранить отдельно в `assets-source/`, не грузить в игру |
| Текстуры | PNG/WebP, максимум 1024 для юнитов, 2048 для atlas террейна |
| Стиль | Stylized low-poly с baked/painted normals |
| Scale | 1 world unit = радиус гекса |
| Pivot юнита | центр основания на земле, `Y=0` |
| Pivot здания | центр занимаемого гекса |
| Анимации | встроенные clips в GLB |
| Draco compression | включить для production |
| Meshopt compression | включить для production при поддержке loader |

## 4.2. Политика полигонов

| Категория | LOD0 triangles | LOD1 triangles | LOD2 |
|---|---:|---:|---|
| Обычный юнит | 1 200-2 500 | 500-900 | billboard |
| Герой | 2 500-4 000 | 1 000-1 500 | billboard |
| Крупный монстр/босс | 4 000-6 000 | 1 800-2 500 | billboard |
| Малое здание | 1 500-3 000 | 600-1 200 | simplified mesh |
| Замок/чудо | 5 000-9 000 | 2 000-4 000 | simplified mesh |
| Дерево | 200-600 | 80-160 | impostor |
| Камень/куст | 80-250 | 30-80 | hidden |

## 4.3. Источники бесплатных моделей

Использовать только ассеты с проверенной лицензией в момент добавления в репозиторий. Лицензию каждого ассета сохранять в `public/assets/LICENSES.md`.

| Источник | Что брать | Лицензия/условия | Ссылка |
|---|---|---|---|
| Quaternius | low-poly персонажи, здания, природа, fantasy props | CC0 по официальному сайту | [quaternius.com](https://quaternius.com/) |
| Kay Lousberg / KayKit | персонажи, medieval hexagon, nature, dungeon props | многие KayKit-паки CC0, проверять страницу конкретного пака | [kaylousberg.com/game-assets](https://kaylousberg.com/game-assets) |
| Kenney | прототипные 3D/2D assets, UI, icons | asset pages public domain CC0 | [kenney.nl](https://kenney.nl/) |
| Sketchfab | точечные модели, если нет CC0-аналога | проверять конкретную Creative Commons или Store license | [Sketchfab free models](https://sketchfab.com/features/free-3d-models) |

Политика проекта: предпочтение CC0. CC-BY допустима только если в `LICENSES.md` внесена атрибуция и ассет не критичен для перераспространения.

## 4.4. Список моделей юнитов

| ID | Название | Размер в гексе | Модель | Обязательные анимации | VFX |
|---|---|---:|---|---|---|
| `hero` | Герой | 0.52 радиуса | humanoid armored leader, плащ, знамя | idle, walk, attack_melee, cast, hurt, die, victory | золотая аура, след знамени |
| `settler` | Поселенец | 0.45 | человек с тележкой/рюкзаком | idle, walk, build, hurt, die | пыль при ходьбе |
| `worker` | Строитель | 0.45 | рабочий с молотом/киркой | idle, walk, build, mine, chop, hurt, die | искры, щепки |
| `spearman` | Копейщик | 0.48 | легкая броня, копье | idle, walk, attack_thrust, brace, hurt, die | ударный след копья |
| `scout` | Разведчик | 0.45 | легкая одежда, капюшон | idle, walk, run, attack_dagger, hide, hurt, die | faint stealth shimmer |
| `archer` | Лучник | 0.48 | лук, колчан | idle, walk, aim, shoot, hurt, die | стрела projectile |
| `swordsman` | Мечник | 0.50 | меч и щит | idle, walk, attack_slash, block, hurt, die | slash arc |
| `knight` | Рыцарь | 0.58 | всадник или тяжелый пехотинец для MVP | idle, walk, charge, attack, hurt, die | dust charge |
| `mage` | Маг | 0.48 | посох, мантия | idle, walk, cast_projectile, cast_aoe, hurt, die | magic projectile, rune circle |
| `crossbowman` | Арбалетчик | 0.50 | арбалет, кожаная броня | idle, walk, reload, shoot, hurt, die | bolt projectile |
| `catapult` | Катапульта | 0.70 | wood siege engine | idle, move_slow, load, fire, break | stone projectile, impact dust |
| `paladin` | Паладин | 0.56 | тяжелая броня, светлый щит | idle, walk, attack, guard, heal, hurt, die | defensive aura |
| `goblin` | Гоблин | 0.42 | малый враг с ножом | idle, walk, attack, taunt, hurt, die | dirty slash |
| `goblin_archer` | Гоблин-лучник | 0.42 | малый враг с луком | idle, walk, aim, shoot, hurt, die | crude arrow |
| `wolf` | Волк | 0.46 | quadruped | idle, walk, run, bite, hurt, die | leap dust |
| `bandit` | Разбойник | 0.48 | человек с топором/мечом | idle, walk, attack, hurt, die | slash |
| `cultist` | Культист Раскола | 0.48 | темная мантия | idle, walk, cast, hurt, die | purple rune |

## 4.5. Список моделей зданий

| ID | Название | Гексы | LOD0 triangles | Визуальные стадии |
|---|---|---:|---:|---|
| `city_center` | Центр города | 1 | 4 000 | эпохи 1-5 |
| `castle` | Замок | 1 | 8 000 | wooden keep -> stone castle -> bastion |
| `barracks` | Казармы | 1 | 3 000 | палатки -> деревянные бараки -> каменные казармы |
| `library` | Библиотека | 1 | 3 200 | малый архив -> башня знаний -> академия |
| `farm` | Ферма | improvement | 1 200 | поле, забор, мельница |
| `lumber_mill` | Лесопилка | improvement | 1 500 | бревна, навес |
| `quarry` | Каменоломня | improvement | 1 600 | карьер, кран |
| `mine` | Шахта | improvement | 1 800 | вход, вагонетка |
| `market` | Рынок | 1 | 2 800 | лавки, тенты |
| `workshop` | Мастерская | 1 | 3 200 | кузница, дым |
| `mage_tower` | Башня магов | 1 | 4 200 | руны, кристалл |
| `walls` | Стены | city perimeter | 3 000 | wood palisade -> stone wall |
| `watchtower` | Сторожевая башня | improvement | 1 500 | башня обзора |
| `harbor` | Гавань | coast | 3 500 | причал, лодки |
| `wonder_sun_obelisk` | Обелиск Солнца | 1 | 6 000 | уникальное чудо |
| `wonder_world_tree` | Древо Мира | 1 | 7 000 | уникальное чудо |
| `wonder_astral_gate` | Астральные Врата | 1 | 8 500 | уникальное чудо |

## 4.6. Декорации и ресурсы

| Категория | Модели |
|---|---|
| Лес | 5 вариантов лиственных деревьев, 3 хвойных, 4 куста, 2 пня |
| Горы | 6 скал, 3 снежных камня, 2 кристалла |
| Пустыня | 3 кактуса, 4 сухих куста, 3 камня, 2 кости |
| Болото | 3 мертвых дерева, 4 камыша, 3 лужи, 2 гриба |
| Руины | 4 колонны, 5 плит, 3 арки, 2 статуи |
| Ресурсы | золото, пшеница, лес, камень, железо, кристалл маны, древние реликвии |
| VFX | стрелы, болты, магические сферы, камни катапульты, hit sparks |

## 4.7. Скелетная анимация

### Three.js слой

1. GLB загружается через `useGLTF`.
2. Clips регистрируются в `AnimationStateMachine`.
3. На юнит создается `AnimationMixer`.
4. Состояния синхронизируются с событиями engine.

```ts
type UnitAnimState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'cast'
  | 'hurt'
  | 'die'
  | 'victory';
```

### Правила переходов

| From | To | Blend |
|---|---|---:|
| idle | walk | 0.15 s |
| walk | idle | 0.20 s |
| idle/walk | attack | 0.08 s |
| attack | idle | 0.12 s |
| any | hurt | 0.05 s |
| hurt | idle | 0.15 s |
| any | die | 0.00 s |

## 4.8. Пропорции относительно гекса

| Объект | Максимальный радиус footprint | Высота модели |
|---|---:|---:|
| Пехота | 0.22-0.28 | 0.55-0.75 |
| Герой | 0.30 | 0.85 |
| Конный/тяжелый юнит | 0.36 | 0.85 |
| Катапульта | 0.45 | 0.65 |
| Малое здание | 0.55 | 0.75-1.20 |
| Замок | 0.70 | 1.80 |
| Чудо | 0.75 | 2.20 |
| Дерево | 0.08-0.18 | 0.60-1.30 |

Юнит должен читаться внутри гекса и не перекрывать соседний гекс больше чем на 15% footprint.

---

# 5. Террейн и декорации

## 5.1. Общие правила террейна

Каждый гекс имеет:

```ts
type HexTerrainData = {
  terrainId: TerrainTypeId;
  biomeId: BiomeTypeId;
  elevation: number;
  moisture: number;
  temperature: number;
  movementCost: number;
  defenseModifier: number;
  yields: ResourceYield;
  decorationSeed: number;
};
```

## 5.2. Спецификация террейнов

| Террейн | Цвет | Высота Y | Move cost | DEF mod | Доход без улучшений | Декорации | Количество |
|---|---|---:|---:|---:|---|---|---|
| Равнина | `#6fa34f` | 0.00 | 1 | 0% | еда +2, золото +1 | трава, цветы, малые камни | 4-9 clumps |
| Лес | `#2f6b3d` | 0.05 | 2 | +20% | еда +1, дерево +2 | деревья, кусты, пни | 5-11 деревьев |
| Гора | `#7b7f86` | 0.62 | blocked | +35% для дальних на вершине | камень +2, наука +1 если руда | скалы, снег, кристаллы | 3-7 скал |
| Вода | `#2b79a3` | -0.18 | blocked до технологии `sailing` | -10% | еда +1 | волны, камыш на берегу | water mesh |
| Пустыня | `#caa765` | 0.02 | 2 | -10% | золото +1 | кактусы, сухие кусты, дюны | 2-5 props |
| Болото | `#4f6541` | -0.06 | 3 | +10% defender, -10% attacker | еда +1, наука +1 | камыш, лужи, мертвые деревья | 4-8 props |
| Холмы | `#7a8f4e` | 0.24 | 2 | +25% | камень +1, золото +1 | камни, редкая трава | 3-7 props |
| Руины | `#77716a` | 0.08 | 1 | +15% | наука +1, прогресс +1 при исследовании | колонны, плиты, обломки | 4-10 props |

## 5.3. Расположение декораций на гексе

Декорации размещаются seed-based, чтобы одинаковый seed всегда давал одинаковую карту.

```ts
function placeDecorations(hex: HexCoord, terrain: TerrainType, seed: number): DecorationInstance[] {
  const rng = createRng(hash(seed, hex.q, hex.r, terrain.id));
  const count = rng.int(terrain.decorationCount.min, terrain.decorationCount.max);
  const result = [];

  for (let i = 0; i < count; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const radius = Math.sqrt(rng.float(0, 1)) * 0.68;
    const localX = Math.cos(angle) * radius;
    const localZ = Math.sin(angle) * radius;

    if (isNearRoadOrRiver(localX, localZ)) continue;
    if (isTooCloseToCenterForUnitReadability(localX, localZ)) continue;

    result.push(buildDecorationInstance(...));
  }

  return result;
}
```

### Запретные зоны

| Зона | Радиус |
|---|---:|
| Центр гекса под юнита | 0.28 |
| Дорога | 0.16 от линии дороги |
| Река | 0.20 от линии реки |
| Здание/improvement | 0.55 |
| UI маркер ресурса | 0.18 |

## 5.4. Анимированные элементы

| Элемент | Метод | Частота |
|---|---|---:|
| Трава | vertex shader sway | 0.8-1.4 Hz |
| Кроны деревьев | instance windStrength + vertex offset | 0.4-0.9 Hz |
| Вода | vertex waves + scrolling normals | 2 normal layers |
| Камыш | vertex sway | 0.7 Hz |
| Магические руины | emissive pulse | 0.3 Hz |
| Пыль пустыни | sparse particles | 1 burst / 8-14 sec |

## 5.5. Биомы

| Биом | Температура | Влажность | Допустимые террейны | Палитра |
|---|---:|---:|---|---|
| Temperate | 90-170 | 90-190 | равнина, лес, холмы, вода | зеленый, коричневый |
| Boreal | 40-100 | 100-220 | лес, холмы, горы, вода | темно-зеленый, серый |
| Arid | 170-255 | 0-90 | пустыня, холмы, горы | песочный, охра |
| Wetlands | 90-180 | 190-255 | болото, лес, вода | болотный, темно-зеленый |
| Highlands | 30-140 | 40-180 | холмы, горы, руины | серый, оливковый |
| Ancient | любой | любой | руины плюс соседние террейны | серый, мох, магический голубой |

## 5.6. Переходы террейнов

Переходы выполняются не отдельными моделями, а blend-маской в terrain shader.

1. Для каждого пикселя в гексе вычислить barycentric/edge distance.
2. Если пиксель ближе 18% радиуса к границе, прочитать terrain соседнего гекса.
3. Blend factor:

```glsl
float edgeBlend = smoothstep(0.00, 0.18, distanceToEdge);
color = mix(neighborTerrainColor, currentTerrainColor, edgeBlend);
```

4. Вода использует отдельную береговую пену.
5. Горы не смешиваются полностью: на границе добавляются каменные осыпи.

---

# 6. Генерация карты

## 6.1. Цели генерации

Для карты 20x15:

| Показатель | Целевое значение |
|---|---:|
| Суша | 68-78% |
| Вода | 22-32% |
| Горы | 7-12% |
| Лес | 18-26% |
| Холмы | 12-18% |
| Болота | 4-8% |
| Пустыня | 6-12% |
| Руины | 3-6% |
| Средняя дистанция стартов | минимум 10 гексов |
| Ресурсные кластеры на игрока | 4-6 |
| Руины рядом со стартом | 1 в радиусе 5-7, не ближе 3 |

## 6.2. Алгоритм верхнего уровня

```ts
function generateMap(config: MapGenConfig): GeneratedMap {
  const rng = createRng(config.seed);
  const height = generateHeightNoise(config, rng);
  const moisture = generateMoistureNoise(config, rng);
  const temperature = generateTemperatureNoise(config, rng);

  let terrain = classifyTerrain(height, moisture, temperature);
  terrain = carveCoastlines(terrain, height);
  terrain = buildMountainRanges(terrain, height, rng);
  const rivers = generateRivers(height, moisture, terrain, rng);
  terrain = applyRiverWetlands(terrain, rivers);

  const biomes = assignBiomes(terrain, moisture, temperature);
  const regions = buildRegions(terrain, biomes);
  const resources = placeResources(terrain, biomes, regions, rng);
  const ruins = placeRuins(terrain, regions, resources, rng);
  const starts = placeStartingPositions(terrain, resources, ruins, regions, rng);

  const validation = validateMap({ terrain, rivers, resources, ruins, starts });
  if (!validation.ok) return regenerateWithSalt(config, validation.salt + 1);

  return { terrain, biomes, rivers, resources, ruins, starts, regions };
}
```

## 6.3. Noise layers

Использовать simplex noise или perlin-compatible реализацию с seed.

| Layer | Scale | Octaves | Weight | Назначение |
|---|---:|---:|---:|---|
| Continentalness | 0.045 | 4 | 1.00 | суша/вода |
| Elevation detail | 0.120 | 3 | 0.35 | холмы/неровности |
| Mountain ridges | 0.080 ridge noise | 4 | 0.70 | горные хребты |
| Moisture | 0.060 | 3 | 1.00 | лес/болото/пустыня |
| Temperature | 0.035 | 2 | 1.00 | биомы |
| Ancient ruins mask | 0.100 cellular | 2 | 1.00 | руины |

## 6.4. Классификация террейна

```ts
if (height < 0.30) terrain = 'water';
else if (height > 0.78 && ridge > 0.55) terrain = 'mountain';
else if (height > 0.62) terrain = 'hills';
else if (moisture > 0.78 && height < 0.48) terrain = 'swamp';
else if (moisture < 0.24 && temperature > 0.58) terrain = 'desert';
else if (moisture > 0.54) terrain = 'forest';
else terrain = 'plains';
```

Руины накладываются после базовой классификации:

```ts
if (ancientMask > 0.86 && terrain is land && not mountain) terrain = 'ruins';
```

## 6.5. Реки

### Алгоритм стока

1. Найти источники: гексы с `height > 0.64`, `moisture > 0.45`, не горные пики.
2. Максимум источников для 20x15: 5.
3. Для каждого источника идти к соседу с минимальной высотой.
4. Если все соседи выше, создать озеро, если размер депрессии до 4 гексов, иначе прорезать перевал.
5. Река заканчивается в воде или на краю карты.
6. Минимальная длина реки: 5 гексов. Короткие реки удаляются.
7. Если две реки встречаются, объединить riverMask.

### River mask

Каждый гекс хранит bitmask ребер, по которым проходит река:

```ts
riverMask |= 1 << direction;
neighborRiverMask |= 1 << oppositeDirection(direction);
```

### Влияние на карту

| Условие | Эффект |
|---|---|
| Река рядом с равниной | еда +1 |
| Река через пустыню | гекс становится floodplain: еда +2, золото +1 |
| Река рядом с городом | торговля +1 |
| Переход через реку без моста | movement +1, атакующий получает -10% |

## 6.6. Ресурсы

| Ресурс | Террейн | Частота на 300 гексов | Минимальная дистанция | Эффект |
|---|---|---:|---:|---|
| Пшеница | равнина, floodplain | 8 | 3 | еда +2 |
| Дичь | лес, холмы | 6 | 3 | еда +1, золото +1 |
| Дерево | лес | 10 | 2 | дерево +2 |
| Камень | холмы, горы | 8 | 3 | камень +2 |
| Железо | холмы, горы | 5 | 4 | unlock/production military |
| Золото | холмы, пустыня, руины | 5 | 4 | золото +3 |
| Кристалл маны | руины, горы, болото | 4 | 5 | наука +1, магия +2 |
| Древние реликвии | руины | 3 | 5 | прогресс +2, одноразовый бонус |

## 6.7. Руины и точки интереса

| POI | Условия | Награда |
|---|---|---|
| Малые руины | любой land, не старт | 25 золота или 15 науки |
| Затонувший храм | берег/болото | 20 науки, открыть соседние гексы радиус 2 |
| Старая кузница | холмы/горы | 20 камня или boost `bronzeWorking` |
| Обелиск | руины/пустыня | 1 очко прогресса за ход 10 ходов |
| Логово врагов | лес/руины | бой, затем 40 золота |

## 6.8. Стартовые позиции

### Требования

1. Старт на суше, не гора, не болото.
2. Минимум 2 равнины в радиусе 2.
3. Минимум 1 ресурс еды в радиусе 3.
4. Минимум 1 production resource в радиусе 4: лес, камень или железо.
5. Вода в радиусе 4 желательна, но не обязательна.
6. Дистанция между игроками: минимум 10 гексов на 20x15.
7. Path distance по суше между стартами должен быть не меньше 14 и не больше 35.

### Scoring

```ts
scoreStart(hex) =
  foodPotential(radius=3) * 3.0 +
  productionPotential(radius=3) * 2.2 +
  goldPotential(radius=4) * 1.2 +
  sciencePotential(radius=5) * 1.0 +
  freshWaterBonus * 4.0 -
  nearbyEnemyCampPenalty * 5.0 -
  mountainCrowdingPenalty * 2.0 -
  swampPenalty * 3.0
```

Стартовые позиции считаются сбалансированными, если разница score между лучшим и худшим стартом не больше 18%.

## 6.9. Валидация карты

| Проверка | Условие |
|---|---|
| Доля суши | 68-78% |
| Доступная суша | минимум 85% land-гексов в крупнейшем landmass |
| Изолированные старты | запрещены |
| Ресурсы еды | минимум 2 в радиусе 5 каждого старта |
| Production | минимум 2 production sources в радиусе 5 |
| Ранний контакт | вражеский лагерь не ближе 4 от старта |
| Поздний контакт | игроки не ближе 10 по hex distance |
| Реки | максимум 5, не больше 35 river edges |
| Горы | нет непрерывной стены, полностью делящей карту, без 2 проходов |

---

# 7. Юниты: полная спецификация

## 7.1. Общие характеристики

| Поле | Значение |
|---|---|
| HP | здоровье |
| ATK | базовая атака ближнего или основного типа |
| DEF | базовая защита |
| MOV | очки движения за ход |
| Range | дальность атаки в гексах |
| Cost | стоимость найма |
| Upkeep | обслуживание за ход |
| Era | эпоха появления |
| Tech | технология разблокировки |

## 7.2. Таблица юнитов

| ID | Название | HP | ATK | DEF | MOV | Range | Cost | Upkeep | Era | Tech |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| `hero` | Герой | 120 | 18 | 12 | 3 | 1 | уникальный | 0 | Примитивы | старт |
| `settler` | Поселенец | 60 | 2 | 4 | 2 | 1 | 80 еды, 40 золота | 1 еда | Примитивы | `settlement` |
| `worker` | Строитель | 55 | 3 | 5 | 2 | 1 | 50 еды, 25 дерева | 1 еда | Примитивы | `toolmaking` |
| `spearman` | Копейщик | 80 | 14 | 10 | 2 | 1 | 45 еды, 25 дерева | 1 золото | Примитивы | `bronzeWorking` |
| `scout` | Разведчик | 65 | 10 | 6 | 4 | 1 | 35 еды, 20 золота | 1 золото | Примитивы | `tracking` |
| `archer` | Лучник | 65 | 13 | 6 | 2 | 2 | 35 дерева, 30 золота | 1 золото | Ранняя цивилизация | `archery` |
| `swordsman` | Мечник | 90 | 17 | 13 | 2 | 1 | 40 железа, 45 золота | 2 золота | Ранняя цивилизация | `ironWorking` |
| `knight` | Рыцарь | 110 | 22 | 16 | 3 | 1 | 70 железа, 90 золота | 3 золота | Средние века | `chivalry` |
| `mage` | Маг | 70 | 20 | 7 | 2 | 2 | 60 науки, 80 золота, 2 маны | 2 золота | Средние века | `arcaneTheory` |
| `crossbowman` | Арбалетчик | 75 | 18 | 8 | 2 | 2 | 45 дерева, 35 железа, 70 золота | 2 золота | Средние века | `engineering` |
| `catapult` | Катапульта | 95 | 26 | 5 | 1 | 3 | 90 дерева, 60 камня, 80 золота | 3 золота | Средние века | `siegecraft` |
| `paladin` | Паладин | 125 | 24 | 20 | 2 | 1 | 80 железа, 120 золота, 3 маны | 4 золота | Возрождение | `holyOrders` |
| `goblin` | Гоблин | 45 | 9 | 4 | 3 | 1 | AI only | 0 | Примитивы | none |
| `goblin_archer` | Гоблин-лучник | 40 | 10 | 3 | 2 | 2 | AI only | 0 | Примитивы | none |
| `wolf` | Волк | 50 | 12 | 3 | 4 | 1 | AI only | 0 | Примитивы | none |
| `bandit` | Разбойник | 70 | 14 | 8 | 3 | 1 | AI only | 0 | Ранняя цивилизация | none |
| `cultist` | Культист Раскола | 80 | 19 | 9 | 2 | 2 | AI only | 0 | Раскол | none |

## 7.3. Уровни прокачки

Все боевые юниты имеют уровни 1-5.

| Уровень | XP нужно суммарно | Бонус | Визуальное отличие |
|---|---:|---|---|
| 1 | 0 | базовые характеристики | обычная модель |
| 2 | 20 | +8% HP max, +1 DEF | бронзовая нашивка/деталь |
| 3 | 55 | +10% ATK, выбрать 1 перк | серебряная деталь, улучшенное оружие |
| 4 | 105 | +1 MOV или +1 Range для дальних, +2 DEF | плащ/знамя |
| 5 | 170 | уникальный ветеранский перк, +12% ATK | золотая деталь, aura marker |

### Перки

| Перк | Требование | Эффект |
|---|---|---|
| `roughTerrain` | уровень 3 | лес/холмы стоят на 1 movement меньше, минимум 1 |
| `shieldWall` | melee | +10% DEF при соседнем союзнике |
| `marksman` | ranged | +15% точность, +1 минимальный урон |
| `charger` | MOV >= 3 | +20% урон, если юнит прошел 2+ гекса перед атакой |
| `siegeExpert` | siege | +30% урон зданиям |
| `arcaneFocus` | mage | -1 мана на способность, минимум 1 |

## 7.4. Детальные карточки юнитов

### Герой

| Поле | Значение |
|---|---|
| Лор | Лидер нового королевства, объединяющий разрозненные земли после древнего Раскола. |
| Роль | Универсальный командир, усиление армии, исследование руин. |
| Способность 1 | `Command Aura`: союзники в радиусе 2 получают +10% ATK и +10% DEF. |
| Способность 2 | `Rally`: 1 раз в 5 ходов восстанавливает 15 HP всем союзникам в радиусе 1. |
| Слабость | Потеря героя дает -20% прогресса на 5 ходов и поражение в режиме Iron Crown. |
| Контрит | гоблин, разбойник, культист |
| Контрится | катапульта, маг, фокус дальних атак |

### Поселенец

| Поле | Значение |
|---|---|
| Лор | Группа семей и ремесленников, готовая основать новый город. |
| Роль | Основание города. |
| Способность | `Found City`: тратит юнита, создает город уровня 1. |
| Ограничение | Нельзя основать город ближе 4 гексов от другого города. |
| Слабость | Почти небоевой, при смерти дает врагу 20 золота. |

### Строитель

| Поле | Значение |
|---|---|
| Лор | Мастера раннего королевства, превращающие дикую землю в инфраструктуру. |
| Роль | Улучшения гексов, дороги, ремонт. |
| Заряды | 3 строительных заряда. |
| Способности | построить ферму, лесопилку, карьер, шахту, дорогу; ремонт стен на 20 HP. |
| Слабость | Низкая атака, требует прикрытия. |

### Копейщик

| Поле | Значение |
|---|---|
| Лор | Крестьянское ополчение, обученное держать строй против натиска. |
| Роль | Дешевая защита, анти-кавалерия. |
| Способность | `Brace`: если не двигался, +35% DEF против рыцаря и волка до следующего хода. |
| Контрит | рыцарь, волк, разведчик |
| Контрится | лучник, маг, мечник |

### Разведчик

| Поле | Значение |
|---|---|
| Лор | Следопыт, первым входящий в неизвестные земли. |
| Роль | Разведка, руины, добивание слабых целей. |
| Способность | `Pathfinder`: лес и холмы стоят 1 movement. |
| Способность | `Survey Ruins`: получает +50% награды из руин. |
| Контрит | гоблин-лучник, катапульта без охраны |
| Контрится | копейщик, рыцарь, городские стены |

### Лучник

| Поле | Значение |
|---|---|
| Лор | Охотники и ополченцы, обученные стрелять залпами. |
| Роль | Ранний дальний урон. |
| Способность | `Volley`: если рядом есть другой лучник/арбалетчик, +10% ATK. |
| Ограничение | Не контратакует в ближнем бою. |
| Контрит | копейщик, маг, гоблин |
| Контрится | рыцарь, разведчик, лесная засада |

### Мечник

| Поле | Значение |
|---|---|
| Лор | Профессиональный солдат с железным оружием. |
| Роль | Надежная пехота для удержания линии. |
| Способность | `Shield Block`: -20% входящего ranged damage, если не атаковал в этот ход. |
| Контрит | копейщик, гоблин, разбойник |
| Контрится | рыцарь, маг, катапульта |

### Рыцарь

| Поле | Значение |
|---|---|
| Лор | Элита средневекового войска, обученная прорывать строй. |
| Роль | Ударный мобильный юнит. |
| Способность | `Charge`: +25% урона, если перед атакой переместился минимум на 2 гекса по равнине/дороге. |
| Штраф | -20% ATK в лесу и болоте. |
| Контрит | лучник, маг, разведчик |
| Контрится | копейщик с Brace, болото, стены |

### Маг

| Поле | Значение |
|---|---|
| Лор | Ученый Раскола, направляющий остатки древней силы. |
| Роль | Магический урон, AOE, контроль. |
| Способность | `Arcane Bolt`: дальность 2, игнорирует 30% DEF. |
| Способность | `Rune Burst`: AOE радиус 1, 70% основного урона, cooldown 3 хода, стоимость 1 мана. |
| Контрит | рыцарь, мечник, паладин |
| Контрится | лучник, разведчик, фокус атаки |

### Арбалетчик

| Поле | Значение |
|---|---|
| Лор | Воин инженерной эпохи, пробивающий тяжелую броню. |
| Роль | Анти-броня на расстоянии. |
| Способность | `Piercing Bolt`: игнорирует 25% DEF. |
| Штраф | После выстрела не может двигаться, если двигался до выстрела больше 1 гекса. |
| Контрит | рыцарь, паладин, мечник |
| Контрится | разведчик, катапульта, маг |

### Катапульта

| Поле | Значение |
|---|---|
| Лор | Осадная машина, созданная для разрушения укреплений. |
| Роль | Осада городов, AOE по плотным войскам. |
| Способность | `Siege Shot`: +50% урон зданиям и стенам. |
| Способность | `Splash`: 35% урона всем юнитам рядом с целью. |
| Ограничение | Не может атаковать после движения. |
| Контрит | стены, города, плотные формации |
| Контрится | разведчик, рыцарь, любой melee рядом |

### Паладин

| Поле | Значение |
|---|---|
| Лор | Воин ордена, соединяющий дисциплину и магическую защиту. |
| Роль | Поздний танк, защита армии. |
| Способность | `Guarding Light`: союзники рядом получают +15% DEF. |
| Способность | `Cleanse`: снимает burn/poison/curse, cooldown 4 хода. |
| Контрит | культист, гоблин, разбойник |
| Контрится | катапульта, маг, экономическое истощение |

### Вражеские юниты

| Юнит | Лор | Роль | Особенность |
|---|---|---|---|
| Гоблин | Слабый налетчик из диких земель. | ранний melee враг | +15% ATK при атаке раненых целей ниже 40% HP |
| Гоблин-лучник | Трусливый стрелок, избегающий прямого боя. | ранний ranged враг | старается держать дистанцию 2 |
| Волк | Дикая угроза на границах цивилизации. | быстрый melee враг | +20% урон по одиночным юнитам без соседних союзников |
| Разбойник | Человек вне закона, появляется около дорог и руин. | средний melee враг | крадет 10 золота при атаке города |
| Культист Раскола | Адепт древних сил. | поздний ranged/magic враг | накладывает `curse`: -10% DEF на 2 хода |

## 7.5. Формула урона

Базовая формула:

```ts
effectiveAtk =
  attacker.ATK *
  levelAtkMultiplier *
  healthAtkMultiplier *
  counterMultiplier *
  abilityMultiplier *
  terrainAttackMultiplier *
  adjacencyMultiplier *
  heightAttackMultiplier *
  randomMultiplier;

effectiveDef =
  defender.DEF *
  levelDefMultiplier *
  terrainDefenseMultiplier *
  fortifyMultiplier *
  buildingDefenseMultiplier *
  heightDefenseMultiplier *
  statusMultiplier;

rawDamage = effectiveAtk * (100 / (100 + effectiveDef * 6));
damage = clamp(round(rawDamage), minDamage, maxDamage);
```

Значения:

| Модификатор | Значение |
|---|---:|
| `levelAtkMultiplier` | `1 + 0.06 * (level - 1)` |
| `levelDefMultiplier` | `1 + 0.05 * (level - 1)` |
| `healthAtkMultiplier` | `0.55 + 0.45 * currentHp / maxHp` |
| `randomMultiplier` | deterministic random `0.90..1.10` |
| `minDamage` | 1 |
| `maxDamage` | 55 для обычных атак, 75 для осадных |

## 7.6. Защита с учетом террейна

```ts
terrainDefenseMultiplier = 1 + terrain.defenseModifier;
heightDefenseMultiplier = 1 + clamp(defenderHeightLevel - attackerHeightLevel, -1, 2) * 0.12;
fortifyMultiplier = defender.isFortified ? 1.20 : 1.00;
buildingDefenseMultiplier = defender.inCity ? 1 + city.defenseBonus : 1.00;
```

---

# 8. Боевая система

## 8.1. Типы атаки

| Тип | Дальность | Контратака | Line of sight | Примеры |
|---|---:|---|---|---|
| Melee | 1 | да | не нужна | копейщик, мечник, рыцарь |
| Ranged | 2-3 | нет, если защитник не ranged и не рядом | нужна | лучник, арбалетчик |
| Magic | 2 | нет обычной, возможна магическая | частичная | маг, культист |
| Siege | 3 | нет | нужна | катапульта |
| AOE | центр + радиус | нет | по центру | Rune Burst, Splash |

## 8.2. Последовательность боя

```text
1. Игрок выбирает атакующего.
2. UI подсвечивает валидные цели.
3. Игрок выбирает цель.
4. Engine валидирует:
   - юнит принадлежит активному игроку
   - атака не использована
   - цель в range
   - есть line of sight, если требуется
   - цель видима
5. Engine рассчитывает hit/miss/crit/damage.
6. Engine применяет damage.
7. Engine рассчитывает counterattack, если применимо.
8. Engine начисляет XP.
9. Engine публикует события.
10. Renderer проигрывает анимации в заданном порядке.
```

## 8.3. Полная формула боя

```ts
basePower = ATK * healthAtkMultiplier;

offense =
  basePower *
  counterClassMod *
  flankMod *
  heightAttackMod *
  terrainAttackMod *
  abilityMod *
  techMod *
  auraMod;

defense =
  DEF *
  terrainDefenseMod *
  heightDefenseMod *
  fortifyMod *
  cityMod *
  wallMod *
  statusDefMod *
  auraDefMod;

expectedDamage = offense * (100 / (100 + defense * 6));

if (isCritical) expectedDamage *= criticalDamageMod;
if (isMiss) expectedDamage *= missDamageMod;

finalDamage = clamp(round(expectedDamage * random(0.9, 1.1)), 1, attackMaxDamage);
```

## 8.4. Пример расчета

Копейщик уровня 1 атакует рыцаря уровня 1 на равнине.

```text
Копейщик ATK = 14
Рыцарь DEF = 16
Копейщик counterClassMod против рыцаря = 1.35
Оба на равнине: terrain = 1.00
Высота равная: height = 1.00
HP копейщика полный: health = 1.00
Random = 1.00

offense = 14 * 1.35 = 18.9
defense = 16
expectedDamage = 18.9 * (100 / (100 + 16 * 6))
expectedDamage = 18.9 * (100 / 196)
expectedDamage = 9.64
finalDamage = 10
```

Если копейщик стоит укрепленным в лесу и рыцарь атакует его:

```text
Рыцарь ATK = 22
Копейщик DEF = 10
Лес DEF = 1.20
Fortify = 1.20
Brace против рыцаря = 1.35 defense

defense = 10 * 1.20 * 1.20 * 1.35 = 19.44
offense = 22 * 0.80 because knight in forest = 17.6
damage = 17.6 * (100 / (100 + 19.44 * 6))
damage = 17.6 * 0.461 = 8.11
finalDamage = 8
```

## 8.5. Модификаторы

| Модификатор | Условие | Значение |
|---|---|---:|
| Фланг | цель имеет 2+ соседних вражеских юнита | +15% ATK |
| Окружение | цель имеет 4+ соседних вражеских юнита | +30% ATK вместо фланга |
| Высота атаки | атакующий выше цели на 1 уровень | +10% ATK |
| Высота атаки | атакующий выше цели на 2 уровня | +20% ATK |
| Низина | атакующий ниже цели | -10% ATK за уровень, максимум -20% |
| Река | melee через реку | -10% ATK |
| Стены | защитник в городе со стенами | +40% DEF |
| Руины | защитник на руинах | +15% DEF |
| Болото | атакующий melee в болоте | -10% ATK |
| Дорога | атака после движения по дороге | нет штрафа charge |

## 8.6. Критические удары

```ts
critChance =
  baseCrit +
  levelBonus +
  heightBonus +
  flankBonus +
  abilityBonus -
  defenderCritResist;
```

| Источник | Значение |
|---|---:|
| Base crit | 5% |
| Разведчик | +8% |
| Герой | +5% |
| Высота +1 | +3% |
| Фланг | +5% |
| Окружение | +10% |
| Ветеран уровень 5 | +5% |
| Defender fortified | -5% |

Critical damage multiplier: `1.50`.

## 8.7. Промахи

Melee атаки не промахиваются полностью, но могут нанести glancing hit.

| Тип | Base miss/glance | Эффект |
|---|---:|---|
| Melee | 5% glance | 50% damage |
| Ranged | 12% miss | 0 damage |
| Magic | 8% unstable | 50% damage |
| Siege | 18% scatter | 50% по цели, 25% шанс задеть соседний гекс |

Модификаторы точности:

| Условие | Accuracy |
|---|---:|
| Цель в лесу | -10% ranged accuracy |
| Цель на холме/горе | -5% ranged accuracy |
| Атакующий на холме | +5% ranged accuracy |
| Marksman perk | +15% accuracy |
| Дальность максимальная | -5% accuracy |

## 8.8. Контратаки

Правила:

1. Melee защитник контратакует melee атакующего, если жив и не exhausted.
2. Ranged защитник контратакует только если атакующий в его range и есть line of sight.
3. Юнит может контратаковать 1 раз за ход.
4. Контратака наносит 65% обычного damage.
5. Укрепленный копейщик с Brace контратакует рыцаря на 85% damage.
6. Катапульта не контратакует.

## 8.9. AOE атаки

### Rune Burst

| Параметр | Значение |
|---|---:|
| Center range | 2 |
| Radius | 1 |
| Damage center | 100% magic damage |
| Damage adjacent | 70% magic damage |
| Friendly fire | 50% damage союзникам, включено |
| Cooldown | 3 хода |
| Cost | 1 мана |

### Catapult Splash

| Параметр | Значение |
|---|---:|
| Range | 3 |
| Center damage | 100% siege damage |
| Adjacent damage | 35% siege damage |
| Buildings | 150% damage |
| Minimum range | 2 |
| Cannot move and fire | да |

## 8.10. Бонусы за соседство

| Условие | Эффект |
|---|---|
| 2 копейщика рядом | оба получают +10% DEF |
| Лучник рядом с лучником/арбалетчиком | +10% ATK ranged |
| Герой в радиусе 2 | +10% ATK и DEF |
| Паладин рядом | +15% DEF |
| Юнит один, рядом нет союзников | волк получает +20% ATK по нему |
| Катапульта без соседнего союзника | -15% DEF |

## 8.11. Визуальная реализация боя

### Melee

```text
0.00 s: attacker turns to defender
0.10 s: attacker moves 20% toward defender
0.35 s: attack animation hit frame
0.38 s: DamageApplied event visual number
0.45 s: hit VFX
0.60 s: attacker returns to tile center
0.75 s: counterattack starts if applicable
```

### Ranged

```text
0.00 s: attacker aim animation
0.30 s: projectile spawn at weapon socket
0.30-0.75 s: projectile follows arc
0.75 s: impact VFX and damage number
0.95 s: attacker returns to idle
```

### Magic

```text
0.00 s: cast animation starts
0.20 s: rune circle appears
0.45 s: projectile/burst release
0.70 s: impact, bloom pulse, damage
1.10 s: particles fade
```

## 8.12. XP

```ts
xpGained =
  damageDealt * 0.35 +
  killBonus +
  levelDifferenceBonus +
  objectiveBonus;
```

| Событие | XP |
|---|---:|
| Нанести 10 damage | 3.5 |
| Добить юнита | +12 |
| Убить юнита выше уровнем | +6 за разницу уровня |
| Захватить лагерь/руины боем | +10 |
| Защитить город | +8 |
| Лечение союзника на 20 HP | +4 |

XP округляется вниз в конце боя. Минимум 1 XP за успешную атаку с уроном.

---

# 9. Здания и города

## 9.1. Основание города

Команда:

```ts
type FoundCityCommand = {
  type: 'foundCity';
  unitId: EntityId;
  hex: HexCoord;
  name?: string;
};
```

Условия:

1. Юнит `settler`.
2. Гекс суша, не гора, не вода.
3. Нет города в радиусе 4.
4. Нет вражеского юнита в радиусе 2.
5. Гекс видим активному игроку.

После основания:

| Параметр | Значение |
|---|---:|
| Уровень | 1 |
| Население | 2 |
| HP города | 150 |
| Базовая зона влияния | радиус 2 |
| Базовый доход | золото +2, еда +2, прогресс +1 |
| Стартовое здание | `city_center` |

## 9.2. Рост города

```ts
foodSurplus = foodIncome - population * 1.0;
growthRequired = 18 + cityLevel * 12 + population * 6;
growthProgress += max(0, foodSurplus);

if growthProgress >= growthRequired:
  population += 1
  growthProgress -= growthRequired
```

| Уровень города | Население | Радиус влияния | HP | Building slots |
|---|---:|---:|---:|---:|
| 1 | 1-3 | 2 | 150 | 3 |
| 2 | 4-6 | 3 | 220 | 5 |
| 3 | 7-10 | 3 | 320 | 7 |
| 4 | 11-15 | 4 | 460 | 9 |
| 5 | 16+ | 5 | 650 | 12 |

## 9.3. Полный список зданий

| ID | Название | Стоимость | Upkeep | Пререквизит | Эффект |
|---|---|---:|---:|---|---|
| `city_center` | Центр города | авто | 0 | none | базовый доход, хранение |
| `castle` | Замок | 120 камня, 80 золота | 2 золота | `masonry` | +80 city HP, +20% DEF города |
| `barracks` | Казармы | 60 дерева, 40 золота | 1 золото | `bronzeWorking` | открывает найм melee, +10 XP новым melee |
| `archery_range` | Стрельбище | 50 дерева, 50 золота | 1 золото | `archery` | лучники/арбалетчики, +10 XP ranged |
| `library` | Библиотека | 70 дерева, 50 камня | 1 золото | `writing` | +4 наука, +1 прогресс |
| `granary` | Амбар | 50 дерева, 30 камня | 0 | `agriculture` | +3 еда, +20% food storage |
| `market` | Рынок | 80 дерева, 60 золота | 0 | `currency` | +5 золото, trade routes +1 |
| `workshop` | Мастерская | 70 дерева, 70 камня | 1 золото | `engineering` | +3 production, siege +15% build speed |
| `blacksmith` | Кузница | 60 камня, 40 железа | 2 золота | `ironWorking` | melee +1 ATK при найме |
| `mage_tower` | Башня магов | 80 камня, 120 золота, 2 маны | 2 золота | `arcaneTheory` | маги, +3 наука, +1 мана |
| `walls` | Стены | 100 камня | 1 золото | `masonry` | +40% DEF города, ranged attack города |
| `watchtower` | Сторожевая башня | 60 дерева, 40 камня | 1 золото | `mapping` | +2 обзор города |
| `temple` | Храм | 80 камня, 80 золота | 1 золото | `rituals` | +2 прогресс, лечение +5 HP/ход |
| `harbor` | Гавань | 90 дерева, 60 камня | 1 золото | `sailing` | coastal trade, food +2, gold +3 |
| `university` | Университет | 120 камня, 150 золота | 3 золота | `scholarship` | +8 наука, research speed +10% |
| `bank` | Банк | 100 камня, 180 золота | 2 золота | `banking` | +12 золото, market fee -10% |
| `guild_hall` | Гильдия | 100 дерева, 120 золота | 2 золота | `guilds` | specialists +2, trade +20% |
| `siege_yard` | Осадный двор | 120 дерева, 100 камня | 2 золота | `siegecraft` | катапульты, siege +10 XP |
| `alchemist_lab` | Лаборатория алхимика | 100 камня, 2 маны, 140 золота | 3 золота | `alchemy` | potions, +2 наука, +2 мана |
| `astral_observatory` | Астральная обсерватория | 160 камня, 4 маны | 4 золота | `astronomy` | +12 наука, видит руины в радиусе 6 |

## 9.4. Дерево зданий

```text
city_center
  +-- granary -> market -> bank
  +-- barracks -> blacksmith -> guild_hall
  +-- archery_range -> siege_yard
  +-- library -> university -> astral_observatory
  +-- temple -> mage_tower -> alchemist_lab
  +-- walls -> castle -> watchtower
  +-- harbor (только coast)
```

## 9.5. Зоны влияния

Город контролирует гексы в радиусе влияния, если:

1. Гекс исследован владельцем.
2. Гекс соединен с городом через сушу или coast для harbor.
3. Гекс не находится ближе к чужому городу более высокого culture pressure.

```ts
culturePressure =
  cityLevel * 10 +
  population * 2 +
  progressBuildings * 4 -
  distanceFromCity * 5;
```

Гекс принадлежит городу с максимальным `culturePressure`, если значение больше 0.

## 9.6. Производство ресурсами зданий

```ts
cityIncome(resource) =
  baseCityIncome(resource) +
  sum(workedHexYields(resource)) +
  sum(buildingYields(resource)) +
  tradeIncome(resource) +
  technologyFlatBonus(resource);

finalCityIncome =
  floor(cityIncome * (1 + sum(percentModifiers)));
```

Город может работать `population + 1` гексов в своей зоне влияния. Приоритет автоматического назначения:

1. Еда, если foodSurplus < 2.
2. Production для текущего строительства.
3. Наука, если идет ключевая технология.
4. Золото, если баланс золота отрицательный.

## 9.7. Оборона города

| Элемент | Эффект |
|---|---|
| City center | базовая ranged attack 12, range 2 |
| Walls | +40% DEF, +100 wall HP |
| Castle | +20% DEF, +80 HP, city attack +6 |
| Watchtower | обзор +2, city attack accuracy +10% |
| Garrison unit | добавляет 30% своего DEF к DEF города |

Город имеет отдельные `wallHp` и `cityHp`. Пока `wallHp > 0`, входящий melee/siege damage сначала идет в стены. Siege damage по стенам умножается на 1.5.

## 9.8. Чудеса света

| ID | Название | Стоимость | Требование | Эффект | Ограничение |
|---|---|---:|---|---|---|
| `wonder_sun_obelisk` | Обелиск Солнца | 220 камня, 180 золота | `rituals` | +3 прогресс всем городам, герой получает +10 max HP | 1 на мир |
| `wonder_world_tree` | Древо Мира | 200 дерева, 4 маны, 200 золота | `natureHarmony` | леса дают +1 еда/+1 наука, лечение +5 HP в лесу | 1 на мир |
| `wonder_astral_gate` | Астральные Врата | 300 камня, 8 маны, 300 золота | `riftStudies` | открывает победу Раскола, +20 наука | 1 на мир |
| `wonder_great_foundry` | Великая Литейная | 250 камня, 120 железа | `machinery` | military production +25%, siege +2 ATK | 1 на мир |

## 9.9. Визуальная эволюция городов

| Эпоха | Визуальный стиль |
|---|---|
| Примитивы | палатки, частокол, костры, земляные дороги |
| Ранняя цивилизация | деревянные дома, амбары, простые каменные фундаменты |
| Средние века | каменные стены, башни, черепичные крыши |
| Возрождение | высокие здания, витражи, мощеные дороги |
| Раскол | магические кристаллы, трещины света, floating fragments |

---

# 10. Ресурсы и экономика

## 10.1. Ресурсы

| Ресурс | Тип | Хранится | Назначение |
|---|---|---|---|
| Золото | глобальный | да | найм, обслуживание, рынок, дипломатия |
| Еда | по городам + глобальный surplus | частично | рост, поселенцы, юниты |
| Дерево | глобальный | да | ранние здания, лучники, дороги |
| Камень | глобальный | да | стены, замки, чудеса |
| Железо | глобальный strategic | да | мечники, рыцари, арбалетчики |
| Мана | глобальный strategic | да | маги, паладины, чудеса Раскола |
| Очки прогресса | глобальный per turn | нет как spendable в MVP | эпохи, civics, победные условия |
| Наука | глобальный per turn | нет как spendable | технологии |

## 10.2. Формула дохода за ход

```ts
grossIncome[resource] =
  sum(cityIncome[resource]) +
  sum(improvementIncome[resource]) +
  sum(tradeIncome[resource]) +
  sum(technologyIncome[resource]) +
  sum(eventIncome[resource]);

expenses[resource] =
  unitUpkeep[resource] +
  buildingUpkeep[resource] +
  tradeMaintenance[resource] +
  difficultyModifiers[resource];

netIncome[resource] = floor(grossIncome[resource] * empireModifier[resource]) - expenses[resource];
stockpile[resource] = clamp(stockpile[resource] + netIncome[resource], 0, storageCap[resource]);
```

## 10.3. Базовые yields террейна

| Террейн | Еда | Дерево | Камень | Золото | Наука | Прогресс |
|---|---:|---:|---:|---:|---:|---:|
| Равнина | 2 | 0 | 0 | 1 | 0 | 0 |
| Лес | 1 | 2 | 0 | 0 | 0 | 0 |
| Гора | 0 | 0 | 2 | 0 | 1 | 0 |
| Вода | 1 | 0 | 0 | 1 | 0 | 0 |
| Пустыня | 0 | 0 | 0 | 1 | 0 | 0 |
| Болото | 1 | 1 | 0 | 0 | 1 | 0 |
| Холмы | 0 | 0 | 1 | 1 | 0 | 0 |
| Руины | 0 | 0 | 1 | 1 | 1 | 1 |

## 10.4. Улучшения

| Improvement | Террейн | Стоимость | Время | Эффект |
|---|---|---:|---:|---|
| Ферма | равнина, floodplain | 20 дерево | 2 хода | еда +2 |
| Лесопилка | лес | 25 дерево | 2 хода | дерево +2, золото +1 |
| Карьер | холмы, камень | 20 дерево | 3 хода | камень +2 |
| Шахта | холмы, горы adjacent, железо/золото | 30 дерево, 20 камень | 3 хода | ресурс +2 или золото +3 |
| Дорога | land | 10 дерево | 1 ход | move cost максимум 1 |
| Мана-фокус | кристалл/руины | 40 камень, 1 мана | 4 хода | мана +2, наука +1 |

## 10.5. Торговля между городами

Торговый маршрут соединяет два города владельца или союзника.

Условия:

1. Есть рынок хотя бы в одном городе.
2. Города соединены дорогой, рекой или coast после `sailing`.
3. Длина маршрута не больше `8 + tradeTechBonus`.
4. Один город уровня 1 поддерживает 1 маршрут, уровень 3 - 2 маршрута, уровень 5 - 3 маршрута.

Формула:

```ts
tradeGold =
  2 +
  floor(routeLength / 3) +
  marketBonus +
  harborBonus +
  foreignTradeBonus;

tradeFood = sameOwner ? 1 : 0;
tradeScience = hasUniversity ? 1 : 0;
```

## 10.6. Рынок

После технологии `currency` игрок может покупать/продавать ресурсы.

| Ресурс | Базовая цена покупки | Цена продажи |
|---|---:|---:|
| Еда | 2 золота | 1 золото |
| Дерево | 3 золота | 1 золото |
| Камень | 4 золота | 2 золота |
| Железо | 6 золота | 3 золота |
| Мана | 10 золота | 5 золота |

Динамическая цена:

```ts
buyPrice = baseBuyPrice * (1 + purchasedThisTurn / 50) * eraInflation;
sellPrice = floor(baseSellPrice * (1 - soldThisTurn / 80));
eraInflation = 1 + currentEraIndex * 0.08;
```

## 10.7. Обслуживание

```ts
unitUpkeepGold =
  sum(unit.upkeepGold) *
  (1 + max(0, totalUnits - freeUnitCap) * 0.03);

freeUnitCap = 4 + cityCount * 2 + barracksCount;
```

Если золото уходит в 0:

1. На первом ходу дефицита: предупреждение.
2. На втором: research -15%.
3. На третьем и далее: все юниты получают -10% ATK/DEF, случайное здание может приостановиться.

## 10.8. Анти-snowball

| Проблема | Решение |
|---|---|
| Игрок с большим числом городов ускоряется слишком сильно | `empireSizePenalty`: после 4 городов стоимость технологий +6% за город |
| Ранний захват дает слишком много | Захваченный город 5 ходов имеет unrest: -50% доход |
| Армия победителя качается быстрее | XP от врагов ниже уровнем уменьшается на 35% |
| Богатая экономика покупает все | Market price растет от покупок в текущем ходу и эпохе |
| Лейтейм без выбора | Чудеса имеют взаимоисключающие victory tracks |

---

# 11. Дерево технологий

## 11.1. Эпохи

| Эпоха | Индекс | Базовая стоимость технологий | Тема |
|---|---:|---:|---|
| Примитивы | 0 | 35 | выживание, первые поселения |
| Ранняя цивилизация | 1 | 70 | письмо, ремесла, ранняя армия |
| Средние века | 2 | 130 | феодализм, инженерия, магия |
| Возрождение | 3 | 220 | экономика, университеты, ордена |
| Раскол | 4 | 360 | древняя магия, разломы, финальные ветки |

## 11.2. Формула стоимости

```ts
techCost =
  eraBaseCost *
  branchMultiplier *
  (1 + completedTechsInEra * 0.08) *
  (1 + max(0, cityCount - 4) * 0.06) *
  difficultyResearchMultiplier;
```

| Ветвь | Multiplier |
|---|---:|
| Военная | 1.00 |
| Экономическая | 0.95 |
| Научная | 1.05 |
| Магическая | 1.15 |

## 11.3. Полное дерево технологий

| ID | Название | Эпоха | Ветвь | Пререквизиты | Эффекты |
|---|---|---|---|---|---|
| `toolmaking` | Изготовление орудий | Примитивы | экономика | none | строитель, ферма, лесопилка |
| `tracking` | Следопытство | Примитивы | военная | none | разведчик, обзор +1 для разведчиков |
| `settlement` | Поселения | Примитивы | экономика | none | поселенец, городская зона влияния |
| `agriculture` | Земледелие | Примитивы | экономика | `toolmaking` | амбар, фермы +1 еда |
| `rituals` | Обряды | Примитивы | магическая | `settlement` | храм, прогресс +1 от руин |
| `bronzeWorking` | Бронзовое дело | Примитивы | военная | `toolmaking` | копейщик, казармы |
| `mapping` | Картография | Примитивы | научная | `tracking` | сторожевая башня, minimap detail |
| `writing` | Письменность | Ранняя цивилизация | научная | `settlement` | библиотека, наука +10% в столице |
| `archery` | Стрельба из лука | Ранняя цивилизация | военная | `tracking` | лучник, стрельбище |
| `masonry` | Каменная кладка | Ранняя цивилизация | экономика | `bronzeWorking` | стены, замок, карьер +1 камень |
| `currency` | Валюта | Ранняя цивилизация | экономика | `writing` | рынок, торговля, покупка/продажа ресурсов |
| `ironWorking` | Обработка железа | Ранняя цивилизация | военная | `bronzeWorking`, `masonry` | мечник, кузница, железо видно |
| `sailing` | Мореплавание | Ранняя цивилизация | экономика | `mapping` | гавань, движение по coast для будущих юнитов |
| `naturalPhilosophy` | Натурфилософия | Ранняя цивилизация | научная | `writing` | наука +1 от гор, boost к scholarship |
| `arcaneTheory` | Теория арканы | Средние века | магическая | `rituals`, `writing` | маг, башня магов, мана видна |
| `feudalism` | Феодализм | Средние века | экономика | `currency`, `ironWorking` | рыцарь prereq, города level cap +1 |
| `engineering` | Инженерия | Средние века | научная | `masonry`, `naturalPhilosophy` | мастерская, арбалетчик, мосты |
| `chivalry` | Рыцарство | Средние века | военная | `feudalism`, `ironWorking` | рыцарь, charge +10% |
| `siegecraft` | Осадное дело | Средние века | военная | `engineering` | катапульта, осадный двор |
| `guilds` | Гильдии | Средние века | экономика | `currency`, `feudalism` | гильдия, specialists |
| `scholarship` | Схоластика | Средние века | научная | `naturalPhilosophy`, `arcaneTheory` | университет, research +5% |
| `alchemy` | Алхимия | Средние века | магическая | `arcaneTheory`, `engineering` | лаборатория алхимика, potions |
| `banking` | Банковское дело | Возрождение | экономика | `guilds`, `scholarship` | банк, market fee -10% |
| `machinery` | Машиностроение | Возрождение | военная | `engineering`, `siegecraft` | siege +2 ATK, Great Foundry |
| `astronomy` | Астрономия | Возрождение | научная | `scholarship`, `mapping` | обсерватория, дальний обзор руин |
| `holyOrders` | Священные ордена | Возрождение | военная | `chivalry`, `rituals` | паладин, temple heal +5 |
| `printing` | Печатное дело | Возрождение | научная | `scholarship`, `guilds` | science buildings +15% |
| `navigation` | Навигация | Возрождение | экономика | `sailing`, `astronomy` | trade route range +4 |
| `natureHarmony` | Гармония природы | Возрождение | магическая | `alchemy`, `agriculture` | Древо Мира, леса +1 еда |
| `professionalArmy` | Профессиональная армия | Возрождение | военная | `machinery`, `banking` | upkeep -10%, новые юниты +15 XP |
| `riftStudies` | Исследования Разлома | Раскол | магическая | `astronomy`, `arcaneTheory` | Астральные Врата, rift events |
| `manaConduits` | Мана-проводники | Раскол | магическая | `riftStudies`, `alchemy` | мана +25%, маги cooldown -1 |
| `industrialLogistics` | Индустриальная логистика | Раскол | экономика | `machinery`, `navigation` | дороги дают trade +1, production +15% |
| `grandStrategy` | Великая стратегия | Раскол | военная | `professionalArmy`, `printing` | армии получают formation bonuses +10% |
| `rationalism` | Рационализм | Раскол | научная | `printing`, `astronomy` | science +20%, tech cost penalty -50% |
| `riftContainment` | Сдерживание Разлома | Раскол | магическая | `manaConduits`, `rationalism` | защита от культистов, победа Seal |
| `ascendantCrown` | Восходящая корона | Раскол | военная | `grandStrategy`, `holyOrders` | герой level cap 6, победа Dominion |

Всего: 37 технологий.

## 11.4. Граф зависимостей

```text
toolmaking -> agriculture
toolmaking -> bronzeWorking -> masonry -> engineering -> siegecraft -> machinery
tracking -> mapping -> sailing -> navigation
tracking -> archery
settlement -> writing -> currency -> guilds -> banking
settlement -> rituals -> arcaneTheory -> alchemy -> manaConduits
bronzeWorking -> ironWorking -> feudalism -> chivalry -> holyOrders
writing -> naturalPhilosophy -> scholarship -> printing -> rationalism
astronomy -> riftStudies -> manaConduits -> riftContainment
professionalArmy -> grandStrategy -> ascendantCrown
```

## 11.5. UI дерева технологий

1. Горизонтальная ось - эпохи.
2. Вертикальная ось - ветви: военная, экономика, наука, магия.
3. Узел технологии показывает:
   - иконку;
   - название;
   - стоимость;
   - ходов до завершения;
   - major unlock icons.
4. Цвета ветвей:
   - военная `#b94a48`;
   - экономика `#d4a23a`;
   - наука `#4d8fd6`;
   - магия `#8a5bd6`.
5. Недоступные узлы имеют opacity 0.35.
6. Исследуемый узел имеет animated border.
7. Завершенные узлы имеют чек-иконку и muted background.

---

# 12. ИИ противника

## 12.1. Архитектура

Используется двухуровневый ИИ:

1. **Strategic Planner**: выбирает цели на 5-15 ходов: расширение, оборона, нападение, технологии, экономика.
2. **Tactical Planner**: принимает решения для конкретных юнитов в текущем ходу.

Модель:

```text
AiDirector
  +-- AiMemory
  +-- InfluenceMap
  +-- StrategicPlanner (utility AI)
  +-- TacticalPlanner (utility + behavior tree)
  +-- EconomyPlanner
  +-- ResearchPlanner
```

## 12.2. Utility AI

Каждое действие получает score 0-100.

```ts
score(action) =
  baseWeight *
  urgency *
  expectedValue *
  successChance *
  personalityModifier -
  riskCost -
  opportunityCost;
```

## 12.3. Стратегические цели

| Цель | Условия выбора | Действия |
|---|---|---|
| `expand` | городов меньше среднего, есть безопасный старт | нанять поселенца, охрана, основать город |
| `defend` | enemyThreat > defensePower * 0.75 | стены, копейщики, стянуть войска |
| `rush` | военная сила > врага на 30%, дистанция < 12 | нанять melee/ranged, атаковать |
| `tech` | отставание по технологиям > 2 | библиотеки, университеты, research branch |
| `economy` | золото/ход < 0 или upkeep высокий | рынки, trade, меньше найма |
| `magic` | есть мана и эпоха >= Средние века | башни магов, маги, рифтовые технологии |

## 12.4. Тактический ИИ

### Target score

```ts
targetScore =
  killChance * 40 +
  damageExpected * 1.2 +
  targetValue * 1.5 +
  focusFireBonus +
  terrainAfterAttackBonus -
  retaliationRisk * 1.4 -
  exposureRisk;
```

### Move score

```ts
moveScore =
  coverBonus +
  heightBonus +
  attackOpportunity +
  objectiveDistanceReduction -
  enemyThreatAtTile -
  isolationPenalty;
```

### Приоритет целей

| Цель | Base value |
|---|---:|
| Герой | 100 |
| Поселенец | 90 |
| Маг | 75 |
| Катапульта | 70 |
| Раненый юнит, которого можно убить | +35 |
| Лучник/арбалетчик | 55 |
| Рыцарь | 60 |
| Город | 80 |
| Строитель | 45 |

## 12.5. Behavior tree для юнита

```text
UnitTurn
  Selector
    Sequence: CanKillTarget -> MoveIfNeeded -> Attack
    Sequence: IsLowHp -> CanRetreat -> RetreatToSafeTile
    Sequence: IsRanged -> FindSafeFiringTile -> Move -> Attack
    Sequence: HasObjective -> MoveTowardObjective
    Sequence: IsIdleScout -> ExploreUnknown
    Action: Fortify
```

## 12.6. Исследование карты

ИИ хранит frontier-гексы: границу исследованного и неизвестного.

```ts
frontierScore =
  unknownNeighbors * 3 +
  nearbyRuins * 8 +
  resourcePotential * 2 -
  enemyThreat * 4 -
  distanceFromScout * 0.6;
```

Разведчики идут к frontier с максимальным score. Боевые юниты не уходят дальше 6 гексов от города без стратегической цели.

## 12.7. Экономика ИИ

Приоритет строительства:

```text
if foodSurplus < 2 -> granary/farm
else if goldPerTurn < 0 -> market/trade
else if underThreat -> walls/barracks/units
else if techBehind -> library/university
else if hasMana -> mageTower/alchemist
else balanced build
```

## 12.8. Дипломатия ИИ

Для будущего мультиплеера с AI:

| Состояние | Условие |
|---|---|
| Neutral | старт |
| Friendly | trade >= 20 ходов, нет border conflict |
| Suspicious | войска у границы, competing wonders |
| Hostile | атаки, city pressure, military advantage |
| War | объявление войны или атака |
| Truce | 10 ходов после мира |

## 12.9. Сложность

| Сложность | AI search depth | Ресурсы | Боевые бонусы | Fog |
|---|---:|---:|---:|---|
| Story | низкая | -10% доход | -10% ATK/DEF | обычный |
| Normal | средняя | 100% | 0% | обычный |
| Veteran | средняя+ | +10% доход | 0% | обычный |
| Warlord | высокая | +20% доход | +5% HP | знает approximate player power |
| Mythic | высокая | +30% доход | +8% HP, +5% ATK | знает explored map, не видит скрытые юниты |

Читерство допустимо только как прозрачные difficulty modifiers. ИИ не должен видеть невидимые юниты на Normal/Veteran.

---

# 13. Пользовательский интерфейс

## 13.1. Визуальный стиль

| Параметр | Решение |
|---|---|
| Жанр UI | dark fantasy strategy, спокойный утилитарный интерфейс |
| Основной фон | `#151922` |
| Панели | `#202633` с opacity 0.94 |
| Акцент золото | `#d7aa4b` |
| Акцент наука | `#4d8fd6` |
| Акцент магия | `#8a5bd6` |
| Ошибка | `#d65a54` |
| Успех | `#6fbf73` |
| Радиус карточек | 6 px |
| Шрифт | Inter для UI, Cinzel или Marcellus для заголовков эпох |

## 13.2. Главное меню

```text
+--------------------------------------------------------------+
| Realms of War                                                |
|                                                              |
| [Продолжить]                                                 |
| [Новая игра]                                                 |
| [Загрузить]                                                  |
| [Hotseat]                                                    |
| [Настройки]                                                  |
| [Выход]                                                      |
|                                                              |
| справа: 3D сцена с вращающимся замком и гексами              |
+--------------------------------------------------------------+
```

## 13.3. Экран новой игры

Поля:

| Контрол | Значения |
|---|---|
| Размер карты | Small 20x15, Medium 36x24, Large 52x36 |
| Seed | текст, кнопка random |
| Игроки | 2-6 |
| AI сложность | Story, Normal, Veteran, Warlord, Mythic |
| Тип карты | Continents, Highlands, Lakes, Balanced |
| Победы | Domination, Science, Rift Seal, Wonders |
| Fog of war | on/off |
| Скорость игры | Quick 75%, Normal 100%, Epic 150% costs |

## 13.4. HUD во время игры

```text
+--------------------------------------------------------------------------------+
| Turn 24 | Player: Kingdom of Dawn | Gold +12 | Food +8 | Wood +5 | Stone +3 ... |
+--------------------------------------------------------------------------------+
|                                                                                |
|                                3D MAP                                          |
|                                                                                |
| [Minimap]                                                 [Notifications]       |
|                                                                                |
+---------------------------+----------------------------+-----------------------+
| Selection Panel           | Unit/City actions          | End Turn / Phase      |
+---------------------------+----------------------------+-----------------------+
```

## 13.5. Панель выбранного юнита

Содержит:

1. Портрет 3D/иконка.
2. Название, уровень, XP progress.
3. HP bar.
4. ATK/DEF/MOV/Range.
5. Status effects.
6. Действия:
   - move;
   - attack;
   - fortify;
   - ability;
   - skip;
   - sleep.
7. Прогноз боя при наведении на цель:
   - expected damage;
   - incoming counter;
   - kill chance;
   - modifiers list.

## 13.6. Панель города

Содержит:

1. Название, уровень, население.
2. HP/walls.
3. Доходы города.
4. Growth progress.
5. Очередь строительства.
6. Доступные здания.
7. Найм юнитов.
8. Worked hexes.
9. Trade routes.
10. Garrison.

## 13.7. Экран технологий

```text
+--------------------------------------------------------------------------------+
| [All] [Military] [Economy] [Science] [Magic]        Science: 18/turn           |
+--------------------------------------------------------------------------------+
| Primitive | Early Civilization | Medieval | Renaissance | Rift                 |
|                                                                              |
| Military  o Tracking -> o Archery -> o Chivalry -> o Professional Army        |
| Economy   o Toolmaking -> o Agriculture -> o Guilds -> o Banking              |
| Science   o Writing -> o Natural Philosophy -> o Scholarship -> o Rationalism |
| Magic     o Rituals -> o Arcane Theory -> o Alchemy -> o Rift Studies         |
|                                                                              |
+--------------------------------------------------------------------------------+
| Selected tech details: unlocks, cost, prerequisites, turns                    |
+--------------------------------------------------------------------------------+
```

## 13.8. Tooltips

Каждый tooltip имеет:

```ts
type TooltipContent = {
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string; delta?: 'good' | 'bad' }>;
  requirements?: string[];
  hotkey?: string;
};
```

Задержка появления: 350 ms.  
Задержка исчезновения: 80 ms.  
Max width: 360 px.  
На мобильном/тач-режиме tooltip открывается long press 450 ms.

## 13.9. Горячие клавиши

| Клавиша | Действие |
|---|---|
| `Space` | следующий юнит без действия |
| `Enter` | завершить ход |
| `Esc` | закрыть панель/снять выбор |
| `M` | режим движения |
| `A` | режим атаки |
| `F` | укрепиться |
| `B` | открыть строительство города |
| `R` | найм юнитов |
| `T` | дерево технологий |
| `G` | toggle grid |
| `Y` | toggle yields |
| `V` | toggle threat view |
| `Tab` | следующий город |
| `Shift+Tab` | предыдущий город |
| `1-9` | способности выбранного юнита |
| `WASD` | камера |
| `Q/E` | поворот камеры |
| `Mouse wheel` | zoom |
| `Middle drag` | pan |

## 13.10. Адаптивность

| Разрешение | Layout |
|---|---|
| 1280x720 | compact HUD, panels max 320 px |
| 1920x1080 | standard HUD, panels 360-420 px |
| 2560x1440 | larger minimap, panels 440 px |
| ultrawide | HUD centered max width 1920, side panels anchored |

UI scale:

```ts
effectiveUiScale = clamp(userUiScale * resolutionScale, 0.85, 1.35);
```

## 13.11. UI анимации

| Элемент | Анимация | Длительность |
|---|---|---:|
| Панель | translateY 12 -> 0, opacity 0 -> 1 | 140 ms |
| Modal | scale 0.98 -> 1, opacity | 120 ms |
| Tooltip | opacity only | 80 ms |
| Resource delta | number fly-up | 650 ms |
| Tech complete | glow pulse | 900 ms |
| End turn | screen edge sweep | 450 ms |

---

# 14. Система игровых ходов

## 14.1. Фазы хода

```ts
type TurnPhase =
  | 'start'
  | 'income'
  | 'research'
  | 'cityProduction'
  | 'unitReady'
  | 'playerActions'
  | 'aiActions'
  | 'end';
```

## 14.2. Полный цикл

```text
1. TurnStarted
2. Обновить visible/fog для активного игрока
3. Начислить доход ресурсов
4. Списать upkeep
5. Применить рост городов
6. Продвинуть строительство зданий/юнитов
7. Продвинуть исследование технологии
8. Обработать status effects:
   - poison/burn damage
   - healing
   - cooldown--
9. Сбросить действия юнитов:
   - movement = MOV
   - attackAvailable = true
   - counterattackAvailable = true
10. Показать уведомления начала хода
11. PlayerActions:
   - движение
   - атака
   - строительство
   - найм
   - выбор исследования
12. EndTurnCommand
13. EndTurn cleanup
14. Передать ход следующему игроку
```

## 14.3. Порядок автоматических действий

В начале хода:

1. Доход террейнов и зданий.
2. Торговля.
3. Upkeep.
4. Дефицитные штрафы.
5. Рост города.
6. Завершение production.
7. Завершение research.
8. Лечение.
9. Урон от статусов.
10. Fog update.

Обоснование: игрок сначала получает результаты экономики, затем последствия содержания, затем новые возможности.

## 14.4. Действия юнита

| Действие | Тратит movement | Тратит attack | Завершает юнит |
|---|---|---|---|
| Move | да | нет | если movement 0 |
| Attack melee | нет | да | да |
| Attack ranged | нет | да | да |
| Fortify | весь остаток | да | да |
| Build improvement | весь остаток | да | да |
| Use ability | зависит | зависит | зависит |
| Skip | нет | нет | да до следующего хода |
| Sleep | нет | нет | пока не разбудят |

## 14.5. Неиспользованные действия

1. Остаток movement не переносится.
2. Неиспользованная атака не переносится.
3. Fortify получает бонус только если юнит не двигался и не атаковал.
4. Строитель может сохранить заряды между ходами.
5. Катапульта может подготовиться: если пропустила ход без движения, следующий выстрел получает +10% accuracy.

## 14.6. Автозавершение хода

Кнопка End Turn активна всегда, но подсвечивается, когда:

```ts
allUnitsDone &&
allCitiesHaveProduction &&
researchSelected &&
noBlockingNotifications
```

Blocking notifications:

1. Нет активной технологии.
2. Город без production.
3. Юнит с доступной атакой рядом с врагом.
4. Поселенец может основать город на рекомендованном гексе.

---

# 15. Мультиплеер

## 15.1. Hotseat

Hotseat работает без сервера в одном клиенте.

### Переключение игроков

```text
1. Игрок нажимает End Turn.
2. Экран затемняется.
3. Появляется HotseatSwitchScreen:
   "Передайте управление игроку 2"
4. Скрывается карта, ресурсы и уведомления предыдущего игрока.
5. Новый игрок нажимает "Начать ход".
6. Загружается fog/visible слой нового игрока.
```

### Скрытие информации

| Данные | На switch screen |
|---|---|
| Карта | скрыта |
| Ресурсы | скрыты |
| Уведомления | скрыты |
| Последние события боя | показываются только если новый игрок имел видимость |
| Очередь строительства | скрыта до входа владельца |

## 15.2. Онлайн-архитектура

VPS 1CPU/2GB используется только как relay/validator turn commands.

```text
Client A
  |
  | WebSocket command
  v
Match Server
  | validates command shape, turn, player, hash
  | appends command to match log
  v
Client B receives command

Both clients run deterministic GameEngine.
```

На первой онлайн-версии сервер не симулирует весь матч каждый кадр. Он проверяет:

1. playerId;
2. turn number;
3. command schema;
4. previousStateHash;
5. command signature/session token.

Позднее сервер может стать authoritative validator, прогоняя команды через engine в Node/Bun.

## 15.3. Протокол WebSocket

```ts
type ClientToServer =
  | { type: 'lobby.create'; payload: CreateLobbyPayload }
  | { type: 'lobby.join'; payload: JoinLobbyPayload }
  | { type: 'match.ready'; payload: ReadyPayload }
  | { type: 'match.command'; payload: MatchCommandPayload }
  | { type: 'match.chat'; payload: ChatPayload }
  | { type: 'match.resync.request'; payload: ResyncRequestPayload };

type ServerToClient =
  | { type: 'lobby.snapshot'; payload: LobbySnapshot }
  | { type: 'match.start'; payload: MatchStartPayload }
  | { type: 'match.command.accepted'; payload: AcceptedCommandPayload }
  | { type: 'match.command.rejected'; payload: RejectedCommandPayload }
  | { type: 'match.player.disconnected'; payload: DisconnectPayload }
  | { type: 'match.resync.snapshot'; payload: ResyncSnapshotPayload };
```

### Команда матча

```ts
type MatchCommandPayload = {
  matchId: string;
  playerId: string;
  turn: number;
  commandIndex: number;
  previousStateHash: string;
  command: GameCommand;
  clientTime: number;
};
```

## 15.4. Синхронизация состояния

Каждый конец хода:

```ts
stateHash = sha256(stableSerialize(GameStateWithoutVolatileFields));
```

Если хэши клиентов расходятся:

1. Сервер запрашивает command log.
2. Клиент пересимулирует от последнего snapshot.
3. Если расход сохраняется, матч помечается `desynced`.
4. Игрокам предлагается resync snapshot от host/authoritative server.

## 15.5. Дисконнекты

| Событие | Поведение |
|---|---|
| Игрок отключился в свой ход | таймер pause 180 sec |
| Не вернулся | AI takeover или surrender, по настройкам лобби |
| Отключился не в свой ход | матч продолжается до его хода |
| Reconnect | сервер отправляет command log с последнего known index |
| Host lost | сервер хранит lobby/match, host не нужен |

## 15.6. Рейтинговая система

ELO:

```ts
expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
newRating = rating + K * (score - expected);
```

| Условие | K |
|---|---:|
| первые 20 матчей | 40 |
| обычный игрок | 24 |
| рейтинг > 1800 | 16 |

Score:

| Итог | Score |
|---|---:|
| победа | 1 |
| поражение | 0 |
| ничья/обоюдный выход | 0.5 |

## 15.7. Лобби и матчмейкинг

MVP лобби:

1. Создать комнату.
2. Код комнаты 6 символов.
3. Настройки карты и правил.
4. Ready check.
5. Chat.
6. Spectator slots до 4.

Matchmaking позже:

```ts
matchScore =
  abs(ratingA - ratingB) * 0.7 +
  waitTimePenalty -
  preferredRulesMatchBonus;
```

## 15.8. Observer mode

1. Observer не отправляет game commands.
2. Observer видит:
   - либо весь матч с задержкой 1 ход;
   - либо fog выбранного игрока, если режим tournament.
3. Chat observer отключен в рейтинговых матчах.
4. Replay использует тот же viewer.

---

# 16. Звук и музыка

## 16.1. Источники бесплатных звуков и музыки

| Источник | Что брать | Условия | Ссылка |
|---|---|---|---|
| OpenGameArt | SFX, музыка, ambience | разные свободные лицензии, проверять каждый ассет | [opengameart.org](https://opengameart.org/) |
| Freesound | полевые записи, UI, ambience | фильтровать CC0 или совместимые CC | [freesound.org](https://freesound.org/) |
| Incompetech | музыка | Creative Commons Attribution обычно требует credit | [incompetech.com](https://incompetech.com/music/royalty-free/licenses/) |
| Kenney | UI/SFX packs | CC0 для game assets | [kenney.nl](https://kenney.nl/) |

Политика: для open-source сборки предпочтение CC0 и CC-BY. Для CC-BY обязательно добавлять credit в `public/assets/audio/CREDITS.md` и экран Credits.

## 16.2. Архитектура аудио

```text
GameEvent
  |
  v
AudioProvider
  +-- MusicManager
  +-- SfxManager
  +-- AmbienceManager
  +-- SpatialAudioManager
```

Использовать Web Audio API через Howler.js или собственную тонкую обертку. Для 3D-позиционирования можно использовать `THREE.PositionalAudio`, но глобальный микс лучше держать в Web Audio.

## 16.3. Звуковые события

| Event | SFX | Cooldown |
|---|---|---:|
| `UnitMoved` plains | footstep_grass | 80 ms |
| `UnitMoved` forest | footstep_leaves | 80 ms |
| `UnitMoved` water/river | footstep_mud/water | 100 ms |
| `AttackStarted` melee | weapon_swing | none |
| `DamageApplied` armor | hit_metal | 50 ms |
| `DamageApplied` flesh | hit_soft | 50 ms |
| `UnitKilled` | unit_die | none |
| `CityFounded` | city_found | none |
| `BuildingCompleted` | build_complete | none |
| `TechnologyCompleted` | tech_complete | none |
| `EndTurn` | turn_end | none |
| UI click | ui_click | 30 ms |
| UI error | ui_error | 100 ms |

## 16.4. Музыка по эпохам

| Эпоха | BPM | Инструменты | Настроение |
|---|---:|---|---|
| Примитивы | 70-84 | барабаны, флейта, струнные drones | разведка, выживание |
| Ранняя цивилизация | 78-92 | лютня, легкая перкуссия | рост, открытие |
| Средние века | 82-96 | хор, барабаны, низкие струнные | война, королевство |
| Возрождение | 86-104 | струнные, клавесин, хор | величие, наука |
| Раскол | 60-90 | dark ambient, processed choir | тревога, магия |

Правило перехода: музыка меняется только в начале хода активного игрока или после завершения технологии, с crossfade 4 секунды.

## 16.5. Ambient по террейну

AmbienceManager считает dominant visible biome around camera.

| Террейн/биом | Звук |
|---|---|
| Лес | ветер в листьях, птицы низкой плотности |
| Вода | волны, берег |
| Болото | влажный ambient, насекомые |
| Пустыня | сухой ветер |
| Горы | высокий ветер |
| Руины | низкий drone, редкие каменные скрипы |

## 16.6. 3D позиционирование

| Звук | Spatial | Max distance |
|---|---|---:|
| Удар оружия | да | 12 |
| Выстрел катапульты | да | 18 |
| Магический взрыв | да | 16 |
| Городское строительство | да | 10 |
| UI | нет | none |
| Музыка | нет | none |
| Ambient | частично | camera-based |

---

# 17. Оптимизация

## 17.1. Цели производительности

| Сценарий | Цель |
|---|---:|
| 20x15, Medium, 1080p | 60 fps |
| 36x24, Medium, 1080p | 60 fps |
| 52x36, Low, 1080p | 45 fps |
| End turn AI на 4 игрока | < 1500 ms |
| Path preview | < 16 ms |
| Save game | < 500 ms |
| Load game | < 2000 ms |

## 17.2. Draw call budget

| Категория | Max draw calls Medium |
|---|---:|
| Террейн | 16 |
| Вода | 4 |
| Декорации | 20 |
| Юниты | 40 |
| Здания | 20 |
| Particles | 8 |
| UI world markers | 8 |
| Shadows | x1.5 multiplier |
| Total | <= 140 |

## 17.3. Instanced rendering

1. Один `InstancedMesh` на `modelId + materialId + LOD`.
2. Instance matrices обновляются только при изменении видимости chunk или сезона.
3. Цветовые вариации через `instanceColor`.
4. Ветер через per-instance attribute `windStrength`.

## 17.4. Texture atlas

| Atlas | Размер | Содержит |
|---|---:|---|
| `terrain_atlas.webp` | 2048 | grass, dirt, sand, rock, swamp, ruins |
| `decorations_atlas.webp` | 2048 | bark, leaves, stones |
| `units_shared.webp` | 1024 | базовые материалы humanoid |
| `ui_icons.webp` | 1024 | ресурсные и action icons |
| `particles.webp` | 1024 | smoke, fire, magic, dust |

## 17.5. Web Workers

| Worker | Задачи | Transfer |
|---|---|---|
| `pathfinding.worker` | A*, influence path maps | map arrays, request |
| `ai.worker` | Strategic/Tactical scoring | compact GameState snapshot |
| `mapgen.worker` | генерация карты | config -> generated arrays |
| `simulation.worker` | балансные симуляции | scenario config |

Worker protocol:

```ts
type WorkerRequest<T> = {
  id: string;
  type: string;
  payload: T;
};

type WorkerResponse<T> = {
  id: string;
  ok: boolean;
  payload?: T;
  error?: string;
};
```

## 17.6. Индикаторы производительности

Debug overlay показывает:

1. FPS current/avg/min.
2. Frame time CPU/GPU approximate.
3. Draw calls.
4. Triangles.
5. Geometries/textures count.
6. Visible chunks.
7. Units rendered/culled.
8. Worker timings.
9. Command processing time.
10. Memory estimate.

## 17.7. Загрузка ресурсов

```text
Boot:
  load UI icons, core shaders, terrain textures, placeholder models

New game loading:
  load terrain decorations for selected biome set
  load starting unit models
  load city/building tier 1

During play:
  lazy load newly unlocked unit/building models
  preload next era assets when research progress > 70%
```

## 17.8. Bundle strategy

| Chunk | Содержимое |
|---|---|
| `main` | меню, core UI |
| `game-engine` | engine/rules/hex |
| `game-rendering` | R3F/Three scene |
| `tech-tree` | экран технологий |
| `mapgen-worker` | генерация |
| `ai-worker` | AI |
| `debug-tools` | только development |

Цель initial JS для меню: < 450 KB gzip.  
Цель game route JS: < 1.8 MB gzip без ассетов.  
GLB/texture assets грузятся отдельно.

---

# 18. Доступность и локализация

## 18.1. i18n

Поддерживаемые языки MVP:

1. RU.
2. EN.

Формат ключей:

```ts
export const ru = {
  'unit.hero.name': 'Герой',
  'unit.hero.description': 'Лидер нового королевства.',
  'resource.gold': 'Золото',
  'action.endTurn': 'Завершить ход',
} as const;
```

Правила:

1. В коде нет пользовательских строк напрямую.
2. Все числа форматируются через `Intl.NumberFormat`.
3. Hotkeys не переводятся, но labels переводятся.
4. Для русского поддержать plural forms.

## 18.2. Цветовая слепота

Нельзя полагаться только на цвет.

| Состояние | Цвет | Доп. индикатор |
|---|---|---|
| Доступно | зеленый | check icon |
| Недоступно | серый | lock icon |
| Опасность | красный | triangle icon |
| Выбранный юнит | золото | ring + vertical marker |
| Враг | красный | crossed swords icon |
| Союзник | синий | shield icon |

Colorblind modes изменяют палитру ownership и heatmaps.

## 18.3. Масштабируемость UI

| Настройка | Диапазон |
|---|---:|
| UI scale | 85-135% |
| Font scale | 90-140% |
| Tooltip delay | 0-1000 ms |
| Animation reduction | on/off |
| Camera shake | 0-100% |

Минимальный размер интерактивного элемента: 36x36 px при scale 100%.

## 18.4. Управление с клавиатуры

Игра должна быть полностью проходима без мыши.

1. `Tab` перебирает интерактивные UI элементы.
2. `Arrow keys` перемещают hex cursor.
3. `Enter` выбирает гекс/подтверждает.
4. `Esc` отменяет.
5. `H` центрирует камеру на столице.
6. `N` следующий активный юнит.
7. `C` следующий город.
8. `?` открывает hotkey overlay.

Hex cursor:

```ts
type KeyboardCursor = {
  hex: HexCoord;
  mode: 'inspect' | 'move' | 'attack' | 'build';
};
```

---

# 19. Тестирование и балансировка

## 19.1. Автоматические тесты

| Система | Тесты |
|---|---|
| Hex math | axial/cube conversion, rounding, distance, neighbors |
| Pathfinding | movement costs, blocked terrain, roads, rivers |
| Combat | damage formula snapshots, crit/miss deterministic RNG |
| Economy | income/upkeep, deficit penalties, city growth |
| Research | prerequisites, cost formula, unlocks |
| Fog | visible/explored/lastSeen correctness |
| Mapgen | land ratio, starts balanced, seed reproducibility |
| Save/load | stable serialization, migration |
| Replay | command log produces same stateHash |
| Hotseat | hidden info between players |

## 19.2. Детерминированный replay test

```ts
test('same seed and commands produce same state hash', () => {
  const commands = loadFixture('twenty-turn-war.json');
  const a = runGame({ seed: 'alpha-001', commands });
  const b = runGame({ seed: 'alpha-001', commands });
  expect(hashGameState(a)).toEqual(hashGameState(b));
});
```

## 19.3. Симуляции боев

Для каждой пары юнитов выполнить 10 000 боев с seed sweep.

Метрики:

1. Win rate.
2. Average remaining HP.
3. Average turns to kill.
4. Cost efficiency.
5. Terrain sensitivity.
6. Level scaling.

Балансные цели:

| Matchup | Целевая победа |
|---|---:|
| Копейщик vs Рыцарь на равнине, копейщик fortified | копейщик 55-65% |
| Рыцарь vs Лучник на равнине | рыцарь 70-80% |
| Лучник vs Копейщик без леса | лучник 60-70% |
| Маг vs Мечник | маг 55-65%, если держит дистанцию |
| Разведчик vs Лучник в лесу | разведчик 50-60% |
| Катапульта vs город со стенами | город падает за 4-6 ходов при охране |

## 19.4. Экономические метрики

Собирать на playtest:

| Метрика | Целевой диапазон |
|---|---:|
| Первый новый город | ход 8-14 |
| Первый лучник | ход 10-18 |
| Первая технология эпохи 2 | ход 18-26 |
| Первый рыцарь | ход 35-50 |
| Доход золота на ход к ходу 30 | +8..+22 |
| Количество юнитов к ходу 30 | 6-12 |
| Средняя длина хода игрока | 60-180 sec |

## 19.5. Playtest-сценарии

| Сценарий | Что проверять |
|---|---|
| Первые 20 ходов | понятность UI, скорость освоения, ранняя экономика |
| Ранняя война | counter-система, смертность юнитов, ценность террейна |
| Экспансия | баланс поселенцев, city spacing, snowball |
| Магическая ветка | не ломает ли бой AOE и мана |
| Карта с болотами | не становится ли движение скучным |
| Hotseat 2 игрока | скрытие информации, скорость switch |
| Low-end PC | fps, memory, loading |

## 19.6. Ручной checklist перед релизом alpha

1. Новая игра стартует за < 8 секунд на карте 20x15.
2. Все 8 террейнов визуально различимы без подсказок.
3. Каждый юнит имеет idle/walk/attack/hurt/die.
4. Fog скрывает врагов корректно.
5. Бой показывает прогноз до подтверждения.
6. AI завершает ход без зависаний.
7. Save/load сохраняет состояние боя и fog.
8. Hotseat не показывает ресурсы предыдущего игрока.
9. UI не перекрывает кнопки на 1280x720.
10. Средний fps не ниже 55 на recommended hardware.

---

# 20. Дорожная карта и этапы разработки

## 20.1. Milestone overview

| Milestone | Играбельный результат | Оценка |
|---|---|---:|
| M0 | Технический каркас, пустая 3D карта | 60 ч |
| M1 | Гекс-карта 3D, камера, picking, terrain | 120 ч |
| M2 | Юниты, движение, pathfinding, fog | 140 ч |
| M3 | Бой, анимации, VFX, XP | 160 ч |
| M4 | Города, здания, ресурсы, найм | 170 ч |
| M5 | Технологии, эпохи, UI дерева | 110 ч |
| M6 | Генерация карты, ресурсы, руины | 130 ч |
| M7 | ИИ Normal, нейтральные враги | 170 ч |
| M8 | Hotseat, save/load, replay hash | 110 ч |
| M9 | Оптимизация, звук, доступность, alpha polish | 180 ч |
| Итого | `v0.1-alpha` | 1350 ч |

## 20.2. Детальные этапы

### M0. Каркас проекта

| Задача | Часы | Зависимости |
|---|---:|---|
| Next.js + TypeScript + R3F setup | 12 | none |
| ESLint/Prettier/Vitest/Playwright | 8 | setup |
| Zustand slices skeleton | 8 | setup |
| GameEngine/GameState skeleton | 12 | setup |
| Data config structure | 8 | GameEngine |
| Basic UI shell | 12 | setup |

Результат: открывается `/game`, есть пустая сцена, HUD, debug overlay.

### M1. 3D гекс-карта

| Задача | Часы |
|---|---:|
| Hex math implementation + tests | 16 |
| Terrain typed arrays | 12 |
| Hex geometry generation | 24 |
| Terrain materials + colors | 20 |
| CameraRig pan/zoom/rotate | 16 |
| Picking hex raycaster | 16 |
| Grid/highlight/path preview base | 12 |
| Minimap v1 | 4 |

Результат: статическая карта 20x15 с 8 террейнами, камера и выделение гекса.

### M2. Движение и fog

| Задача | Часы |
|---|---:|
| ECS entity/component storage | 20 |
| Unit data configs | 12 |
| UnitLayer GLB placeholders | 20 |
| A* pathfinding | 22 |
| MovementSystem | 18 |
| Movement animation | 16 |
| VisionSystem/fog arrays | 20 |
| FogLayer shader | 12 |

Результат: юниты ходят по карте, path preview учитывает террейн, fog работает.

### M3. Бой

| Задача | Часы |
|---|---:|
| Combat rules + tests | 26 |
| Attack command validation | 12 |
| Combat forecast UI | 18 |
| Unit animation state machine | 24 |
| Projectiles | 16 |
| Particle effects | 20 |
| XP/levels/perks | 20 |
| Death/removal flow | 12 |
| Combat sound hooks | 12 |

Результат: melee/ranged/magic/siege атаки, XP, уровни, визуальные попадания.

### M4. Города и экономика

| Задача | Часы |
|---|---:|
| City components/systems | 24 |
| Found city flow | 14 |
| Building configs | 16 |
| Production queue | 22 |
| Resource income/upkeep | 24 |
| Recruitment flow | 20 |
| City UI | 28 |
| Improvements/builders | 22 |

Результат: можно основать город, строить здания, нанимать юниты, получать ресурсы.

### M5. Технологии

| Задача | Часы |
|---|---:|
| Tech data configs 37 techs | 14 |
| ResearchSystem | 16 |
| Unlock integration | 20 |
| TechTreeScreen | 34 |
| Era transitions | 10 |
| Tech notifications | 8 |
| Tests | 8 |

Результат: технологии исследуются, открывают здания/юниты/бонусы.

### M6. Генерация карты

| Задача | Часы |
|---|---:|
| Seeded noise | 14 |
| Terrain classification | 18 |
| River generation | 24 |
| Resource placement | 18 |
| Ruins/POI | 14 |
| Starting position balancing | 22 |
| Map validation/regeneration | 12 |
| Mapgen worker | 8 |

Результат: новая карта создается по seed, стартовые позиции сбалансированы.

### M7. ИИ

| Задача | Часы |
|---|---:|
| Influence maps | 24 |
| Tactical scoring | 34 |
| Behavior tree runner | 18 |
| Strategic planner | 34 |
| Economy planner | 22 |
| Research planner | 14 |
| AI worker integration | 12 |
| Difficulty modifiers | 8 |
| AI playtest tuning | 4 |

Результат: AI строит города, нанимает армию, атакует и защищается на Normal.

### M8. Hotseat и сохранения

| Задача | Часы |
|---|---:|
| Stable serialization | 16 |
| Prisma SQLite save/load | 18 |
| Command log/replay hash | 20 |
| Hotseat switch screen | 16 |
| Per-player fog persistence | 14 |
| Autosave | 8 |
| LoadGameScreen | 10 |
| Integration tests | 8 |

Результат: локальные сохранения, Hotseat 2-4 игрока, replay deterministic.

### M9. Alpha polish

| Задача | Часы |
|---|---:|
| Asset replacement pass | 30 |
| Audio/music integration | 24 |
| Performance profiling | 28 |
| LOD/instancing optimization | 30 |
| Accessibility settings | 18 |
| Localization RU/EN | 18 |
| Tutorial-lite onboarding via objectives | 12 |
| Bug fixing/playtest | 20 |

Результат: `v0.1-alpha`, которую можно дать внешним тестерам.

## 20.3. Зависимости

```text
M0 -> M1 -> M2 -> M3
          -> M6 -> M7
M2 -> M4 -> M5
M4 + M5 + M7 -> M8
M1..M8 -> M9
```

## 20.4. Приоритеты

### Критично

1. Детерминированный engine.
2. Гекс-математика и pathfinding.
3. Разделение логики и рендера.
4. Fog of war.
5. Save/load.
6. Combat forecast.
7. Performance на 20x15.

### Желательно

1. Полная анимация всех юнитов.
2. Красивые transitions UI.
3. Богатые particle effects.
4. Несколько типов карт.
5. Observer/replay viewer.

### Опционально для alpha

1. Онлайн-мультиплеер.
2. Рейтинги.
3. Naval units.
4. Сложная дипломатия.
5. Погодные эффекты с влиянием на геймплей.

---

# 21. Риски и решения

## 21.1. Технические риски

| Риск | Вероятность | Влияние | Решение |
|---|---:|---:|---|
| Three.js performance падает из-за множества объектов | высокая | высокое | instancing, chunks, LOD, draw call budget с M1 |
| React re-render ломает FPS | средняя | высокое | R3F components memo, selectors, engine snapshot versioning |
| Bundle становится слишком большим | средняя | среднее | route splitting, lazy assets, GLB compression |
| Десинхрон в мультиплеере | высокая | высокое | deterministic RNG, command log, stateHash tests с M0 |
| Pathfinding тормозит при больших картах | средняя | среднее | worker, cache influence maps, A* bounds |
| Fog shader дорогой | средняя | среднее | texture mask per player, update only changed chunks |
| Asset pipeline хаотичный | высокая | среднее | asset manifest, naming rules, LICENSES.md |
| SQLite save миграции ломают сейвы | средняя | среднее | versioned save migrations, integration tests |

## 21.2. Геймдизайнерские риски

| Риск | Вероятность | Влияние | Решение |
|---|---:|---:|---|
| Snowball от ранних городов | высокая | высокое | empireSizePenalty, unrest, tech cost scaling |
| Лейтгейм скучный | средняя | высокое | ветки победы Раскола, чудеса, кризисы разлома |
| Маги слишком сильные | высокая | среднее | мана, cooldown, friendly fire, низкая HP |
| Катапульты доминируют | средняя | среднее | minimum range, cannot move+fire, слабая DEF |
| Террейн неважен | средняя | высокое | defense/move/height modifiers, combat forecast |
| AI кажется нечестным | средняя | высокое | показывать difficulty bonuses, не давать hidden vision на Normal |
| Много микроменеджмента | средняя | среднее | auto-work tiles, production recommendations, next unit |
| Игрок не понимает прогноз боя | средняя | высокое | подробный breakdown modifiers в tooltip |

## 21.3. Производственные риски

| Риск | Вероятность | Влияние | Решение |
|---|---:|---:|---|
| Объем проекта слишком большой | высокая | высокое | жесткий scope alpha, milestones с playable result |
| Не хватает 3D ассетов одного стиля | высокая | среднее | выбрать 1-2 основных источника CC0, перекрашивать материалы |
| Баланс требует много времени | высокая | среднее | simulation worker, telemetry playtests |
| UI перегружен | средняя | среднее | progressive disclosure, контекстные панели |
| Online server на VPS слабый | средняя | среднее | relay commands, не симулировать heavy AI на сервере в MVP |

## 21.4. Критерии готовности alpha

Alpha считается готовой, если:

1. Матч 2 игрока Hotseat на карте 20x15 можно закончить победой.
2. Есть минимум 12 цивилизационных юнитов и 3 нейтральных/вражеских.
3. Есть 8 террейнов, 12 зданий, 30+ технологий.
4. Есть save/load и deterministic replay hash.
5. ИИ Normal умеет основать второй город и атаковать игрока.
6. FPS на recommended hardware держится 60 fps в 90% времени.
7. Все ассеты имеют записанную лицензию.
8. RU и EN локализации покрывают весь UI.

---

# Приложение A. Минимальные TypeScript-контракты

```ts
export type PlayerId = string;
export type EntityId = string;
export type CityId = string;
export type TerrainTypeId =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'water'
  | 'desert'
  | 'swamp'
  | 'hills'
  | 'ruins';

export type ResourceId =
  | 'gold'
  | 'food'
  | 'wood'
  | 'stone'
  | 'iron'
  | 'mana'
  | 'progress'
  | 'science';

export type ResourceYield = Partial<Record<ResourceId, number>>;

export type GameState = {
  version: number;
  seed: string;
  turn: number;
  activePlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
  map: SerializedMapStorage;
  entities: EntityState;
  cities: Record<CityId, CityState>;
  diplomacy: DiplomacyState;
  commandLogHash: string;
};
```

# Приложение B. Источники, проверенные для рекомендаций ассетов

1. Quaternius: [официальная библиотека free low-poly 3D models](https://quaternius.com/).
2. Kay Lousberg / KayKit: [каталог game assets](https://kaylousberg.com/game-assets), включая паки с GLTF/FBX и CC0 на страницах конкретных наборов.
3. Kenney: [официальный сайт](https://kenney.nl/) и [support/license FAQ](https://kenney.nl/support) с указанием CC0 для game assets.
4. Sketchfab: [free 3D models](https://sketchfab.com/features/free-3d-models) и [license page](https://sketchfab.com/licenses). Для каждого ассета проверять конкретную лицензию.
5. OpenGameArt: [каталог](https://opengameart.org/) и [FAQ по лицензиям](https://opengameart.org/content/faq).
6. Freesound: [FAQ](https://freesound.org/help/faq/) о Creative Commons-звуках.
7. Incompetech: [страница лицензий](https://incompetech.com/music/royalty-free/licenses/) для музыки Kevin MacLeod.

# Приложение C. Дополнения к спецификации

Этот блок добавляет недостающие системы без переписывания существующих разделов. Если дополнение уточняет уже указанное значение, это явно отмечено строкой `Изменение/уточнение`.

## 1. [ДОПОЛНЕНИЕ] Условия победы и поражения

### 1.1. Настройки побед при создании игры

Каждый тип победы включается отдельным флагом в `NewGameScreen`. По умолчанию для `v0.1-alpha` включены все победы, кроме Score Victory.

```ts
type VictoryRulesConfig = {
  domination: boolean;   // default true
  science: boolean;      // default true
  riftSeal: boolean;     // default true
  wonders: boolean;      // default true
  score: boolean;        // default false, auto-enabled if turnLimit > 0
  turnLimit: number;     // 0 means no limit, default 300
  allowContinueAfterWin: boolean; // default true
};
```

| Настройка | Значение по умолчанию | Диапазон |
|---|---:|---:|
| Domination Victory | on | on/off |
| Science Victory | on | on/off |
| Rift Seal Victory | on | on/off |
| Wonders Victory | on | on/off |
| Score Victory | off | on/off |
| Turn Limit | 300 | 0, 150, 200, 300, 500 |
| Continue After Win | on | on/off |

Если игрок отключил все типы побед и `turnLimit = 0`, кнопка `Start Game` блокируется с ошибкой: `Нужно включить хотя бы одно условие победы или лимит ходов`.

### 1.2. Domination Victory

Domination Victory означает военное подчинение всех major players.

```ts
dominationWin =
  enabled &&
  activeMajorPlayers
    .filter(p => p.id !== candidatePlayerId)
    .every(enemy =>
      candidate.controlsCapitalOf(enemy.id) ||
      enemy.isEliminated
    ) &&
  candidate.ownCapitalControlledBySelf &&
  holdCounter >= requiredHoldTurns;
```

| Размер карты | Игроки | Требование | Hold turns |
|---|---:|---|---:|
| 20x15 | 2 | захватить столицу противника | 3 |
| 28x18 | 2 | захватить столицу противника | 3 |
| 36x24 | 3-4 | контролировать столицы всех противников | 4 |
| 52x36 | 5-6 | контролировать столицы всех противников | 5 |

Дополнительное правило на случай уничтожения столицы:

```ts
if originalCapitalDestroyed:
  substituteCapital = largestRemainingCityByPopulation;
```

Если у противника нет городов и нет поселенцев, он считается eliminated.

### 1.3. Science Victory

Science Victory отражает восстановление знаний древнего мира без использования нестабильной силы Разлома.

Требования:

1. Исследовать технологию `rationalism`.
2. Исследовать минимум 30 технологий из 37.
3. Построить `university` минимум в 2 городах.
4. Построить `astral_observatory` минимум в 1 городе.
5. Выполнить проект `great_codex`.

Проект `great_codex`:

| Параметр | Значение |
|---|---:|
| Требование | `rationalism`, `astral_observatory` |
| Стоимость | 650 science progress |
| Производится | глобально, накапливает 100% science/turn |
| Минимальное время | 6 ходов |
| Максимальный вклад overflow | 150 science/turn |
| Прерывается войной? | нет |
| Победа | в начале следующего хода после завершения |

Формула прогресса:

```ts
greatCodexProgress += clamp(player.sciencePerTurn, 0, 150);
scienceVictoryReady = greatCodexProgress >= 650;
```

Пример:

```text
Игрок имеет 72 science/turn.
650 / 72 = 9.03.
Проект завершится за 10 ходов.
Если через 4 хода science выросла до 96, остаток пересчитывается автоматически.
```

### 1.4. Rift Seal Victory

Rift Seal Victory означает закрытие Разлома через магию, контроль маны и защиту ритуалов.

Требования:

1. Исследовать `riftStudies`.
2. Исследовать `manaConduits`.
3. Исследовать `riftContainment`.
4. Контролировать минимум 3 источника маны.
5. Иметь доход маны минимум `+12/turn`.
6. Построить `wonder_astral_gate`.
7. Провести 4 этапа ритуала `seal_the_rift`.

Этапы ритуала:

| Этап | Название | Стоимость | Длительность | Риск |
|---|---|---:|---:|---|
| 1 | Стабилизация контура | 80 маны | 3 хода | spawn 1 cultist camp |
| 2 | Связывание проводников | 120 маны | 4 хода | -10% science на время |
| 3 | Запечатывание створок | 160 маны | 5 ходов | атака культистов на ближайший город |
| 4 | Последняя печать | 220 маны | 6 ходов | все враги видят город с Вратами |

Ритуал прерывается, если город с `wonder_astral_gate` захвачен. Прогресс текущего этапа теряется, завершенные этапы сохраняются.

### 1.5. Wonders Victory

Wonders Victory означает культурно-историческое превосходство.

```ts
requiredWonders = clamp(Math.ceil(totalEnabledWorldWonders * 0.45), 3, 5);
requiredPrestige = 80 + playerCount * 15;
```

Для `v0.1-alpha`, где 4 чуда света, требуется:

| Параметр | Значение |
|---|---:|
| Построить чудес света | 3 |
| Накопить prestige | 110 для 2 игроков |
| Удерживать чудеса после объявления | 5 ходов |

Prestige:

```ts
prestige =
  builtWorldWonders * 30 +
  completedEras * 8 +
  capitalPopulation * 2 +
  controlledRuins * 3 +
  activeTradeRoutes * 2;
```

Пример:

```text
Игрок построил 3 чуда: 90 prestige.
Столица население 8: +16.
Контролирует 2 руины: +6.
Итого 112. Для 2 игроков порог 110, условие выполнено.
Победа наступит, если игрок удержит 3 чуда 5 ходов.
```

### 1.6. Score Victory и лимит ходов

Изменение/уточнение: лимит ходов существует, но по умолчанию не завершает игру, если `Score Victory = off`. При `Score Victory = on` стандартный лимит равен 300 ходам.

Score считается в конце последнего хода:

```ts
score =
  cityScore +
  populationScore +
  techScore +
  militaryScore +
  wonderScore +
  economyScore +
  explorationScore;

cityScore = cityCount * 40;
populationScore = totalPopulation * 8;
techScore = completedTechs * 12;
militaryScore = floor(totalArmyPower * 0.6);
wonderScore = worldWonders * 70;
economyScore = floor((goldIncome + scienceIncome + manaIncome * 3) * 2);
explorationScore = floor(exploredHexes / totalHexes * 100);
```

При равенстве score побеждает игрок с большим числом столиц под контролем. Если и это равно, побеждает игрок с большим science/turn.

### 1.7. Условия поражения

| Поражение | Условие | Применяется |
|---|---|---|
| Elimination | нет городов, нет поселенцев, нет героя | всегда |
| Capital Collapse | столица потеряна и не возвращена за 12 ходов | если включено в настройках |
| Hero Death | герой погиб | только режим `Iron Crown` |
| Surrender | игрок нажал surrender и подтвердил | всегда |
| Desync Forfeit | игрок в ranked online не смог восстановить состояние 3 раза | online ranked |
| Timeout | игрок пропустил 3 таймера подряд | online timed |

Для Hotseat пораженный игрок больше не получает ходов, но его города остаются на карте как occupied/ruins в зависимости от способа поражения.

### 1.8. UI прогресса победы

`VictoryPanel` доступна из HUD кнопкой с иконкой лаврового венка.

| Элемент UI | Содержимое |
|---|---|
| Victory tabs | Domination, Science, Rift Seal, Wonders, Score |
| Progress bar | процент выполнения текущего условия |
| Checklist | конкретные незавершенные требования |
| Rival progress | виден только по исследованной информации или дипломатическим данным |
| Warning banner | появляется, если соперник в 10 ходах от победы |

Пример строки:

```text
Rift Seal: 5/7 требований
[x] Rift Studies
[x] Mana Conduits
[ ] Rift Containment
[x] 3 mana sources
[x] +12 mana/turn
[x] Astral Gate
[ ] Ritual stage 2/4
```

### 1.9. Победа в Hotseat

Последовательность:

```text
1. Победная команда/условие применяется в конце команды или начале хода.
2. Экран карты скрывается затемнением.
3. Показывается VictoryScreen только с именем победителя и типом победы.
4. Игроки подтверждают общий просмотр итогов.
5. Открывается MatchSummaryScreen со статистикой всех игроков.
6. Можно выбрать:
   - Continue as sandbox
   - Save replay
   - Return to menu
```

В Hotseat нельзя показывать скрытую информацию до общего подтверждения итогов.

## 2. [ДОПОЛНЕНИЕ] Система маны как ресурса

### 2.1. Появление маны по эпохам

Мана физически присутствует на карте с начала игры, но не полностью доступна игроку.

| Эпоха | Видимость маны | Добыча | Использование |
|---|---|---|---|
| Примитивы | скрыта, кроме наград руин | одноразовые награды руин | нельзя тратить, cap 10 после `rituals` |
| Ранняя цивилизация | видна как `strange crystal` после `rituals` | храм +1, руины | храмовые эффекты |
| Средние века | полностью видна после `arcaneTheory` | мана-фокус, башня магов | маги, Rune Burst |
| Возрождение | видна и оценивается AI | conduits, лаборатория | паладины, чудеса |
| Раскол | стратегический ключевой ресурс | high-yield nodes | Rift Seal |

Изменение/уточнение: мана не должна быть полностью мертвым ресурсом до Средних веков. После `rituals` игрок получает малый cap и может копить награды, но стабильная добыча появляется позже.

### 2.2. Максимальный запас маны

```ts
manaCap =
  baseCapByEra +
  templeCount * 4 +
  mageTowerCount * 10 +
  alchemistLabCount * 12 +
  controlledManaSources * 8 +
  technologyManaCapBonus;
```

| Условие | Base cap |
|---|---:|
| Нет `rituals` | 0 |
| `rituals` изучены | 10 |
| `arcaneTheory` изучена | 40 |
| Возрождение достигнуто | 70 |
| Раскол достигнут | 110 |

Technology cap bonuses:

| Технология | Бонус |
|---|---:|
| `arcaneTheory` | +20 |
| `alchemy` | +20 |
| `manaConduits` | +40 |
| `riftContainment` | +30 |

### 2.3. Формула дохода маны

```ts
manaIncome =
  baseManaIncome +
  terrainManaIncome +
  buildingManaIncome +
  improvementManaIncome +
  technologyManaIncome +
  wonderManaIncome -
  ritualMaintenance;
```

| Источник | Условие | Мана/ход |
|---|---|---:|
| Base | нет | 0 |
| Храм | `rituals` | +1 |
| Башня магов | `arcaneTheory` | +1 |
| Лаборатория алхимика | `alchemy` | +2 |
| Мана-фокус | кристалл маны улучшен | +2 |
| Руины под контролем | после `rituals` | +1 за 2 руины, округление вниз |
| Древо Мира | чудо | +2 |
| Астральные Врата | чудо | +4 |
| `manaConduits` | технология | +25% к gross mana |
| Этап Rift Seal | активный ритуал | -2, -3, -4, -5 по этапам |

Пример:

```text
Игрок имеет:
2 храма = +2
1 башню магов = +1
1 лабораторию = +2
2 мана-фокуса = +4
3 контролируемые руины = floor(3 / 2) = +1
Астральные Врата = +4
Gross = 14
manaConduits = +25% => floor(14 * 1.25) = 17
Активен этап 3 ритуала: -4
Net mana = +13/ход
```

### 2.4. Добыча маны до Башни Магов

До `mage_tower` доступны только малые источники:

| Способ | Требование | Количество |
|---|---|---:|
| Награда малых руин | разведчик/герой исследует POI | +2..+5 one-time |
| Обелиск | POI | +1/ход на 10 ходов |
| Храм | `rituals` | +1/ход |
| Контроль 2 руин | `rituals` | +1/ход |
| Wonder `sun_obelisk` | `rituals` | +1/ход |

Магические боевые способности до `arcaneTheory` недоступны, поэтому ранняя мана является подготовительным ресурсом.

### 2.5. Стоимость способностей в мане

| Способность | Юнит/источник | Стоимость | Cooldown |
|---|---|---:|---:|
| `Arcane Bolt` | маг | 0 | нет |
| `Rune Burst` | маг | 1 | 3 хода |
| `Arcane Shield` | маг, после `alchemy` | 2 | 4 хода |
| `Cleanse` | паладин | 1 | 4 хода |
| `Guarding Light Overcharge` | паладин | 2 | 5 ходов |
| `Rally` | герой | 0 | 5 ходов |
| `Rift Pulse` | Астральные Врата | 4 | 6 ходов |
| `Seal Ritual Stage 1` | проект | 80 total | 3 хода |
| `Seal Ritual Stage 2` | проект | 120 total | 4 хода |
| `Seal Ritual Stage 3` | проект | 160 total | 5 ходов |
| `Seal Ritual Stage 4` | проект | 220 total | 6 ходов |

### 2.6. Мана и Rift Seal Victory

Rift Seal требует не только накопить ману, но и выдерживать положительный доход.

```ts
canStartRiftStage =
  player.manaStockpile >= stage.startCost &&
  player.manaPerTurn >= stage.requiredManaPerTurn &&
  player.controlsManaSources >= 3;
```

| Этап | Start cost | Требуемый доход |
|---|---:|---:|
| 1 | 80 | +8/ход |
| 2 | 120 | +10/ход |
| 3 | 160 | +12/ход |
| 4 | 220 | +15/ход |

Если доход маны падает ниже требования во время этапа, этап не отменяется, но прогресс замедляется:

```ts
ritualProgressPerTurn =
  player.manaPerTurn >= required
    ? 1.0
    : clamp(player.manaPerTurn / required, 0.25, 0.9);
```

## 3. [ДОПОЛНЕНИЕ] Naval units и морская система

### 3.1. Статус системы

Naval gameplay не входит в обязательный scope `v0.1-alpha`, но архитектура должна поддерживать:

1. `domain: 'land' | 'naval' | 'air' | 'embarked'`.
2. Разные movement cost для воды и суши.
3. Порты как точки строительства и посадки.
4. Морской бой и транспортировку сухопутных юнитов.

### 3.2. Морские технологии

Изменение/уточнение: существующие технологии `sailing` и `navigation` уже есть. Для полноценной морской ветки после alpha нужно добавить 3 технологии в data configs, не меняя текущий alpha-граф.

| ID | Название | Эпоха | Пререквизиты | Эффекты |
|---|---|---|---|---|
| `sailing` | Мореплавание | Ранняя цивилизация | `mapping` | гавань, embark на coast, лодка |
| `shipbuilding` | Кораблестроение | Средние века | `sailing`, `engineering` | галера, транспорт, ремонт в порту |
| `cartography` | Морские карты | Возрождение | `navigation`, `shipbuilding` | каравелла, ocean movement |
| `navalArtillery` | Морская артиллерия | Раскол | `machinery`, `cartography` | линейный корабль, bombard coast |

### 3.3. Типы водных гексов

| Тип | Условие генерации | Move |
|---|---|---:|
| Coast | вода рядом с сушей | доступно с `sailing` |
| Lake | waterbody не соединен с краем карты | доступно с `sailing` |
| Sea | waterbody соединен с краем, distance to land <= 4 | доступно с `shipbuilding` |
| Ocean | distance to land > 4 | доступно с `cartography` |

Для карты 20x15 Ocean не генерируется, только Coast/Lake/Sea.

### 3.4. Морские юниты

| ID | Название | Domain | HP | ATK | DEF | MOV | Range | Cost | Upkeep | Tech |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `boat` | Лодка | naval | 55 | 8 | 5 | 3 | 1 | 40 дерево, 20 золото | 1 золото | `sailing` |
| `galley` | Галера | naval | 85 | 15 | 10 | 4 | 1 | 80 дерево, 50 золото | 2 золота | `shipbuilding` |
| `transport` | Транспорт | naval | 90 | 4 | 8 | 4 | 1 | 100 дерево, 40 золото | 2 золота | `shipbuilding` |
| `caravel` | Каравелла | naval | 105 | 18 | 12 | 5 | 2 | 120 дерево, 90 золото | 3 золота | `cartography` |
| `warship` | Линейный корабль | naval | 145 | 28 | 16 | 4 | 3 | 160 дерево, 80 железо, 140 золото | 5 золота | `navalArtillery` |

### 3.5. Embark и транспортировка

Есть два режима:

1. **Embarked unit**: сухопутный юнит временно превращается в слабую лодку.
2. **Transport ship**: отдельный naval unit перевозит 2-4 сухопутных юнита.

Embark:

| Параметр | Значение |
|---|---:|
| Требование | `sailing`, гекс coast рядом с land |
| Стоимость посадки | весь остаток movement |
| MOV на воде | 2 до `shipbuilding`, 3 после |
| ATK | 0 |
| DEF multiplier | 0.45 от базового DEF |
| Получаемый ranged damage | x1.35 |
| Высадка | весь остаток movement |

Transport capacity:

| Юнит | Capacity |
|---|---:|
| `transport` | 3 land units |
| `caravel` | 1 land unit |
| `warship` | 1 land unit |

### 3.6. Морской бой

Морская формула использует общую combat formula, но добавляет wave и boarding modifiers.

```ts
navalOffense =
  baseOffense *
  windModifier *
  rangeBandModifier *
  coastalSupportModifier *
  veteranCrewModifier;

navalDefense =
  baseDefense *
  waterTypeModifier *
  portDefenseModifier *
  weatherDefenseModifier;
```

| Модификатор | Условие | Значение |
|---|---|---:|
| Coast support | союзный порт в радиусе 3 | +10% DEF |
| Shallow waters | coast/lake | лодка/галера +10% ATK |
| Open sea | sea/ocean | лодка -15% DEF |
| Boarding | melee naval против transport | +35% ATK |
| Storm | weather enabled | ranged naval -20% accuracy |
| Port repair | юнит в порту | +15 HP/ход |

### 3.7. Порт и гавань

Существующее здание `harbor` получает будущую naval-функцию.

| Механика | Значение |
|---|---|
| Постройка кораблей | только город с `harbor` на coast |
| Repair | naval units в городе/порту лечатся +15 HP/ход |
| Embark discount | посадка рядом с harbor не тратит attack action |
| Trade route | coast route +3 золота, +1 еда |
| Naval supply | каждый harbor дает free naval upkeep для 2 кораблей |
| Blockade | вражеский naval unit рядом с harbor снижает trade на 50% |

### 3.8. Архитектурные поля для будущего

```ts
type UnitDomain = 'land' | 'naval' | 'embarked' | 'air';

type MovementProfile = {
  domain: UnitDomain;
  canEnterTerrain: TerrainTypeId[];
  waterAccess: 'none' | 'coast' | 'sea' | 'ocean';
  embarkState?: {
    originalUnitId: EntityId;
    turnsAtSea: number;
  };
};
```

## 4. [ДОПОЛНЕНИЕ] Дипломатия, нейтральные лагеря и фракции

### 4.1. Типы neutral factions

| Фракция | Тип | Отношение к игроку | Отношение к другим |
|---|---|---|---|
| `goblin_clans` | organized hostile | Hostile by default | воюют с free cities, нейтральны к волкам |
| `wild_beasts` | wildlife | Aggressive if approached | атакуют всех humanoid |
| `bandit_league` | raiders | Suspicious | торгуют с гоблинами, грабят города |
| `rift_cult` | late hostile | Hidden -> Hostile | союзны между собой, враждебны всем |
| `free_cities` | neutral settlements | Neutral | обороняются, торгуют, боятся культистов |
| `ancient_wardens` | ruins guardians | Dormant | не двигаются далеко от POI |

### 4.2. Репутация

Репутация хранится отдельно по каждой neutral faction.

```ts
reputation: Record<NeutralFactionId, number>; // -100..+100
```

| Диапазон | Состояние | Эффект |
|---|---|---|
| -100..-61 | Blood Feud | атакуют при виде, trade запрещен |
| -60..-21 | Hostile | лагеря спавнят рейды |
| -20..+19 | Neutral | не атакуют вне радиуса угрозы |
| +20..+59 | Respect | доступен trade/parley |
| +60..+100 | Alliance | лагеря дают quests, могут прислать помощь |

Изменения репутации:

| Действие | Репутация |
|---|---:|
| Уничтожить лагерь фракции | -25 |
| Захватить neutral city | -35 к free cities |
| Выполнить quest | +20 |
| Заплатить tribute | +10, cooldown 10 ходов |
| Торговать 5 ходов подряд | +5 |
| Убить культистов рядом с free city | +15 к free cities |
| Подкупить бандитов для рейда | -10 к free cities, +15 к bandits |

### 4.3. Нейтральные лагеря

```ts
type NeutralCamp = {
  id: string;
  factionId: NeutralFactionId;
  hex: HexCoord;
  level: 1 | 2 | 3;
  aggression: number; // 0..100
  tributeCooldownUntilTurn: number;
  spawnProgress: number;
};
```

| Уровень лагеря | HP | Spawn interval | Защита | Награда за уничтожение |
|---|---:|---:|---|---|
| 1 | 80 | 8 ходов | 1 юнит | 35 золота, 10 XP |
| 2 | 130 | 6 ходов | 2 юнита | 60 золота, 20 XP |
| 3 | 190 | 5 ходов | 3 юнита, лидер | 100 золота, relic chance 30% |

### 4.4. Действия с лагерем

| Действие | Требование | Стоимость | Результат |
|---|---|---:|---|
| Attack | лагерь видим | нет | бой |
| Parley | репутация > -40, герой/разведчик рядом | 1 action | открывает варианты |
| Tribute | золото >= цена | 25/50/90 золота | aggression -30, reputation +10 |
| Bribe Raid | bandit only, reputation >= 20 | 80 золота | рейд на выбранного врага через 3 хода |
| Trade | reputation >= 20 | trade goods | разовый обмен |
| Pact | reputation >= 60 | 120 золота | лагерь не атакует 25 ходов |
| Recruit Mercenary | bandit/free city | 100 золота | 1 временный юнит на 15 ходов |

Tribute price:

```ts
tributeCost = 20 + camp.level * 25 + currentEraIndex * 15;
```

### 4.5. Нейтральные города

Free city - это малый город без полноценного дерева технологий.

| Действие | Условие | Результат |
|---|---|---|
| Trade | репутация >= 0 | ресурсный обмен, trade route |
| Quest | раз в 15 ходов | награда reputation/resources |
| Vassalize | репутация >= 70, militaryPower >= cityPower * 1.3 | город платит 25% дохода |
| Annex peacefully | репутация >= 90, 200 золота | город становится вашим, unrest 3 хода |
| Conquer | победить гарнизон | город ваш, unrest 8 ходов, reputation -35 |
| Raze | после захвата | получить 50% storage, reputation -60 |

Free city не строит чудеса и не участвует в победе, пока не annexed.

### 4.6. Торговля с нейтралами

| Фракция | Покупает | Продает |
|---|---|---|
| Goblin clans | еда, железо | золото, разведданные |
| Bandit league | золото | наемники, слухи, украденные ресурсы |
| Free cities | любые ресурсы | еда, stone, trade goods |
| Ancient wardens | relics | science boost, map reveal |

Формула цены:

```ts
neutralTradePrice =
  baseMarketPrice *
  reputationModifier *
  scarcityModifier *
  eraInflation;

reputationModifier = 1.2 - clamp((reputation + 100) / 200, 0, 1) * 0.4;
```

При reputation +100 цена покупки у нейтрала на 20% ниже базовой, при -100 на 20% выше.

## 5. [ДОПОЛНЕНИЕ] Tutorial и onboarding

### 5.1. Первый запуск

При первом запуске игрок видит `FirstRunChoiceScreen`, а не длинный tutorial text.

| Кнопка | Действие |
|---|---|
| Быстрое обучение | запускает фиксированную карту `tutorial-001`, 1 игрок vs нейтралы |
| Новая игра | обычная генерация, подсказки включены |
| Я уже играл | подсказки отключены, можно включить в настройках |

Флаг:

```ts
onboardingState = {
  firstRunCompleted: boolean;
  tutorialHintsEnabled: boolean;
  completedObjectiveIds: string[];
  seenHintIds: string[];
};
```

### 5.2. Обучение через objective chain

Вместо текстовой инструкции используется цепочка коротких целей, подсветка UI и ghost previews.

| Objective ID | Условие завершения | Награда | Что подсвечивается |
|---|---|---:|---|
| `select_hero` | выбрать героя | нет | ring вокруг героя |
| `move_scout` | переместить разведчика на неизвестный гекс | +5 золота | путь и fog boundary |
| `inspect_city` | открыть панель столицы | нет | city center |
| `choose_research` | выбрать технологию | +5 science | кнопка технологий |
| `start_production` | поставить здание/юнита в очередь | +10 дерево | production slot |
| `attack_camp` | атаковать гоблина | +10 XP герою | enemy camp |
| `finish_turn` | завершить ход | нет | End Turn |
| `build_improvement` | начать ферму/лесопилку | +10 еда | worker action |
| `recruit_unit` | нанять первого юнита | -10% cost one-time | recruitment tab |
| `found_second_city` | основать второй город | +1 population столицы | recommended city site |

### 5.3. Первые 5 ходов

| Ход | Цель | Скрытая помощь |
|---|---|---|
| 1 | выбрать героя, разведать, выбрать исследование | первый path preview бесплатный, враги не атакуют |
| 2 | открыть город, начать производство | recommended production помечен звездой |
| 3 | исследовать руины разведчиком | руины в радиусе 4 гарантированы |
| 4 | первый бой с гоблином | гоблин имеет -20% HP на tutorial карте |
| 5 | улучшить гекс строителем | worker начинает рядом с рекомендуемой фермой |

### 5.4. Интерактивные подсказки

```ts
type TutorialHint = {
  id: string;
  trigger: TutorialTrigger;
  anchor: UiAnchor | HexCoord | EntityId;
  displayMode: 'pulse' | 'ghostPath' | 'combatPreview' | 'panelHighlight';
  maxShows: number;
  dismissMode: 'completeAction' | 'manual' | 'timeout';
};
```

| Первое действие | Подсказка |
|---|---|
| Наведение на гекс | показывает yield icons и movement cost |
| Выбор юнита | подсвечивает доступные гексы |
| Наведение атаки | показывает прогноз урона и риск контратаки |
| Открытие города | подсвечивает очередь производства |
| Открытие технологий | подсвечивает доступные технологии |
| Недостаток ресурса | показывает конкретный источник ресурса |

### 5.5. Отключение подсказок

Подсказки отключаются автоматически, если выполнены условия:

```ts
autoDisableTutorial =
  completedCoreObjectives >= 8 ||
  currentTurn >= 25 ||
  playerDisabledHints;
```

Core objectives: первые 8 из таблицы objective chain. После отключения остаются только tooltips и combat forecast.

### 5.6. Обучение без длинных текстовых инструкций

| Система | Метод обучения |
|---|---|
| Движение | ghost path + подсветка затрат движения на каждом гексе |
| Бой | combat forecast, подсветка выгодного фланга |
| Строительство | recommended badge на 1-2 вариантах, остальные доступны |
| Технологии | glowing edge к технологии с полезным unlock |
| Экономика | resource delta fly-up в начале хода |
| Fog | затемнение неизвестного и bright reveal animation |
| Города | worked hex icons появляются при наведении на население |

Текст допускается только в tooltip и objective label до 90 символов.

## 6. [ДОПОЛНЕНИЕ] Стартовый состав игрока

### 6.1. Стартовый preset `standard_alpha`

Изменение/уточнение: для `v0.1-alpha` стандартный старт начинается с уже основанной столицы. Поселенец не выдается по умолчанию, чтобы второй город появлялся через экономическое решение, а не в первый ход.

| Элемент | Количество | Позиция |
|---|---:|---|
| Столица уровня 1 | 1 | стартовый гекс `S` |
| Герой | 1 | сосед `dir 0` от столицы |
| Копейщик | 2 | соседи `dir 2` и `dir 4` |
| Разведчик | 1 | сосед `dir 1` |
| Строитель | 1 | сосед `dir 3` |
| Поселенец | 0 | нанимается после старта |

Если выбран гекс занят/заблокирован, юнит ставится на ближайший валидный гекс по BFS радиусом до 3.

```text
        Scout
    Spear   Hero
       Capital
    Worker  Spear
```

### 6.2. Стартовый preset `expansion_test`

Для внутренних playtest-карт можно включить ускоренный старт.

| Элемент | Количество |
|---|---:|
| Столица | 1 |
| Герой | 1 |
| Копейщик | 2 |
| Разведчик | 1 |
| Строитель | 1 |
| Поселенец | 1 |

Поселенец стартует на `dir 5`, а ближайший копейщик считается его охраной. Этот preset нельзя использовать в ranked online.

### 6.3. Стартовые ресурсы

| Ресурс | Standard alpha | Expansion test |
|---|---:|---:|
| Золото | 90 | 70 |
| Еда | 35 | 25 |
| Дерево | 45 | 35 |
| Камень | 20 | 15 |
| Железо | 0 | 0 |
| Мана | 0 | 0 |
| Наука stored | 0 | 0 |
| Очки прогресса stored | 0 | 0 |

### 6.4. Стартовые технологии

| Технология | Статус | Причина |
|---|---|---|
| `settlement` | researched | столица уже основана, unlock поселенцев |
| `toolmaking` | researched | стартовый строитель и improvements |
| `tracking` | researched | стартовый разведчик |
| `bronzeWorking` | not researched | новые копейщики требуют исследования |
| `agriculture` | not researched | первый экономический выбор |
| `rituals` | not researched | ранний путь к мане |

Стартовые копейщики являются legacy militia: они существуют на карте, но новых копейщиков нельзя нанимать до `bronzeWorking`.

### 6.5. Стартовые здания

Изменение/уточнение: замок не является стартовым полноценным зданием. Визуальный деревянный keep входит в модель `city_center`, но gameplay-эффекты `castle` не активны.

| Здание | Статус на старте |
|---|---|
| `city_center` | построено |
| `castle` | не построено |
| `barracks` | не построено |
| `library` | не построено |
| `granary` | не построено |

Стартовый `city_center` получает уточненный alpha-доход:

| Доход | Значение |
|---|---:|
| Золото | +2 |
| Еда | +2 |
| Наука | +3 |
| Прогресс | +1 |

Причина изменения: без базовой науки игрок не может начать исследование до библиотеки, что ломает первые 10 ходов.

## 7. [ДОПОЛНЕНИЕ] Система статусов и эффектов

### 7.1. Общий формат статуса

```ts
type StatusEffect = {
  id: StatusEffectId;
  sourceEntityId?: EntityId;
  sourcePlayerId?: PlayerId;
  durationTurns: number;
  stacks: number;
  appliedTurn: number;
  tags: StatusTag[];
};
```

| Правило | Значение |
|---|---|
| Максимум одинаковых stack | 3, если статус stackable |
| Refresh | повторное наложение обновляет duration |
| Tick timing | начало хода владельца цели |
| Cleanse timing | до poison/burn tick |
| UI | максимум 6 иконок, остальные в tooltip |

### 7.2. Полный список статусов

| ID | Тип | Длительность | Stacks | Эффект | Источник | Снятие |
|---|---|---:|---:|---|---|---|
| `fortified` | buff | пока не двинется | нет | +20% DEF | действие Fortify | движение/атака |
| `brace` | buff | 1 ход | нет | +35% DEF против charge | копейщик | начало следующего хода |
| `commanded` | buff aura | dynamic | нет | +10% ATK/DEF | герой radius 2 | выйти из радиуса |
| `guarded_light` | buff aura | dynamic | нет | +15% DEF | паладин рядом | выйти из радиуса |
| `inspired` | buff | 2 хода | нет | +10% XP gain, +5% crit | герой Rally | duration |
| `shielded` | buff | 2 хода | нет | -25% входящего ranged/magic | Arcane Shield | duration/dispel |
| `poisoned` | debuff dot | 3 хода | да | 4 damage/stack/turn, healing -25% | болото, культист, ядовитые руины | Cleanse, temple |
| `burning` | debuff dot | 2 хода | да | 6 damage/stack/turn, DEF -5% | fire VFX, catapult fire upgrade | вода, дождь, Cleanse |
| `cursed` | debuff magic | 2 хода | нет | -10% DEF, DoT +20% | культист | Cleanse, temple |
| `slowed` | debuff | 1 ход | нет | MOV -1, минимум 1 | болото, chilled | duration |
| `stunned` | debuff | 1 ход | нет | нельзя атаковать, MOV = 0 | siege critical, Rift Pulse | Cleanse не снимает |
| `bleeding` | debuff dot | 2 хода | да | 3 damage/stack при движении на гекс | wolf, bandit | лечение 10+ HP |
| `concealed` | stealth | пока не атакует | нет | не виден дальше 2 гексов | разведчик в лесу | атака/adjacent enemy |
| `wet` | neutral | 2 хода | нет | immune to burning, lightning risk future | дождь, река | duration |
| `exhausted` | neutral | до начала хода | нет | нельзя counterattack | после counterattack/ability | начало хода |
| `unrest` | city debuff | 3-8 ходов | нет | -50% yields | захват города | duration, garrison |

### 7.3. Взаимодействия статусов

| Комбинация | Результат |
|---|---|
| `wet` + `burning` | burning снимается, появляется smoke VFX |
| `burning` + `poisoned` | оба работают, но суммарный DoT capped at 18/turn |
| `cursed` + любой DoT | DoT damage x1.20 |
| `shielded` + `burning` | shield не снижает DoT, только direct magic/ranged |
| `fortified` + movement | fortified снимается до движения |
| `brace` + knight charge | charge bonus рыцаря отменяется, копейщик получает +35% DEF |
| `stunned` + `fortified` | fortified сохраняется, но юнит не действует |
| `concealed` + attack | concealed снимается перед расчетом атаки |

### 7.4. Визуальные индикаторы

| Статус | Индикатор на юните | VFX |
|---|---|---|
| Fortified | маленький щит над HP bar | короткая стойка/щит |
| Brace | копье icon | stance animation |
| Commanded | золотой ring segment | мягкая aura от героя |
| Poisoned | зеленая капля | faint green particles |
| Burning | красное пламя | flame/smoke particles |
| Cursed | фиолетовая руна | dark pulse |
| Slowed | синяя цепь | low dust trail |
| Stunned | желтая звезда | brief flash |
| Concealed | полупрозрачная иконка глаза | shimmer |
| Unrest | красный флаг на городе | smoke/angry crowd marker |

## 8. [ДОПОЛНЕНИЕ] День, ночь и погода

### 8.1. Статус для alpha

Изменение/уточнение: в `v0.1-alpha` день/ночь и погода являются визуальными системами по умолчанию и не меняют боевые формулы. Gameplay modifiers доступны только при включенной настройке `Advanced Weather Rules`.

Причина: пошаговая стратегия уже имеет много модификаторов. Погода не должна ломать читаемость боя в первой alpha.

### 8.2. Цикл дня и ночи

```ts
type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';
dayPhase = phases[Math.floor(turn / 2) % 4];
```

| Фаза | Ходы | Exposure | Цвет света |
|---|---|---:|---|
| Dawn | 1-2 | 0.95 | теплый `#ffd9a0` |
| Day | 3-4 | 1.05 | нейтральный `#fff1d2` |
| Dusk | 5-6 | 0.85 | оранжевый `#e6a06a` |
| Night | 7-8 | 0.65 | холодный `#8aa7d6` |

Цикл повторяется каждые 8 ходов. В Hotseat все игроки видят одну и ту же фазу, потому что turn глобальный.

### 8.3. Погода

```ts
type WeatherType = 'clear' | 'mist' | 'rain' | 'storm' | 'snow' | 'heat';
```

Вероятности на начало глобального раунда:

| Биом | Clear | Mist | Rain | Storm | Snow | Heat |
|---|---:|---:|---:|---:|---:|---:|
| Temperate | 55% | 15% | 20% | 8% | 2% | 0% |
| Boreal | 45% | 15% | 10% | 5% | 25% | 0% |
| Arid | 70% | 0% | 2% | 3% | 0% | 25% |
| Wetlands | 35% | 25% | 25% | 15% | 0% | 0% |
| Highlands | 50% | 15% | 10% | 10% | 15% | 0% |

Для alpha выбирается weather per map, не per region, чтобы не усложнять UI.

### 8.4. Advanced Weather Rules

Если включено:

| Погода | Движение | Бой | Видимость |
|---|---|---|---|
| Clear | нет | нет | нет |
| Mist | нет | ranged accuracy -10% | vision -1, минимум 1 |
| Rain | болото/лес +1 move cost | fire/burning не накладывается | нет |
| Storm | coast/naval +1 move cost | ranged/siege accuracy -15% | vision -1 |
| Snow | холмы/горы +1 move cost | cavalry charge -15% | нет |
| Heat | пустыня +1 move cost | units in desert lose 2 HP/turn if not adjacent water | нет |

Погода длится 3-6 ходов:

```ts
weatherDuration = rng.int(3, 6);
```

## 9. [ДОПОЛНЕНИЕ] Баланс экономики ранней игры

### 9.1. Базовый сценарий расчета

Расчеты ниже используют `standard_alpha`, карту 20x15 и стартовую столицу:

| Параметр | Значение |
|---|---|
| Население столицы | 2 |
| Worked hexes | 3 |
| Рабочие гексы | floodplain, forest, hills |
| Стартовые технологии | `settlement`, `toolmaking`, `tracking` |
| Исследование | `agriculture` или `bronzeWorking` |
| Производство | `granary` или `barracks` |

Доход хода 1:

| Источник | Еда | Дерево | Камень | Золото | Наука | Прогресс |
|---|---:|---:|---:|---:|---:|---:|
| City center | 2 | 0 | 0 | 2 | 3 | 1 |
| Floodplain | 3 | 0 | 0 | 1 | 0 | 0 |
| Forest | 1 | 2 | 0 | 0 | 0 | 0 |
| Hills | 0 | 0 | 1 | 1 | 0 | 0 |
| Gross | 6 | 2 | 1 | 4 | 3 | 1 |
| Upkeep | -1 worker food | 0 | 0 | -3 units | 0 | 0 |
| Net | +5 | +2 | +1 | +1 | +3 | +1 |

### 9.2. Ход 1

| Действие | Доступно? | Комментарий |
|---|---|---|
| Разведчик идет к руинам | да | MOV 4, цель в радиусе 4-6 |
| Герой занимает холм/центр | да | открывает обзор и безопасный бой |
| Копейщики прикрывают столицу | да | один рядом с городом, один с разведчиком |
| Строитель начинает ферму/лесопилку | да | 2 хода ферма, 2 хода лесопилка |
| Выбор исследования | да | `agriculture` 35 science или `bronzeWorking` 35 |
| Найм лучника | нет | нужен `archery` |
| Постройка второго города | нет в standard | нужен нанятый поселенец |

После конца хода 1 при net:

```text
Gold: 90 + 1 = 91
Food: 35 + 5 = 40
Wood: 45 + 2 = 47
Stone: 20 + 1 = 21
Science progress: 3/35
```

### 9.3. Ход 5

Типичное состояние при выборе `agriculture` и фермы:

| Показатель | Значение |
|---|---:|
| Gold | 94-100 |
| Food | 58-66 |
| Wood | 52-58 |
| Stone | 24-28 |
| Science progress | 15/35 |
| Столица growth | 20-28 / required 42 |
| Постройка | granary 60-80% |
| Разведка | 20-35 гексов открыто |
| Руины | 0-1 исследованы |

Если разведчик нашел руины с science reward +15, `agriculture` завершается на ходе 5-6.

### 9.4. Ход 10

Типичное состояние:

| Показатель | Economy-first | Military-first |
|---|---:|---:|
| Gold | 105-125 | 90-110 |
| Food | 80-105 | 65-85 |
| Wood | 60-75 | 45-60 |
| Stone | 30-38 | 28-35 |
| Изучено | `agriculture` | `bronzeWorking` |
| Второе исследование | `bronzeWorking` 10-18/35 | `archery` 6-12/70 |
| Здание | granary завершен | barracks завершены |
| Юниты | стартовые + worker | стартовые + 1 spearman queued |
| Поселенец | можно начать, 5-7 ходов | откладывается |

### 9.5. Ход 20

Целевое состояние здоровой ранней экономики:

| Показатель | Целевой диапазон |
|---|---:|
| Города | 1-2 |
| Население столицы | 3-4 |
| Юниты | 5-8 |
| Изученные технологии | 3-4 |
| Gold/turn | +4..+12 |
| Food surplus empire | +8..+18 |
| Science/turn | 5..11 |
| Wood stockpile | 40..90 |
| Stone stockpile | 25..70 |
| Первый лучник | ход 16-22 |
| Первый второй город | ход 14-22 |

### 9.6. Время до ключевых событий

| Событие | Быстро | Норма | Поздно |
|---|---:|---:|---:|
| Первая технология | ход 6 | ход 8 | ход 11 |
| Granary/Barracks | ход 8 | ход 10 | ход 13 |
| Первый поселенец | ход 12 | ход 16 | ход 22 |
| Второй город | ход 14 | ход 18 | ход 24 |
| Archery researched | ход 14 | ход 18 | ход 24 |
| Первый лучник | ход 16 | ход 20 | ход 26 |

Если второй город появляется до хода 10 без сильной жертвы армии, стоимость поселенца нужно увеличить на 15%. Если первый лучник стабильно позже хода 26, стоимость `archery` нужно снизить с 70 до 60.

## 10. [ДОПОЛНЕНИЕ] Точные параметры карты 20x15

### 10.1. Размер и форма

Карта 20x15 хранится как прямоугольный массив axial-координат:

```ts
width = 20;
height = 15;
q = 0..19;
r = 0..14;
totalHexes = width * height = 300;
```

Визуально pointy-top axial rectangle выглядит как скошенный параллелограмм, но storage и генерация считаются прямоугольником.

World bounds для `HEX_RADIUS = 1`:

```ts
minX = 0;
maxX = sqrt(3) * (19 + 14 / 2) = 45.03;
minZ = 0;
maxZ = 1.5 * 14 = 21.0;
```

### 10.2. Стандартные размеры режимов

| Режим | Рекомендуемый размер | Гексы | Игроки | Комментарий |
|---|---|---:|---:|---|
| Tutorial | 16x12 | 192 | 1 + нейтралы | короткая карта |
| 1 игрок vs AI alpha | 20x15 | 300 | 2 | стандарт alpha |
| Hotseat quick duel | 20x15 | 300 | 2 | допустимо, контакт ранний |
| Hotseat standard duel | 28x18 | 504 | 2 | рекомендуется |
| 3-4 игрока | 36x24 | 864 | 3-4 | после оптимизации |
| 5-6 игроков | 52x36 | 1872 | 5-6 | future |

Ответ на вопрос: для Hotseat 2 игрока карта 20x15 подходит для быстрой партии на 60-90 минут, но стандартной считается 28x18, чтобы дать место для второго города и разведки.

### 10.3. Параметры 20x15 standard

| Параметр | Значение |
|---|---:|
| Игроки | 1 human + 1 AI или 2 Hotseat |
| Major player starts | 2 |
| Neutral camps | 5-7 |
| Free cities | 0-1 |
| Ruins/POI | 8-12 |
| Mana sources | 3-5 |
| Rivers | 2-4 |
| Average start distance | 11-14 hex |
| Minimum land path distance | 14 |
| Recommended turn limit | 200 для quick, 300 standard |

## 11. [ДОПОЛНЕНИЕ] Save game миграции и autosave

### 11.1. Версии сохранения

```ts
type SaveMetadata = {
  saveSchemaVersion: number;   // increments on save format changes
  gameRulesVersion: string;    // semver, affects balance/rules
  contentVersion: string;      // semver, affects data configs/assets
  createdWithBuild: string;
  createdAt: string;
  lastPlayedAt: string;
};
```

| Версия | Назначение | Пример |
|---|---|---|
| `saveSchemaVersion` | структура JSON/Blob | 1, 2, 3 |
| `gameRulesVersion` | правила, формулы, баланс | `0.1.0` |
| `contentVersion` | технологии, юниты, здания | `0.1.0-data.4` |

### 11.2. Совместимость

| Ситуация | Поведение |
|---|---|
| saveSchemaVersion ниже текущей | применить миграции по порядку |
| saveSchemaVersion выше текущей | запретить загрузку, показать версию |
| gameRulesVersion patch отличается | разрешить, пометить `balance changed` |
| gameRulesVersion minor отличается | разрешить только как `legacy rules` или sandbox |
| contentVersion missing ids | попытаться map через migration table |
| migration failed | создать backup и не трогать исходный save |

### 11.3. Формат миграции

```ts
type SaveMigration = {
  from: number;
  to: number;
  description: string;
  migrate: (oldSave: unknown) => unknown;
};
```

Правила:

1. Миграция не изменяет исходный файл до успешной записи нового.
2. Перед миграцией создается backup.
3. После миграции пересчитывается `stateHash`.
4. Если hash невалиден, save открывается только в recovery mode.

### 11.4. Autosave

| Тип | Когда | Слоты |
|---|---|---:|
| Turn autosave | начало хода human player | 10 rolling |
| Pre-combat autosave | перед атакой по городу/герою | 3 rolling |
| Manual quicksave | `Ctrl+S` или кнопка | 5 rolling |
| Milestone autosave | новая эпоха, победный проект | 5 rolling |
| Hotseat switch autosave | перед экраном передачи хода | 6 rolling |

Autosave naming:

```text
autosave_turn_024_player_kingdom_of_dawn
quicksave_003
milestone_era_medieval_turn_041
```

Минимальный интервал autosave: 30 секунд реального времени, кроме Hotseat switch, который всегда сохраняет.

### 11.5. Несовместимость и UI

Если save несовместим:

```text
Это сохранение создано в версии 0.2.0, текущая версия 0.1.0.
Загрузка невозможна: формат сохранения новее клиента.
[Открыть папку сохранений] [Назад]
```

Если требуется миграция:

```text
Сохранение будет обновлено с формата 1 до 3.
Будет создан backup. Старый файл не будет удален.
[Обновить и загрузить] [Отмена]
```

## 12. [ДОПОЛНЕНИЕ] Accessibility: клавиатура, screen reader, высокий контраст

### 12.1. Полная навигация клавиатурой

| Клавиша | Контекст | Действие |
|---|---|---|
| `ArrowUp` | map cursor | сосед direction 2 |
| `ArrowDown` | map cursor | сосед direction 5 |
| `ArrowLeft` | map cursor | сосед direction 3 |
| `ArrowRight` | map cursor | сосед direction 0 |
| `Shift+ArrowUp` | map cursor | direction 1 |
| `Shift+ArrowDown` | map cursor | direction 4 |
| `Enter` | map/UI | выбрать/подтвердить |
| `Esc` | любой | отменить/закрыть |
| `Tab` | UI | следующий focusable element |
| `Shift+Tab` | UI | предыдущий focusable element |
| `N` | map | следующий юнит с действием |
| `C` | map | следующий город |
| `H` | map | центр на столице |
| `Ctrl+F` | map | найти город/юнит |
| `Ctrl+S` | любой | quicksave |
| `Ctrl+L` | меню | quickload prompt |
| `?` | любой | hotkey overlay |

Hex cursor всегда имеет visible ring и текстовое описание в live region.

### 12.2. Keyboard action modes

```ts
type KeyboardActionMode =
  | 'inspect'
  | 'moveTarget'
  | 'attackTarget'
  | 'buildTarget'
  | 'cityProduction'
  | 'techSelect';
```

| Mode | Вход | Выход |
|---|---|---|
| inspect | default | `M`, `A`, `B`, `T` |
| moveTarget | `M` на выбранном юните | Enter подтверждает, Esc отменяет |
| attackTarget | `A` | Enter атакует, Esc отменяет |
| buildTarget | worker action | Enter строит, Esc отменяет |
| cityProduction | `B` на городе | Enter ставит в очередь |
| techSelect | `T` | Enter выбирает технологию |

### 12.3. Screen reader support

3D canvas:

```tsx
<canvas
  role="application"
  aria-label="Карта Realms of War. Используйте стрелки для перемещения курсора по гексам."
/>
<div aria-live="polite" id="map-status" />
<div aria-live="assertive" id="combat-alerts" />
```

Live region examples:

| Событие | Текст |
|---|---|
| Cursor moved | `Гекс q 5 r 7, лес, защита +20%, еда 1, дерево 2.` |
| Unit selected | `Выбран Копейщик, здоровье 80 из 80, движение 2, атака доступна.` |
| Combat forecast | `Ожидаемый урон 10, ответный урон 6, шанс критического удара 5 процентов.` |
| Enemy visible | `Обнаружен Гоблин-лучник на расстоянии 3.` |
| Research complete | `Исследование Земледелие завершено. Доступен Амбар.` |

### 12.4. ARIA для UI

| Элемент | Атрибуты |
|---|---|
| ResourceBar | `role="status"`, `aria-label` с полными значениями |
| EndTurn button | `aria-disabled`, `aria-describedby` для blockers |
| Tech node | `role="treeitem"`, `aria-expanded`, `aria-selected` |
| Production queue | `role="listbox"` |
| Modal | `role="dialog"`, focus trap |
| Tooltip | `role="tooltip"`, связка `aria-describedby` |

### 12.5. Высококонтрастный режим

| Токен | Normal | High contrast |
|---|---|---|
| Background | `#151922` | `#000000` |
| Panel | `#202633` | `#101010` |
| Text | `#e8edf5` | `#ffffff` |
| Muted text | `#aab3c2` | `#d8d8d8` |
| Focus ring | `#d7aa4b` | `#ffff00` |
| Enemy | `#d65a54` | `#ff4040` |
| Ally | `#4d8fd6` | `#00b7ff` |
| Valid move | `#6fbf73` | `#00ff66` |
| Blocked | `#5d6675` | `#888888` |

High contrast также включает:

1. Толщина selection ring x1.75.
2. Отключение прозрачности панелей.
3. Pattern overlay для heatmaps.
4. Минимальный contrast ratio текста 7:1.

## 13. [ДОПОЛНЕНИЕ] Anti-cheat для будущего мультиплеера

### 13.1. Базовый принцип

Open-source клиент нельзя считать доверенным. Anti-cheat строится не на запрете модификации клиента, а на серверной валидации команд и минимизации скрытой информации на клиенте.

| Режим | Уровень доверия | Anti-cheat |
|---|---|---|
| Hotseat | доверенный локальный | нет |
| Online friendly relay | частично доверенный | command hash, desync detection |
| Online ranked | недоверенный | authoritative server, visible-state slices |

### 13.2. Валидация команд сервером

Для ranked server прогоняет каждую команду через тот же `GameEngine`.

```ts
serverAcceptsCommand =
  isPlayerTurn(command.playerId) &&
  commandIndex === expectedIndex &&
  schemaValid(command) &&
  commandAllowedByVisibleState(command) &&
  engineValidationPasses(command) &&
  resultingStateHashMatchesServer;
```

Проверки:

| Команда | Проверка |
|---|---|
| MoveUnit | владелец, movement, terrain, fog, нет enemy zone block |
| Attack | range, line of sight, attackAvailable, target visible |
| Recruit | ресурсы, building/tech unlock, city ownership |
| Research | prerequisites, not already researched |
| Trade | доступный маршрут, ресурсы, cooldown |
| EndTurn | no pending forced decisions |

### 13.3. Защита от map hack

Для ranked online клиент не получает полный `GameState`. Сервер отправляет `PlayerVisibleState`.

```ts
type PlayerVisibleState = {
  ownEntities: EntitySnapshot[];
  visibleEnemyEntities: EntitySnapshot[];
  exploredMap: ExploredHexSnapshot[];
  visibleMap: VisibleHexSnapshot[];
  publicScores: PublicScoreSnapshot[];
};
```

Скрытые данные:

1. Невидимые юниты противника.
2. Текущие очереди строительства противника.
3. Невидимые ресурсы без технологии.
4. AI/neutral hidden intents.
5. Ритуальные проекты до разведки нужного города.

### 13.4. Tamper evidence

```ts
type SignedCommandEnvelope = {
  command: GameCommand;
  matchId: string;
  playerId: string;
  commandIndex: number;
  previousStateHash: string;
  clientBuildHash: string;
  signature: string;
};
```

Client build hash не предотвращает чит, но помогает:

1. помечать modded clients;
2. запрещать ranked при mismatch;
3. быстро диагностировать desync.

### 13.5. Обнаружение и санкции

| Нарушение | Действие |
|---|---|
| Invalid command schema | reject, warning |
| 3 invalid commands за матч | auto-forfeit |
| State hash mismatch | resync attempt |
| 3 desync за 20 ходов | match cancelled или forfeit виновного |
| Build hash mismatch in ranked | запрет входа |
| Rate limit exceeded | temporary disconnect |
| Replay доказал невозможное действие | match overturned, rating rollback |

Логи ranked матчей хранятся 30 дней:

```ts
type MatchAuditLog = {
  matchId: string;
  commandLog: GameCommand[];
  stateHashesByTurn: string[];
  rejectedCommands: RejectedCommand[];
  clientBuildHashes: Record<PlayerId, string>;
};
```

## 14. [ДОПОЛНЕНИЕ] Система достижений

### 14.1. Принципы

1. Достижения не дают gameplay bonuses.
2. Достижения работают offline.
3. В ranked online достижения подтверждаются сервером.
4. Hidden achievements раскрываются после выполнения.

```ts
type Achievement = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  category: AchievementCategory;
  hidden: boolean;
  progressMax: number;
};
```

### 14.2. Список достижений

| ID | Название | Условие | Категория |
|---|---|---|---|
| `first_city` | Первый камень | основать первый город | economy |
| `second_city_turn20` | Быстрая экспансия | основать второй город до хода 20 | economy |
| `first_blood` | Первая кровь | уничтожить первого врага | combat |
| `hero_survives` | Живой символ | выиграть партию без смерти героя | combat |
| `ruin_runner` | Искатель древностей | исследовать 5 руин за матч | exploration |
| `forest_king` | Лесной король | контролировать 20 лесных гексов | economy |
| `iron_line` | Железная линия | иметь 5 melee юнитов уровня 3+ | combat |
| `no_gold_deficit` | Казна полна | 50 ходов без отрицательного gold/turn | economy |
| `first_wonder` | Чудо эпохи | построить первое чудо | wonders |
| `three_wonders` | Каменная летопись | построить 3 чуда в одном матче | wonders |
| `science_victory` | Великий кодекс | выиграть Science Victory | victory |
| `domination_victory` | Под одной короной | выиграть Domination Victory | victory |
| `rift_sealed` | Печать Разлома | выиграть Rift Seal Victory | victory |
| `wonder_victory` | Наследие веков | выиграть Wonders Victory | victory |
| `underdog` | Против течения | победить AI Veteran после потери столицы | challenge |
| `clean_war` | Без осадного пепла | выиграть войну, не разрушив города | challenge |
| `neutral_friend` | Договор с окраиной | довести reputation с free cities до +80 | diplomacy |
| `camp_tamer` | Укротитель лагерей | заключить pact с 3 лагерями | diplomacy |
| `mage_order` | Орден арканы | иметь 4 магов и +12 mana/turn | magic |
| `seal_rush` | Срочная печать | завершить Rift Seal до хода 180 | magic |
| `cartographer` | Картограф | исследовать 90% карты | exploration |
| `hotseat_finish` | За одним столом | завершить Hotseat матч | multiplayer |
| `perfect_defense` | Непробитые стены | выдержать 5 атак города без потери HP города | combat |
| `market_master` | Мастер рынка | заработать 500 золота торговлей | economy |

### 14.3. Статистика

```ts
type PlayerStats = {
  matchesStarted: number;
  matchesFinished: number;
  victoriesByType: Record<VictoryType, number>;
  unitsKilled: number;
  unitsLost: number;
  citiesFounded: number;
  citiesCaptured: number;
  wondersBuilt: number;
  techsResearched: number;
  ruinsExplored: number;
  totalGoldEarned: number;
  totalManaSpent: number;
  highestUnitLevel: number;
};
```

### 14.4. Связь с условиями победы

| Victory type | Achievement | Доп. статистика |
|---|---|---|
| Domination | `domination_victory` | столицы захвачены, ход победы |
| Science | `science_victory` | tech count, science/turn |
| Rift Seal | `rift_sealed` | mana spent, ritual turns |
| Wonders | `wonder_victory` | wonders count, prestige |
| Score | `score_king` future | final score breakdown |

## 15. [ДОПОЛНЕНИЕ] Моддинг и data-driven контент

### 15.1. Политика моддинга

Моддинг поддерживается для offline, Hotseat и friendly online. Ranked online использует только signed vanilla data.

| Режим | Mods |
|---|---|
| Singleplayer | разрешены |
| Hotseat | разрешены, если все игроки на одном клиенте |
| Online friendly | разрешены, если checksum совпадает у всех |
| Online ranked | запрещены |

### 15.2. Структура мода

```text
mods/
  my-mod/
    manifest.json
    data/
      units.json
      buildings.json
      technologies.json
      terrain.json
      map-presets.json
    assets/
      models/
      textures/
      icons/
      audio/
    localization/
      ru.json
      en.json
    maps/
      custom-map-001.json
```

`manifest.json`:

```json
{
  "id": "my-mod",
  "name": "My Mod",
  "version": "1.0.0",
  "gameVersion": ">=0.1.0 <0.2.0",
  "author": "Author",
  "loadOrder": 100,
  "dependencies": [],
  "checksum": "sha256..."
}
```

### 15.3. Что можно менять без кода

| Категория | Можно менять | Нельзя без кода |
|---|---|---|
| Юниты | stats, cost, abilities refs, model refs | новая hardcoded ability logic |
| Здания | yields, cost, prereqs, models | новый production algorithm |
| Технологии | graph, costs, unlocks | новый тип unlock без schema |
| Террейн | yields, move, defense, colors | новый shader behavior |
| Карты | fixed maps, presets, seeds | новый generator algorithm |
| Локализация | все строки | layout logic |
| Аудио | event bindings | новый audio engine |

### 15.4. Schema для кастомного юнита

```json
{
  "id": "mod_elven_ranger",
  "nameKey": "unit.mod_elven_ranger.name",
  "descriptionKey": "unit.mod_elven_ranger.description",
  "domain": "land",
  "stats": {
    "hp": 72,
    "atk": 16,
    "def": 7,
    "mov": 3,
    "range": 2
  },
  "cost": {
    "wood": 50,
    "gold": 60
  },
  "upkeep": {
    "gold": 2
  },
  "era": "medieval",
  "requiredTech": "archery",
  "abilities": ["volley", "forest_concealment"],
  "modelId": "mod_elven_ranger.glb",
  "iconId": "mod_elven_ranger"
}
```

### 15.5. Кастомные карты

```ts
type CustomMapFile = {
  schemaVersion: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  seed?: string;
  hexes: Array<{
    q: number;
    r: number;
    terrainId: TerrainTypeId;
    elevation?: number;
    resourceId?: string;
    riverMask?: number;
  }>;
  starts: Array<{
    playerSlot: number;
    q: number;
    r: number;
  }>;
  neutralCamps?: NeutralCampPlacement[];
  ruins?: PoiPlacement[];
};
```

Валидация кастомной карты:

| Проверка | Условие |
|---|---|
| Все hexes в bounds | обязательно |
| Starts на land | обязательно |
| Starts connected | обязательно для land-only режима |
| Unknown terrain ids | ошибка |
| Missing localization | warning |
| Too many assets | warning при > 500 MB |

### 15.6. Conflict resolution

Моды применяются по `loadOrder`. Если два мода меняют один ID:

```ts
finalRecord = deepMerge(baseRecord, modARecord, modBRecord);
```

Правила:

1. Поля scalar заменяются последним модом.
2. Массивы по умолчанию заменяются, не объединяются.
3. Для `effects` можно указать `patchMode: 'append'`.
4. Ошибка schema validation отключает только проблемный мод, не всю игру.

### 15.7. Checksums для мультиплеера

```ts
contentChecksum = sha256(stableSerialize({
  baseContentVersion,
  enabledMods: mods.map(m => ({
    id: m.id,
    version: m.version,
    checksum: m.checksum
  }))
}));
```

Friendly online lobby стартует только если `contentChecksum` совпадает у всех игроков.
