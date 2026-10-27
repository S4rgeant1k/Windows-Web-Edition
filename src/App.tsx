import { useEffect } from 'react';
import { OSProvider, useOSActions, useOSState, useOSStoreAccessor } from './context/OSContext';
import { Desktop } from './components/Desktop/Desktop';
import { Taskbar } from './components/Taskbar/Taskbar';
import { StartMenu } from './components/Taskbar/StartMenu';
import { TaskView } from './components/Taskbar/TaskView';
import { ActionCenter } from './components/Taskbar/ActionCenter';
import { PowerScreen } from './components/Common/PowerScreen';
import { Window } from './components/WindowManager/Window';

function Shell() {
  const windowIds = useOSState((state) => state.windows.map((w) => w.id).join('|'));
  const prefs = useOSState((state) => state.prefs);
  const actions = useOSActions();
  const getState = useOSStoreAccessor();

  // Тема и акцентный цвет живут в CSS-переменных: компоненты не ререндерятся.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.style.setProperty('--accent', prefs.accentColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.accentColor);
  }, [prefs.theme, prefs.accentColor]);

  useEffect(() => {
    const onResize = () => actions.clampAllWindows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [actions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      if (event.key === 'Meta' || event.key === 'OS' || event.key === 'Win') {
        if (event.ctrlKey || event.altKey || event.shiftKey) return;
        event.preventDefault();
        actions.toggleStartMenu();
      } else if (event.altKey && event.key === 'F4') {
        event.preventDefault();
        const activeId = getState().activeWindowId;
        if (activeId) actions.closeWindow(activeId);
      } else if (event.key === 'Escape' && !typing) {
        actions.setStartMenuOpen(false);
        actions.setTaskViewOpen(false);
        actions.setActionCenterOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actions, getState]);

  const ids = windowIds ? windowIds.split('|') : [];

  return (
    <div className="boot-fade relative h-full w-full overflow-hidden font-sans text-win-base">
      <Desktop />

      {ids.map((id) => (
        <Window key={id} windowId={id} />
      ))}

      <TaskView />
      <StartMenu />
      <ActionCenter />
      <Taskbar />
      <PowerScreen />
    </div>
  );
}

export default function App() {
  return (
    <OSProvider>
      <Shell />
    </OSProvider>
  );
}
