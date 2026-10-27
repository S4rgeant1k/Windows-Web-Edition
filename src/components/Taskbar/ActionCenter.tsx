import { useEffect, useState, type ReactNode } from 'react';
import {
  BellOff,
  Clock3,
  Image as ImageIcon,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';

interface QuickActionProps {
  label: string;
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
}

function QuickAction({ label, active, icon, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[74px] flex-col items-center justify-center gap-1.5 border text-win-xs transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : 'border-[var(--divider)] bg-[var(--button-bg)] hover:bg-[var(--hover-bg)]'
      }`}
    >
      {icon}
      <span className="px-1 text-center leading-tight">{label}</span>
    </button>
  );
}

export function ActionCenter() {
  const open = useOSState((state) => state.actionCenterOpen);
  const prefs = useOSState((state) => state.prefs);
  const windowsCount = useOSState((state) => state.windows.length);
  const actions = useOSActions();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!open) return null;

  const date = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  return (
    <>
      <div
        className="fixed inset-0 z-[91000]"
        onPointerDown={() => actions.setActionCenterOpen(false)}
        onContextMenu={(event) => event.preventDefault()}
        aria-hidden="true"
      />
      <aside
        data-action-center
        className="fixed bottom-[48px] right-0 top-0 z-[92000] flex w-[340px] max-w-[92vw] animate-menu-in flex-col border-l border-[var(--menu-border)] bg-[var(--menu-bg)] text-[var(--text-primary)] shadow-window backdrop-blur-xl"
      >
        <div className="border-b border-[var(--divider)] px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-win-md font-semibold">Центр уведомлений</h2>
            <button
              type="button"
              onClick={() => actions.setActionCenterOpen(false)}
              className="text-win-xs opacity-60 hover:opacity-100"
            >
              Закрыть
            </button>
          </div>
          <p className="mt-1 text-win-xs capitalize opacity-70">
            {date}, {time} · открыто окон: {windowsCount}
          </p>
        </div>

        <div className="border-b border-[var(--divider)] p-4">
          <h3 className="mb-3 text-win-sm font-semibold opacity-80">Быстрые действия</h3>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction
              label={prefs.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              active={prefs.theme === 'dark'}
              icon={prefs.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              onClick={() => actions.setTheme(prefs.theme === 'dark' ? 'light' : 'dark')}
            />
            <QuickAction
              label="Сменить обои"
              icon={<ImageIcon size={20} />}
              onClick={() => actions.cycleWallpaper()}
            />
            <QuickAction
              label={prefs.muted ? 'Включить звук' : 'Без звука'}
              active={prefs.muted}
              icon={prefs.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              onClick={() => actions.toggleMute()}
            />
            <QuickAction
              label={prefs.showSeconds ? 'Скрыть секунды' : 'Показать секунды'}
              active={prefs.showSeconds}
              icon={<Clock3 size={20} />}
              onClick={() => actions.setShowSeconds(!prefs.showSeconds)}
            />
            <QuickAction
              label="Все параметры"
              icon={<SettingsIcon size={20} />}
              onClick={() => actions.openWindow('settings')}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <BellOff size={30} className="opacity-30" />
          <p className="text-win-base font-semibold">Уведомлений нет</p>
          <p className="text-win-sm leading-relaxed opacity-60">
            Системные сообщения появятся здесь. Настройки темы, обоев и часов доступны
            в быстрых действиях выше.
          </p>
        </div>
      </aside>
    </>
  );
}
