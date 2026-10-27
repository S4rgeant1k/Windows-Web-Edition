import { FilePlus2, FolderPlus, Image as ImageIcon, MonitorCog, RefreshCw } from 'lucide-react';
import { ContextMenu as BaseContextMenu, type ContextMenuItem } from '../Common/ContextMenu';

export interface DesktopContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRefresh: () => void;
  onChangeWallpaper: () => void;
  onCreateTextFile: () => void;
  onCreateFolder: () => void;
  onOpenSettings: () => void;
  /** Дополнительные пункты (действия над выбранным объектом). */
  targetItems?: ContextMenuItem[];
}

/** Контекстное меню рабочего стола: перехватывает системное меню браузера. */
export function ContextMenu({
  x,
  y,
  onClose,
  onRefresh,
  onChangeWallpaper,
  onCreateTextFile,
  onCreateFolder,
  onOpenSettings,
  targetItems = [],
}: DesktopContextMenuProps) {
  const items: ContextMenuItem[] = [
    ...targetItems,
    {
      id: 'refresh',
      label: 'Обновить',
      icon: <RefreshCw size={14} />,
      shortcut: 'F5',
      dividerBefore: targetItems.length > 0,
      onClick: onRefresh,
    },
    {
      id: 'new-text',
      label: 'Создать текстовый документ',
      icon: <FilePlus2 size={14} />,
      dividerBefore: true,
      onClick: onCreateTextFile,
    },
    {
      id: 'new-folder',
      label: 'Создать папку',
      icon: <FolderPlus size={14} />,
      onClick: onCreateFolder,
    },
    {
      id: 'wallpaper',
      label: 'Сменить обои',
      icon: <ImageIcon size={14} />,
      dividerBefore: true,
      onClick: onChangeWallpaper,
    },
    {
      id: 'display-settings',
      label: 'Персонализация',
      icon: <MonitorCog size={14} />,
      onClick: onOpenSettings,
    },
  ];

  return <BaseContextMenu items={items} x={x} y={y} onClose={onClose} />;
}
