// PRODUÇÃO: Este arquivo gerencia dados locais do localStorage.
// Dados de demonstração (mockData.ts) NÃO são mais incluídos aqui —
// eles são exibidos SOMENTE no modo offline explícito (sem Supabase configurado)
// através do AppContext, nunca misturados com dados reais.
import { Business, Offer, QuoteRequest } from '../types';

const LOCAL_BIZ_KEY = 'economizaja_custom_businesses';
const LOCAL_OFFERS_KEY = 'economizaja_custom_offers';
const LOCAL_QUOTES_KEY = 'economizaja_custom_quotes';

export function getLocalBusinesses(): Business[] {
  try {
    const raw = localStorage.getItem(LOCAL_BIZ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBusiness(business: Business) {
  try {
    const raw = localStorage.getItem(LOCAL_BIZ_KEY);
    const custom: Business[] = raw ? JSON.parse(raw) : [];
    const existingIdx = custom.findIndex(b => b.id === business.id);
    if (existingIdx >= 0) {
      custom[existingIdx] = business;
    } else {
      custom.unshift(business);
    }
    localStorage.setItem(LOCAL_BIZ_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Erro ao salvar empresa no localStorage:', e);
  }
}

export function getLocalOffers(): Offer[] {
  try {
    const raw = localStorage.getItem(LOCAL_OFFERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalOffer(offer: Offer) {
  try {
    const raw = localStorage.getItem(LOCAL_OFFERS_KEY);
    const custom: Offer[] = raw ? JSON.parse(raw) : [];
    const existingIdx = custom.findIndex(o => o.id === offer.id);
    if (existingIdx >= 0) {
      custom[existingIdx] = offer;
    } else {
      custom.unshift(offer);
    }
    localStorage.setItem(LOCAL_OFFERS_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Erro ao salvar oferta no localStorage:', e);
  }
}

export function getLocalQuoteRequests(): QuoteRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalQuoteRequest(quote: QuoteRequest) {
  try {
    const raw = localStorage.getItem(LOCAL_QUOTES_KEY);
    const custom: QuoteRequest[] = raw ? JSON.parse(raw) : [];
    const existingIdx = custom.findIndex(q => q.id === quote.id);
    if (existingIdx >= 0) {
      custom[existingIdx] = quote;
    } else {
      custom.unshift(quote);
    }
    localStorage.setItem(LOCAL_QUOTES_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Erro ao salvar cotação no localStorage:', e);
  }
}

// Limpa TODOS os dados locais (útil para migração de dev → produção)
export function clearAllLocalData() {
  try {
    localStorage.removeItem(LOCAL_BIZ_KEY);
    localStorage.removeItem(LOCAL_OFFERS_KEY);
    localStorage.removeItem(LOCAL_QUOTES_KEY);
  } catch (e) {
    console.warn('Erro ao limpar dados locais:', e);
  }
}
