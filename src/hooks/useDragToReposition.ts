import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
}

interface UseDragToRepositionOptions {
  initialPosition?: Position;
  onPositionChange?: (position: Position) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useDragToReposition({
  initialPosition = { x: 50, y: 50 },
  onPositionChange,
  containerRef
}: UseDragToRepositionOptions = {}) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const dragState = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0
  });

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const container = containerRef?.current || e.currentTarget;
    const rect = container.getBoundingClientRect();

    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: position.x,
      startOffsetY: position.y
    };
  }, [position, containerRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    const container = containerRef?.current || e.currentTarget;
    const rect = container.getBoundingClientRect();

    dragState.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffsetX: position.x,
      startOffsetY: position.y
    };
  }, [position, containerRef]);

  const handleMove = useCallback((clientX: number, clientY: number, container: HTMLElement) => {
    if (!dragState.current.isDragging) return;

    const rect = container.getBoundingClientRect();
    const deltaX = clientX - dragState.current.startX;
    const deltaY = clientY - dragState.current.startY;

    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragState.current.startOffsetX + deltaXPercent));
    const newY = Math.max(0, Math.min(100, dragState.current.startOffsetY + deltaYPercent));

    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
    onPositionChange?.(newPosition);
  }, [onPositionChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current.isDragging || !containerRef?.current) return;
      handleMove(e.clientX, e.clientY, containerRef.current);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.current.isDragging || !containerRef?.current) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY, containerRef.current);
    };

    const handleEnd = () => {
      dragState.current.isDragging = false;
    };

    if (dragState.current.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [handleMove, containerRef]);

  const resetPosition = useCallback(() => {
    const defaultPosition = { x: 50, y: 50 };
    setPosition(defaultPosition);
    onPositionChange?.(defaultPosition);
  }, [onPositionChange]);

  return {
    position,
    isDragging: dragState.current.isDragging,
    handleMouseDown,
    handleTouchStart,
    resetPosition,
    setPosition
  };
}
