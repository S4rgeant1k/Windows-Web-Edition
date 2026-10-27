import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface PointerMotion {
  dx: number;
  dy: number;
  clientX: number;
  clientY: number;
  shiftKey: boolean;
}

interface Session {
  pointerId: number;
  startX: number;
  startY: number;
}

export interface PointerSessionOptions {
  disabled?: boolean | (() => boolean);
  onStart?: (event: ReactPointerEvent<HTMLElement>) => void;
  onMove?: (motion: PointerMotion, event: ReactPointerEvent<HTMLElement>) => void;
  onEnd?: (motion: PointerMotion, event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Одна сессия указателя: pointer capture гарантирует, что события продолжат
 * приходить даже когда курсор выходит за пределы элемента. Никаких
 * сторонних drag-and-drop библиотек — только onPointerDown/Move/Up.
 */
export function usePointerSession(options: PointerSessionOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const sessionRef = useRef<Session | null>(null);

  const getMotion = useCallback(
    (session: Session, event: ReactPointerEvent<HTMLElement>): PointerMotion => ({
      dx: event.clientX - session.startX,
      dy: event.clientY - session.startY,
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
    }),
    [],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const opts = optionsRef.current;
    const disabled = typeof opts.disabled === 'function' ? opts.disabled() : !!opts.disabled;
    if (disabled || event.button !== 0 || sessionRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    sessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    opts.onStart?.(event);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      optionsRef.current.onMove?.(getMotion(session, event), event);
    },
    [getMotion],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      sessionRef.current = null;
      const target = event.currentTarget;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
      optionsRef.current.onEnd?.(getMotion(session, event), event);
    },
    [getMotion],
  );

  const pointerProps = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
    }),
    [onPointerDown, onPointerMove, onPointerUp],
  );

  return { pointerProps, sessionRef, isActive: () => sessionRef.current !== null };
}

export interface DraggableOptions {
  disabled?: boolean | (() => boolean);
  onDragStart?: (event: ReactPointerEvent<HTMLElement>) => void;
  onDrag: (motion: PointerMotion) => void;
  onDragEnd?: (motion: PointerMotion) => void;
}

/** Перетаскивание за заголовок окна. */
export function useDraggable(options: DraggableOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const session = usePointerSession({
    disabled: () => {
      const value = optionsRef.current.disabled;
      return typeof value === 'function' ? value() : !!value;
    },
    onStart: (event) => optionsRef.current.onDragStart?.(event),
    onMove: (motion) => optionsRef.current.onDrag(motion),
    onEnd: (motion) => optionsRef.current.onDragEnd?.(motion),
  });

  return { dragProps: session.pointerProps, isDragging: session.isActive };
}
