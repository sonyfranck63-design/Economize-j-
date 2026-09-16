import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * PageTransition: wrapper que adiciona animação suave de transição de telas (fade + leve slide vertical).
 * Respeita preferências de acessibilidade (prefers-reduced-motion).
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = 'w-full',
  id,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      key={id}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
