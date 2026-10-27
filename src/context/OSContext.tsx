import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type {
  AppId,
  Bounds,
  FileSystem,
  OSActions,
  OSPreferences,
  OSState,
  OpenWindowOptions,
  PowerState,
  ThemeMode,
  WindowProps,
  WindowState,
} from '../types';
import { APPS, MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, TASKBAR_HEIGHT } from '../lib/apps';
import { WALLPAPERS } from '../lib/wallpapers';
import {
  PROTECTED_PATHS,
  RECYCLE_PATH,
  DESKTOP_PATH,
  clearFolder,
  createDefaultFileSystem,
  createFolderNode,
  createTextFileNode,
  deleteNode,
  getNode,
  isFolder,
  joinPath,
  moveNode,
  nodeName,
  normalizePath,
  parentPath,
  renameNodeInTree,
  uniqueName,
  updateNode,
} from '../lib/filesystem';

const FS_STORAGE_KEY = 'wwe.filesystem.v1';
const PREFS_STORAGE_KEY = 'wwe.preferences.v1';

const DEFAULT_PREFS: OSPreferences = {
  theme: 'light',
  accentColor: '#0078D7',
  wallpaperId: WALLPAPERS[0].id,
  volume: 65,
  muted: false,
  showSeconds: true,
};

function readStorage(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Приватный режим или переполнение квоты: состояние продолжает жить в памяти.
  }
}

function loadFileSystem(): FileSystem {
  try {
    const raw = readStorage(FS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FileSystem;
      if (
        parsed &&
        parsed.kind === 'folder' &&
        parsed.name === 'C:' &&
        parsed.children &&
        getNode(parsed, RECYCLE_PATH)
      ) {
        return parsed;
      }
    }
  } catch {
    // Повреждённые данные — возвращаем стандартное дерево.
  }
  return createDefaultFileSystem();
}

