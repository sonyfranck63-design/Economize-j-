import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Business,
  Offer,
  QuoteRequest,
  QuoteProposal,
  Review,
  PriceAlert,
  ChatMessage,
  AdminMonetizationSettings,
} from '../types';

export const dataService = {
  // ==========================================
  // BUSINESSES
  // ==========================================
  async getBusinesses(city?: string, categoryId?: string): Promise<Business[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('businesses')
      .select('*, business_services(*), business_products(*)')
      .eq('active', true);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn('Erro ao carregar empresas do Supabase:', error?.message);
      return [];
    }

    return data.map((b: any) => ({
      id: b.id,
      name: b.name,
      ownerName: b.legal_name || b.name,
      email: '',
      phone: b.phone,
      whatsapp: b.whatsapp,
      categoryId: b.category_id,
      subcategory: b.subcategory,
      city: b.city,
      state: b.state,
      neighborhood: b.neighborhood,
      address: b.address,
      description: b.description || '',
      logo: b.logo_url || '',
      photos: b.photos || [],
      rating: Number(b.rating) || 5,
      reviewCount: b.review_count || 0,
      verified: Boolean(b.verified),
      featured: Boolean(b.featured),
      openNow: true,
      workingHours: b.working_hours || 'Seg a Sex: 08h às 18h',
      distanceKm: 1.5,
      plan: (b.plan_tier as any) || 'gratis',
      leadsReceivedCount: b.leads_count || 0,
      isDemo: false,
      services: (b.business_services || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        estimatedPriceFrom: s.estimated_price_from,
        durationText: s.duration_text,
      })),
      products: (b.business_products || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        inStock: p.in_stock,
        category: p.category,
      })),
    }));
  },

  async createBusiness(business: Omit<Business, 'id' | 'leadsReceivedCount'>, ownerId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado');
    }

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: business.name,
        legal_name: business.ownerName,
        phone: business.phone,
        whatsapp: business.whatsapp,
        category_id: business.categoryId,
        subcategory: business.subcategory,
        address: business.address,
        neighborhood: business.neighborhood,
        city: business.city,
        state: business.state,
        description: business.description,
        logo_url: business.logo,
        photos: business.photos,
        verified: business.verified,
        featured: business.featured,
        plan_tier: business.plan,
        working_hours: business.workingHours,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  },

  async toggleBusinessVerified(id: string, verified: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('businesses').update({ verified }).eq('id', id);
  },

  async toggleBusinessFeatured(id: string, featured: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('businesses').update({ featured }).eq('id', id);
  },

  // ==========================================
  // OFFERS
  // ==========================================
  async getOffers(city?: string, categoryId?: string): Promise<Offer[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('offers')
      .select('*, businesses(name, whatsapp, city, neighborhood)')
      .eq('active', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn('Erro ao carregar ofertas:', error?.message);
      return [];
    }

    return data.map((o: any) => ({
      id: o.id,
      businessId: o.business_id,
      businessName: o.businesses?.name || 'Empresa Local',
      businessWhatsapp: o.businesses?.whatsapp || '',
      businessCity: o.businesses?.city || '',
      businessNeighborhood: o.businesses?.neighborhood || '',
      title: o.title,
      description: o.description,
      currentPrice: Number(o.current_price),
      originalPrice: o.original_price ? Number(o.original_price) : undefined,
      validUntil: o.valid_until,
      categoryId: o.category_id,
      imageUrl: o.image_url || '',
      isDemo: false,
      verifiedDiscount: Boolean(o.verified_discount),
      viewsCount: o.views_count || 0,
      claimsCount: o.claims_count || 0,
    }));
  },

  async createOffer(offer: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { data, error } = await supabase
      .from('offers')
      .insert({
        business_id: offer.businessId,
        title: offer.title,
        description: offer.description,
        current_price: offer.currentPrice,
        original_price: offer.originalPrice,
        valid_until: offer.validUntil,
        category_id: offer.categoryId,
        image_url: offer.imageUrl,
        verified_discount: offer.verifiedDiscount,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  },

  async removeOffer(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('offers').update({ active: false }).eq('id', id);
  },

  // ==========================================
  // QUOTE REQUESTS & PROPOSALS
  // ==========================================
  async getQuoteRequests(userId?: string): Promise<QuoteRequest[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('quote_requests')
      .select('*, quote_proposals(*, businesses(name, whatsapp, rating, review_count))')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((qr: any) => ({
      id: qr.id,
      userId: qr.user_id,
      userName: qr.user_name,
      userPhone: qr.user_phone,
      userEmail: qr.user_email,
      city: qr.city,
      state: qr.state,
      neighborhood: qr.neighborhood,
      categoryId: qr.category_id,
      subcategory: qr.subcategory,
      title: qr.title,
      description: qr.description,
      desiredDeadline: qr.desired_deadline,
      budgetRange: qr.budget_range,
      photos: qr.photos || [],
      createdAt: qr.created_at,
      status: qr.status,
      proposals: (qr.quote_proposals || []).map((p: any) => ({
        id: p.id,
        quoteRequestId: p.quote_request_id,
        businessId: p.business_id,
        businessName: p.businesses?.name || 'Empresa Parceira',
        businessRating: Number(p.businesses?.rating) || 5,
        businessReviewCount: p.businesses?.review_count || 0,
        businessDistanceKm: 2.1,
        businessWhatsapp: p.businesses?.whatsapp || '',
        price: Number(p.price),
        deadlineText: p.deadline_text,
        description: p.description,
        createdAt: p.created_at,
        status: p.status,
      })),
    }));
  },

  async createQuoteRequest(quote: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>, userId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { data, error } = await supabase
      .from('quote_requests')
      .insert({
        user_id: userId,
        user_name: quote.userName,
        user_phone: quote.userPhone,
        user_email: quote.userEmail,
        city: quote.city,
        state: quote.state,
        neighborhood: quote.neighborhood,
        category_id: quote.categoryId,
        subcategory: quote.subcategory,
        title: quote.title,
        description: quote.description,
        desired_deadline: quote.desiredDeadline,
        budget_range: quote.budgetRange,
        photos: quote.photos,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Cria o lead comercial correspondente
    await supabase.from('leads').insert({
      quote_request_id: data.id,
      category_id: quote.categoryId,
      city: quote.city,
      state: quote.state,
      neighborhood: quote.neighborhood,
      title: quote.title,
      description: quote.description,
      price: 15.00,
      status: 'AVAILABLE',
    });

    return data.id;
  },

  async submitProposal(params: {
    quoteRequestId: string;
    businessId: string;
    price: number;
    deadlineText: string;
    description: string;
  }): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { data, error } = await supabase
      .from('quote_proposals')
      .insert({
        quote_request_id: params.quoteRequestId,
        business_id: params.businessId,
        price: params.price,
        deadline_text: params.deadlineText,
        description: params.description,
        status: 'pendente',
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Atualiza status do pedido de orçamento
    await supabase
      .from('quote_requests')
      .update({ status: 'propostas_recebidas' })
      .eq('id', params.quoteRequestId);

    return data.id;
  },

  async acceptProposal(quoteRequestId: string, proposalId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    await supabase
      .from('quote_proposals')
      .update({ status: 'escolhida' })
      .eq('id', proposalId);

    await supabase
      .from('quote_requests')
      .update({ status: 'escolhido' })
      .eq('id', quoteRequestId);
  },

  // ==========================================
  // REVIEWS
  // ==========================================
  async getReviews(businessId?: string): Promise<Review[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      businessId: r.business_id,
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      verifiedService: Boolean(r.verified_service),
      reported: Boolean(r.reported),
      isDemo: false,
    }));
  },

  async addReview(params: {
    businessId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
  }): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { error } = await supabase.from('reviews').insert({
      business_id: params.businessId,
      user_id: params.userId,
      user_name: params.userName,
      rating: params.rating,
      comment: params.comment,
      verified_service: true,
    });

    if (error) throw new Error(error.message);
  },

  async reportReview(reviewId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('reviews').update({ reported: true }).eq('id', reviewId);
  },

  // ==========================================
  // PRICE ALERTS
  // ==========================================
  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((pa: any) => ({
      id: pa.id,
      userId: pa.user_id,
      keyword: pa.keyword,
      maxPrice: Number(pa.max_price),
      categoryId: pa.category_id,
      city: pa.city,
      createdAt: pa.created_at,
      active: pa.active,
      notified: pa.notified,
    }));
  },

  async createPriceAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'active' | 'notified'>, userId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: userId,
        keyword: alert.keyword,
        max_price: alert.maxPrice,
        category_id: alert.categoryId,
        city: alert.city,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  },

  async removePriceAlert(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('price_alerts').delete().eq('id', id);
  },

  // ==========================================
  // MONETIZATION & APP SETTINGS
  // ==========================================
  async getMonetizationSettings(): Promise<AdminMonetizationSettings | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'monetization')
      .single();

    if (error || !data) return null;
    return data.value as AdminMonetizationSettings;
  },

  async updateMonetizationSettings(settings: AdminMonetizationSettings): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'monetization',
        value: settings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  },
};
