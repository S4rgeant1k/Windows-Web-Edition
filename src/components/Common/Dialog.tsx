import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
  title: string;
  message?: string;
  /** Если undefined — диалог без поля ввода (подтверждение действия). */
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function Dialog({
  title,
  message,
  initialValue,
  placeholder,
  confirmLabel = 'ОК',
  cancelLabel = 'Отмена',
  onConfirm,
  onClose,
}: DialogProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialValue !== undefined) inputRef.current?.select();
  }, [initialValue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const confirm = () => {
    onConfirm(value.trim());
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100001] flex animate-fade-in items-center justify-center bg-black/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-[380px] max-w-[92vw] animate-menu-in border border-[var(--accent)] bg-[var(--dialog-bg)] shadow-window"
      >
        <div className="flex h-8 items-center justify-between bg-[var(--accent)] px-3 text-win-sm text-white">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center text-base leading-none hover:bg-white/20"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="p-5 text-win-base text-[var(--text-primary)]">
          {message && <p className="mb-3 whitespace-pre-line leading-relaxed">{message}</p>}
          {initialValue !== undefined && (
            <input
              ref={inputRef}
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirm();
              }}
              className="w-full border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 outline-none focus:border-[var(--accent)]"
            />
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={confirm}
              className="min-w-[90px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-win-sm text-white hover:brightness-110"
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[90px] border border-[var(--input-border)] bg-[var(--button-bg)] px-3 py-1.5 text-win-sm hover:bg-[var(--hover-bg)]"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
