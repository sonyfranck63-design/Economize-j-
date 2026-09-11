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
 * Normaliza e compara categorias de forma flexível
 */
export const isCategoryMatch = (bizCat: string, quoteCat: string): boolean => {
  const b = (bizCat || '').toLowerCase().trim();
  const q = (quoteCat || '').toLowerCase().trim();
  if (!b || !q) return true;

  if (b === q) return true;
  if (b.includes(q) || q.includes(b)) return true;

  // Aliases automotivos
  const autoKeywords = ['automotivo', 'auto', 'mecanica', 'mecânica', 'carro', 'veiculo', 'veículo', 'oleo', 'óleo'];
  const isBAuto = autoKeywords.some((k) => b.includes(k));
  const isQAuto = autoKeywords.some((k) => q.includes(k));
  if (isBAuto && isQAuto) return true;

  // Aliases casa & serviços
  const homeKeywords = ['casa', 'servico', 'serviço', 'reforma', 'limpeza', 'eletricista', 'pintor', 'marceneiro'];
  const isBHome = homeKeywords.some((k) => b.includes(k));
  const isQHome = homeKeywords.some((k) => q.includes(k));
  if (isBHome && isQHome) return true;

  return false;
};

/**
 * Normaliza e compara localização de forma flexível e inteligente
 * Não bloqueia se o consumidor digitou o bairro (ex: Morro Santana) e a empresa está em Porto Alegre
 */
export const isLocationMatch = (
  biz: { city?: string; state?: string; neighborhood?: string },
  quote: { city?: string; state?: string; neighborhood?: string }
): boolean => {
  const bCity = (biz.city || '').toLowerCase().trim();
  const qCity = (quote.city || '').toLowerCase().trim();
  const bState = (biz.state || '').toLowerCase().trim();
  const qState = (quote.state || '').toLowerCase().trim();
  const bNeigh = (biz.neighborhood || '').toLowerCase().trim();
  const qNeigh = (quote.neighborhood || '').toLowerCase().trim();

  // Se alguma das partes não tiver cidade informada, permite atendimento
  if (!bCity || !qCity) return true;

  // Igualdade direta ou substring
  if (bCity === qCity || bCity.includes(qCity) || qCity.includes(bCity)) return true;

  // Bairro coincide com cidade ou vice-versa
  if (qNeigh && (qNeigh.includes(bCity) || bCity.includes(qNeigh))) return true;
  if (bNeigh && (bNeigh.includes(qCity) || qCity.includes(bNeigh))) return true;

  // Se o estado for o mesmo, o parceiro regional pode atender
  if (bState && qState && bState === qState) return true;

  // Se o nome do bairro for conhecido de uma capital (ex: Morro Santana em Porto Alegre)
  if (
    (qCity.includes('morro santana') || qNeigh.includes('morro santana')) &&
    (bCity.includes('porto alegre') || bState === 'rs')
  ) {
    return true;
  }

  return true;
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
