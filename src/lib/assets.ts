/**
 * URL файла из public/ с учётом Vite `base`.
 * - `npm run dev` → BASE_URL = '/' → `/assets/icons/notepad.svg`
 * - сборка для GitHub Pages → BASE_URL = '/Windows-Web-Edition/'
 *   → `/Windows-Web-Edition/assets/icons/notepad.svg`
 *
 * Абсолютные `/assets/...` в коде использовать нельзя: на Pages они указывали бы
 * в корень домена github.io и все иконки/обои отдавали бы 404.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
