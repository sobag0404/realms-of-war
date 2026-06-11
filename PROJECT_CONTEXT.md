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

> Последнее обновление: 2026-06-11

### Что реализовано

- ✅ GDD (полная спецификация 5531 строк)
- ✅ Hex-математика (`src/engine/hex/`) — координаты, дистанции, пути, округление, хранение карты
- ✅ Ядро движка (`src/engine/core/`) — GameState, GameConfig, GameRng, CommandQueue, EventBus, типы
- ✅ Data-конфиги (`src/data/`) — юниты, здания, технологии, террейн, ресурсы
- ✅ Прототип 2D (Canvas) — `public/prototype/index.html`
- ✅ Next.js проект с shadcn/ui компонентами
- ✅ Prisma schema + SQLite

### Что НЕ реализовано (ключевое для v0.1-alpha)

- ❌ ECS-системы (Movement, Combat, Economy, Research, Vision, AI, City, Turn)
- ❌ Генератор карты (mapgen)
- ❌ 3D-рендеринг (React Three Fiber сцена)
- ❌ UI/HUD экраны (главное меню, настройки, дерево технологий, управление городом)
- ❌ Система сохранений/загрузок
- ❌ Hotseat-режим
- ❌ AI-противник
- ❌ Звуковое оформление

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
│   ├── components/ui/                  # shadcn/ui компоненты
│   ├── data/                           # Data-driven конфиги баланса
│   │   ├── buildings.ts
│   │   ├── resources.ts
│   │   ├── technologies.ts
│   │   ├── terrain.ts
│   │   └── units.ts
│   ├── engine/                         # Игровой движок
│   │   ├── core/                       # Ядро (GameState, EventBus, CommandQueue, RNG)
│   │   └── hex/                        # Гексагональная математика
│   ├── hooks/                          # React хуки
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

---

## Приоритеты разработки (следующие шаги)

1. **ECS-системы** — Movement, Combat, Economy (ядро геймплея)
2. **Генератор карты** — seed-based, биомы, реки, ресурсы, стартовые позиции
3. **3D-рендеринг** — TerrainLayer + CameraRig + SelectionHighlights
4. **UI/HUD** — GameHud, ResourceBar, TurnPanel, CityPanel
5. **AI** — базовый стратегический ИИ (Utility AI)
6. **Сохранения** — Prisma + JSON serialization

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
