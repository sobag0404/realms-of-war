// ============================================================================
// Hotkey Configuration — Realms of War
// ============================================================================

/** Hotkey category for grouping in the settings UI */
export type HotkeyCategory = 'camera' | 'selection' | 'game' | 'ui' | 'debug';

/** Single hotkey binding definition */
export interface HotkeyBinding {
  id: string;
  /** Default key binding */
  defaultKey: string;
  /** Alternative key binding */
  altKey?: string;
  /** Category for grouping */
  category: HotkeyCategory;
  name: string;
  nameRu: string;
  /** Whether this hotkey can be rebound by the player */
  canRebind: boolean;
}

// ---------------------------------------------------------------------------
// Hotkey data
// ---------------------------------------------------------------------------
export const HOTKEYS: HotkeyBinding[] = [
  // ===== Camera =====
  { id: 'camera.forward',  defaultKey: 'KeyW', altKey: 'ArrowUp',    category: 'camera', name: 'Move Camera Up',     nameRu: 'Камера вверх',      canRebind: true },
  { id: 'camera.backward', defaultKey: 'KeyS', altKey: 'ArrowDown',  category: 'camera', name: 'Move Camera Down',   nameRu: 'Камера вниз',       canRebind: true },
  { id: 'camera.left',     defaultKey: 'KeyA', altKey: 'ArrowLeft',  category: 'camera', name: 'Move Camera Left',   nameRu: 'Камера влево',      canRebind: true },
  { id: 'camera.right',    defaultKey: 'KeyD', altKey: 'ArrowRight', category: 'camera', name: 'Move Camera Right',  nameRu: 'Камера вправо',     canRebind: true },
  { id: 'camera.zoomIn',   defaultKey: 'Equal', altKey: 'NumpadAdd', category: 'camera', name: 'Zoom In',            nameRu: 'Приблизить',        canRebind: true },
  { id: 'camera.zoomOut',  defaultKey: 'Minus', altKey: 'NumpadSubtract', category: 'camera', name: 'Zoom Out',       nameRu: 'Отдалить',          canRebind: true },
  { id: 'camera.rotateCW', defaultKey: 'KeyQ',                       category: 'camera', name: 'Rotate Camera CW',   nameRu: 'Вращать по часовой', canRebind: true },
  { id: 'camera.rotateCCW',defaultKey: 'KeyE',                       category: 'camera', name: 'Rotate Camera CCW',  nameRu: 'Вращать против часовой', canRebind: true },
  { id: 'camera.center',   defaultKey: 'Home',                       category: 'camera', name: 'Center on Capital',  nameRu: 'Центр на столицу',  canRebind: true },
  { id: 'camera.follow',   defaultKey: 'KeyF',                       category: 'camera', name: 'Follow Selected Unit', nameRu: 'Следовать за юнитом', canRebind: true },

  // ===== Selection =====
  { id: 'selection.select',     defaultKey: 'Pointer',    category: 'selection', name: 'Select / Confirm',    nameRu: 'Выбрать / Подтвердить', canRebind: false },
  { id: 'selection.deselect',   defaultKey: 'Escape',     category: 'selection', name: 'Deselect / Cancel',   nameRu: 'Снять выделение / Отмена', canRebind: false },
  { id: 'selection.boxSelect',  defaultKey: 'Pointer+Drag', category: 'selection', name: 'Box Select',       nameRu: 'Выделение рамкой',       canRebind: false },
  { id: 'selection.selectAll',  defaultKey: 'KeyA',       category: 'selection', name: 'Select All Units',    nameRu: 'Выбрать всех юнитов',     canRebind: true },
  { id: 'selection.selectArmy', defaultKey: 'KeyS',       category: 'selection', name: 'Select Army',         nameRu: 'Выбрать армию',           canRebind: true },
  { id: 'selection.cycleUnit',  defaultKey: 'Tab',        category: 'selection', name: 'Cycle Selected Unit', nameRu: 'Следующий юнит',          canRebind: true },
  { id: 'selection.prevUnit',   defaultKey: 'Shift+Tab',  category: 'selection', name: 'Previous Unit',      nameRu: 'Предыдущий юнит',         canRebind: true },
  { id: 'selection.addMod',     defaultKey: 'Shift',      category: 'selection', name: 'Add to Selection',    nameRu: 'Добавить к выделению',    canRebind: false },

  // ===== Game =====
  { id: 'game.endTurn',      defaultKey: 'Enter',           category: 'game', name: 'End Turn',           nameRu: 'Завершить ход',     canRebind: true },
  { id: 'game.quickSave',    defaultKey: 'F5',              category: 'game', name: 'Quick Save',         nameRu: 'Быстрое сохранение', canRebind: true },
  { id: 'game.quickLoad',    defaultKey: 'F9',              category: 'game', name: 'Quick Load',         nameRu: 'Быстрая загрузка',  canRebind: true },
  { id: 'game.autoEndTurn',  defaultKey: 'Shift+Enter',     category: 'game', name: 'Toggle Auto End Turn', nameRu: 'Авто-конец хода', canRebind: true },
  { id: 'game.attack',       defaultKey: 'Space',           category: 'game', name: 'Attack / Bombard',   nameRu: 'Атаковать / Обстрелять', canRebind: true },
  { id: 'game.fortify',      defaultKey: 'KeyF',            category: 'game', name: 'Fortify Unit',       nameRu: 'Укрепить юнит',     canRebind: true },
  { id: 'game.wait',         defaultKey: 'KeyW',            category: 'game', name: 'Wait (Skip Unit)',   nameRu: 'Ждать (пропустить)', canRebind: true },

  // ===== UI =====
  { id: 'ui.techTree',       defaultKey: 'KeyT',  category: 'ui', name: 'Open Tech Tree',      nameRu: 'Древо технологий',     canRebind: true },
  { id: 'ui.cityView',       defaultKey: 'KeyC',  category: 'ui', name: 'Open City View',      nameRu: 'Обзор города',         canRebind: true },
  { id: 'ui.diplomacy',      defaultKey: 'KeyP',  category: 'ui', name: 'Open Diplomacy',      nameRu: 'Дипломатия',           canRebind: true },
  { id: 'ui.unitInfo',       defaultKey: 'KeyI',  category: 'ui', name: 'Unit Info Panel',     nameRu: 'Информация о юните',   canRebind: true },
  { id: 'ui.resourcePanel',  defaultKey: 'KeyR',  category: 'ui', name: 'Resource Panel',      nameRu: 'Панель ресурсов',      canRebind: true },
  { id: 'ui.minimap',        defaultKey: 'KeyM',  category: 'ui', name: 'Toggle Minimap',      nameRu: 'Мини-карта',           canRebind: true },
  { id: 'ui.productionMenu', defaultKey: 'KeyB',  category: 'ui', name: 'Production Menu',     nameRu: 'Меню производства',    canRebind: true },
  { id: 'ui.settings',       defaultKey: 'Escape',category: 'ui', name: 'Settings Menu',       nameRu: 'Настройки',            canRebind: false },
  { id: 'ui.help',           defaultKey: 'F1',    category: 'ui', name: 'Help / Tutorial',     nameRu: 'Справка / Обучение',   canRebind: true },

  // ===== Debug =====
  { id: 'debug.console',     defaultKey: 'Backquote',  category: 'debug', name: 'Toggle Debug Console', nameRu: 'Консоль отладки', canRebind: true },
  { id: 'debug.grid',        defaultKey: 'KeyG',       category: 'debug', name: 'Toggle Hex Grid',      nameRu: 'Сетка гексов',    canRebind: true },
  { id: 'debug.fog',         defaultKey: 'Shift+F',    category: 'debug', name: 'Toggle Fog of War',    nameRu: 'Туман войны',     canRebind: true },
  { id: 'debug.terrainInfo', defaultKey: 'Shift+T',    category: 'debug', name: 'Terrain Info Overlay', nameRu: 'Инфо о местности', canRebind: true },
  { id: 'debug.coords',      defaultKey: 'Shift+C',    category: 'debug', name: 'Show Coordinates',     nameRu: 'Координаты',      canRebind: true },
  { id: 'debug.fps',         defaultKey: 'F3',         category: 'debug', name: 'Show FPS Counter',     nameRu: 'Счётчик FPS',     canRebind: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map from hotkey id to its full binding. */
export const HOTKEY_MAP: Record<string, HotkeyBinding> = Object.fromEntries(
  HOTKEYS.map((h) => [h.id, h]),
);

/** Get all hotkeys in a given category. */
export function getHotkeysByCategory(category: string): HotkeyBinding[] {
  return HOTKEYS.filter((h) => h.category === category);
}
