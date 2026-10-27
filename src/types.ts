/** Все публичные типы операционной системы. */

export type AppId = 'explorer' | 'notepad' | 'settings' | 'browser';
export type ThemeMode = 'light' | 'dark';
export type PowerState = 'on' | 'sleep' | 'off';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Параметры, с которыми запущено конкретное приложение. */
export interface WindowProps {
  /** Текущая папка Проводника. */
  path?: string;
  /** Путь к открытому в Блокноте файлу. */
  filePath?: string;
  /** Стартовый адрес Браузера. */
  url?: string;
}

export interface WindowState extends Bounds {
  id: string;
  appId: AppId;
  title: string;
  isMaximized: boolean;
  isMinimized: boolean;
  zIndex: number;
  /** Геометрия окна до разворачивания на весь экран. */
  restoreBounds?: Bounds;
  props: WindowProps;
}

export interface TextFileNode {
  kind: 'text';
  name: string;
  content: string;
  modifiedAt: number;
  /** Путь, откуда узел попал в Корзину. */
  originPath?: string;
}

export interface FolderNode {
  kind: 'folder';
  name: string;
  children: Record<string, FsNode>;
  originPath?: string;
}

export type FsNode = FolderNode | TextFileNode;
/** Корень дерева — диск C:. */
export type FileSystem = FolderNode;

export interface FsEntry {
  name: string;
  path: string;
  node: FsNode;
}

export interface OSPreferences {
  theme: ThemeMode;
  accentColor: string;
  wallpaperId: string;
  volume: number;
  muted: boolean;
  showSeconds: boolean;
}

export interface OSState {
  windows: WindowState[];
  activeWindowId: string | null;
  fileSystem: FileSystem;
  startMenuOpen: boolean;
  taskViewOpen: boolean;
  actionCenterOpen: boolean;
  powerState: PowerState;
  prefs: OSPreferences;
}

export interface OpenWindowOptions extends WindowProps {
  title?: string;
  width?: number;
  height?: number;
}

export interface OSActions {
  // --- Окна ---
  openWindow(appId: AppId, options?: OpenWindowOptions): void;
  closeWindow(id: string): void;
  focusWindow(id: string): void;
  minimizeWindow(id: string): void;
  toggleMaximizeWindow(id: string): void;
  restoreWindow(id: string): void;
  taskbarClick(id: string): void;
  updateWindowBounds(id: string, bounds: Bounds): void;
  setWindowTitle(id: string, title: string): void;
  updateWindowProps(id: string, patch: Partial<WindowProps>): void;
  clampAllWindows(): void;

  // --- Оболочка ---
  toggleStartMenu(): void;
  setStartMenuOpen(open: boolean): void;
  toggleTaskView(): void;
  setTaskViewOpen(open: boolean): void;
  toggleActionCenter(): void;
  setActionCenterOpen(open: boolean): void;
  setPowerState(state: PowerState): void;

  // --- Персонализация ---
  setTheme(theme: ThemeMode): void;
  setAccentColor(color: string): void;
  setWallpaper(id: string): void;
  cycleWallpaper(): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  setShowSeconds(show: boolean): void;

  // --- Виртуальная файловая система ---
  writeFile(path: string, content: string): void;
  createTextFile(dirPath: string, name?: string): string;
  createFolder(dirPath: string, name?: string): string;
  renameNode(path: string, newName: string): void;
  moveToTrash(path: string): void;
  restoreFromTrash(path: string): void;
  emptyTrash(): void;
  resetFileSystem(): void;
  reloadFromStorage(): void;
}
