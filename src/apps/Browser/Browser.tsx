import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe2,
  Home,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';

interface BrowserProps {
  initialUrl?: string;
}

const HOME = 'about:home';

const BOOKMARKS = [
  { label: 'Example Domain', url: 'https://example.com', hint: 'Разрешает встраивание' },
  {
    label: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/export/embed.html',
    hint: 'Встраиваемая карта',
  },
  { label: 'HTTPBin HTML', url: 'https://httpbin.org/html', hint: 'Простая страница' },
  { label: 'Wikipedia', url: 'https://www.wikipedia.org', hint: 'Может блокировать iframe' },
];

function normalizeTarget(raw: string): string {
  const value = raw.trim();
  if (!value || value === HOME) return HOME;
  if (/^(javascript|data|file):/i.test(value)) return HOME;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('about:')) return HOME;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) && !value.includes(' ')) {
    return `https://${value}`;
  }
  return `https://www.bing.com/search?q=${encodeURIComponent(value)}`;
}

interface NavState {
  pages: string[];
  index: number;
}

function HomePage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const submit = () => {
    if (query.trim()) onNavigate(query);
  };

  return (
    <div className="fluent-scroll h-full overflow-y-auto bg-gradient-to-br from-[#eaf4fd] via-white to-[#dcecf9] px-8 py-8 text-[#16324f]">
      <div className="mx-auto max-w-[620px]">
        <div className="mb-6 flex items-center gap-3">
          <Globe2 size={34} className="text-[#0078D7]" />
          <div>
            <h1 className="text-[26px] font-light leading-tight">Браузер</h1>
            <p className="text-win-sm opacity-70">Домашняя страница Windows 10 Web Edition</p>
          </div>
        </div>

        <div className="mb-8 flex h-[42px] items-center gap-2 border border-[#0078D7] bg-white px-3 shadow-sm">
          <Search size={17} className="text-[#0078D7]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') submit();
            }}
            placeholder="Введите адрес сайта или поисковый запрос"
            className="h-full min-w-0 flex-1 bg-transparent text-win-base outline-none"
            aria-label="Адрес или поисковый запрос"
          />
          <button
            type="button"
            onClick={submit}
            className="h-[30px] bg-[#0078D7] px-4 text-win-sm text-white hover:brightness-110"
          >
            Перейти
          </button>
        </div>

        <h2 className="mb-3 text-win-md font-semibold">Закладки</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BOOKMARKS.map((bookmark) => (
            <button
              key={bookmark.url}
              type="button"
              onClick={() => onNavigate(bookmark.url)}
              className="flex h-[100px] flex-col justify-between border border-[#c8dcec] bg-white p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:border-[#0078D7]"
            >
              <span className="text-win-sm font-semibold text-[#0078D7]">{bookmark.label}</span>
              <span className="text-win-xs leading-tight opacity-60">{bookmark.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 border-l-[3px] border-[#0078D7] bg-white/70 p-4 text-win-sm leading-relaxed">
          <p className="mb-1 font-semibold">Как это работает</p>
          <p className="opacity-75">
            Страницы загружаются в элемент iframe. Некоторые сайты запрещают встраивание
            заголовками X-Frame-Options или CSP frame-ancestors — в таком случае используйте
            кнопку «В новой вкладке» в предупреждении над страницей. Ввод без точки
            воспринимается как поисковый запрос.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Browser({ initialUrl }: BrowserProps) {
  const [nav, setNav] = useState<NavState>(() => ({
    pages: [initialUrl && /^https?:\/\//i.test(initialUrl) ? initialUrl : HOME],
    index: 0,
  }));
  const current = nav.pages[nav.index];
  const [address, setAddress] = useState(current === HOME ? '' : current);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);

  useEffect(() => {
    setAddress(current === HOME ? '' : current);
    setBannerHidden(false);
    setLoading(current !== HOME);
  }, [current]);

  const navigate = (raw: string) => {
    const target = normalizeTarget(raw);
    setNav((state) => {
      const pages = [...state.pages.slice(0, state.index + 1), target];
      return { pages, index: pages.length - 1 };
    });
    setReloadKey((key) => key + 1);
  };

  const goBack = () => setNav((state) => ({ ...state, index: Math.max(0, state.index - 1) }));
  const goForward = () =>
    setNav((state) => ({ ...state, index: Math.min(state.pages.length - 1, state.index + 1) }));
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] text-[var(--text-primary)]">
      {/* Панель навигации. */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--divider)] bg-[var(--toolbar-bg)] px-2 py-1.5">
        <button type="button" title="Назад" onClick={goBack} disabled={nav.index === 0} className="icon-button">
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          title="Вперёд"
          onClick={goForward}
          disabled={nav.index >= nav.pages.length - 1}
          className="icon-button"
        >
          <ArrowRight size={16} />
        </button>
        <button type="button" title="Обновить" onClick={reload} className="icon-button">
          <RefreshCw size={14} />
        </button>
        <button type="button" title="Домашняя страница" onClick={() => navigate(HOME)} className="icon-button">
          <Home size={15} />
        </button>
        <div className="mx-1 flex h-[30px] min-w-0 flex-1 items-center gap-2 border border-[var(--input-border)] bg-[var(--input-bg)] px-2">
          <Globe2 size={14} className="shrink-0 opacity-60" />
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate(address);
              else if (event.key === 'Escape') setAddress(current === HOME ? '' : current);
            }}
            placeholder="Введите URL-адрес или поисковый запрос"
            aria-label="Адресная строка"
            className="h-full min-w-0 flex-1 bg-transparent text-win-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate(address)}
          className="h-[30px] bg-[var(--accent)] px-3 text-win-sm text-white hover:brightness-110"
        >
          Перейти
        </button>
      </div>

      {/* Предупреждение о X-Frame-Options / CSP с рабочим обходом. */}
      {current !== HOME && !bannerHidden && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-win-xs text-amber-900">
          <ShieldAlert size={15} className="shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1">
            Сайт может запрещать встраивание (X-Frame-Options, CSP frame-ancestors). Если iframe
            пустой — откройте страницу в новой вкладке браузера.
          </span>
          <button
            type="button"
            onClick={() => window.open(current, '_blank', 'noopener,noreferrer')}
            className="flex shrink-0 items-center gap-1 border border-amber-500 px-2 py-1 font-medium hover:bg-amber-100"
          >
            <ExternalLink size={12} /> В новой вкладке
          </button>
          <button
            type="button"
            onClick={() => setBannerHidden(true)}
            title="Скрыть предупреждение"
            className="shrink-0 p-1 hover:bg-amber-100"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-white">
        {current === HOME ? (
          <HomePage onNavigate={navigate} />
        ) : (
          <>
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white text-win-sm text-gray-500">
                Загрузка {current}…
              </div>
            )}
            <iframe
              key={`${current}-${reloadKey}`}
              src={current}
              title={`Веб-страница: ${current}`}
              className="h-full w-full border-0"
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
            />
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[var(--divider)] px-3 py-1 text-win-xs opacity-70">
        <span className="truncate">{current === HOME ? 'Домашняя страница' : current}</span>
        <span className="shrink-0">
          История: {nav.index + 1} / {nav.pages.length}
        </span>
      </div>
    </div>
  );
}
