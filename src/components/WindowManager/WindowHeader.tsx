import { memo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import type { AppId } from '../../types';
import { APPS } from '../../lib/apps';

export interface HeaderPointerProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
}

interface WindowHeaderProps {
  appId: AppId;
  title: string;
  isActive: boolean;
  isMaximized: boolean;
  dragProps: HeaderPointerProps;
  onDoubleClick: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}

function ControlButton({ label, onClick, danger, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-full w-[45px] items-center justify-center transition-colors ${
        danger ? 'hover:bg-[#E81123] hover:text-white' : 'hover:bg-[var(--header-button-hover)]'
      }`}
    >
      {children}
    </button>
  );
}

export const WindowHeader = memo(function WindowHeader({
  appId,
  title,
  isActive,
  isMaximized,
  dragProps,
  onDoubleClick,
  onMinimize,
  onMaximize,
  onClose,
}: WindowHeaderProps) {
  return (
    <div
      {...dragProps}
      onDoubleClick={onDoubleClick}
      className={`flex h-[30px] shrink-0 touch-none select-none items-center justify-between border-b text-win-sm ${
        isActive
          ? 'border-[var(--header-border-active)] bg-[var(--header-active)] text-[var(--text-primary)]'
          : 'border-[var(--header-border)] bg-[var(--header-inactive)] text-[var(--text-muted)]'
      }`}
      style={{ cursor: isMaximized ? 'default' : 'move' }}
    >
      <div className="flex min-w-0 items-center gap-2 pl-2">
        <img src={APPS[appId].icon} alt="" width={16} height={16} draggable={false} />
        <span className="truncate">{title}</span>
      </div>
      <div className="flex h-full shrink-0 items-stretch">
        <ControlButton label="Свернуть" onClick={onMinimize}>
          <Minus size={12} strokeWidth={1.6} />
        </ControlButton>
        <ControlButton
          label={isMaximized ? 'Свернуть в окно' : 'Развернуть'}
          onClick={onMaximize}
        >
          {isMaximized ? <Copy size={11} strokeWidth={1.6} /> : <Square size={10} strokeWidth={1.6} />}
        </ControlButton>
        <ControlButton label="Закрыть" onClick={onClose} danger>
          <X size={13} strokeWidth={1.6} />
        </ControlButton>
      </div>
    </div>
  );
});
