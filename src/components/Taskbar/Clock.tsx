import { useEffect, useState } from 'react';
import { useOSActions, useOSState } from '../../context/OSContext';

export function Clock() {
  const showSeconds = useOSState((state) => state.prefs.showSeconds);
  const actions = useOSActions();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
  }).format(now);
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const full = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return (
    <button
      type="button"
      data-action-center-toggle
      title={full}
      onClick={() => actions.toggleActionCenter()}
      className="flex h-full flex-col items-end justify-center px-2 text-right text-win-xs leading-[16px] text-white hover:bg-white/10"
    >
      <span className="tabular-nums">{time}</span>
      <span className="tabular-nums">{date}</span>
    </button>
  );
}
