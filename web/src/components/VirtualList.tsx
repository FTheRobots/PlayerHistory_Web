import { useRef, useState, useEffect, type ReactNode, type UIEvent } from 'react';

interface VirtualListProps<T> {
  items: T[];
  /** Estimated row height in px (fixed estimate — good enough for event cards). */
  estimateSize?: number;
  overscan?: number;
  className?: string;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Fired when scrolled near the bottom (for infinite scroll). */
  onEndReached?: () => void;
  endReachedOffset?: number;
}

/** Lightweight fixed-estimate virtualizer (no extra dependency). */
export function VirtualList<T>({
  items,
  estimateSize = 120,
  overscan = 6,
  className,
  getKey,
  renderItem,
  onEndReached,
  endReachedOffset = 400,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(600);
  const endReachedLock = useRef(false);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () => setViewport(el.clientHeight || 600);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    endReachedLock.current = false;
  }, [items.length]);

  const totalHeight = items.length * estimateSize;
  const start = Math.max(0, Math.floor(scrollTop / estimateSize) - overscan);
  const visibleCount = Math.ceil(viewport / estimateSize) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);
  const offsetY = start * estimateSize;

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollTop(el.scrollTop);
    if (!onEndReached) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < endReachedOffset) {
      if (!endReachedLock.current) {
        endReachedLock.current = true;
        onEndReached();
        window.setTimeout(() => {
          endReachedLock.current = false;
        }, 400);
      }
    }
  };

  return (
    <div ref={parentRef} className={className} onScroll={onScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {items.slice(start, end).map((item, i) => {
            const index = start + i;
            return (
              <div key={getKey(item, index)} style={{ minHeight: estimateSize * 0.7 }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
