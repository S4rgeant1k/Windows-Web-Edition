import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronUp, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { Clock } from './Clock';

type Popover = 'volume' | 'network' | 'tray' | null;

export function SystemTray() {
  const actions = useOSActions();
  const volume = useOSState((state) => state.prefs.volume);
  const muted = useOSState((state) => state.prefs.muted);
  const actionCenterOpen = useOSState((state) => state.actionCenterOpen);
  const windowsCount = useOSState((state) => state.windows.length);
  const [popover, setPopover] = useState<Popover>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!popover) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPopover(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [popover]);

  const effectiveVolume = muted ? 0 : volume;

  return (
    <div ref={rootRef} className="relative flex h-full shrink-0 items-stretch">
      <button
        type="button"
        title="Показать скрытые значки"
        aria-label="Скрытые значки"
        onClick={() => setPopover((current) => (current === 'tray' ? null : 'tray'))}
        className="flex w-8 items-center justify-center text-white/90 hover:bg-white/10"
      >
        <ChevronUp size={12} className="opacity-70" />
      </button>
      <button
        type="button"
        title={online ? 'Сеть: подключено' : 'Сеть: нет подключения'}
        aria-label="Сеть"
        onClick={() => setPopover((current) => (current === 'network' ? null : 'network'))}
        className="flex w-8 items-center justify-center text-white/90 hover:bg-white/10"
      >
        {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      </button>
      <button
        type="button"
        title={`Громкость: ${effectiveVolume}%`}
        aria-label="Громкость"
        onClick={() => setPopover((current) => (current === 'volume' ? null : 'volume'))}
        className="flex w-8 items-center justify-center text-white/90 hover:bg-white/10"
      >
        {effectiveVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <Clock />

      <button
        type="button"
        data-action-center-toggle
        title="Центр уведомлений"
        aria-label="Центр уведомлений"
        onClick={() => actions.toggleActionCenter()}
        className={`relative flex w-10 items-center justify-center text-white/90 hover:bg-white/10 ${
          actionCenterOpen ? 'bg-white/15' : ''
        }`}
      >
        <Bell size={16} />
        <span className="absolute bottom-1 right-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </button>

      {popover && (
        <div className="absolute bottom-[52px] right-2 z-[96000] w-[280px] animate-menu-in border border-[var(--menu-border)] bg-[var(--menu-bg)] p-4 text-win-base text-[var(--text-primary)] shadow-window backdrop-blur-xl">
          {popover === 'tray' ? (
            <div className="text-win-sm leading-relaxed">
              <div className="mb-2 font-semibold">Скрытые значки</div>
              <div className="flex justify-between border-b border-[var(--divider)] py-1">
                <span>Открыто окон</span>
                <span className="tabular-nums">{windowsCount}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--divider)] py-1">
                <span>Сеть</span>
                <span>{online ? 'подключено' : 'отключено'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Громкость</span>
                <span className="tabular-nums">{effectiveVolume}%</span>
              </div>
            </div>
          ) : popover === 'volume' ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">Громкость</span>
                <span className="tabular-nums opacity-70">{effectiveVolume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => actions.toggleMute()}
                  title={muted ? 'Включить звук' : 'Выключить звук'}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--input-border)] hover:bg-[var(--hover-bg)]"
                >
                  {effectiveVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={effectiveVolume}
                  onChange={(event) => actions.setVolume(Number(event.target.value))}
                  className="h-1 w-full cursor-pointer accent-[var(--accent)]"
                  aria-label="Уровень громкости"
                />
              </div>
              <p className="mt-3 text-win-xs opacity-60">
                Регулятор управляет эмулируемым уровнем громкости системы.
              </p>
            </>
          ) : (
            <>
              <div className="mb-2 font-semibold">Сеть</div>
              <div className="flex items-center gap-2">
                {online ? <Wifi size={18} /> : <WifiOff size={18} />}
                <span>{online ? 'Подключено к сети' : 'Нет подключения'}</span>
              </div>
              <p className="mt-3 text-win-xs leading-relaxed opacity-70">
                Состояние берётся из браузерного API navigator.onLine и обновляется
                при потере или восстановлении соединения.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
