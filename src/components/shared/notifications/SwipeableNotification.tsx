'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface LowStockItem {
  id: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
}

interface SwipeableNotificationProps {
  item: LowStockItem;
  onDismiss: (id: string) => void;
  onClick: () => void;
  index: number;
}

export function SwipeableNotification({ item, onDismiss, onClick, index }: SwipeableNotificationProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);
  const threshold = 80; // pixels to trigger dismiss

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;

    // Determine swipe direction on first significant movement
    if (!swipeDirection && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeDirection('horizontal');
      } else {
        setSwipeDirection('vertical');
      }
    }

    if (swipeDirection === 'horizontal') {
      // Allow swipe left or right
      setTouchDelta({ x: deltaX, y: 0 });
    } else if (swipeDirection === 'vertical') {
      // Allow swipe up only (not down)
      if (deltaY < 0) {
        setTouchDelta({ x: 0, y: deltaY });
      }
    }
  };

  const handleTouchEnd = () => {
    const shouldDismiss = Math.abs(touchDelta.x) > threshold || Math.abs(touchDelta.y) > threshold;
    if (shouldDismiss) {
      setIsDismissing(true);
      setTimeout(() => onDismiss(item.id), 200);
    } else {
      setTouchDelta({ x: 0, y: 0 });
    }
    setTouchStart(null);
    setSwipeDirection(null);
  };

  const isResting = touchDelta.x === 0 && touchDelta.y === 0;
  const totalDelta = Math.abs(touchDelta.x) + Math.abs(touchDelta.y);

  return (
    <div
      className={`relative w-full p-4 hover:bg-bg-light transition-all duration-300 text-left rounded-xl group border border-border-muted hover:border-warning/30 hover:shadow-md cursor-pointer ${
        isDismissing ? 'opacity-0 scale-95' : ''
      }`}
      style={{
        animation: `slideIn 0.4s ease-out ${index * 0.06}s both`,
        transform: `translate(${touchDelta.x}px, ${touchDelta.y}px)`,
        transition: isResting ? 'transform 0.2s ease-out, opacity 0.2s, scale 0.2s' : 'none',
        opacity: isDismissing ? 0 : 1 - totalDelta / 200,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (totalDelta < 10) {
          onClick();
        }
      }}
    >
      {/* Dismiss button for desktop */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-text-muted hover:bg-danger/20 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 md:block hidden"
        title="Dismiss"
      >
        <X size={14} />
      </button>

      {/* Swipe hint for mobile - left/right/up indicators */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-danger/50 to-transparent rounded-l-xl md:hidden"
           style={{ opacity: touchDelta.x < -20 ? 1 : 0, transition: 'opacity 0.1s' }} />
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-danger/50 to-transparent rounded-r-xl md:hidden"
           style={{ opacity: touchDelta.x > 20 ? 1 : 0, transition: 'opacity 0.1s' }} />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-danger/50 to-transparent rounded-t-xl md:hidden"
           style={{ opacity: touchDelta.y < -20 ? 1 : 0, transition: 'opacity 0.1s' }} />

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${
            item.quantity === 0 ? 'bg-danger/20' : 'bg-warning/20'
          }`}>
            <AlertTriangle size={24} className={item.quantity === 0 ? 'text-danger' : 'text-warning'} />
          </div>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="font-semibold text-base text-text truncate">
              {item.brand} {item.model}
            </p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
              item.quantity === 0
                ? 'bg-danger/20 text-danger border border-danger/30'
                : 'bg-warning/20 text-warning border border-warning/30'
            }`}>
              {item.quantity === 0 ? 'OUT OF STOCK' : `${item.quantity} left`}
            </span>
          </div>
          <p className="text-sm text-text-muted mb-1">Size: {item.size}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${
              item.quantity === 0 ? 'bg-danger' : 'bg-warning'
            } animate-pulse`}></span>
            {item.quantity === 0 ? 'Restock immediately' : 'Low stock alert'}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
