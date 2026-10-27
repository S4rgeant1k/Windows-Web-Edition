import { X } from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { APPS } from '../../lib/apps';

export function TaskView() {
  const open = useOSState((state) => state.taskViewOpen);
  const windows = useOSState((state) => state.windows);
  const activeWindowId = useOSState((state) => state.activeWindowId);
  const actions = useOSActions();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bottom-[48px] z-[86000] flex flex-wrap content-center items-center justify-center gap-5 bg-black/45 p-8 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) actions.setTaskViewOpen(false);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {windows.length === 0 ? (
        <div className="rounded-sm border border-white/20 bg-black/40 px-8 py-6 text-center text-white">
          <p className="text-win-lg font-light">Нет открытых окон</p>
          <p className="mt-2 text-win-sm text-white/70">
            Запустите приложение из меню «Пуск» или с рабочего стола.
          </p>
        </div>
      ) : (
        windows.map((win) => (
          <div
            key={win.id}
            className={`group relative flex h-[170px] w-[240px] flex-col items-center justify-center gap-3 border bg-[var(--menu-bg)] text-[var(--text-primary)] shadow-window transition-transform hover:-translate-y-1 ${
              win.id === activeWindowId
                ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                : 'border-[var(--menu-border)]'
            }`}
          >
            <button
              type="button"
              onClick={() => actions.focusWindow(win.id)}
              className="flex flex-1 flex-col items-center justify-center gap-3"
            >
              <img src={APPS[win.appId].icon} alt="" width={48} height={48} />
              <span className="max-w-[200px] truncate text-win-base font-medium">{win.title}</span>
              <span className="text-win-xs opacity-60">
                {win.isMinimized ? 'Свёрнуто' : win.id === activeWindowId ? 'Активно' : 'Открыто'}
              </span>
            </button>
            <button
              type="button"
              title="Закрыть окно"
              onClick={() => actions.closeWindow(win.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center opacity-50 hover:bg-[#E81123] hover:text-white hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
