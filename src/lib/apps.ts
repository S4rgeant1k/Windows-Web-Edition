import type { AppId } from '../types';
import { asset } from './assets';

export interface AppDefinition {
  id: AppId;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  keywords: string[];
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
}

export const TASKBAR_HEIGHT = 48;
export const MIN_WINDOW_WIDTH = 320;
export const MIN_WINDOW_HEIGHT = 200;

const icons = (name: string) => asset(`icons/${name}.svg`);

export const APPS: Record<AppId, AppDefinition> = {
  explorer: {
    id: 'explorer',
    title: 'Проводник',
    subtitle: 'Файлы и папки этого компьютера',
    icon: icons('explorer'),
    accent: '#EBAE12',
    keywords: ['файлы', 'папки', 'диск', 'проводник', 'explorer', 'files'],
    defaultSize: { width: 900, height: 560 },
    minSize: { width: 520, height: 340 },
  },
  notepad: {
    id: 'notepad',
    title: 'Блокнот',
    subtitle: 'Простой текстовый редактор',
    icon: icons('notepad'),
    accent: '#1F6FC4',
    keywords: ['текст', 'заметки', 'блокнот', 'notepad', 'txt'],
    defaultSize: { width: 720, height: 540 },
    minSize: { width: 360, height: 260 },
  },
  settings: {
    id: 'settings',
    title: 'Настройки',
    subtitle: 'Система, персонализация, оформление',
    icon: icons('settings'),
    accent: '#0F7BC4',
    keywords: ['настройки', 'тема', 'обои', 'settings', 'параметры'],
    defaultSize: { width: 900, height: 620 },
    minSize: { width: 560, height: 380 },
  },
  browser: {
    id: 'browser',
    title: 'Браузер',
    subtitle: 'Домашняя страница и веб-сайты',
    icon: icons('browser'),
    accent: '#0778D4',
    keywords: ['интернет', 'сайт', 'браузер', 'browser', 'веб', 'web'],
    defaultSize: { width: 1000, height: 660 },
    minSize: { width: 480, height: 340 },
  },
};

export const APP_IDS = Object.keys(APPS) as AppId[];

/** Программы в алфавитном порядке, как в меню «Пуск». */
export const APPS_ALPHABETICAL = [...APP_IDS].sort((a, b) =>
  APPS[a].title.localeCompare(APPS[b].title, 'ru'),
);

/** Первая буква, под которой программа попадает в список «Все приложения». */
export function appLetter(id: AppId): string {
  return APPS[id].title.charAt(0).toUpperCase();
}