function loadPrefs(): OSPreferences {
  try {
    const raw = readStorage(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<OSPreferences>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      accentColor:
        typeof parsed.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accentColor)
          ? parsed.accentColor
          : DEFAULT_PREFS.accentColor,
      wallpaperId: WALLPAPERS.some((w) => w.id === parsed.wallpaperId)
        ? (parsed.wallpaperId as string)
        : DEFAULT_PREFS.wallpaperId,
      volume:
        typeof parsed.volume === 'number'
          ? Math.min(100, Math.max(0, Math.round(parsed.volume)))
          : DEFAULT_PREFS.volume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFS.muted,
      showSeconds:
        typeof parsed.showSeconds === 'boolean' ? parsed.showSeconds : DEFAULT_PREFS.showSeconds,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function createInitialState(): OSState {
  return {
    windows: [],
    activeWindowId: null,
    fileSystem: loadFileSystem(),
    startMenuOpen: false,
    taskViewOpen: false,
    actionCenterOpen: false,
    powerState: 'on',
    prefs: loadPrefs(),
  };
}

function viewport(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1280, height: 720 };
  return {
    width: window.innerWidth,
    height: Math.max(240, window.innerHeight - TASKBAR_HEIGHT),
  };
}

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampBounds(
  bounds: Bounds,
  minWidth = MIN_WINDOW_WIDTH,
  minHeight = MIN_WINDOW_HEIGHT,
): Bounds {
  const { width: vw, height: vh } = viewport();
  const width = Math.max(minWidth, Math.min(Math.round(bounds.width), vw));
  const height = Math.max(minHeight, Math.min(Math.round(bounds.height), vh));
  return {
    width,
    height,
    x: Math.round(Math.min(Math.max(bounds.x, 0), Math.max(0, vw - width))),
    y: Math.round(Math.min(Math.max(bounds.y, 0), Math.max(0, vh - height))),
  };
}

type Listener = () => void;

/**
 * Небольшой внешний стор: компоненты подписываются через Context API +
 * useSyncExternalStore с селектором, поэтому изменение одного среза состояния
 * не перерисовывает остальные подписчики.
 */
class OSStore {
  private state: OSState;
  private listeners = new Set<Listener>();
  readonly actions: OSActions;

  constructor(initial: OSState) {
    this.state = initial;
    this.actions = this.createActions();
  }

  getState = (): OSState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setState = (updater: (previous: OSState) => OSState): void => {
    const next = updater(this.state);
    if (next === this.state) return;
    this.state = next;
    this.listeners.forEach((listener) => listener());
  };

  private maxZ(state: OSState): number {
    return state.windows.reduce((max, w) => Math.max(max, w.zIndex), 0);
  }

  private activeIdFor(windows: WindowState[]): string | null {
    const top = windows
      .filter((w) => !w.isMinimized)
      .reduce<WindowState | null>((best, w) => (!best || w.zIndex > best.zIndex ? w : best), null);
    return top ? top.id : null;
  }

  private focusState(state: OSState, id: string): OSState {
    const target = state.windows.find((w) => w.id === id);
    if (!target) return state;
    const maxZ = this.maxZ(state);
    if (
      state.activeWindowId === id &&
      !target.isMinimized &&
      target.zIndex === maxZ &&
      !state.startMenuOpen &&
      !state.taskViewOpen
    ) {
      return state;
    }
    return {
      ...state,
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w,
      ),
      activeWindowId: id,
      startMenuOpen: false,
      taskViewOpen: false,
    };
  }

  /** Закрывает окна удалённых файлов и уводит Проводник в родительскую папку. */
  private removeStaleWindows(state: OSState, deletedPath: string): OSState {
    const prefix = `${deletedPath}/`;
    const windows: WindowState[] = [];
    for (const w of state.windows) {
      const linked =
        w.appId === 'notepad' ? w.props.filePath : w.appId === 'explorer' ? w.props.path : undefined;
      if (linked && (linked === deletedPath || linked.startsWith(prefix))) {
        if (w.appId === 'notepad') continue;
        windows.push({ ...w, props: { ...w.props, path: parentPath(deletedPath) } });
      } else {
        windows.push(w);
      }
    }
    return { ...state, windows, activeWindowId: this.activeIdFor(windows) };
  }

  private createActions(): OSActions {
    return {
      // ---------------------------------------------------------------- Окна
      openWindow: (appId: AppId, options: OpenWindowOptions = {}) => {
        this.setState((state) => {
          const def = APPS[appId];
          const singleInstance = appId === 'settings' || (appId === 'notepad' && !!options.filePath);
          const existing = singleInstance
            ? state.windows.find(
                (w) =>
                  w.appId === appId &&
                  (appId !== 'notepad' || w.props.filePath === options.filePath),
              )
            : undefined;
          if (existing) return this.focusState(state, existing.id);

          const { width: vw, height: vh } = viewport();
          const count = state.windows.length;
          const width = Math.min(options.width ?? def.defaultSize.width, vw - 16);
          const height = Math.min(options.height ?? def.defaultSize.height, vh - 16);
          const cascade = (count % 6) * 26;
          const bounds = clampBounds(
            {
              x: Math.round((vw - width) / 2) + cascade - 90,
              y: Math.round((vh - height) / 2) + cascade - 70,
              width,
              height,
            },
            def.minSize.width,
            def.minSize.height,
          );
          const props: WindowProps = {
            path: options.path,
            filePath: options.filePath,
            url: options.url,
          };
          const window: WindowState = {
            id: uid('win'),
            appId,
            title:
              options.title ??
              (options.filePath
                ? nodeName(options.filePath)
                : options.url
                  ? options.url
                  : def.title),
            ...bounds,
            isMaximized: false,
            isMinimized: false,
            zIndex: this.maxZ(state) + 1,
            props,
          };
          return {
            ...state,
            windows: [...state.windows, window],
            activeWindowId: window.id,
            startMenuOpen: false,
            taskViewOpen: false,
            actionCenterOpen: false,
          };
        });
      },

      closeWindow: (id: string) => {
        this.setState((state) => {
          const windows = state.windows.filter((w) => w.id !== id);
          if (windows.length === state.windows.length) return state;
          return { ...state, windows, activeWindowId: this.activeIdFor(windows) };
        });
      },

      focusWindow: (id: string) => this.setState((state) => this.focusState(state, id)),

      minimizeWindow: (id: string) => {
        this.setState((state) => {
          const windows = state.windows.map((w) =>
            w.id === id ? { ...w, isMinimized: true } : w,
          );
          return { ...state, windows, activeWindowId: this.activeIdFor(windows) };
        });
      },

      toggleMaximizeWindow: (id: string) => {
        this.setState((state) => {
          if (!state.windows.some((w) => w.id === id)) return state;
          const { width: vw, height: vh } = viewport();
          const windows = state.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.isMaximized) {
              return {
                ...w,
                ...clampBounds(
                  w.restoreBounds ?? { x: w.x, y: w.y, width: w.width, height: w.height },
                  APPS[w.appId].minSize.width,
                  APPS[w.appId].minSize.height,
                ),
                isMaximized: false,
                restoreBounds: undefined,
              };
            }
            return {
              ...w,
              restoreBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
              x: 0,
              y: 0,
              width: vw,
              height: vh,
              isMaximized: true,
            };
          });
          return this.focusState({ ...state, windows }, id);
        });
      },

      restoreWindow: (id: string) => {
        this.setState((state) => {
          const w = state.windows.find((item) => item.id === id);
          if (!w) return state;
          let windows = state.windows;
          if (w.isMaximized) {
            const { width: vw, height: vh } = viewport();
            windows = windows.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...clampBounds(
                      item.restoreBounds ?? {
                        x: item.x,
                        y: item.y,
                        width: Math.min(item.width, vw),
                        height: Math.min(item.height, vh),
                      },
                      APPS[item.appId].minSize.width,
                      APPS[item.appId].minSize.height,
                    ),
                    isMaximized: false,
                    restoreBounds: undefined,
                  }
                : item,
            );
          }
          return this.focusState({ ...state, windows }, id);
        });
      },

      taskbarClick: (id: string) => {
        this.setState((state) => {
          const target = state.windows.find((w) => w.id === id);
          if (!target) return state;
          if (state.activeWindowId === id && !target.isMinimized) {
            const windows = state.windows.map((w) =>
              w.id === id ? { ...w, isMinimized: true } : w,
            );
            return {
              ...state,
              windows,
              activeWindowId: this.activeIdFor(windows),
              actionCenterOpen: false,
            };
          }
          return this.focusState(state, id);
        });
      },

      updateWindowBounds: (id: string, bounds: Bounds) => {
        this.setState((state) => {
          let changed = false;
          const windows = state.windows.map((w) => {
            if (w.id !== id || w.isMaximized) return w;
            const next = clampBounds(
              bounds,
              APPS[w.appId].minSize.width,
              APPS[w.appId].minSize.height,
            );
            if (
              next.x === w.x &&
              next.y === w.y &&
              next.width === w.width &&
              next.height === w.height
            ) {
              return w;
            }
            changed = true;
            return { ...w, ...next };
          });
          return changed ? { ...state, windows } : state;
        });
      },

      setWindowTitle: (id: string, title: string) => {
        this.setState((state) => ({
          ...state,
          windows: state.windows.map((w) => (w.id === id ? { ...w, title } : w)),
        }));
      },

      updateWindowProps: (id: string, patch: Partial<WindowProps>) => {
        this.setState((state) => ({
          ...state,
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, props: { ...w.props, ...patch } } : w,
          ),
        }));
      },

      clampAllWindows: () => {
        this.setState((state) => {
          const { width: vw, height: vh } = viewport();
          const windows = state.windows.map((w) => {
            if (w.isMaximized) return { ...w, x: 0, y: 0, width: vw, height: vh };
            return {
              ...w,
              ...clampBounds(w, APPS[w.appId].minSize.width, APPS[w.appId].minSize.height),
            };
          });
          return { ...state, windows };
        });
      },

      // ------------------------------------------------------------ Оболочка
      toggleStartMenu: () =>
        this.setState((state) => ({
          ...state,
          startMenuOpen: !state.startMenuOpen,
          taskViewOpen: false,
          actionCenterOpen: false,
        })),
      setStartMenuOpen: (open: boolean) =>
        this.setState((state) => ({ ...state, startMenuOpen: open })),
      toggleTaskView: () =>
        this.setState((state) => ({
          ...state,
          taskViewOpen: !state.taskViewOpen,
          startMenuOpen: false,
          actionCenterOpen: false,
        })),
      setTaskViewOpen: (open: boolean) =>
        this.setState((state) => ({ ...state, taskViewOpen: open })),
      toggleActionCenter: () =>
        this.setState((state) => ({
          ...state,
          actionCenterOpen: !state.actionCenterOpen,
          startMenuOpen: false,
          taskViewOpen: false,
        })),
      setActionCenterOpen: (open: boolean) =>
        this.setState((state) => ({ ...state, actionCenterOpen: open })),
      setPowerState: (powerState: PowerState) =>
        this.setState((state) => ({
          ...state,
          powerState,
          startMenuOpen: false,
          taskViewOpen: false,
          actionCenterOpen: false,
        })),

      // ------------------------------------------------------ Персонализация
      setTheme: (theme: ThemeMode) =>
        this.setState((state) => ({ ...state, prefs: { ...state.prefs, theme } })),
      setAccentColor: (accentColor: string) =>
        this.setState((state) => ({ ...state, prefs: { ...state.prefs, accentColor } })),
      setWallpaper: (wallpaperId: string) =>
        this.setState((state) =>
          WALLPAPERS.some((w) => w.id === wallpaperId)
            ? { ...state, prefs: { ...state.prefs, wallpaperId } }
            : state,
        ),
      cycleWallpaper: () =>
        this.setState((state) => {
          const index = WALLPAPERS.findIndex((w) => w.id === state.prefs.wallpaperId);
          const next = WALLPAPERS[(index + 1 + WALLPAPERS.length) % WALLPAPERS.length];
          return { ...state, prefs: { ...state.prefs, wallpaperId: next.id } };
        }),
      setVolume: (volume: number) =>
        this.setState((state) => ({
          ...state,
          prefs: { ...state.prefs, volume: Math.min(100, Math.max(0, Math.round(volume))) },
        })),
      toggleMute: () =>
        this.setState((state) => ({ ...state, prefs: { ...state.prefs, muted: !state.prefs.muted } })),
      setShowSeconds: (showSeconds: boolean) =>
        this.setState((state) => ({ ...state, prefs: { ...state.prefs, showSeconds } })),

      // --------------------------------------------------- Файловая система
      writeFile: (path: string, content: string) => {
        this.setState((state) => ({
          ...state,
          fileSystem: updateNode(state.fileSystem, path, (node) => {
            if (node && node.kind === 'folder') return node;
            if (node && node.kind === 'text') {
              if (node.content === content) return node;
              return { ...node, content, modifiedAt: Date.now() };
            }
            return { kind: 'text', name: nodeName(path), content, modifiedAt: Date.now() };
          }),
        }));
      },

      createTextFile: (dirPath: string, name?: string) => {
        const dir = normalizePath(dirPath);
        const folder = getNode(this.getState().fileSystem, dir);
        if (!folder || folder.kind !== 'folder') return '';
        const base = name ? name.replace(/\.txt$/i, '') : 'Новый текстовый документ';
        const finalName = uniqueName(this.getState().fileSystem, dir, base, '.txt');
        this.setState((state) => ({
          ...state,
          fileSystem: createTextFileNode(state.fileSystem, dir, finalName),
        }));
        return joinPath(dir, finalName);
      },

      createFolder: (dirPath: string, name?: string) => {
        const dir = normalizePath(dirPath);
        const folder = getNode(this.getState().fileSystem, dir);
        if (!folder || folder.kind !== 'folder') return '';
        const finalName = uniqueName(this.getState().fileSystem, dir, name ?? 'Новая папка', '');
        this.setState((state) => ({
          ...state,
          fileSystem: createFolderNode(state.fileSystem, dir, finalName),
        }));
        return joinPath(dir, finalName);
      },

      renameNode: (path: string, rawName: string) => {
        this.setState((state) => {
          const normalized = normalizePath(path);
          const node = getNode(state.fileSystem, normalized);
          if (!node) return state;
          let newName = rawName.trim();
          if (!newName || /[\\/:*?"<>|]/.test(newName)) return state;
          if (node.kind === 'text' && !/\.txt$/i.test(newName)) newName += '.txt';
          const oldName = nodeName(normalized);
          const parent = parentPath(normalized);
          const folder = getNode(state.fileSystem, parent);
          if (
            folder &&
            folder.kind === 'folder' &&
            folder.children[newName] &&
            newName !== oldName
          ) {
            return state;
          }
          const newPath = joinPath(parent, newName);
          const remap = (value?: string) =>
            value && (value === normalized || value.startsWith(`${normalized}/`))
              ? newPath + value.slice(normalized.length)
              : value;
          return {
            ...state,
            fileSystem: renameNodeInTree(state.fileSystem, normalized, newName),
            windows: state.windows.map((w) => ({
              ...w,
              props: { ...w.props, path: remap(w.props.path), filePath: remap(w.props.filePath) },
              title:
                w.appId === 'notepad' && w.props.filePath === normalized ? newName : w.title,
            })),
          };
        });
      },

      moveToTrash: (path: string) => {
        this.setState((state) => {
          const normalized = normalizePath(path);
          if (PROTECTED_PATHS.includes(normalized)) return state;
          const node = getNode(state.fileSystem, normalized);
          if (!node) return state;

          // Повторное удаление из Корзины — безвозвратное.
          if (normalized.startsWith(`${RECYCLE_PATH}/`)) {
            return this.removeStaleWindows(
              { ...state, fileSystem: deleteNode(state.fileSystem, normalized) },
              normalized,
            );
          }

          const trash = getNode(state.fileSystem, RECYCLE_PATH);
          if (!trash || trash.kind !== 'folder') return state;
          const extension = node.kind === 'text' && /\.txt$/i.test(node.name) ? '.txt' : '';
          const base = extension ? node.name.replace(/\.txt$/i, '') : node.name;
          const name = uniqueName(state.fileSystem, RECYCLE_PATH, base, extension);
          const fileSystem = moveNode(state.fileSystem, normalized, RECYCLE_PATH, name, normalized);
          return this.removeStaleWindows({ ...state, fileSystem }, normalized);
        });
      },

      restoreFromTrash: (path: string) => {
        this.setState((state) => {
          const normalized = normalizePath(path);
          const node = getNode(state.fileSystem, normalized);
          if (!node || !normalized.startsWith(`${RECYCLE_PATH}/`)) return state;
          const target = node.originPath ? parentPath(node.originPath) : DESKTOP_PATH;
          const destination = isFolder(state.fileSystem, target) ? target : DESKTOP_PATH;
          const extension = node.kind === 'text' && /\.txt$/i.test(node.name) ? '.txt' : '';
          const base = extension ? node.name.replace(/\.txt$/i, '') : node.name;
          const name = uniqueName(state.fileSystem, destination, base, extension);
          return {
            ...state,
            fileSystem: moveNode(state.fileSystem, normalized, destination, name),
          };
        });
      },

      emptyTrash: () => {
        this.setState((state) => ({
          ...state,
          fileSystem: clearFolder(state.fileSystem, RECYCLE_PATH),
          windows: state.windows.map((w) =>
            w.appId === 'explorer' && w.props.path?.startsWith(`${RECYCLE_PATH}/`)
              ? { ...w, props: { ...w.props, path: RECYCLE_PATH } }
              : w,
          ),
        }));
      },

      resetFileSystem: () => {
        this.setState((state) => {
          const windows = state.windows.filter(
            (w) => w.appId !== 'notepad' && w.appId !== 'explorer',
          );
          return {
            ...state,
            fileSystem: createDefaultFileSystem(),
            windows,
            activeWindowId: this.activeIdFor(windows),
          };
        });
      },

      reloadFromStorage: () => {
        this.setState((state) => ({
          ...state,
          fileSystem: loadFileSystem(),
          prefs: loadPrefs(),
        }));
      },
    };
  }
}

