import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useOSActions, useOSStoreAccessor } from '../../context/OSContext';
import { DOCUMENTS_PATH, displayPath, nodeName, normalizePath, readTextFile } from '../../lib/filesystem';

interface NotepadProps {
  windowId: string;
  filePath?: string;
}

type MenuId = 'file' | 'edit' | 'view';

interface MenuItem {
  label: string;
  shortcut?: string;
  dividerBefore?: boolean;
  onClick: () => void;
}

export function Notepad({ windowId, filePath }: NotepadProps) {
  const actions = useOSActions();
  const getState = useOSStoreAccessor();
  const initialPath = filePath ? normalizePath(filePath) : '';

  const [docPath, setDocPath] = useState(initialPath);
  const [text, setText] = useState(() =>
    initialPath ? (readTextFile(getState().fileSystem, initialPath) ?? '') : '',
  );
  const [fontSize, setFontSize] = useState(14);
  const [wrap, setWrap] = useState(true);
  const [menuOpen, setMenuOpen] = useState<MenuId | null>(null);
  const [status, setStatus] = useState('Готово');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menubarRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(docPath);

  useEffect(() => {
    pathRef.current = docPath;
  }, [docPath]);

  // При переименовании файла Проводником заголовок и содержимое окна обновляются.
  useEffect(() => {
    if (!filePath) return;
    const nextPath = normalizePath(filePath);
    setDocPath(nextPath);
    pathRef.current = nextPath;
    setText(readTextFile(getState().fileSystem, nextPath) ?? '');
    actions.setWindowTitle(windowId, nodeName(nextPath));
  }, [filePath, actions, getState, windowId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menubarRef.current?.contains(event.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  /** Пустой документ при первом вводе автоматически получает файл на диске C:. */
  const ensureFile = useCallback((): string => {
    if (pathRef.current) return pathRef.current;
    const created = actions.createTextFile(DOCUMENTS_PATH, 'Без названия');
    if (!created) return '';
    pathRef.current = created;
    setDocPath(created);
    actions.updateWindowProps(windowId, { filePath: created });
    actions.setWindowTitle(windowId, nodeName(created));
    return created;
  }, [actions, windowId]);

  const updateText = useCallback(
    (value: string) => {
      setText(value);
      const target = ensureFile();
      if (target) {
        actions.writeFile(target, value);
        setStatus(`Сохранено: ${displayPath(target)}`);
      }
    },
    [actions, ensureFile],
  );

  const save = useCallback(() => {
    const target = ensureFile();
    if (!target) return;
    actions.writeFile(target, text);
    setStatus(`Сохранено: ${displayPath(target)}`);
  }, [actions, ensureFile, text]);

  const insertDateTime = useCallback(() => {
    const stamp = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
    const element = textareaRef.current;
    if (!element) {
      updateText(`${text}${stamp}`);
      return;
    }
    const start = element.selectionStart;
    const end = element.selectionEnd;
    updateText(text.slice(0, start) + stamp + text.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + stamp.length, start + stamp.length);
    });
  }, [text, updateText]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      save();
    } else if ((event.ctrlKey || event.metaKey) && key === 'n') {
      event.preventDefault();
      actions.openWindow('notepad');
    } else if (event.key === 'F5') {
      event.preventDefault();
      insertDateTime();
    }
  };

  const menus: { id: MenuId; label: string; items: MenuItem[] }[] = [
    {
      id: 'file',
      label: 'Файл',
      items: [
        {
          label: 'Новое окно',
          shortcut: 'Ctrl+N',
          onClick: () => actions.openWindow('notepad'),
        },
        { label: 'Сохранить', shortcut: 'Ctrl+S', onClick: save },
        {
          label: 'Печать',
          shortcut: 'Ctrl+P',
          dividerBefore: true,
          onClick: () => window.print(),
        },
        { label: 'Закрыть', onClick: () => actions.closeWindow(windowId) },
      ],
    },
    {
      id: 'edit',
      label: 'Правка',
      items: [
        {
          label: 'Выделить всё',
          shortcut: 'Ctrl+A',
          onClick: () => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
          },
        },
        { label: 'Очистить всё', onClick: () => updateText('') },
        {
          label: 'Вставить время и дату',
          shortcut: 'F5',
          dividerBefore: true,
          onClick: insertDateTime,
        },
      ],
    },
    {
      id: 'view',
      label: 'Вид',
      items: [
        {
          label: 'Увеличить',
          onClick: () => setFontSize((size) => Math.min(28, size + 2)),
        },
        {
          label: 'Уменьшить',
          onClick: () => setFontSize((size) => Math.max(10, size - 2)),
        },
        {
          label: wrap ? '✓ Перенос слов' : 'Перенос слов',
          dividerBefore: true,
          onClick: () => setWrap((value) => !value),
        },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] text-win-sm text-[var(--text-primary)]">
      <div
        ref={menubarRef}
        className="flex shrink-0 items-center border-b border-[var(--divider)] bg-[var(--toolbar-bg)] px-1"
      >
        {menus.map((menu) => (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => (current === menu.id ? null : menu.id))}
              className={`px-3 py-1.5 hover:bg-[var(--hover-bg)] ${
                menuOpen === menu.id ? 'bg-[var(--hover-bg)]' : ''
              }`}
            >
              {menu.label}
            </button>
            {menuOpen === menu.id && (
              <div className="absolute left-0 top-full z-50 min-w-[230px] animate-menu-in border border-[var(--menu-border)] bg-[var(--menu-bg)] py-1 shadow-menu backdrop-blur-xl">
                {menu.items.map((item) => (
                  <div key={item.label}>
                    {item.dividerBefore && <div className="my-1 h-px bg-[var(--divider)]" />}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        item.onClick();
                      }}
                      className="flex w-full items-center gap-6 px-3 py-1.5 text-left hover:bg-[var(--accent)] hover:text-white"
                    >
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && <span className="text-win-xs opacity-60">{item.shortcut}</span>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => updateText(event.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        aria-label="Текстовый редактор"
        placeholder="Начните вводить текст — документ создастся и сохранится автоматически."
        className="min-h-0 w-full flex-1 resize-none border-0 bg-[var(--input-bg)] px-3 py-2 outline-none"
        style={{
          fontSize,
          fontFamily: 'Consolas, "Courier New", monospace',
          lineHeight: 1.45,
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          overflowX: wrap ? 'hidden' : 'auto',
        }}
      />

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--divider)] px-3 py-1 text-win-xs opacity-70">
        <span className="truncate">{docPath ? displayPath(docPath) : 'Новый документ'}</span>
        <span className="shrink-0 tabular-nums">
          Строк: {text.split('\n').length} · Символов: {text.length} · UTF-8 ·{' '}
          {Math.round((fontSize / 14) * 100)}%
        </span>
      </div>
      <div className="shrink-0 border-t border-[var(--divider)] px-3 py-0.5 text-win-xs opacity-55">
        {status}
      </div>
    </div>
  );
}
