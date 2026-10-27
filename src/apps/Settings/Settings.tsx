import { useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  HardDrive,
  Info,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { ACCENT_COLORS, WALLPAPERS } from '../../lib/wallpapers';
import { DESKTOP_PATH, countFiles, getNode, nodeName } from '../../lib/filesystem';
import { Dialog } from '../../components/Common/Dialog';

type Tab = 'system' | 'personalization' | 'about';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'system', label: 'Система', icon: <Monitor size={17} /> },
  { id: 'personalization', label: 'Персонализация', icon: <Palette size={17} /> },
  { id: 'about', label: 'О системе', icon: <Info size={17} /> },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-1 text-win-md font-semibold">{title}</h3>
      {description && <p className="mb-3 text-win-sm opacity-65">{description}</p>}
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between border border-[var(--input-border)] bg-[var(--button-bg)] px-3 py-2.5 text-left hover:bg-[var(--hover-bg)]"
    >
      <span className="text-win-sm">{label}</span>
      <span
        className={`relative h-[20px] w-[40px] rounded-full border transition-colors ${
          checked ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--input-border)] bg-[var(--input-bg)]'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  );
}

export function Settings() {
  const prefs = useOSState((state) => state.prefs);
  const fileSystem = useOSState((state) => state.fileSystem);
  const windowsCount = useOSState((state) => state.windows.length);
  const actions = useOSActions();
  const [tab, setTab] = useState<Tab>('system');
  const [resetOpen, setResetOpen] = useState(false);

  const storageKb = useMemo(() => {
    try {
      const raw = localStorage.getItem('wwe.filesystem.v1') ?? '';
      return (new Blob([raw]).size / 1024).toFixed(1);
    } catch {
      return '0.0';
    }
  }, [fileSystem]);

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="shrink-0 border-b border-[var(--divider)] bg-[var(--accent)] px-5 py-3 text-white">
        <h1 className="text-win-lg font-light">Настройки</h1>
        <p className="text-win-xs opacity-85">Windows 10 Web Edition · параметры системы</p>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav className="w-[190px] shrink-0 border-r border-[var(--divider)] bg-[var(--sidebar-bg)] py-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-win-sm hover:bg-[var(--hover-bg)] ${
                tab === item.id ? 'border-l-[3px] border-[var(--accent)] bg-[var(--selected-bg)]' : ''
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="fluent-scroll min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === 'system' && (
            <>
              <Section title="Режим приложений" description="Светлая и тёмная тема оформления окон, меню и приложений.">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'light' as const, label: 'Светлая', icon: <Sun size={20} /> },
                    { id: 'dark' as const, label: 'Тёмная', icon: <Moon size={20} /> },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => actions.setTheme(option.id)}
                      className={`border p-3 text-left transition-colors ${
                        prefs.theme === option.id
                          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                          : 'border-[var(--input-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <div
                        className={`mb-3 flex h-[62px] items-end rounded-sm border p-1 ${
                          option.id === 'light'
                            ? 'border-gray-300 bg-gradient-to-br from-sky-100 to-white'
                            : 'border-gray-600 bg-gradient-to-br from-slate-800 to-slate-950'
                        }`}
                      >
                        <span
                          className={`block h-[18px] w-full rounded-sm ${
                            option.id === 'light' ? 'bg-white/90' : 'bg-slate-700'
                          }`}
                          style={{ borderTop: `3px solid ${prefs.accentColor}` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-win-sm font-medium">
                        {option.icon}
                        {option.label}
                        {prefs.theme === option.id && <Check size={14} className="ml-auto text-[var(--accent)]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Часы и звук" description="Настройки панели задач и системной громкости.">
                <div className="space-y-2">
                  <Toggle
                    checked={prefs.showSeconds}
                    onChange={actions.setShowSeconds}
                    label="Показывать секунды в часах (ЧЧ:ММ:СС)"
                  />
                  <div className="flex items-center gap-3 border border-[var(--input-border)] bg-[var(--button-bg)] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={actions.toggleMute}
                      title={prefs.muted ? 'Включить звук' : 'Выключить звук'}
                      className="flex h-8 w-8 items-center justify-center border border-[var(--input-border)] hover:bg-[var(--hover-bg)]"
                    >
                      {prefs.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={prefs.muted ? 0 : prefs.volume}
                      onChange={(event) => actions.setVolume(Number(event.target.value))}
                      className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
                      aria-label="Громкость"
                    />
                    <span className="w-[46px] text-right text-win-sm tabular-nums">
                      {prefs.muted ? 0 : prefs.volume}%
                    </span>
                  </div>
                </div>
              </Section>

              <Section title="Обслуживание" description="Виртуальный диск C: хранится в localStorage вашего браузера.">
                <div className="flex flex-wrap items-center gap-3 border border-[var(--input-border)] bg-[var(--button-bg)] p-3">
                  <div className="min-w-[180px] flex-1 text-win-sm">
                    <div className="font-medium">Файлов на диске: {countFiles(fileSystem)}</div>
                    <div className="opacity-65">Занимаемое место: {storageKb} КБ</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetOpen(true)}
                    className="flex items-center gap-2 border border-[var(--input-border)] px-3 py-2 text-win-sm hover:bg-[var(--hover-bg)]"
                  >
                    <RotateCcw size={14} /> Сбросить файловую систему
                  </button>
                </div>
              </Section>
            </>
          )}

          {tab === 'personalization' && (
            <>
              <Section title="Акцентный цвет" description="Официальный цвет Windows 10 — #0078D7. Изменение применяется ко всем окнам и меню.">
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={`${color.label} · ${color.value}`}
                      onClick={() => actions.setAccentColor(color.value)}
                      className={`flex h-[46px] w-[46px] items-center justify-center border-2 transition-transform hover:scale-105 ${
                        prefs.accentColor === color.value
                          ? 'border-[var(--text-primary)]'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      {prefs.accentColor === color.value && <Check size={18} className="text-white" />}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-win-sm">
                  Текущий цвет: <span className="font-mono">{prefs.accentColor}</span>
                </p>
              </Section>

              <Section title="Фон рабочего стола" description="Обои можно также менять через контекстное меню рабочего стола.">
                <div className="grid grid-cols-3 gap-3">
                  {WALLPAPERS.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      type="button"
                      onClick={() => actions.setWallpaper(wallpaper.id)}
                      className={`overflow-hidden border text-left transition-transform hover:-translate-y-0.5 ${
                        prefs.wallpaperId === wallpaper.id
                          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]'
                          : 'border-[var(--input-border)]'
                      }`}
                    >
                      <span
                        className="block h-[86px] bg-cover bg-center"
                        style={{ backgroundImage: `url(${wallpaper.src})` }}
                      />
                      <span className="block bg-[var(--button-bg)] px-2 py-1.5 text-win-xs">
                        {wallpaper.label}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={actions.cycleWallpaper}
                  className="mt-3 border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-win-sm text-white hover:brightness-110"
                >
                  Следующие обои
                </button>
              </Section>
            </>
          )}

          {tab === 'about' && (
            <>
              <Section title="Windows 10 Web Edition" description="Полностью браузерная эмуляция рабочего стола: окна, файловая система, приложения.">
                <div className="border border-[var(--input-border)] bg-[var(--button-bg)] text-win-sm">
                  {[
                    ['Версия', '1.0.0 (Web Edition)'],
                    ['Сборка', '2026.10 · React 18 + TypeScript'],
                    ['Стек', 'Vite · Tailwind CSS · Lucide React'],
                    ['Хранилище', 'localStorage (диск C: и настройки)'],
                    ['Файлов на диске C:', String(countFiles(fileSystem))],
                    ['Открыто окон', String(windowsCount)],
                    ['Язык браузера', navigator.language],
                    ['Платформа', navigator.platform || 'не определена'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-[var(--divider)] px-3 py-2 last:border-b-0">
                      <span className="opacity-65">{label}</span>
                      <span className="text-right font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Быстрый доступ" description="Откройте приложения или ознакомьтесь с возможностями системы.">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actions.openWindow('explorer', { path: DESKTOP_PATH })}
                    className="flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-win-sm text-white hover:brightness-110"
                  >
                    <HardDrive size={15} /> Открыть Проводник
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const welcomePath = 'C:/Users/Desktop/Добро пожаловать.txt';
                      const path = getNode(fileSystem, welcomePath)
                        ? welcomePath
                        : actions.createTextFile(DESKTOP_PATH, 'Добро пожаловать');
                      actions.openWindow('notepad', {
                        filePath: path,
                        title: nodeName(path),
                      });
                    }}
                    className="border border-[var(--input-border)] px-4 py-2 text-win-sm hover:bg-[var(--hover-bg)]"
                  >
                    Открыть справку в Блокноте
                  </button>
                </div>
              </Section>

              <Section title="Горячие клавиши">
                <ul className="space-y-1.5 text-win-sm opacity-80">
                  <li><span className="font-mono">Win</span> — открыть/закрыть меню «Пуск»</li>
                  <li><span className="font-mono">Alt+F4</span> — закрыть активное окно</li>
                  <li><span className="font-mono">F5</span> — обновить рабочий стол / вставить дату в Блокноте</li>
                  <li><span className="font-mono">Ctrl+S</span> — сохранить документ, <span className="font-mono">Ctrl+N</span> — новое окно Блокнота</li>
                  <li><span className="font-mono">Shift</span> при растягивании угла окна — сохранить пропорции</li>
                  <li><span className="font-mono">Delete</span> — удалить выбранный файл, <span className="font-mono">Escape</span> — снять выделение</li>
                </ul>
              </Section>
            </>
          )}
        </div>
      </div>

      {resetOpen && (
        <Dialog
          title="Сбросить файловую систему"
          message="Все созданные файлы и папки будут заменены стандартным содержимым диска C:. Это действие нельзя отменить."
          confirmLabel="Сбросить"
          onConfirm={() => actions.resetFileSystem()}
          onClose={() => setResetOpen(false)}
        />
      )}
    </div>
  );
}