const OSStoreContext = createContext<OSStore | null>(null);

export function OSProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new OSStore(createInitialState()));

  useEffect(() => {
    let lastFileSystem = store.getState().fileSystem;
    let lastPrefs = store.getState().prefs;
    let timer: number | undefined;

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (state.prefs !== lastPrefs) {
        lastPrefs = state.prefs;
        writeStorage(PREFS_STORAGE_KEY, JSON.stringify(lastPrefs));
      }
      if (state.fileSystem !== lastFileSystem) {
        lastFileSystem = state.fileSystem;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          writeStorage(FS_STORAGE_KEY, JSON.stringify(lastFileSystem));
        }, 180);
      }
    });

    return () => {
      unsubscribe();
      if (timer !== undefined) {
        window.clearTimeout(timer);
        writeStorage(FS_STORAGE_KEY, JSON.stringify(lastFileSystem));
      }
    };
  }, [store]);

  return <OSStoreContext.Provider value={store}>{children}</OSStoreContext.Provider>;
}

function useStore(): OSStore {
  const store = useContext(OSStoreContext);
  if (!store) throw new Error('OSProvider не найден: оберните приложение в <OSProvider>.');
  return store;
}

/** Стабильный объект действий: не вызывает ререндеров у потребителей. */
export function useOSActions(): OSActions {
  return useStore().actions;
}

/**
 * Подписка на срез состояния. Перерисовка происходит только если выбранное
 * селектором значение изменилось (сравнение по Object.is).
 */
export function useOSState<T>(selector: (state: OSState) => T): T {
  const store = useStore();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cacheRef = useRef<{ state: OSState; value: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    const state = store.getState();
    const cache = cacheRef.current;
    if (cache && cache.state === state) return cache.value;
    const nextValue = selectorRef.current(state);
    if (cache && Object.is(cache.value, nextValue)) {
      cacheRef.current = { state, value: cache.value };
      return cache.value;
    }
    cacheRef.current = { state, value: nextValue };
    return nextValue;
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/**
 * Reads the state once without subscribing. Useful for initial values of local
 * state (e.g. loading a Notepad document) so that saving text does not trigger
 * an extra render of the editor.
 */
export function useOSStoreAccessor(): () => OSState {
  const store = useStore();
  return useCallback(() => store.getState(), [store]);
}

/** Удобный доступ ко всему состоянию сразу (используйте точечно). */
export function useOS(): { state: OSState; actions: OSActions } {
  const state = useOSState((s) => s);
  return { state, actions: useOSActions() };
}
