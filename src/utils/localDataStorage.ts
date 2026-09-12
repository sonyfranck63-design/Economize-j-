import { Business, Offer, QuoteRequest } from '../types';
import { INITIAL_BUSINESSES, INITIAL_OFFERS, INITIAL_QUOTE_REQUESTS } from '../data/mockData';

const LOCAL_BIZ_KEY = 'economizaja_custom_businesses';
const LOCAL_OFFERS_KEY = 'economizaja_custom_offers';
const LOCAL_QUOTES_KEY = 'economizaja_custom_quotes';

export function getLocalBusinesses(): Business[] {
  try {
    const raw = localStorage.getItem(LOCAL_BIZ_KEY);
    const custom: Business[] = raw ? JSON.parse(raw) : [];
    const customIds = new Set(custom.map(b => b.id));
    const merged = [...custom, ...INITIAL_BUSINESSES.filter(b => !customIds.has(b.id))];
    return merged;
  } catch {
    return INITIAL_BUSINESSES;
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
    const custom: Offer[] = raw ? JSON.parse(raw) : [];
    const customIds = new Set(custom.map(o => o.id));
    const merged = [...custom, ...INITIAL_OFFERS.filter(o => !customIds.has(o.id))];
    return merged;
  } catch {
    return INITIAL_OFFERS;
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
    const custom: QuoteRequest[] = raw ? JSON.parse(raw) : [];
    const customIds = new Set(custom.map(q => q.id));
    const merged = [...custom, ...INITIAL_QUOTE_REQUESTS.filter(q => !customIds.has(q.id))];
    return merged;
  } catch {
    return INITIAL_QUOTE_REQUESTS;
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
