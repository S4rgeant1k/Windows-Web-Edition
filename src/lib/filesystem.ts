import type { FileSystem, FolderNode, FsEntry, FsNode } from '../types';

export const ROOT_PATH = 'C:';
export const DESKTOP_PATH = 'C:/Users/Desktop';
export const DOCUMENTS_PATH = 'C:/Documents';
export const DOWNLOADS_PATH = 'C:/Users/Downloads';
export const PICTURES_PATH = 'C:/Users/Pictures';
export const RECYCLE_PATH = 'C:/$Recycle.Bin';

/** Служебные папки, которые нельзя удалить. */
export const PROTECTED_PATHS = [
  ROOT_PATH,
  'C:/Users',
  DESKTOP_PATH,
  DOCUMENTS_PATH,
  DOWNLOADS_PATH,
  PICTURES_PATH,
  RECYCLE_PATH,
];

const WELCOME_TEXT = `Windows 10 Web Edition
======================

Добро пожаловать в браузерную версию Windows 10!

Что можно сделать прямо сейчас:
  • Меню «Пуск» — кнопка Windows в левом нижнем углу.
  • Строка поиска на панели задач ищет программы и текстовые файлы.
  • Окна можно перетаскивать за заголовок и тянуть за любое из 8 рёбер/углов.
    Двойной щелчок по заголовку разворачивает окно на весь экран.
    При изменении размера за угол удерживайте Shift, чтобы сохранить пропорции.
  • Правый клик по рабочему столу открывает меню: «Обновить»,
    «Сменить обои» и «Создать текстовый документ».
  • Все файлы Блокнота автоматически сохраняются в localStorage
    браузера и не исчезают после перезагрузки страницы.
  • Удалённые файлы попадают в Корзину, откуда их можно восстановить.

Горячие клавиши: Win — меню «Пуск», Alt+F4 — закрыть активное окно,
Ctrl+S — сохранить файл в Блокноте, Ctrl+N — новый документ.

Приятной работы!`;

export function createDefaultFileSystem(): FileSystem {
  const now = Date.now();
  const folder = (name: string, children: Record<string, FsNode> = {}): FolderNode => ({
    kind: 'folder',
    name,
    children,
  });
  const text = (name: string, content: string): FsNode => ({
    kind: 'text',
    name,
    content,
    modifiedAt: now,
  });

  return folder('C:', {
    Users: folder('Users', {
      Desktop: folder('Desktop', {
        'Добро пожаловать.txt': text('Добро пожаловать.txt', WELCOME_TEXT),
        'Заметки.txt': text('Заметки.txt', 'Заметки сохраняются автоматически.\n'),
      }),
      Downloads: folder('Downloads'),
      Pictures: folder('Pictures'),
    }),
    Documents: folder('Documents', {
      'Идеи.txt': text('Идеи.txt', 'Добавьте свою идею здесь...\n'),
    }),
    '$Recycle.Bin': folder('$Recycle.Bin'),
  });
}

/** 'C:/Users/Desktop/' -> ['Users', 'Desktop'] */
export function pathSegments(path: string): string[] {
  const raw = path.replace(/\\/g, '/').trim().split('/').filter(Boolean);
  if (raw.length > 0 && raw[0].toLowerCase() === 'c:') raw.shift();
  return raw;
}

export function normalizePath(path: string): string {
  return [ROOT_PATH, ...pathSegments(path)].join('/');
}

export function joinPath(parent: string, name: string): string {
  return `${normalizePath(parent)}/${name}`;
}

export function parentPath(path: string): string {
  const segments = pathSegments(path);
  segments.pop();
  return [ROOT_PATH, ...segments].join('/');
}

export function nodeName(path: string): string {
  const segments = pathSegments(path);
  return segments.length ? segments[segments.length - 1] : ROOT_PATH;
}

