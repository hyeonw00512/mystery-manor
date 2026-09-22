import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

interface Transform { x: number; y: number; scale: number; }
const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 700;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useBoardViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastGesture = useRef<{ centerX: number; centerY: number; distance: number } | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const reset = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    const scale = clamp(Math.min(element.clientWidth / STAGE_WIDTH, element.clientHeight / STAGE_HEIGHT) * .94, .38, 1.15);
    setTransform({ x: (element.clientWidth - STAGE_WIDTH * scale) / 2, y: (element.clientHeight - STAGE_HEIGHT * scale) / 2, scale });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(reset);
    if (viewportRef.current) observer.observe(viewportRef.current);
    reset();
    return () => observer.disconnect();
  }, [reset]);

  const zoomAt = useCallback((nextScale: number, clientX: number, clientY: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setTransform((current) => {
      const scale = clamp(nextScale, .38, 2.4);
      const pointerX = clientX - bounds.left;
      const pointerY = clientY - bounds.top;
      const boardX = (pointerX - current.x) / current.scale;
      const boardY = (pointerY - current.y) / current.scale;
      return { scale, x: pointerX - boardX * scale, y: pointerY - boardY * scale };
    });
  }, []);

  const onWheel = (event: ReactWheelEvent) => {
    event.preventDefault();
    zoomAt(transform.scale * (event.deltaY > 0 ? .9 : 1.1), event.clientX, event.clientY);
  };

  const gestureFromPointers = () => {
    const points = [...pointers.current.values()];
    if (points.length < 2) return null;
    const [a, b] = points;
    return { centerX: (a!.x + b!.x) / 2, centerY: (a!.y + b!.y) / 2, distance: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastGesture.current = gestureFromPointers() ?? { centerX: event.clientX, centerY: event.clientY, distance: 0 };
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const previousPoint = pointers.current.get(event.pointerId);
    if (!previousPoint) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureFromPointers();
    if (gesture && lastGesture.current?.distance) {
      const ratio = gesture.distance / lastGesture.current.distance;
      const centerX = gesture.centerX; const centerY = gesture.centerY;
      setTransform((current) => {
        const bounds = viewportRef.current?.getBoundingClientRect();
        if (!bounds) return current;
        const px = centerX - bounds.left; const py = centerY - bounds.top;
        const boardX = (px - current.x) / current.scale; const boardY = (py - current.y) / current.scale;
        const scale = clamp(current.scale * ratio, .38, 2.4);
        return { scale, x: px - boardX * scale, y: py - boardY * scale };
      });
      lastGesture.current = gesture;
    } else if (pointers.current.size === 1) {
      setTransform((current) => ({ ...current, x: current.x + event.clientX - previousPoint.x, y: current.y + event.clientY - previousPoint.y }));
      lastGesture.current = { centerX: event.clientX, centerY: event.clientY, distance: 0 };
    }
  };

  const onPointerEnd = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId);
    const remaining = [...pointers.current.values()][0];
    lastGesture.current = remaining ? { centerX: remaining.x, centerY: remaining.y, distance: 0 } : null;
  };

  const zoomBy = (factor: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (bounds) zoomAt(transform.scale * factor, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  };

  const focusOn = useCallback((boardX: number, boardY: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setTransform((current) => ({
      ...current,
      x: bounds.width / 2 - boardX * current.scale,
      y: bounds.height / 2 - boardY * current.scale
    }));
  }, []);

  return { viewportRef, transform, reset, zoomBy, focusOn, handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd } };
}
