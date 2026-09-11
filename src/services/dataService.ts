import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSmartImage, isInvalidOrDeadImageUrl } from '../utils/imageUtils';
import { getDeletedQuoteIds, markQuoteAsDeletedLocally } from '../utils/quoteStorage';
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
  async getBusinesses(city?: string, categoryId?: string, includeInactive = false): Promise<Business[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('businesses')
      .select('*, business_services(*), business_products(*)');

    if (!includeInactive) {
      query = query.eq('active', true);
    }
    query = query.limit(100);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error || !data) {
      if (error?.message?.includes('Failed to fetch')) {
        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL.');
      } else {
        console.warn('Erro ao carregar empresas do Supabase:', error?.message);
      }
      return [];
    }

    return data.map((b: any) => ({
      id: b.id,
      name: b.name,
      ownerId: b.owner_id,
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
      active: b.active !== false,
      openNow: true,
      workingHours: b.working_hours || 'Seg a Sex: 08h às 18h',
      distanceKm: 1.5,
      plan: (b.plan_tier as any) || 'gratis',
      planTier: (b.plan_tier as any) || 'gratis',
      coverImage: !isInvalidOrDeadImageUrl(b.photos?.[0]) 
        ? b.photos[0] 
        : !isInvalidOrDeadImageUrl(b.logo_url) 
        ? b.logo_url 
        : getSmartImage(b.category_id, `${b.subcategory || ''} ${b.name || ''}`),
      leadsReceivedCount: b.leads_count || 0,
      isDemo: false,
      reviews: [],
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

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('Sua sessão expirou. Faça login novamente para cadastrar uma empresa.');
    }

    const validLogo = !isInvalidOrDeadImageUrl(business.logo)
      ? business.logo
      : getSmartImage(business.categoryId, business.name);

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_id: authData.user.id,
        name: business.name,
        legal_name: business.ownerName || business.name,
        phone: business.phone,
        whatsapp: business.whatsapp || business.phone,
        category_id: business.categoryId,
        subcategory: business.subcategory,
        address: business.address,
        neighborhood: business.neighborhood,
        city: business.city,
        state: business.state,
        description: business.description || '',
        logo_url: validLogo,
        photos: business.photos && business.photos.length > 0 ? business.photos : [validLogo],
        verified: Boolean(business.verified),
        featured: Boolean(business.featured),
        plan_tier: business.plan || 'gratis',
        working_hours: business.workingHours || 'Seg a Sex: 08h às 18h',
        active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao inserir empresa no Supabase:', error);
      throw new Error(error.message || 'Erro ao persistir empresa no banco de dados');
    }

    // Upgrade profile role to 'business' automatically if it's currently 'customer'
    try {
      await supabase
        .from('profiles')
        .update({ role: 'business' })
        .eq('id', authData.user.id)
        .eq('role', 'customer');
    } catch (profileErr) {
      console.warn('Aviso ao atualizar role do perfil para business:', profileErr);
    }

    return data.id;
  },

  async toggleBusinessActive(id: string, active: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('businesses').update({ active }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async toggleBusinessVerified(id: string, verified: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('businesses').update({ verified }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async toggleBusinessFeatured(id: string, featured: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('businesses').update({ featured }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteBusiness(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteOffer(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ==========================================
  // OFFERS
  // ==========================================
  async getOffers(city?: string, categoryId?: string): Promise<Offer[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('offers')
      .select('*, businesses(name, whatsapp, city, neighborhood)')
      .eq('active', true).limit(50)
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error || !data) {
      if (error?.message?.includes('Failed to fetch')) {
        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL.');
      } else {
        console.warn('Erro ao carregar ofertas:', error?.message);
      }
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
      imageUrl: !isInvalidOrDeadImageUrl(o.image_url)
        ? o.image_url
        : getSmartImage(o.category_id, o.title),
      isDemo: false,
      reviews: [],
      verifiedDiscount: Boolean(o.verified_discount),
      viewsCount: o.views_count || 0,
      claimsCount: o.claims_count || 0,
    }));
  },

  async createOffer(offer: Omit<Offer, 'id' | 'viewsCount' | 'claimsCount'>): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const finalImageUrl = !isInvalidOrDeadImageUrl(offer.imageUrl)
      ? offer.imageUrl
      : getSmartImage(offer.categoryId, offer.title);

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
        image_url: finalImageUrl,
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
  // FAVORITES (PERSISTÊNCIA DEFINITIVA NO SUPABASE)
  // ==========================================
  async getUserFavorites(userId: string): Promise<{ businessIds: string[]; offerIds: string[] }> {
    if (!isSupabaseConfigured || !supabase || !userId) {
      return { businessIds: [], offerIds: [] };
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id, business_id, offer_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao carregar favoritos do Supabase:', error);
        return { businessIds: [], offerIds: [] };
      }

      const businessIds: string[] = [];
      const offerIds: string[] = [];

      (data || []).forEach((fav) => {
        if (fav.business_id) businessIds.push(fav.business_id);
        if (fav.offer_id) offerIds.push(fav.offer_id);
      });

      return { businessIds, offerIds };
    } catch (err) {
      console.error('Falha de rede ao consultar favoritos:', err);
      return { businessIds: [], offerIds: [] };
    }
  },

  async addFavoriteBusiness(userId: string, businessId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    if (!userId) throw new Error('Usuário precisa estar autenticado para favoritar');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        business_id: businessId,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Já existe nos favoritos (idempotente)
        return businessId;
      }
      console.error('Erro ao adicionar favorito no Supabase:', error);
      throw new Error(error.message || 'Erro ao favoritar empresa no Supabase');
    }

    return data.id;
  },

  async removeFavoriteBusiness(userId: string, businessId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    if (!userId) throw new Error('Usuário precisa estar autenticado');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('business_id', businessId);

    if (error) {
      console.error('Erro ao remover favorito no Supabase:', error);
      throw new Error(error.message || 'Erro ao desfavoritar empresa no Supabase');
    }
  },

  async addFavoriteOffer(userId: string, offerId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    if (!userId) throw new Error('Usuário precisa estar autenticado para favoritar');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        offer_id: offerId,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Já existe nos favoritos (idempotente)
        return offerId;
      }
      console.error('Erro ao favoritar oferta no Supabase:', error);
      throw new Error(error.message || 'Erro ao favoritar oferta no Supabase');
    }

    return data.id;
  },

  async removeFavoriteOffer(userId: string, offerId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    if (!userId) throw new Error('Usuário precisa estar autenticado');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('offer_id', offerId);

    if (error) {
      console.error('Erro ao remover oferta favorita no Supabase:', error);
      throw new Error(error.message || 'Erro ao desfavoritar oferta no Supabase');
    }
  },

  // ==========================================
  // QUOTE REQUESTS & PROPOSALS
  // ==========================================
  async getUserQuoteRequests(userId: string): Promise<QuoteRequest[]> {
    if (!isSupabaseConfigured || !supabase || !userId) return [];

    const { data, error } = await supabase
      .from('quote_requests')
      .select(`
        *,
        quote_proposals (
          id,
          quote_request_id,
          business_id,
          price,
          deadline_text,
          description,
          status,
          created_at,
          businesses (
            name,
            whatsapp,
            rating,
            review_count
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      if (!this.isTableMissing(error)) {
        console.warn('Aviso ao buscar solicitações do cliente na tabela quote_requests:', error?.message);
      }
      return [];
    }

    const deletedIds = getDeletedQuoteIds();
    return data
      .filter((qr: any) => !deletedIds.has(qr.id) && qr.status !== 'cancelado')
      .map((qr: any) => ({
      id: qr.id,
      userId: qr.user_id,
      targetBusinessId: qr.target_business_id,
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

  async getMarketplaceQuoteRequests(): Promise<QuoteRequest[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    // Consulta a view segura onde telefone e e-mail são protegidos/mascarados para empresas
    const { data, error } = await supabase
      .from('secure_leads_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      if (error?.message?.includes('Failed to fetch')) {
        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida.');
      }
      return [];
    }

    // Carrega propostas acessíveis para os orçamentos (RLS permite ver próprias propostas e se for cliente/admin)
    const proposalsMap = new Map<string, QuoteProposal[]>();
    try {
      const { data: propsData } = await supabase
        .from('quote_proposals')
        .select(`
          id,
          quote_request_id,
          business_id,
          price,
          deadline_text,
          description,
          created_at,
          status,
          businesses (
            name,
            whatsapp,
            rating,
            review_count
          )
        `);

      if (propsData && propsData.length > 0) {
        propsData.forEach((p: any) => {
          const list = proposalsMap.get(p.quote_request_id) || [];
          list.push({
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
          });
          proposalsMap.set(p.quote_request_id, list);
        });
      }
    } catch (propsErr) {
      console.warn('Aviso ao carregar propostas no marketplace:', propsErr);
    }

    const deletedIds = getDeletedQuoteIds();
    return data
      .filter((qr: any) => !deletedIds.has(qr.id) && qr.status !== 'cancelado')
      .map((qr: any) => ({
      id: qr.id,
      userId: qr.user_id,
      targetBusinessId: qr.target_business_id,
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
      proposals: proposalsMap.get(qr.id) || [],
    }));
  },

  /**
   * Busca orçamentos direcionados diretamente para as empresas do usuário logado
   */
  async getBusinessDirectQuoteRequests(businessIds: string[]): Promise<QuoteRequest[]> {
    if (!isSupabaseConfigured || !supabase || !businessIds || businessIds.length === 0) return [];

    const { data, error } = await supabase
      .from('quote_requests')
      .select(`
        *,
        quote_proposals (
          id,
          quote_request_id,
          business_id,
          price,
          deadline_text,
          description,
          status,
          created_at,
          businesses (
            name,
            whatsapp,
            rating,
            review_count
          )
        )
      `)
      .in('target_business_id', businessIds)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const deletedIds = getDeletedQuoteIds();
    return data
      .filter((qr: any) => !deletedIds.has(qr.id) && qr.status !== 'cancelado')
      .map((qr: any) => ({
        id: qr.id,
        userId: qr.user_id,
        targetBusinessId: qr.target_business_id,
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

  /**
   * Sincronização unificada: combina cotações do cliente, cotações direcionadas às suas empresas e marketplace
   */
  async syncAllQuoteRequests(userId?: string, ownedBusinessIds: string[] = []): Promise<QuoteRequest[]> {
    const deletedIds = getDeletedQuoteIds();
    const map = new Map<string, QuoteRequest>();

    // 1. Cotações de marketplace (secure_leads_view)
    try {
      const marketQuotes = await this.getMarketplaceQuoteRequests();
      (marketQuotes || []).forEach((q) => {
        if (!deletedIds.has(q.id) && q.status !== 'cancelado') {
          map.set(q.id, q);
        }
      });
    } catch (e) {
      console.warn('Aviso ao sincronizar cotações do marketplace:', e);
    }

    // 2. Se o usuário possuir empresas, busca cotações direcionadas diretamente às suas empresas
    if (ownedBusinessIds && ownedBusinessIds.length > 0) {
      try {
        const directQuotes = await this.getBusinessDirectQuoteRequests(ownedBusinessIds);
        (directQuotes || []).forEach((q) => {
          if (!deletedIds.has(q.id) && q.status !== 'cancelado') {
            map.set(q.id, q);
          }
        });
      } catch (e) {
        console.warn('Aviso ao sincronizar cotações direcionadas às empresas:', e);
      }
    }

    // 3. Se for usuário autenticado, busca suas cotações pessoais (com propostas completas de clientes)
    if (userId) {
      try {
        const userQuotes = await this.getUserQuoteRequests(userId);
        (userQuotes || []).forEach((q) => {
          if (!deletedIds.has(q.id) && q.status !== 'cancelado') {
            map.set(q.id, q);
          }
        });
      } catch (e) {
        console.warn('Aviso ao sincronizar cotações do usuário:', e);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getQuoteRequests(userId?: string): Promise<QuoteRequest[]> {
    if (userId) {
      return this.getUserQuoteRequests(userId);
    }
    return this.getMarketplaceQuoteRequests();
  },

  async createQuoteRequest(quote: Omit<QuoteRequest, 'id' | 'createdAt' | 'status' | 'proposals'>, userId: string): Promise<string> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error('Sua sessão expirou. Faça login novamente para solicitar um orçamento.');
    }

    const { data, error } = await supabase
      .from('quote_requests')
      .insert({
        user_id: authData.user.id,
        target_business_id: quote.targetBusinessId || null,
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
        photos: quote.photos || [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao inserir cotação no Supabase:', error);
      throw new Error(error.message || 'Erro ao registrar solicitação de orçamento');
    }

    // Cria o lead comercial correspondente (se tabela leads estiver acessível)
    try {
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
    } catch (leadErr) {
      console.warn('Aviso ao criar registro na tabela leads:', leadErr);
    }

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

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('Sua sessão expirou. Faça login novamente para enviar uma proposta.');
    }

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

    if (error) {
      console.error('Erro ao inserir proposta no Supabase (técnico):', error);
      throw new Error('Não foi possível enviar a proposta. Verifique sua sessão e tente novamente.');
    }

    // Atualiza status do pedido de orçamento (Agora feito via Trigger MIGRATION 00016)
    // O trigger tg_quote_proposals_after_insert garante atualização segura para 'propostas_recebidas'
    return data.id;
  },

  async acceptProposal(quoteRequestId: string, proposalId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    // 1. Marca a proposta escolhida com UUID real
    const { error: propError } = await supabase
      .from('quote_proposals')
      .update({ status: 'escolhida' })
      .eq('id', proposalId);

    if (propError) {
      console.error('Erro ao atualizar proposta no Supabase:', propError);
      throw new Error(propError.message || 'Erro ao registrar aceite da proposta no banco de dados.');
    }

    // Nota: O banco de dados agora possui triggers automáticos (MIGRATION 00016)
    // que atualizam o status do pedido de orçamento para 'escolhido'
    // e rejeitam as demais propostas automaticamente.
  },

  async cancelQuoteRequest(quoteRequestId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase
      .from('quote_requests')
      .update({ status: 'cancelado' })
      .eq('id', quoteRequestId);

    if (error) {
      console.error('Erro ao encerrar cotação no Supabase:', error);
      throw new Error(error.message || 'Não foi possível encerrar a solicitação de orçamento.');
    }

    // Se houver lead na tabela comercial, marca como cancelado para não notificar mais empresas
    try {
      await supabase
        .from('leads')
        .update({ status: 'CANCELLED' })
        .eq('quote_request_id', quoteRequestId);
    } catch (leadErr) {
      console.warn('Aviso ao atualizar lead cancelado:', leadErr);
    }
  },

  async deleteQuoteRequest(quoteRequestId: string): Promise<void> {
    // 1. Marca imediatamente a exclusão no armazenamento local para nunca mais reaparecer
    markQuoteAsDeletedLocally(quoteRequestId);

    if (!isSupabaseConfigured || !supabase) return;

    // 2. Tenta exclusão atômica via RPC (Migration 00022 / fix_quotes_rls.sql)
    try {
      const { error: rpcError } = await supabase.rpc('delete_quote_request', {
        p_quote_request_id: quoteRequestId,
      });
      if (!rpcError) {
        return;
      }
      console.warn('RPC delete_quote_request não disponível ou retornou erro, aplicando cascata manual:', rpcError?.message);
    } catch (rpcErr) {
      console.warn('Exceção ao chamar RPC delete_quote_request:', rpcErr);
    }

    // 3. Fallback em cascata manual
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('quote_request_id', quoteRequestId);
      if (convs && convs.length > 0) {
        const convIds = convs.map((c: any) => c.id);
        await supabase.from('messages').delete().in('conversation_id', convIds);
        await supabase.from('conversations').delete().eq('quote_request_id', quoteRequestId);
      }
    } catch (convErr) {
      console.warn('Aviso ao remover conversas vinculadas:', convErr);
    }

    try {
      await supabase.from('quote_proposals').delete().eq('quote_request_id', quoteRequestId);
    } catch (propErr) {
      console.warn('Aviso ao remover propostas vinculadas:', propErr);
    }

    try {
      await supabase.from('leads').delete().eq('quote_request_id', quoteRequestId);
    } catch (leadErr) {
      console.warn('Aviso ao remover lead associado:', leadErr);
    }

    // 4. Remove a solicitação de orçamento
    const { error } = await supabase
      .from('quote_requests')
      .delete()
      .eq('id', quoteRequestId);

    if (error) {
      console.warn('DELETE direto bloqueado por RLS ou chave. Aplicando soft-delete de segurança:', error.message);
      try {
        await supabase
          .from('quote_requests')
          .update({ status: 'cancelado' })
          .eq('id', quoteRequestId);
      } catch (softErr) {
        console.error('Erro ao marcar cotação como cancelada:', softErr);
      }
    }
  },

  // ==========================================
  // REVIEWS
  // ==========================================
  async getReviews(businessId?: string): Promise<Review[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(100);
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;
    if (error || !data) {
      if (error?.message?.includes('Failed to fetch')) {
        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL (reviews).');
      }
      return [];
    }

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
      reviews: [],
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
