import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle';
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) => {
  const renderActionButton = (act: EmptyStateAction, isPrimary = true) => {
    const ActIcon = act.icon;
    let buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition duration-150 active:scale-95 cursor-pointer ';

    if (act.variant === 'secondary' || (!isPrimary && !act.variant)) {
      buttonClass += 'bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5';
    } else if (act.variant === 'outline') {
      buttonClass += 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5';
    } else if (act.variant === 'subtle') {
      buttonClass += 'text-emerald-600 hover:text-emerald-700 hover:underline px-2 py-1';
    } else {
      // primary
      buttonClass += 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow px-5 py-2.5';
    }

    if (act.href) {
      return (
        <a
          key={act.label}
          href={act.href}
          target="_blank"
          rel="noreferrer"
          className={buttonClass}
        >
          {ActIcon && <ActIcon className="w-4 h-4" />}
          <span>{act.label}</span>
        </a>
      );
    }

    return (
      <button
        key={act.label}
        type="button"
        onClick={act.onClick}
        className={buttonClass}
      >
        {ActIcon && <ActIcon className="w-4 h-4" />}
        <span>{act.label}</span>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`bg-white rounded-2xl border border-slate-100/90 text-center flex flex-col items-center justify-center ${
        compact ? 'p-6 space-y-2' : 'p-8 sm:p-12 shadow-xs space-y-3.5'
      } ${className}`}
    >
      <div
        className={`rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 text-slate-400 flex items-center justify-center shadow-2xs ${
          compact ? 'w-10 h-10 mb-1' : 'w-14 h-14 sm:w-16 sm:h-16 mb-2'
        }`}
      >
        <Icon className={compact ? 'w-5 h-5 text-slate-400' : 'w-7 h-7 sm:w-8 sm:h-8 text-slate-400'} />
      </div>

      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          {badge}
        </span>
      )}

      <h3 className={`font-bold text-slate-900 ${compact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'}`}>
        {title}
      </h3>

      {description && (
        <p className={`text-slate-500 max-w-md mx-auto leading-relaxed ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={`flex flex-wrap items-center justify-center gap-2.5 pt-2 ${compact ? 'pt-1' : 'pt-2'}`}>
          {action && renderActionButton(action, true)}
          {secondaryAction && renderActionButton(secondaryAction, false)}
        </div>
      )}
    </motion.div>
  );
};
