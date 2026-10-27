import type { CSSProperties } from 'react';
import type { Bounds } from '../types';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const RESIZE_DIRECTIONS: ResizeDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export interface ResizeLimits {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

/** Перемещение окна с запретом выхода за границы рабочей области. */
export function computeDrag(start: Bounds, dx: number, dy: number, limits: ResizeLimits): Bounds {
  return {
    ...start,
    x: Math.round(clamp(start.x + dx, 0, limits.maxWidth - start.width)),
    y: Math.round(clamp(start.y + dy, 0, limits.maxHeight - start.height)),
  };
}

/**
 * 8-направленный ресайз. Углы с зажатым Shift сохраняют пропорции окна,
 * обычное перетаскивание меняет размер свободно.
 */
export function computeResize(
  direction: ResizeDirection,
  start: Bounds,
  dx: number,
  dy: number,
  limits: ResizeLimits,
  preserveAspect = false,
): Bounds {
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  let { x, y, width, height } = start;

  if (direction.includes('e')) {
    width = clamp(start.width + dx, limits.minWidth, limits.maxWidth - start.x);
  }
  if (direction.includes('s')) {
    height = clamp(start.height + dy, limits.minHeight, limits.maxHeight - start.y);
  }
  if (direction.includes('w')) {
    width = clamp(start.width - dx, limits.minWidth, right);
    x = right - width;
  }
  if (direction.includes('n')) {
    height = clamp(start.height - dy, limits.minHeight, bottom);
    y = bottom - height;
  }

  if (preserveAspect && direction.length === 2) {
    const aspect = start.width / start.height;
    let w = clamp(Math.round(width), limits.minWidth, limits.maxWidth);
    let h = clamp(Math.round(w / aspect), limits.minHeight, limits.maxHeight);
    const maxH = direction.includes('n') ? bottom : limits.maxHeight - start.y;
    if (h > maxH) {
      h = Math.max(limits.minHeight, maxH);
      w = Math.round(h * aspect);
    }
    const maxW = direction.includes('w') ? right : limits.maxWidth - start.x;
    if (w > maxW) {
      w = Math.max(limits.minWidth, maxW);
      h = Math.round(w / aspect);
    }
    width = Math.round(w);
    height = Math.round(h);
    x = direction.includes('w') ? right - width : start.x;
    y = direction.includes('n') ? bottom - height : start.y;
  }

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

/** Зоны захвата лежат внутри окна, чтобы их не обрезал overflow: hidden. */
export const RESIZE_HANDLES: Record<ResizeDirection, CSSProperties> = {
  n: { top: 0, left: 10, right: 10, height: 5 },
  s: { bottom: 0, left: 10, right: 10, height: 5 },
  e: { right: 0, top: 10, bottom: 10, width: 5 },
  w: { left: 0, top: 10, bottom: 10, width: 5 },
  ne: { top: 0, right: 0, width: 14, height: 14 },
  nw: { top: 0, left: 0, width: 14, height: 14 },
  se: { bottom: 0, right: 0, width: 14, height: 14 },
  sw: { bottom: 0, left: 0, width: 14, height: 14 },
};
