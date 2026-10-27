import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { ArrowUpRight, Info, PenLine, Trash2 } from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { ContextMenu } from './ContextMenu';
import { DesktopIcon } from './DesktopIcon';
import type { ContextMenuItem } from '../Common/ContextMenu';
import { Dialog } from '../Common/Dialog';
import { getWallpaper } from '../../lib/wallpapers';
import { asset } from '../../lib/assets';
import {
  DESKTOP_PATH,
  DOCUMENTS_PATH,
  RECYCLE_PATH,
  ROOT_PATH,
  displayPath,
  formatDate,
  getNode,
  listFolder,
  nodeName,
} from '../../lib/filesystem';
import type { AppId, OpenWindowOptions } from '../../types';

interface Shortcut {
  id: string;
  label: string;
  icon: string;
  appId: AppId;
  options?: OpenWindowOptions;
}

const SHORTCUTS: Shortcut[] = [
  {
    id: 'pc',
    label: 'Этот компьютер',
    icon: asset('icons/computer.svg'),
    appId: 'explorer',
    options: { path: ROOT_PATH, title: 'Этот компьютер' },
  },
  {
    id: 'recycle',
    label: 'Корзина',
    icon: asset('icons/trash.svg'),
    appId: 'explorer',
    options: { path: RECYCLE_PATH, title: 'Корзина' },
  },
  {
    id: 'documents',
    label: 'Документы',
    icon: asset('icons/folder.svg'),
    appId: 'explorer',
    options: { path: DOCUMENTS_PATH, title: 'Документы' },
  },
  {
    id: 'notepad',
    label: 'Блокнот',
    icon: asset('icons/notepad.svg'),
    appId: 'notepad',
  },
  {
    id: 'browser',
    label: 'Браузер',
    icon: asset('icons/browser.svg'),
    appId: 'browser',
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: asset('icons/settings.svg'),
    appId: 'settings',
  },
];

interface MenuState {
  x: number;
  y: number;
  target?: { kind: 'file' | 'shortcut'; path?: string; shortcutId?: string };
}

