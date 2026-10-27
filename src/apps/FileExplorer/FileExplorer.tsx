import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FilePlus2,
  FolderPlus,
  HardDrive,
  Info,
  PenLine,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { ContextMenu, type ContextMenuItem } from '../../components/Common/ContextMenu';
import { Dialog } from '../../components/Common/Dialog';
import {
  DESKTOP_PATH,
  DOCUMENTS_PATH,
  DOWNLOADS_PATH,
  PICTURES_PATH,
  RECYCLE_PATH,
  ROOT_PATH,
  displayPath,
  formatDate,
  getNode,
  isFolder,
  listFolder,
  nodeName,
  normalizePath,
  parentPath,
} from '../../lib/filesystem';
import type { FsEntry } from '../../types';
import { asset } from '../../lib/assets';

interface FileExplorerProps {
  windowId: string;
  initialPath?: string;
}

interface DialogState {
  title: string;
  message?: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

interface MenuState {
  x: number;
  y: number;
  entry?: FsEntry;
}

const NAV_ITEMS: { label: string; path: string; icon: string; group?: string }[] = [
  { label: 'Рабочий стол', path: DESKTOP_PATH, icon: asset('icons/computer.svg'), group: 'Быстрый доступ' },
  { label: 'Документы', path: DOCUMENTS_PATH, icon: asset('icons/folder.svg') },
  { label: 'Загрузки', path: DOWNLOADS_PATH, icon: asset('icons/downloads.svg') },
  { label: 'Изображения', path: PICTURES_PATH, icon: asset('icons/pictures.svg') },
  { label: 'Этот компьютер (C:)', path: ROOT_PATH, icon: asset('icons/computer.svg'), group: 'Этот компьютер' },
  { label: 'Корзина', path: RECYCLE_PATH, icon: asset('icons/trash.svg') },
];

export function FileExplorer({ windowId, initialPath }: FileExplorerProps) {
  const fileSystem = useOSState((state) => state.fileSystem);
  const actions = useOSActions();
  const [path, setPath] = useState(() => normalizePath(initialPath ?? DESKTOP_PATH));
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const [address, setAddress] = useState(() => displayPath(path));
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    if (initialPath) setPath(normalizePath(initialPath));
  }, [initialPath]);

  useEffect(() => {
    setAddress(displayPath(path));
    setSelectedPath(null);
  }, [path]);

  const navigate = useCallback(
    (next: string) => {
      const target = normalizePath(next);
      if (target === path || !isFolder(fileSystem, target)) return;
      setBackStack((stack) => [...stack, path]);
      setForwardStack([]);
      setPath(target);
      actions.updateWindowProps(windowId, { path: target });
    },
    [actions, fileSystem, path, windowId],
  );

  const goBack = () => {
    if (backStack.length === 0) return;
    const previous = backStack[backStack.length - 1];
    setBackStack((stack) => stack.slice(0, -1));
    setForwardStack((stack) => [...stack, path]);
    setPath(previous);
    actions.updateWindowProps(windowId, { path: previous });
  };

  const goForward = () => {
    if (forwardStack.length === 0) return;
    const next = forwardStack[forwardStack.length - 1];
    setForwardStack((stack) => stack.slice(0, -1));
    setBackStack((stack) => [...stack, path]);
    setPath(next);
    actions.updateWindowProps(windowId, { path: next });
  };

  const goUp = () => {
    if (path === ROOT_PATH) return;
    navigate(parentPath(path));
  };

  const entries = listFolder(fileSystem, path);
  const selected = entries.find((entry) => entry.path === selectedPath) ?? null;
  const isRecycleBin = path === RECYCLE_PATH;

  const openEntry = (entry: FsEntry) => {
    if (isRecycleBin) {
      showProperties(entry);
      return;
    }
    if (entry.node.kind === 'folder') navigate(entry.path);
    else actions.openWindow('notepad', { filePath: entry.path, title: entry.name });
  };

  const showProperties = (entry: FsEntry) => {
    const node = entry.node;
    const type = node.kind === 'folder' ? 'Папка' : 'Текстовый документ';
    const details =
      node.kind === 'text'
        ? `Размер: ${node.content.length} симв.\nИзменён: ${formatDate(node.modifiedAt)}`
        : `Объектов внутри: ${Object.keys(node.children).length}`;
    const origin = node.originPath ? `\nИсходная папка: ${displayPath(parentPath(node.originPath))}` : '';
    setDialog({
      title: 'Свойства',
      message: `${type}\nИмя: ${entry.name}\n${details}\nПуть: ${displayPath(entry.path)}${origin}`,
      confirmLabel: 'Закрыть',
      onConfirm: () => undefined,
    });
  };

  const createTextFile = () => {
    if (isRecycleBin) return;
    const created = actions.createTextFile(path);
    if (created) setSelectedPath(created);
  };

  const openCreateFolderDialog = () => {
    if (isRecycleBin) return;
    setDialog({
      title: 'Новая папка',
      initialValue: 'Новая папка',
      confirmLabel: 'Создать',
      onConfirm: (value) => {
        const created = actions.createFolder(path, value || undefined);
        if (created) setSelectedPath(created);
      },
    });
  };

  const renameSelected = (entry: FsEntry) => {
    if (isRecycleBin) return;
    setDialog({
      title: 'Переименовать',
      initialValue: entry.name,
      confirmLabel: 'Переименовать',
      onConfirm: (value) => {
        if (value) actions.renameNode(entry.path, value);
      },
    });
  };

  const entryMenuItems = (entry: FsEntry): ContextMenuItem[] => [
    {
      id: 'open',
      label: isRecycleBin ? 'Свойства' : 'Открыть',
      icon: <Info size={14} />,
      onClick: () => openEntry(entry),
    },
    {
      id: 'rename',
      label: 'Переименовать',
      icon: <PenLine size={14} />,
      disabled: isRecycleBin,
      onClick: () => renameSelected(entry),
    },
    ...(isRecycleBin
      ? [
          {
            id: 'restore',
            label: 'Восстановить',
            icon: <RotateCcw size={14} />,
            onClick: () => actions.restoreFromTrash(entry.path),
          },
        ]
      : []),
    {
      id: 'delete',
      label: isRecycleBin ? 'Удалить навсегда' : 'Удалить',
      icon: <Trash2 size={14} />,
      dividerBefore: true,
      onClick: () => actions.moveToTrash(entry.path),
    },
    {
      id: 'properties',
      label: 'Свойства',
      icon: <Info size={14} />,
      onClick: () => showProperties(entry),
    },
  ];

  const folderMenuItems: ContextMenuItem[] = [
    {
      id: 'refresh',
      label: 'Обновить',
      icon: <RefreshCw size={14} />,
      onClick: () => actions.reloadFromStorage(),
    },
    {
      id: 'new-text',
      label: 'Создать текстовый документ',
      icon: <FilePlus2 size={14} />,
      disabled: isRecycleBin,
      dividerBefore: true,
      onClick: createTextFile,
    },
    {
      id: 'new-folder',
      label: 'Создать папку',
      icon: <FolderPlus size={14} />,
      disabled: isRecycleBin,
      onClick: openCreateFolderDialog,
    },
    ...(isRecycleBin
      ? [
          {
            id: 'empty',
            label: 'Очистить корзину',
            icon: <Trash2 size={14} />,
            dividerBefore: true,
            onClick: () =>
              setDialog({
                title: 'Очистить корзину',
                message: 'Удалить все объекты без возможности восстановления?',
                confirmLabel: 'Очистить',
                onConfirm: () => actions.emptyTrash(),
              }),
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] text-win-base text-[var(--text-primary)]">
      {/* Панель навигации и адресная строка. */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--divider)] px-2 py-1.5">
        <button type="button" title="Назад" onClick={goBack} disabled={!backStack.length} className="icon-button">
          <ArrowLeft size={16} />
        </button>
        <button type="button" title="Вперёд" onClick={goForward} disabled={!forwardStack.length} className="icon-button">
          <ArrowRight size={16} />
        </button>
        <button type="button" title="Вверх" onClick={goUp} disabled={path === ROOT_PATH} className="icon-button">
          <ArrowUp size={16} />
        </button>
        <button type="button" title="Обновить" onClick={() => actions.reloadFromStorage()} className="icon-button">
          <RefreshCw size={14} />
        </button>
        <div className="mx-1 flex h-[28px] min-w-0 flex-1 items-center gap-2 border border-[var(--input-border)] bg-[var(--input-bg)] px-2">
          <HardDrive size={14} className="shrink-0 opacity-60" />
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              const target = normalizePath(address);
              const node = getNode(fileSystem, target);
              if (node?.kind === 'folder') navigate(target);
              else if (node?.kind === 'text') {
                actions.openWindow('notepad', { filePath: target, title: nodeName(target) });
              } else {
                setAddress(displayPath(path));
              }
            }}
            aria-label="Адресная строка"
            className="h-full min-w-0 flex-1 bg-transparent text-win-sm outline-none"
          />
        </div>
      </div>

      {/* Лента команд. */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--divider)] bg-[var(--toolbar-bg)] px-2 py-1">
        <button type="button" onClick={openCreateFolderDialog} disabled={isRecycleBin} className="command-button">
          <FolderPlus size={15} /> Новая папка
        </button>
        <button type="button" onClick={createTextFile} disabled={isRecycleBin} className="command-button">
          <FilePlus2 size={15} /> Текстовый документ
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--divider)]" />
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && openEntry(selected)}
          className="command-button"
        >
          Открыть
        </button>
        <button
          type="button"
          disabled={!selected || isRecycleBin}
          onClick={() => selected && renameSelected(selected)}
          className="command-button"
        >
          <PenLine size={14} /> Переименовать
        </button>
        {isRecycleBin ? (
          <>
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && actions.restoreFromTrash(selected.path)}
              className="command-button"
            >
              <RotateCcw size={14} /> Восстановить
            </button>
            <button
              type="button"
              onClick={() =>
                setDialog({
                  title: 'Очистить корзину',
                  message: 'Удалить все объекты без возможности восстановления?',
                  confirmLabel: 'Очистить',
                  onConfirm: () => actions.emptyTrash(),
                })
              }
              className="command-button"
            >
              <Trash2 size={14} /> Очистить корзину
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && actions.moveToTrash(selected.path)}
            className="command-button"
          >
            <Trash2 size={14} /> Удалить
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Левая навигационная панель. */}
        <nav className="fluent-scroll w-[180px] shrink-0 overflow-y-auto border-r border-[var(--divider)] bg-[var(--sidebar-bg)] py-2">
          {NAV_ITEMS.map((item) => (
            <div key={item.path}>
              {item.group && (
                <div className="px-3 pb-1 pt-3 text-win-xs font-semibold uppercase tracking-wide opacity-55">
                  {item.group}
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-win-sm hover:bg-[var(--hover-bg)] ${
                  path === item.path ? 'border-l-[3px] border-[var(--accent)] bg-[var(--selected-bg)]' : ''
                }`}
              >
                <img src={item.icon} alt="" width={18} height={18} />
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          ))}
        </nav>

        {/* Основная зона: список файлов и папок. */}
        <div
          className="fluent-scroll min-w-0 flex-1 overflow-auto"
          onContextMenu={(event) => {
            event.preventDefault();
            setSelectedPath(null);
            setMenu({ x: event.clientX, y: event.clientY });
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPath(null);
          }}
        >
          <table className="w-full border-collapse text-win-sm">
            <thead>
              <tr className="border-b border-[var(--divider)] text-left text-win-xs opacity-70">
                <th className="px-3 py-1.5 font-normal">Имя</th>
                <th className="hidden px-3 py-1.5 font-normal sm:table-cell">Дата изменения</th>
                <th className="hidden px-3 py-1.5 font-normal md:table-cell">Тип</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.path}
                  onClick={() => setSelectedPath(entry.path)}
                  onDoubleClick={() => openEntry(entry)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedPath(entry.path);
                    setMenu({ x: event.clientX, y: event.clientY, entry });
                  }}
                  className={`cursor-default select-none border-b border-[var(--divider)]/60 ${
                    selectedPath === entry.path
                      ? 'bg-[var(--accent)]/20 outline outline-1 outline-[var(--accent)]/50'
                      : 'hover:bg-[var(--hover-bg)]'
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <img
                        src={
                          entry.node.kind === 'folder'
                            ? asset('icons/folder.svg')
                            : asset('icons/file-text.svg')
                        }
                        alt=""
                        width={20}
                        height={20}
                      />
                      <span className="truncate">{entry.name}</span>
                    </span>
                  </td>
                  <td className="hidden px-3 py-1.5 opacity-70 sm:table-cell">
                    {entry.node.kind === 'text' ? formatDate(entry.node.modifiedAt) : '—'}
                  </td>
                  <td className="hidden px-3 py-1.5 opacity-70 md:table-cell">
                    {entry.node.kind === 'folder' ? 'Папка с файлами' : 'Текстовый документ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-win-sm opacity-60">
              <HardDrive size={26} />
              <p>{isRecycleBin ? 'Корзина пуста' : 'В этой папке нет объектов'}</p>
              {!isRecycleBin && <p className="text-win-xs">Создайте текстовый документ или папку.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Строка состояния. */}
      <div className="flex shrink-0 items-center justify-between border-t border-[var(--divider)] px-3 py-1 text-win-xs opacity-70">
        <span>
          {entries.length} {entries.length === 1 ? 'объект' : 'объектов'}
          {selected ? ` · выбрано: ${selected.name}` : ''}
        </span>
        <span>{displayPath(path)}</span>
      </div>

      {menu && (
        <ContextMenu
          items={menu.entry ? entryMenuItems(menu.entry) : folderMenuItems}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      )}
      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          initialValue={dialog.initialValue}
          confirmLabel={dialog.confirmLabel}
          onConfirm={dialog.onConfirm}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
