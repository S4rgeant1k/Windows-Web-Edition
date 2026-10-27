import { memo } from 'react';
import { FileExplorer } from '../../apps/FileExplorer/FileExplorer';
import { Notepad } from '../../apps/Notepad/Notepad';
import { Settings } from '../../apps/Settings/Settings';
import { Browser } from '../../apps/Browser/Browser';
import type { AppId, WindowProps } from '../../types';

interface WindowContentProps {
  windowId: string;
  appId: AppId;
  props: WindowProps;
}

/**
 * Содержимое окна изолировано от перерисовок рамки: при перетаскивании
 * геометрия меняется напрямую в DOM, а приложения не ререндерятся вообще.
 */
export const WindowContent = memo(function WindowContent({ windowId, appId, props }: WindowContentProps) {
  switch (appId) {
    case 'explorer':
      return <FileExplorer windowId={windowId} initialPath={props.path} />;
    case 'notepad':
      return <Notepad windowId={windowId} filePath={props.filePath} />;
    case 'settings':
      return <Settings />;
    case 'browser':
      return <Browser initialUrl={props.url} />;
    default:
      return null;
  }
});
