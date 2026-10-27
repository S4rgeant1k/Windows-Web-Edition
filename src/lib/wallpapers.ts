import { asset } from './assets';

export interface WallpaperOption {
  id: string;
  label: string;
  src: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'win10-default',
    label: 'Windows 10',
    src: asset('wallpapers/win10-default.jpg'),
  },
  {
    id: 'win10-dark',
    label: 'Тёмная синяя',
    src: asset('wallpapers/win10-dark.svg'),
  },
  {
    id: 'win10-light',
    label: 'Светлая голубая',
    src: asset('wallpapers/win10-light.svg'),
  },
];

export interface AccentOption {
  label: string;
  value: string;
}

/** Официальный акцентный цвет Windows 10 — первый в списке. */
export const ACCENT_COLORS: AccentOption[] = [
  { label: 'Windows Blue', value: '#0078D7' },
  { label: 'Cobalt', value: '#005A9E' },
  { label: 'Teal', value: '#00838F' },
  { label: 'Emerald', value: '#107C41' },
  { label: 'Violet', value: '#744DA9' },
  { label: 'Magenta', value: '#B1468B' },
  { label: 'Amber', value: '#C17900' },
  { label: 'Crimson', value: '#C4314B' },
];

export function getWallpaper(id: string): WallpaperOption {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}
