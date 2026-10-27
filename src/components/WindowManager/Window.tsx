import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useOSActions, useOSState } from '../../context/OSContext';
import { APPS, MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, TASKBAR_HEIGHT } from '../../lib/apps';
import {
  RESIZE_CURSORS,
  RESIZE_DIRECTIONS,
  RESIZE_HANDLES,
  computeDrag,
  computeResize,
  type ResizeDirection,
  type ResizeLimits,
} from '../../lib/geometry';
import { useDraggable, type PointerMotion } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import type { Bounds, WindowState } from '../../types';
import { WindowHeader } from './WindowHeader';
import { WindowContent } from './WindowContent';

interface WindowProps {
  windowId: string;
}

function getLimits(): ResizeLimits {
  return {
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    maxWidth: window.innerWidth,
    maxHeight: Math.max(240, window.innerHeight - TASKBAR_HEIGHT),
  };
}

export const Window = memo(function Window({ windowId }: WindowProps) {
  const win = useOSState((state) => state.windows.find((w) => w.id === windowId) ?? null);
  const isActive = useOSState((state) => state.activeWindowId === windowId);
  const actions = useOSActions();

  const frameRef = useRef<HTMLDivElement>(null);
  const startBoundsRef = useRef<Bounds | null>(null);
  const previewRef = useRef<Bounds | null>(null);
  const currentRef = useRef<WindowState | null>(win);
  currentRef.current = win;

  // Превью геометрии синхронизируется со стором только между взаимодействиями.
  useLayoutEffect(() => {
    if (!win) return;
    previewRef.current = { x: win.x, y: win.y, width: win.width, height: win.height };
  }, [win]);

  /** Прямая запись в DOM: 60 кадров перетаскивания не создают 60 ререндеров. */
  const applyPreview = useCallback((bounds: Bounds) => {
    previewRef.current = bounds;
    const element = frameRef.current;
    if (!element) return;
    element.style.left = `${bounds.x}px`;
    element.style.top = `${bounds.y}px`;
    element.style.width = `${bounds.width}px`;
    element.style.height = `${bounds.height}px`;
  }, []);

  const onDragStart = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const current = currentRef.current;
      if (!current) return;
      let start: Bounds;
      if (current.isMaximized) {
        // Как в настоящей Windows: потянув за заголовок развёрнутого окна,
        // оно восстанавливается и следует за курсором.
        const restored = current.restoreBounds ?? {
          x: current.x,
          y: current.y,
          width: APPS[current.appId].defaultSize.width,
          height: APPS[current.appId].defaultSize.height,
        };
        const width = Math.min(restored.width, window.innerWidth);
        start = {
          x: Math.max(0, event.clientX - width / 2),
          y: 0,
          width,
          height: restored.height,
        };
        actions.toggleMaximizeWindow(windowId);
      } else {
        start = { x: current.x, y: current.y, width: current.width, height: current.height };
        actions.focusWindow(windowId);
      }
      startBoundsRef.current = start;
      document.body.classList.add('is-dragging');
    },
    [actions, windowId],
  );

  const onDrag = useCallback(
    (motion: PointerMotion) => {
      const start = startBoundsRef.current;
      if (!start) return;
      applyPreview(computeDrag(start, motion.dx, motion.dy, getLimits()));
    },
    [applyPreview],
  );

  const finishInteraction = useCallback(() => {
    document.body.classList.remove('is-dragging', 'is-resizing');
    const preview = previewRef.current;
    if (preview) actions.updateWindowBounds(windowId, preview);
    startBoundsRef.current = null;
  }, [actions, windowId]);

  const { dragProps } = useDraggable({
    onDragStart,
    onDrag,
    onDragEnd: finishInteraction,
  });

  const onResizeStart = useCallback(() => {
    const current = currentRef.current;
    if (!current) return;
    startBoundsRef.current = {
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
    };
    actions.focusWindow(windowId);
    document.body.classList.add('is-resizing');
  }, [actions, windowId]);

  const onResize = useCallback(
    (direction: ResizeDirection, motion: PointerMotion) => {
      const start = startBoundsRef.current;
      if (!start) return;
      applyPreview(
        computeResize(direction, start, motion.dx, motion.dy, getLimits(), motion.shiftKey),
      );
    },
    [applyPreview],
  );

  const { getResizeProps } = useResizable({
    disabled: () => !!currentRef.current?.isMaximized,
    onResizeStart,
    onResize,
    onResizeEnd: finishInteraction,
  });

  // Стабильные обработчики позволяют memo-компоненту заголовка не
  // перерисовываться при смене геометрии или других окон.
  const handleFocus = useCallback(() => actions.focusWindow(windowId), [actions, windowId]);
  const handleToggleMaximize = useCallback(
    () => actions.toggleMaximizeWindow(windowId),
    [actions, windowId],
  );
  const handleMinimize = useCallback(() => actions.minimizeWindow(windowId), [actions, windowId]);
  const handleClose = useCallback(() => actions.closeWindow(windowId), [actions, windowId]);

  if (!win || win.isMinimized) return null;

  const style: CSSProperties = win.isMaximized
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: `calc(100vh - ${TASKBAR_HEIGHT}px)`,
        zIndex: win.zIndex,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <div
      ref={frameRef}
      data-window-id={windowId}
      role="dialog"
      aria-label={win.title}
      onPointerDown={handleFocus}
      className={`absolute flex flex-col overflow-hidden border border-[var(--window-border)] bg-[var(--app-bg)] ${
        isActive ? 'shadow-window-active' : 'shadow-window'
      } ${win.isMaximized ? '' : 'rounded-[3px]'}`}
      style={style}
    >
      <WindowHeader
        appId={win.appId}
        title={win.title}
        isActive={isActive}
        isMaximized={win.isMaximized}
        dragProps={dragProps}
        onDoubleClick={handleToggleMaximize}
        onMinimize={handleMinimize}
        onMaximize={handleToggleMaximize}
        onClose={handleClose}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <WindowContent windowId={windowId} appId={win.appId} props={win.props} />
      </div>

      {!win.isMaximized &&
        RESIZE_DIRECTIONS.map((direction) => (
          <div
            key={direction}
            {...getResizeProps(direction)}
            aria-hidden="true"
            className="absolute z-30 touch-none"
            style={{ ...RESIZE_HANDLES[direction], cursor: RESIZE_CURSORS[direction] }}
          />
        ))}
    </div>
  );
});
