import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: 'dark' | 'light';
  showSlogan?: boolean;
  className?: string;
}

export const BrandIcon: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const uniqueId = React.useId ? React.useId().replace(/[:]/g, '') : Math.random().toString(36).substring(2, 9);
  const goldGlowId = `goldGlow-${uniqueId}`;
  const whiteGleamId = `whiteGleam-${uniqueId}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 shadow-md shadow-emerald-500/25 border border-white/20 overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${sizeMap[size]} ${className}`}
    >
      {/* Dynamic ambient highlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/25 pointer-events-none" />

      {/* Custom Vector Icon for EconomizaJá (Stylized 'E' + Speed & Savings Arrow/Dollar fusion) */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
      >
        <defs>
          <linearGradient id={goldGlowId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id={whiteGleamId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Subtle currency vertical strike bar */}
        <path
          d="M20 5V35"
          stroke={`url(#${goldGlowId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Stylized Modern Letter 'E' with dynamic savings arrow */}
        {/* Top bar of E */}
        <path
          d="M12 11H27C28.1 11 29 11.9 29 13C29 14.1 28.1 15 27 15H15V25H25C26.1 25 27 25.9 27 27C27 28.1 26.1 29 25 29H12C10.9 29 10 28.1 10 27V13C10 11.9 10.9 11 12 11Z"
          fill={`url(#${whiteGleamId})`}
        />

        {/* Center arrow representing "Já" (speed) & smart savings */}
        <path
          d="M15 18.5H23.5L20.5 16C20.1 15.6 20.1 15 20.5 14.6C20.9 14.2 21.5 14.2 21.9 14.6L26.4 18.3C26.8 18.7 26.8 19.3 26.4 19.7L21.9 23.4C21.5 23.8 20.9 23.8 20.5 23.4C20.1 23 20.1 22.4 20.5 22L23.5 19.5H15C14.4 19.5 14 19.1 14 18.5C14 18 14.4 17.5 15 17.5V18.5Z"
          fill={`url(#${goldGlowId})`}
        />

        {/* Sparkle star on top right */}
        <path
          d="M31 7L31.6 8.4L33 9L31.6 9.6L31 11L30.4 9.6L29 9L30.4 8.4L31 7Z"
          fill="#fef08a"
        />
      </svg>
    </div>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'dark',
  showSlogan = true,
  className = '',
}) => {
  const textSizes = {
    sm: 'text-xs sm:text-base',
    md: 'text-sm sm:text-xl',
    lg: 'text-base sm:text-2xl',
    xl: 'text-lg sm:text-3xl',
  };

  const isLight = textColor === 'light';

  return (
    <div className={`flex items-center gap-2.5 text-left ${className}`}>
      <BrandIcon size={size} />

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-display font-black tracking-tight leading-tight flex items-center ${
              textSizes[size]
            } ${isLight ? 'text-white' : 'text-slate-900'}`}
          >
            Economiza
            <span className="text-emerald-500 ml-0.5">
              Já
            </span>
          </span>

          {showSlogan && (
            <span
              className={`hidden sm:block text-[11px] font-medium leading-tight ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Antes de comprar, compare.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
