export type UserRole = 'customer' | 'business' | 'admin';

export interface Category {
  id: string;
  name: string;
  iconName: string;
  description: string;
  subcategories: string[];
}

export interface BusinessService {
  id: string;
  title: string;
  description: string;
  estimatedPriceFrom?: number;
  durationText?: string;
}

export interface BusinessProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  inStock: boolean;
  category: string;
}

export interface Business {
  ownerId?: string;
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  categoryId: string;
  subcategory: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  description: string;
  logo: string;
  photos: string[];
  rating: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean; // "DESTAQUE" / "PATROCINADO"
  featuredUntil?: string; // Validade temporal do destaque
  active?: boolean;
  openNow: boolean;
  workingHours: string;
  distanceKm: number; // relative to current selected city
  plan: 'gratis' | 'pro' | 'premium';
  planTier?: 'gratis' | 'pro' | 'premium';
  coverImage?: string;
  leadsReceivedCount: number;
  leadCredits?: number;
  isDemo: boolean;
  services: BusinessService[];
  products: BusinessProduct[];
  reviews?: Review[];
}

export interface Offer {
  id: string;
  businessId: string;
  businessName: string;
  businessWhatsapp: string;
  businessCity: string;
  businessNeighborhood: string;
  title: string;
  description: string;
  currentPrice: number;
  originalPrice?: number; // Only true verified previous prices, never fictitious
  validUntil: string;
  categoryId: string;
  imageUrl: string;
  isDemo: boolean;
  verifiedDiscount: boolean;
  viewsCount: number;
  claimsCount: number;
}

export interface QuoteRequest {
  id: string;
  userId: string;
  targetBusinessId?: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  city: string;
  state: string;
  neighborhood: string;
  categoryId: string;
  subcategory?: string;
  title: string;
  description: string;
  desiredDeadline: string;
  budgetRange?: string;
  photos?: string[];
  createdAt: string;
  status: 'aberto' | 'propostas_recebidas' | 'escolhido' | 'finalizado' | 'cancelado';
  proposals: QuoteProposal[];
  origin?: 'geral' | 'direcionado' | 'proprio_consumidor' | 'recebido_parceiro';
}

export interface QuoteProposal {
  id: string;
  quoteRequestId: string;
  businessId: string;
  businessName: string;
  businessRating: number;
  businessReviewCount: number;
  businessDistanceKm: number;
  businessWhatsapp: string;
  price: number;
  deadlineText: string;
  description: string;
  createdAt: string;
  status: 'pendente' | 'escolhida' | 'recusada';
}

export interface PriceAlert {
  id: string;
  userId: string;
  keyword: string;
  maxPrice: number;
  categoryId: string;
  city: string;
  createdAt: string;
  active: boolean;
  notified: boolean;
}

export interface Review {
  id: string;
  businessId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  verifiedService: boolean;
  reported: boolean;
  isDemo: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  businessId: string;
  userId: string;
  senderType: 'user' | 'business';
  senderName: string;
  text: string;
  timestamp: string;
  quoteRequestId?: string;
}

export interface AdminMonetizationSettings {
  costPerLead: number;
  packLeads5: number;
  packLeads20: number;
  planProMonthly: number;
  planPremiumMonthly: number;
  featuredDailyRate: number;
  platformCommissionPercent: number;
  adminPixKey?: string;
  adminPixKeyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  adminPixBeneficiary?: string;
  adminPixBank?: string;
  adminWhatsapp?: string;
  adminReceiptInstructions?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'proposal' | 'offer' | 'price_alert' | 'chat' | 'system' | 'quote_directed' | 'proposal_received' | 'proposal_accepted' | 'proposal_chosen' | 'lead_opportunity';
  read: boolean;
  linkAction?: string;
}

export interface UserLocation {
  city: string;
  state: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
}
