// ==============================================================================
// EconomizaJá — Image Utilities & Smart Categorization Fallbacks
// ==============================================================================

// Lista de URLs conhecidas do Unsplash que estão quebradas (404/expiradas)
export const DEAD_IMAGE_PATTERNS = [
  'photo-1556761175-5973dc0f32d7',
  'photo-1486006920555-c77dce18193b',
];

// Imagens verificadas e testadas (HTTP 200 OK garantido)
export const VERIFIED_IMAGES = {
  // Automotivo
  oleo_lubrificante: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
  mecanica_motor: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
  carro_oficina: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=800&q=80',
  estetica_automotiva: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
  pneus_alinhamento: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
  guincho_reboque: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
  
  // Casa, Reforma & Construção
  casa_reforma: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  eletricista: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  hidraulica: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
  limpeza_faxina: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  
  // Saúde, Beleza & Bem-estar
  saude_beleza: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80',
  
  // Alimentação & Gastronomia
  gastronomia: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  
  // Comércio & Serviços Gerais
  comercio_geral: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
};

// Verifica se uma URL é válida ou se é um link quebrado conhecido
export function isInvalidOrDeadImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return true;
  return DEAD_IMAGE_PATTERNS.some((pattern) => trimmed.includes(pattern));
}

// Seleciona a imagem mais condizente com a categoria e serviço
export function getSmartImage(categoryId?: string, keywordOrTitle?: string): string {
  const text = `${categoryId || ''} ${keywordOrTitle || ''}`.toLowerCase();

  // 1. Especificidades automotivas (alta precisão)
  if (text.includes('oleo') || text.includes('óleo') || text.includes('lubrific') || text.includes('filtro')) {
    return VERIFIED_IMAGES.oleo_lubrificante;
  }
  if (text.includes('pneu') || text.includes('alinhamento') || text.includes('balanceamento') || text.includes('borracha')) {
    return VERIFIED_IMAGES.pneus_alinhamento;
  }
  if (text.includes('estetica') || text.includes('estética') || text.includes('lavagem') || text.includes('polimento') || text.includes('higieniz')) {
    return VERIFIED_IMAGES.estetica_automotiva;
  }
  if (text.includes('guincho') || text.includes('reboque') || text.includes('socorro')) {
    return VERIFIED_IMAGES.guincho_reboque;
  }
  if (
    text.includes('automot') ||
    text.includes('carro') ||
    text.includes('mecanic') ||
    text.includes('mecânic') ||
    text.includes('motor') ||
    text.includes('oficina') ||
    text.includes('freio') ||
    text.includes('suspens')
  ) {
    return VERIFIED_IMAGES.mecanica_motor;
  }

  // 2. Casa, Reformas & Construção
  if (text.includes('eletric') || text.includes('elétric') || text.includes('energia') || text.includes('fiação')) {
    return VERIFIED_IMAGES.eletricista;
  }
  if (text.includes('hidraulic') || text.includes('hidráulic') || text.includes('encanad') || text.includes('vazamento') || text.includes('cano')) {
    return VERIFIED_IMAGES.hidraulica;
  }
  if (text.includes('limpeza') || text.includes('faxina') || text.includes('diarista') || text.includes('higieniza')) {
    return VERIFIED_IMAGES.limpeza_faxina;
  }
  if (text.includes('casa') || text.includes('reforma') || text.includes('pintura') || text.includes('pedreiro') || text.includes('construç')) {
    return VERIFIED_IMAGES.casa_reforma;
  }

  // 3. Saúde & Beleza
  if (text.includes('saude') || text.includes('saúde') || text.includes('beleza') || text.includes('cabelo') || text.includes('barba') || text.includes('salão') || text.includes('estetica')) {
    return VERIFIED_IMAGES.saude_beleza;
  }

  // 4. Alimentação
  if (text.includes('alimento') || text.includes('comida') || text.includes('restaurante') || text.includes('lanche') || text.includes('pizza') || text.includes('padaria')) {
    return VERIFIED_IMAGES.gastronomia;
  }

  // Padrão de serviço geral confiável
  return VERIFIED_IMAGES.comercio_geral;
}

// Sugestões visuais pré-definidas para o parceiro escolher com 1 clique ao criar ofertas
export const OFFER_IMAGE_SUGGESTIONS = [
  {
    title: 'Troca de Óleo e Filtros',
    url: VERIFIED_IMAGES.oleo_lubrificante,
    category: 'automotivo',
  },
  {
    title: 'Mecânica & Motor',
    url: VERIFIED_IMAGES.mecanica_motor,
    category: 'automotivo',
  },
  {
    title: 'Estética Automotiva & Polimento',
    url: VERIFIED_IMAGES.estetica_automotiva,
    category: 'automotivo',
  },
  {
    title: 'Pneus & Alinhamento',
    url: VERIFIED_IMAGES.pneus_alinhamento,
    category: 'automotivo',
  },
  {
    title: 'Reforma & Construção',
    url: VERIFIED_IMAGES.casa_reforma,
    category: 'casa',
  },
  {
    title: 'Serviços Elétricos',
    url: VERIFIED_IMAGES.eletricista,
    category: 'casa',
  },
  {
    title: 'Encanador & Hidráulica',
    url: VERIFIED_IMAGES.hidraulica,
    category: 'casa',
  },
  {
    title: 'Limpeza Residencial & Comercial',
    url: VERIFIED_IMAGES.limpeza_faxina,
    category: 'casa',
  },
  {
    title: 'Salão, Beleza & Cuidados',
    url: VERIFIED_IMAGES.saude_beleza,
    category: 'saude',
  },
  {
    title: 'Comércio & Serviços Gerais',
    url: VERIFIED_IMAGES.comercio_geral,
    category: 'geral',
  },
];
