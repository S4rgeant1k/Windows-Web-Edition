import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, LayoutGrid, Maximize2, Minus, Search, X } from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { APPS, APP_IDS } from '../../lib/apps';
import { displayPath, findTextFiles } from '../../lib/filesystem';
import { asset } from '../../lib/assets';
import { ContextMenu, type ContextMenuItem } from '../Common/ContextMenu';
import { SystemTray } from './SystemTray';

interface SearchResult {
  id: string;
  label: string;
  description: string;
  icon: string;
  run: () => void;
}

export function Taskbar() {
  const windows = useOSState((state) => state.windows);
  const activeWindowId = useOSState((state) => state.activeWindowId);
  const startMenuOpen = useOSState((state) => state.startMenuOpen);
  const taskViewOpen = useOSState((state) => state.taskViewOpen);
  const fileSystem = useOSState((state) => state.fileSystem);
  const actions = useOSActions();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [taskMenu, setTaskMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const results = useMemo<SearchResult[]>(() => {
    const text = query.trim().toLocaleLowerCase('ru');
    if (!text) return [];
    const apps: SearchResult[] = APP_IDS.filter((id) => {
      const app = APPS[id];
      return (
        app.title.toLocaleLowerCase('ru').includes(text) ||
        app.keywords.some((word) => word.toLocaleLowerCase('ru').includes(text))
      );
    })
      .slice(0, 4)
      .map((id) => ({
        id: `app-${id}`,
        label: APPS[id].title,
        description: 'Приложение',
        icon: APPS[id].icon,
        run: () => actions.openWindow(id),
      }));
    const files: SearchResult[] = findTextFiles(fileSystem)
      .filter(
        (entry) =>
          entry.name.toLocaleLowerCase('ru').includes(text) ||
          entry.node.kind === 'text' && entry.node.content.toLocaleLowerCase('ru').includes(text),
      )
      .slice(0, 5)
      .map((entry) => ({
        id: `file-${entry.path}`,
        label: entry.name,
        description: displayPath(entry.path),
        icon: asset('icons/file-text.svg'),
        run: () => actions.openWindow('notepad', { filePath: entry.path, title: entry.name }),
      }));
    return [...apps, ...files];
  }, [query, fileSystem, actions]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [searchOpen]);

  const runResult = (result: SearchResult) => {
    result.run();
    setQuery('');
    setSearchOpen(false);
  };

  const taskMenuItems: ContextMenuItem[] = taskMenu
    ? [
        {
          id: 'restore',
          label: 'Развернуть',
          icon: <Maximize2 size={14} />,
          onClick: () => actions.restoreWindow(taskMenu.id),
        },
        {
          id: 'minimize',
          label: 'Свернуть',
          icon: <Minus size={14} />,
          onClick: () => actions.minimizeWindow(taskMenu.id),
        },
        {
          id: 'close',
          label: 'Закрыть окно',
          icon: <X size={14} />,
          dividerBefore: true,
          onClick: () => actions.closeWindow(taskMenu.id),
        },
      ]
    : [];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[95000] flex h-[48px] items-stretch border-t border-white/10 bg-[#101010]/85 text-white backdrop-blur-md">
      {/* Левая секция: Пуск, поиск, представление задач. */}
      <div className="flex shrink-0 items-stretch">
        <button
          type="button"
          data-start-button
          title="Пуск"
          aria-label="Пуск"
          onClick={() => actions.toggleStartMenu()}
          className={`flex w-[48px] items-center justify-center transition-colors ${
            startMenuOpen ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          <img src={asset('icons/windows-logo.svg')} alt="" width={22} height={22} />
        </button>

        <div ref={searchRef} className="relative flex items-center py-[6px] pl-1">
          <div className="flex h-[36px] w-[248px] items-center gap-2 border border-white/15 bg-white/10 px-3 focus-within:border-white/40 focus-within:bg-white/15">
            <Search size={15} className="shrink-0 text-white/75" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setSearchOpen(false);
                  setQuery('');
                  event.currentTarget.blur();
                } else if (event.key === 'Enter' && results.length > 0) {
                  runResult(results[0]);
                  event.currentTarget.blur();
                }
              }}
              placeholder="Поиск в Windows"
              aria-label="Поиск программ и файлов"
              className="h-full min-w-0 flex-1 bg-transparent text-win-base text-white placeholder:text-white/60 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Очистить поиск"
                onClick={() => {
                  setQuery('');
                  setSearchOpen(false);
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {searchOpen && query.trim() && (
            <div className="absolute bottom-[52px] left-1 z-[96000] max-h-[420px] w-[380px] animate-menu-in overflow-y-auto border border-[var(--menu-border)] bg-[var(--menu-bg)] py-2 text-[var(--text-primary)] shadow-window backdrop-blur-xl">
              <div className="px-3 pb-2 text-win-xs uppercase tracking-wide opacity-60">
                Результаты поиска · {results.length}
              </div>
              {results.length === 0 ? (
                <p className="px-3 py-4 text-win-sm opacity-70">
                  Ничего не найдено. Попробуйте другое слово.
                </p>
              ) : (
                results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => runResult(result)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--hover-bg)]"
                  >
                    <img src={result.icon} alt="" width={24} height={24} />
                    <span className="min-w-0">
                      <span className="block truncate text-win-base font-medium">{result.label}</span>
                      <span className="block truncate text-win-xs opacity-60">
                        {result.description}
                      </span>
                    </span>
                    <FileText size={13} className="ml-auto shrink-0 opacity-30" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          title="Представление задач"
          aria-label="Представление задач"
          onClick={() => actions.toggleTaskView()}
          className={`ml-1 flex w-[44px] items-center justify-center transition-colors ${
            taskViewOpen ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          <LayoutGrid size={18} />
        </button>
      </div>

      {/* Центральная секция: запущенные задачи. */}
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto px-2 fluent-scroll">
        {windows.map((win) => {
          const active = win.id === activeWindowId;
          return (
            <button
              key={win.id}
              type="button"
              title={win.title}
              onClick={() => actions.taskbarClick(win.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setTaskMenu({ x: event.clientX, y: event.clientY, id: win.id });
              }}
              className={`relative flex h-full w-[168px] max-w-[168px] shrink-0 items-center gap-2 px-2 transition-colors ${
                active ? 'bg-white/20' : 'hover:bg-white/10'
              } ${win.isMinimized ? 'opacity-60' : ''}`}
            >
              <img src={APPS[win.appId].icon} alt="" width={20} height={20} className="shrink-0" />
              <span className="truncate text-win-xs">{win.title}</span>
              <span
                className={`absolute bottom-0 left-2 right-2 h-[2px] ${
                  active ? 'bg-[var(--accent)]' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Правая секция: системный трей и часы. */}
      <SystemTray />

      {taskMenu && (
        <ContextMenu
          items={taskMenuItems}
          x={taskMenu.x}
          y={taskMenu.y}
          onClose={() => setTaskMenu(null)}
        />
      )}
    </footer>
  );
}
