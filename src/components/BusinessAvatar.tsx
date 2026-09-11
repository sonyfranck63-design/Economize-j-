import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { isInvalidOrDeadImageUrl } from '../utils/imageUtils';

interface BusinessAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}

export const BusinessAvatar: React.FC<BusinessAvatarProps> = ({
  src,
  name,
  className = 'w-16 h-16 rounded-2xl border border-slate-100',
  iconClassName = 'w-6 h-6 text-emerald-600',
}) => {
  const [hasError, setHasError] = useState(false);

  const trimmedSrc = src?.trim();
  const showFallback = !trimmedSrc || isInvalidOrDeadImageUrl(trimmedSrc) || hasError;

  if (showFallback) {
    return (
      <div
        className={`flex items-center justify-center bg-emerald-50 border border-emerald-100 shrink-0 ${className}`}
      >
        <Building2 className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={trimmedSrc}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover bg-slate-50 shrink-0 ${className}`}
    />
  );
};