interface DialogState {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

export function Desktop() {
  const fileSystem = useOSState((state) => state.fileSystem);
  const wallpaperId = useOSState((state) => state.prefs.wallpaperId);
  const actions = useOSActions();
  const wallpaper = getWallpaper(wallpaperId);

  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const entries = listFolder(fileSystem, DESKTOP_PATH);

  const openShortcut = useCallback(
    (shortcut: Shortcut) => actions.openWindow(shortcut.appId, shortcut.options ?? {}),
    [actions],
  );

  const openPath = useCallback(
    (path: string) => {
      const node = getNode(fileSystem, path);
      if (!node) return;
      if (node.kind === 'folder') actions.openWindow('explorer', { path });
      else actions.openWindow('notepad', { filePath: path, title: node.name });
    },
    [actions, fileSystem],
  );

  const showProperties = useCallback(
    (path: string) => {
      const node = getNode(fileSystem, path);
      if (!node) return;
      const type = node.kind === 'folder' ? 'Папка' : 'Текстовый документ (.txt)';
      const size =
        node.kind === 'text'
          ? `Размер: ${node.content.length} симв. · Изменён: ${formatDate(node.modifiedAt)}`
          : `Объектов внутри: ${Object.keys(node.children).length}`;
      setDialog({
        title: 'Свойства',
        message: `${type}\nИмя: ${node.name}\n${size}\nРасположение: ${displayPath(path)}`,
        confirmLabel: 'Закрыть',
        onConfirm: () => undefined,
      });
    },
    [fileSystem],
  );

  const targetItems: ContextMenuItem[] = (() => {
    if (!menu?.target) return [];
    const { kind, path, shortcutId } = menu.target;
    if (kind === 'shortcut') {
      const shortcut = SHORTCUTS.find((item) => item.id === shortcutId);
      if (!shortcut) return [];
      const items: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Открыть',
          icon: <ArrowUpRight size={14} />,
          onClick: () => openShortcut(shortcut),
        },
      ];
      if (shortcut.id === 'recycle') {
        items.push({
          id: 'empty-trash',
          label: 'Очистить корзину',
          icon: <Trash2 size={14} />,
          onClick: () =>
            setDialog({
              title: 'Очистить корзину',
              message: 'Удалить все объекты из Корзины без возможности восстановления?',
              confirmLabel: 'Очистить',
              onConfirm: () => actions.emptyTrash(),
            }),
        });
      }
      return items;
    }
    if (!path) return [];
    return [
      { id: 'open', label: 'Открыть', icon: <ArrowUpRight size={14} />, onClick: () => openPath(path) },
      {
        id: 'rename',
        label: 'Переименовать',
        icon: <PenLine size={14} />,
        onClick: () =>
          setDialog({
            title: 'Переименовать',
            initialValue: nodeName(path),
            confirmLabel: 'Переименовать',
            onConfirm: (value) => {
              if (value) actions.renameNode(path, value);
            },
          }),
      },
      {
        id: 'delete',
        label: 'Удалить',
        icon: <Trash2 size={14} />,
        onClick: () => actions.moveToTrash(path),
      },
      {
        id: 'properties',
        label: 'Свойства',
        icon: <Info size={14} />,
        dividerBefore: true,
        onClick: () => showProperties(path),
      },
    ];
  })();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;
      if (typing) return;
      if (event.key === 'Delete' && selected?.startsWith('C:/')) {
        actions.moveToTrash(selected);
        setSelected(null);
      } else if (event.key === 'Escape') {
        setSelected(null);
        setMenu(null);
      } else if (event.key === 'F5') {
        event.preventDefault();
        actions.reloadFromStorage();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actions, selected]);

  const onDesktopContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSelected(null);
    setMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onContextMenu={onDesktopContextMenu}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelected(null);
          setMenu(null);
        }
      }}
    >
      {/* Обои: абсолютное позиционирование, центр экрана, режим cover. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#0078D7] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${wallpaper.src})` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />

      {/* Сетка иконок: сверху вниз вдоль левого края, затем следующий столбец. */}
      <div
        className="absolute left-2 top-2 grid gap-1"
        style={{
          gridTemplateRows: 'repeat(6, 88px)',
          gridAutoFlow: 'column',
          gridAutoColumns: '82px',
        }}
      >
        {SHORTCUTS.map((shortcut) => (
          <DesktopIcon
            key={shortcut.id}
            icon={shortcut.icon}
            label={shortcut.label}
            selected={selected === shortcut.id}
            onSelect={() => setSelected(shortcut.id)}
            onOpen={() => openShortcut(shortcut)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelected(shortcut.id);
              setMenu({
                x: event.clientX,
                y: event.clientY,
                target: { kind: 'shortcut', shortcutId: shortcut.id },
              });
            }}
          />
        ))}
        {entries.map((entry) => (
          <DesktopIcon
            key={entry.path}
            icon={entry.node.kind === 'folder' ? asset('icons/folder.svg') : asset('icons/file-text.svg')}
            label={entry.name}
            selected={selected === entry.path}
            onSelect={() => setSelected(entry.path)}
            onOpen={() => openPath(entry.path)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelected(entry.path);
              setMenu({
                x: event.clientX,
                y: event.clientY,
                target: { kind: 'file', path: entry.path },
              });
            }}
          />
        ))}
      </div>

      {/* Подсказка в правом нижнем углу, как активация Windows. */}
      <div className="pointer-events-none absolute bottom-3 right-4 text-right text-[11px] leading-tight text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        <div className="font-semibold">Windows 10 Web Edition</div>
        <div>Редакция для браузера · {entries.length} объектов на рабочем столе</div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          targetItems={targetItems}
          onClose={closeMenu}
          onRefresh={() => {
            actions.reloadFromStorage();
            setSelected(null);
          }}
          onChangeWallpaper={() => actions.cycleWallpaper()}
          onCreateTextFile={() => {
            const path = actions.createTextFile(DESKTOP_PATH);
            if (path) setSelected(path);
          }}
          onCreateFolder={() =>
            setDialog({
              title: 'Новая папка',
              initialValue: 'Новая папка',
              confirmLabel: 'Создать',
              onConfirm: (value) => actions.createFolder(DESKTOP_PATH, value || undefined),
            })
          }
          onOpenSettings={() => actions.openWindow('settings')}
        />
      )}

      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          initialValue={dialog.initialValue}
          placeholder={dialog.placeholder}
          confirmLabel={dialog.confirmLabel}
          onConfirm={dialog.onConfirm}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
