import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Clock3,
  FileText,
  FolderOpen,
  Globe2,
  Power,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { APPS, APPS_ALPHABETICAL, appLetter } from '../../lib/apps';
import { countFiles, getNode, joinPath, DOCUMENTS_PATH, DESKTOP_PATH } from '../../lib/filesystem';
import { asset } from '../../lib/assets';

interface TileProps {
  label: string;
  value: string;
  icon?: ReactNode;
  className: string;
  wide?: boolean;
  onClick: () => void;
}

function Tile({ label, value, icon, className, wide, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col justify-between overflow-hidden p-2.5 text-left text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.98] ${
        wide ? 'col-span-2' : ''
      } ${className}`}
    >
      <span className="text-win-xs font-semibold">{label}</span>
      {icon && <span className="absolute right-2 top-2 opacity-80">{icon}</span>}
      <span className="text-win-md font-semibold leading-tight drop-shadow-sm">{value}</span>
    </button>
  );
}

export function StartMenu() {
  const open = useOSState((state) => state.startMenuOpen);
  const fileSystem = useOSState((state) => state.fileSystem);
  const prefs = useOSState((state) => state.prefs);
  const actions = useOSActions();
  const [powerOpen, setPowerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const powerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!powerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!powerRef.current?.contains(event.target as Node)) setPowerOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [powerOpen]);

  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    ...(prefs.showSeconds ? { second: '2-digit' } : {}),
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(now);

  const openDailyNote = () => {
    const path = joinPath(DOCUMENTS_PATH, 'Ежедневник.txt');
    if (!getNode(fileSystem, path)) actions.createTextFile(DOCUMENTS_PATH, 'Ежедневник');
    actions.openWindow('notepad', { filePath: path, title: 'Ежедневник.txt' });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[88000]"
          onPointerDown={() => actions.setStartMenuOpen(false)}
          onContextMenu={(event) => event.preventDefault()}
          aria-hidden="true"
        />
      )}
      <div
        data-start-menu
        aria-hidden={!open}
        className={`fixed bottom-[48px] left-0 z-[90000] flex h-[560px] max-h-[calc(100vh-56px)] w-[660px] max-w-[96vw] border border-[var(--menu-border)] bg-[var(--menu-bg)] text-[var(--text-primary)] shadow-window backdrop-blur-xl transition-all duration-200 ease-out ${
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {/* Левая узкая полоса: профиль, настройки, питание. */}
        <div className="flex w-[52px] shrink-0 flex-col items-center justify-between border-r border-[var(--divider)] bg-[var(--start-rail)] py-3">
          <button
            type="button"
            title="Пользователь — открыть настройки"
            onClick={() => actions.openWindow('settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--hover-bg)]"
          >
            <img src={asset('icons/user.svg')} alt="Пользователь" className="h-8 w-8 rounded-full" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              title="Настройки"
              onClick={() => actions.openWindow('settings')}
              className="flex h-10 w-[44px] items-center justify-center hover:bg-[var(--hover-bg)]"
            >
              <SettingsIcon size={19} />
            </button>
            <div ref={powerRef} className="relative">
              <button
                type="button"
                data-power-button
                title="Питание"
                onClick={() => setPowerOpen((value) => !value)}
                className={`flex h-10 w-[44px] items-center justify-center hover:bg-[var(--hover-bg)] ${
                  powerOpen ? 'bg-[var(--hover-bg)]' : ''
                }`}
              >
                <Power size={19} />
              </button>
              {powerOpen && (
                <div
                  data-power-menu
                  className="absolute bottom-11 left-0 z-10 w-[200px] animate-menu-in border border-[var(--menu-border)] bg-[var(--menu-bg)] py-1 shadow-menu backdrop-blur-xl"
                >
                  {[
                    {
                      label: 'Спящий режим',
                      action: () => actions.setPowerState('sleep'),
                    },
                    {
                      label: 'Перезагрузка',
                      action: () => window.location.reload(),
                    },
                    {
                      label: 'Завершение работы',
                      action: () => actions.setPowerState('off'),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setPowerOpen(false);
                        item.action();
                      }}
                      className="block w-full px-4 py-2 text-left text-win-sm hover:bg-[var(--accent)] hover:text-white"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Средняя колонка: алфавитный список всех программ. */}
        <div className="flex w-[248px] shrink-0 flex-col border-r border-[var(--divider)] px-3 py-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-win-md font-semibold">Все приложения</h2>
            <span className="text-win-xs opacity-60">А–Я</span>
          </div>
          <div className="fluent-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            {APPS_ALPHABETICAL.map((id, index) => {
              const letter = appLetter(id);
              const previous = index > 0 ? appLetter(APPS_ALPHABETICAL[index - 1]) : null;
              const app = APPS[id];
              return (
                <Fragment key={id}>
                  {letter !== previous && (
                    <div className="px-2 pb-1 pt-3 text-win-xs font-semibold uppercase opacity-55">
                      {letter}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => actions.openWindow(id)}
                    className="flex w-full items-center gap-3 rounded-[2px] px-2 py-1.5 text-left text-win-base hover:bg-[var(--hover-bg)]"
                  >
                    <img src={app.icon} alt="" width={22} height={22} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{app.title}</span>
                      <span className="block truncate text-win-xs opacity-55">{app.subtitle}</span>
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
          <div className="border-t border-[var(--divider)] pt-3 text-win-xs leading-relaxed opacity-60">
            Всего программ: {APPS_ALPHABETICAL.length}. Нажмите Win, чтобы скрыть меню.
          </div>
        </div>

        {/* Правая зона: интерактивные «живые плитки». */}
        <div className="min-w-0 flex-1 px-4 py-4">
          <h2 className="mb-3 text-win-md font-semibold">Закреплённые плитки</h2>
          <div className="grid grid-cols-4 gap-2" style={{ gridAutoRows: '88px' }}>
            <Tile
              label="Часы"
              value={time}
              wide
              className="bg-[var(--accent)]"
              icon={<Clock3 size={20} />}
              onClick={() => actions.setShowSeconds(!prefs.showSeconds)}
            />
            <Tile
              label={weekday}
              value={dateLabel}
              className="bg-[#B7473A]"
              icon={<CalendarDays size={18} />}
              onClick={openDailyNote}
            />
            <Tile
              label="Проводник"
              value={`${countFiles(fileSystem)} файлов`}
              className="bg-[#107C41]"
              icon={<FolderOpen size={18} />}
              onClick={() => actions.openWindow('explorer', { path: DESKTOP_PATH })}
            />
            <Tile
              label="Браузер"
              value="Домашняя страница"
              wide
              className="bg-[#0778D4]"
              icon={<Globe2 size={20} />}
              onClick={() => actions.openWindow('browser')}
            />
            <Tile
              label="Блокнот"
              value="Новая заметка"
              className="bg-[#5B2E83]"
              icon={<FileText size={18} />}
              onClick={() => actions.openWindow('notepad')}
            />
            <Tile
              label="Настройки"
              value={prefs.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
              className="bg-[#4B5563]"
              icon={<SettingsIcon size={18} />}
              onClick={() => actions.openWindow('settings')}
            />
          </div>
          <p className="mt-4 text-win-xs leading-relaxed opacity-60">
            Плитки показывают реальные данные системы. Часы переключают секунды на панели
            задач, календарь открывает ежедневник, Проводник считает файлы на диске C:.
          </p>
        </div>
      </div>
    </>
  );
}
