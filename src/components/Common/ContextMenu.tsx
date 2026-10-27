import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  dividerBefore?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const next = {
      left: Math.max(4, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(4, Math.min(y, window.innerHeight - height - 8)),
    };
    setPosition((previous) =>
      previous.left === next.left && previous.top === next.top ? previous : next,
    );
  }, [x, y, items]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Контекстное меню"
      className="fixed z-[100000] min-w-[228px] animate-menu-in overflow-hidden rounded-[3px] border border-[var(--menu-border)] bg-[var(--menu-bg)] py-1 text-win-base text-[var(--text-primary)] shadow-menu backdrop-blur-xl"
      style={{ left: Math.max(4, position.left), top: Math.max(4, position.top) }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.dividerBefore && <div className="my-1 h-px bg-[var(--divider)]" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className="flex w-full items-center gap-3 px-3 py-[7px] text-left transition-colors hover:bg-[var(--accent)] hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-primary)]"
          >
            <span className="flex w-4 shrink-0 justify-center text-win-sm opacity-80">
              {item.icon ?? null}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-win-xs opacity-50">{item.shortcut}</span>}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
