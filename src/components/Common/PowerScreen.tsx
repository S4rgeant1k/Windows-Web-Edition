import { useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { asset } from '../../lib/assets';

export function PowerScreen() {
  const powerState = useOSState((state) => state.powerState);
  const actions = useOSActions();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (powerState !== 'sleep') return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [powerState]);

  if (powerState === 'on') return null;

  if (powerState === 'sleep') {
    const time = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
    return (
      <button
        type="button"
        onClick={() => actions.setPowerState('on')}
        className="fixed inset-0 z-[200000] flex animate-fade-in flex-col items-center justify-center gap-3 bg-[#04122b]/90 text-white backdrop-blur-xl"
      >
        <span className="text-[86px] font-light tabular-nums">{time}</span>
        <span className="text-win-md opacity-70">
          Спящий режим · нажмите в любом месте, чтобы продолжить
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200000] flex animate-fade-in flex-col items-center justify-center gap-6 bg-black text-white">
      <img src={asset('icons/windows-logo.svg')} alt="" width={72} height={72} className="opacity-80" />
      <p className="text-win-md text-white/70">Компьютер выключен</p>
      <button
        type="button"
        onClick={() => actions.setPowerState('on')}
        className="flex items-center gap-2 border border-white/30 px-6 py-3 text-win-base hover:bg-white/10"
      >
        <Power size={18} /> Включить
      </button>
      <p className="text-win-xs text-white/40">Все файлы и настройки сохранены в localStorage.</p>
    </div>
  );
}
