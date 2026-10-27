import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { ResizeDirection } from '../lib/geometry';
import { usePointerSession, type PointerMotion } from './useDraggable';

export interface ResizableOptions {
  disabled?: boolean | (() => boolean);
  onResizeStart?: (direction: ResizeDirection) => void;
  onResize: (direction: ResizeDirection, motion: PointerMotion) => void;
  onResizeEnd?: (direction: ResizeDirection, motion: PointerMotion) => void;
}

/** 8 зон изменения размеров: 4 ребра + 4 угла. */
export function useResizable(options: ResizableOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const directionRef = useRef<ResizeDirection>('se');

  const session = usePointerSession({
    disabled: () => {
      const value = optionsRef.current.disabled;
      return typeof value === 'function' ? value() : !!value;
    },
    onStart: () => optionsRef.current.onResizeStart?.(directionRef.current),
    onMove: (motion: PointerMotion) => optionsRef.current.onResize(directionRef.current, motion),
    onEnd: (motion: PointerMotion) => optionsRef.current.onResizeEnd?.(directionRef.current, motion),
  });

  const getResizeProps = useCallback(
    (direction: ResizeDirection) => ({
      ...session.pointerProps,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        directionRef.current = direction;
        session.pointerProps.onPointerDown(event);
      },
    }),
    [session.pointerProps],
  );

  return { getResizeProps, isResizing: session.isActive };
}
