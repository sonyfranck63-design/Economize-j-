import React, { useState, useEffect } from 'react';
import { Wrench, Sparkles, ShoppingBag, Building2, Car, Store } from 'lucide-react';
import { getSmartImage, isInvalidOrDeadImageUrl } from '../utils/imageUtils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  category?: string;
  fallbackKeyword?: string;
  className?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  category,
  fallbackKeyword,
  className = 'w-full h-full object-cover',
  ...rest
}) => {
  const smartDefault = getSmartImage(category, fallbackKeyword || alt);

  // Se a URL fornecida for vazia ou for uma URL 404 conhecida, já usa o smart fallback direto
  const initialUrl = isInvalidOrDeadImageUrl(src) ? smartDefault : src!.trim();

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [errorStage, setErrorStage] = useState<number>(0); // 0 = original, 1 = fallback tentado, 2 = falha total (usar UI de ícone)

  useEffect(() => {
    const validUrl = isInvalidOrDeadImageUrl(src) ? smartDefault : src!.trim();
    setCurrentSrc(validUrl);
    setErrorStage(0);
  }, [src, category, fallbackKeyword, alt]);

  const handleError = () => {
    if (errorStage === 0) {
      // Tenta o fallback inteligente
      setCurrentSrc(smartDefault);
      setErrorStage(1);
    } else {
      // Se até o fallback falhou (ex: sem conexão à internet), usa a renderização visual nativa com SVG
      setErrorStage(2);
    }
  };

  // Ícone temático para o fallback visual absoluto (sem imagem de rede)
  const renderFallbackIcon = () => {
    const text = `${category || ''} ${fallbackKeyword || ''} ${alt || ''}`.toLowerCase();
    if (text.includes('automot') || text.includes('carro') || text.includes('oleo') || text.includes('mecân') || text.includes('pneu')) {
      return <Car className="w-10 h-10 text-emerald-600/80" />;
    }
    if (text.includes('casa') || text.includes('reform') || text.includes('eletric') || text.includes('hidraul')) {
      return <Wrench className="w-10 h-10 text-emerald-600/80" />;
    }
    if (text.includes('saude') || text.includes('beleza') || text.includes('estetica')) {
      return <Sparkles className="w-10 h-10 text-emerald-600/80" />;
    }
    return <Store className="w-10 h-10 text-emerald-600/80" />;
  };

  if (errorStage >= 2) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 select-none ${className}`}>
        {renderFallbackIcon()}
        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider line-clamp-1 px-2 text-center">
          {alt || 'EconomizaJá'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
      {...rest}
    />
  );
};
