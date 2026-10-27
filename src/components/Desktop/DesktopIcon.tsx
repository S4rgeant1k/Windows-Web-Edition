import { memo, type MouseEvent, type KeyboardEvent } from 'react';

interface DesktopIconProps {
  icon: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const DesktopIcon = memo(function DesktopIcon({
  icon,
  label,
  selected,
  onSelect,
  onOpen,
  onContextMenu,
}: DesktopIconProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      title={label}
      className={`flex h-[88px] w-[82px] flex-col items-center gap-1 rounded-[2px] border px-1 py-1.5 text-center outline-none ${
        selected
          ? 'border-[var(--accent)]/70 bg-[var(--accent)]/30'
          : 'border-transparent hover:bg-white/10'
      }`}
    >
      <img
        src={icon}
        alt=""
        width={40}
        height={40}
        draggable={false}
        className="pointer-events-none h-10 w-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]"
      />
      <span className="line-clamp-2 break-words text-[12px] leading-[15px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        {label}
      </span>
    </button>
  );
});
