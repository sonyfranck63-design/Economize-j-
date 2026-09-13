/**
 * Utilitários para gestão de cotações, matching de negócios e persistência de exclusões locais
 */

const DELETED_QUOTES_KEY = 'economizaja_deleted_quote_ids';

export const getDeletedQuoteIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_QUOTES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const markQuoteAsDeletedLocally = (id: string): void => {
  try {
    const set = getDeletedQuoteIds();
    set.add(id);
    localStorage.setItem(DELETED_QUOTES_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Não foi possível salvar id de cotação excluída localmente:', err);
  }
};

/**
 * Remove acentos e normaliza texto para comparação resiliente
 */
const normalizeText = (text: unknown): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Dicionário de sinônimos e siglas conhecidas de cidades brasileiras
 */
const CITY_ALIASES: Record<string, string[]> = {
  'porto alegre': ['poa', 'porto alegre', 'capital'],
  'poa': ['poa', 'porto alegre', 'capital'],
  'sao paulo': ['sp', 'sampa', 'sao paulo', 'capital'],
  'rio de janeiro': ['rj', 'rio', 'rio de janeiro', 'capital'],
  'belo horizonte': ['bh', 'belo horizonte', 'capital'],
  'curitiba': ['cwb', 'curitiba', 'capital'],
  'brasilia': ['bsb', 'brasilia', 'distrito federal', 'df'],
  'salvador': ['ssa', 'salvador', 'capital'],
  'florianopolis': ['floripa', 'florianopolis', 'capital'],
  'caxias do sul': ['caxias', 'caxias do sul'],
  'canoas': ['canoas', 'regiao metropolitana'],
  'gravatai': ['gravatai'],
  'viamao': ['viamao'],
  'novo hamburgo': ['novo hamburgo'],
  'sao leopoldo': ['sao leopoldo'],
};

/**
 * Normaliza e compara categorias de forma flexível e inteligente
 */
export const isCategoryMatch = (bizCat: string, quoteCat: string): boolean => {
  const b = normalizeText(bizCat);
  const q = normalizeText(quoteCat);
  if (!b || !q) return true;

  if (b === q) return true;
  if (b.includes(q) || q.includes(b)) return true;

  // Categoria universal ou geral
  if (b === 'geral' || q === 'geral' || b === 'servicos' || q === 'servicos') {
    return true;
  }

  // Aliases automotivos
  const autoKeywords = [
    'automotivo', 'auto', 'mecanica', 'carro', 'veiculo', 'oleo', 'pneu', 'freio',
    'suspensao', 'eletrica auto', 'bateria', 'guincho', 'oficina', 'troca de oleo'
  ];
  const isBAuto = autoKeywords.some((k) => b.includes(k));
  const isQAuto = autoKeywords.some((k) => q.includes(k));
  if (isBAuto && isQAuto) return true;

  // Aliases casa, reformas e hidráulica
  const homeKeywords = [
    'casa', 'hidraulica', 'encanador', 'vazamento', 'servico', 'reforma',
    'construcao', 'limpeza', 'eletricista', 'pintor', 'marceneiro', 'pedreiro',
    'serralheiro', 'calha', 'telhado', 'desentupidora'
  ];
  const isBHome = homeKeywords.some((k) => b.includes(k));
  const isQHome = homeKeywords.some((k) => q.includes(k));
  if (isBHome && isQHome) return true;

  // Aliases tecnologia
  const techKeywords = ['tecnologia', 'informatica', 'celular', 'computador', 'notebook', 'impressora', 'ti', 'software'];
  const isBTech = techKeywords.some((k) => b.includes(k));
  const isQTech = techKeywords.some((k) => q.includes(k));
  if (isBTech && isQTech) return true;

  // Aliases climatização e refrigeração
  const climaKeywords = ['climatizacao', 'ar condicionado', 'refrigeracao', 'aquecedor', 'split', 'ventilacao'];
  const isBClima = climaKeywords.some((k) => b.includes(k));
  const isQClima = climaKeywords.some((k) => q.includes(k));
  if (isBClima && isQClima) return true;

  // Aliases beleza e saúde
  const beautyKeywords = ['beleza', 'estetica', 'salao', 'cabelo', 'barbearia', 'manicure', 'massagem', 'saude', 'clinica'];
  const isBBeauty = beautyKeywords.some((k) => b.includes(k));
  const isQBeauty = beautyKeywords.some((k) => q.includes(k));
  if (isBBeauty && isQBeauty) return true;

  return false;
};

/**
 * Normaliza e compara localização de forma flexível e inteligente.
 * Trata siglas como 'poa' <-> 'porto alegre', bairros, estados e cidades vizinhas.
 */
export const isLocationMatch = (
  biz: { city?: string; state?: string; neighborhood?: string },
  quote: { city?: string; state?: string; neighborhood?: string }
): boolean => {
  const bCity = normalizeText(biz.city);
  const qCity = normalizeText(quote.city);
  const bState = normalizeText(biz.state);
  const qState = normalizeText(quote.state);
  const bNeigh = normalizeText(biz.neighborhood);
  const qNeigh = normalizeText(quote.neighborhood);

  // Se alguma das partes não tiver cidade informada, permite atendimento
  if (!bCity || !qCity) return true;

  // Igualdade direta ou substring
  if (bCity === qCity || bCity.includes(qCity) || qCity.includes(bCity)) return true;

  // Comparação por apelidos/siglas conhecidas (ex: POA <-> Porto Alegre)
  for (const [, aliases] of Object.entries(CITY_ALIASES)) {
    const bInAliases = aliases.includes(bCity);
    const qInAliases = aliases.includes(qCity);
    if (bInAliases && qInAliases) return true;
  }

  // Bairro coincide com cidade ou vice-versa (ex: consumidor digitou 'Morro Santana' no campo cidade)
  if (qNeigh && (qNeigh.includes(bCity) || bCity.includes(qNeigh))) return true;
  if (bNeigh && (bNeigh.includes(qCity) || qCity.includes(bNeigh))) return true;

  // Bairros idênticos
  if (bNeigh && qNeigh && (bNeigh === qNeigh || bNeigh.includes(qNeigh) || qNeigh.includes(bNeigh))) {
    return true;
  }

  // Se ambos os estados estão informados e são diferentes, não é a mesma região
  if (bState && qState && bState !== qState) {
    return false;
  }

  // Se o estado for o mesmo (ex: RS), empresas do estado podem prestar atendimento regional
  if (bState && qState && bState === qState) return true;

  // Caso padrão tolerante se nenhum estado foi informado para não ocultar oportunidades
  return !bCity || !qCity;
};

/**
 * Validação abrangente se uma cotação é pertinente a uma empresa
 */
export const isQuoteMatchingBusiness = (
  quote: { categoryId: string; city: string; state?: string; neighborhood?: string },
  biz: { categoryId: string; city: string; state?: string; neighborhood?: string }
): boolean => {
  return isCategoryMatch(biz.categoryId, quote.categoryId) && isLocationMatch(biz, quote);
};
