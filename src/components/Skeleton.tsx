import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Skeleton base: bloco cinza com animate-pulse e cantos arredondados consistentes com o design system
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
      {...props}
    />
  );
};

/**
 * Skeleton para card de Ofertas (OffersView / SearchView)
 */
export const OfferCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col justify-between">
      {/* Imagem */}
      <div className="relative h-48 bg-slate-100 animate-pulse">
        <div className="absolute top-3 left-3 w-20 h-5 bg-slate-200 rounded-md" />
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-200" />
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton para card de Empresas (SearchView)
 */
export const BusinessCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-4 w-full md:w-auto">
        <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 max-w-full" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
        <Skeleton className="h-10 w-full md:w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      </div>
    </div>
  );
};

/**
 * Skeleton para card de Cotação (QuotesView)
 */
export const QuoteCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-56" />
        </div>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton para itens no popover de Notificações
 */
export const NotificationItemSkeleton: React.FC = () => {
  return (
    <div className="p-3 rounded-xl my-1 bg-slate-50/60 border border-slate-100 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-12" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  );
};
