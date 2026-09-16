import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hapticImpactLight, hapticImpactMedium } from '../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<any> | void;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  pullThreshold = 65,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [thresholdCrossed, setThresholdCrossed] = useState(false);

  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    // Verifica se estamos no topo da página ou container
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    if (deltaY > 0) {
      // Damping físico suave (resistência elástica)
      const dampedDistance = Math.min(110, deltaY * 0.45);
      setPullDistance(dampedDistance);

      if (dampedDistance >= pullThreshold && !thresholdCrossed) {
        setThresholdCrossed(true);
        hapticImpactLight();
      } else if (dampedDistance < pullThreshold && thresholdCrossed) {
        setThresholdCrossed(false);
      }
    } else {
      setPullDistance(0);
      setThresholdCrossed(false);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(48); // Posição fixa do indicador durante refresh
      hapticImpactMedium();

      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn('Erro ao atualizar dados via pull-to-refresh:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setThresholdCrossed(false);
        }, 350);
      }
    } else {
      setPullDistance(0);
      setThresholdCrossed(false);
    }
  };

  const rotation = Math.min(360, (pullDistance / pullThreshold) * 360);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative min-h-full ${className}`}
    >
      {/* Indicador de Pull To Refresh */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: 1,
              y: pullDistance,
            }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 -top-12 z-30 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-slate-200/80 text-xs font-bold text-slate-700">
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing
                    ? 'animate-spin text-emerald-600'
                    : thresholdCrossed
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
                style={{
                  transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
                  transition: isRefreshing ? undefined : 'transform 0.1s ease-out',
                }}
              />
              <span className="text-[11px]">
                {isRefreshing
                  ? 'Atualizando...'
                  : thresholdCrossed
                  ? 'Solte para atualizar'
                  : 'Puxe para atualizar'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo com leve deslocamento elástico */}
      <motion.div
        animate={{ y: isRefreshing ? 28 : pullDistance > 0 ? pullDistance * 0.35 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