export function displayPath(path: string): string {
  return normalizePath(path).replace(/\//g, '\\');
}

export function getNode(fs: FileSystem, path: string): FsNode | null {
  let current: FsNode = fs;
  for (const segment of pathSegments(path)) {
    if (current.kind !== 'folder') return null;
    const next: FsNode | undefined = current.children[segment];
    if (!next) return null;
    current = next;
  }
  return current;
}

export function isFolder(fs: FileSystem, path: string): boolean {
  const node = getNode(fs, path);
  return !!node && node.kind === 'folder';
}

/** Иммутабельное обновление узла по пути. updater(null) создаёт новый узел. */
export function updateNode(
  fs: FileSystem,
  path: string,
  updater: (node: FsNode | null) => FsNode | null,
): FileSystem {
  const segments = pathSegments(path);
  if (segments.length === 0) {
    const root = updater(fs);
    return root && root.kind === 'folder' ? root : fs;
  }

  const rebuild = (node: FsNode, index: number): FsNode => {
    if (node.kind !== 'folder') return node;
    const key = segments[index];
    const last = index === segments.length - 1;
    const child = node.children[key] ?? null;

    if (last) {
      const result = updater(child);
      if (result === child) return node;
      const children = { ...node.children };
      if (result) children[key] = { ...result, name: key };
      else delete children[key];
      return { ...node, children };
    }

    if (!child || child.kind !== 'folder') return node;
    const nextChild = rebuild(child, index + 1);
    if (nextChild === child) return node;
    return { ...node, children: { ...node.children, [key]: nextChild } };
  };

  return rebuild(fs, 0) as FileSystem;
}

export function deleteNode(fs: FileSystem, path: string): FileSystem {
  return updateNode(fs, path, () => null);
}

export function renameNodeInTree(fs: FileSystem, path: string, newName: string): FileSystem {
  const oldName = nodeName(path);
  const parent = parentPath(path);
  if (!newName || newName === oldName || newName.includes('/')) return fs;
  return updateNode(fs, parent, (node) => {
    if (!node || node.kind !== 'folder') return node;
    const target = node.children[oldName];
    if (!target || (node.children[newName] && newName !== oldName)) return node;
    const children = { ...node.children };
    delete children[oldName];
    children[newName] = { ...target, name: newName };
    return { ...node, children };
  });
}

/** Снимает/устанавливает пометку о исходном пути (для Корзины). */
export function setOrigin(node: FsNode, originPath?: string): FsNode {
  if (node.kind === 'folder') {
    return {
      kind: 'folder',
      name: node.name,
      children: node.children,
      ...(originPath ? { originPath } : {}),
    };
  }
  return {
    kind: 'text',
    name: node.name,
    content: node.content,
    modifiedAt: node.modifiedAt,
    ...(originPath ? { originPath } : {}),
  };
}

/** Перемещение узла: сначала удаляем, затем вставляем в целевую папку. */
export function moveNode(
  fs: FileSystem,
  fromPath: string,
  toDir: string,
  newName: string,
  originPath?: string,
): FileSystem {
  const node = getNode(fs, fromPath);
  if (!node) return fs;
  const withoutSource = deleteNode(fs, fromPath);
  return updateNode(withoutSource, toDir, (folder) => {
    if (!folder || folder.kind !== 'folder') return folder;
    return {
      ...folder,
      children: {
        ...folder.children,
        [newName]: { ...setOrigin(node, originPath), name: newName },
      },
    };
  });
}

export function listFolder(fs: FileSystem, path: string): FsEntry[] {
  const node = getNode(fs, path);
  if (!node || node.kind !== 'folder') return [];
  const base = normalizePath(path);
  return Object.entries(node.children)
    .map(([name, child]) => ({ name, path: `${base}/${name}`, node: child }))
    .sort((a, b) => {
      if (a.node.kind !== b.node.kind) return a.node.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'ru', { numeric: true });
    });
}

export function readTextFile(fs: FileSystem, path: string): string | null {
  const node = getNode(fs, path);
  return node && node.kind === 'text' ? node.content : null;
}

/** Подбирает свободное имя в папке: file.txt, file (2).txt, ... */
export function uniqueName(fs: FileSystem, dirPath: string, base: string, extension: string): string {
  const folder = getNode(fs, dirPath);
  const taken = folder && folder.kind === 'folder' ? folder.children : {};
  let candidate = `${base}${extension}`;
  let index = 2;
  while (taken[candidate]) {
    candidate = `${base} (${index})${extension}`;
    index += 1;
  }
  return candidate;
}

export function createTextFileNode(fs: FileSystem, dirPath: string, name: string, content = ''): FileSystem {
  return updateNode(fs, dirPath, (folder) => {
    if (!folder || folder.kind !== 'folder' || folder.children[name]) return folder;
    return {
      ...folder,
      children: {
        ...folder.children,
        [name]: { kind: 'text', name, content, modifiedAt: Date.now() },
      },
    };
  });
}

export function createFolderNode(fs: FileSystem, dirPath: string, name: string): FileSystem {
  return updateNode(fs, dirPath, (folder) => {
    if (!folder || folder.kind !== 'folder' || folder.children[name]) return folder;
    return {
      ...folder,
      children: {
        ...folder.children,
        [name]: { kind: 'folder', name, children: {} },
      },
    };
  });
}

export function clearFolder(fs: FileSystem, dirPath: string): FileSystem {
  return updateNode(fs, dirPath, (folder) =>
    folder && folder.kind === 'folder' ? { ...folder, children: {} } : folder,
  );
}

/** Все текстовые файлы диска (кроме Корзины) — для поиска. */
export function findTextFiles(fs: FileSystem): FsEntry[] {
  const result: FsEntry[] = [];
  const walk = (node: FsNode, path: string) => {
    if (node.kind === 'text') {
      result.push({ name: node.name, path, node });
      return;
    }
    for (const [name, child] of Object.entries(node.children)) {
      if (path === ROOT_PATH && name === '$Recycle.Bin') continue;
      walk(child, `${path}/${name}`);
    }
  };
  walk(fs, ROOT_PATH);
  return result;
}

export function countFiles(fs: FileSystem): number {
  let count = 0;
  const walk = (node: FsNode) => {
    if (node.kind === 'text') count += 1;
    else Object.values(node.children).forEach(walk);
  };
  walk(fs);
  return count;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
