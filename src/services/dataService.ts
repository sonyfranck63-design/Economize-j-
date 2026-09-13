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

    // Consulta destaques vigentes em featured_listings para desassociar plano de destaque
    const activeFeaturedMap = new Map<string, string>();
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: featuredData } = await supabase
        .from('featured_listings')
        .select('business_id, start_date, end_date')
        .eq('active', true)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);
      if (featuredData) {
        featuredData.forEach((f: any) => {
          activeFeaturedMap.set(f.business_id, f.end_date);
        });
      }
    } catch (fErr) {
      console.warn('Aviso ao consultar featured_listings:', fErr);
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
      featured: activeFeaturedMap.has(b.id),
      featuredUntil: activeFeaturedMap.get(b.id),
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

    // Garante que o registro em public.profiles existe para o owner_id antes de vincular à empresa
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!existingProfile) {
      const userEmail = authData.user.email || `${authData.user.id}@economizaja.local`;
      const userName = authData.user.user_metadata?.full_name || business.ownerName || business.name || 'Parceiro';

      // Inserção com role 'customer' para garantir compatibilidade com triggers de role security
      // Utiliza apenas colunas existentes no schema do banco (id, email, full_name, role, city, state)
      const profilePayload: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        city: string;
        state: string;
      } = {
        id: authData.user.id,
        email: userEmail,
        full_name: userName,
        role: 'customer',
        city: business.city || 'São Paulo',
        state: business.state || 'SP',
      };

      const { error: insertProfileErr } = await supabase
        .from('profiles')
        .insert(profilePayload);

      if (insertProfileErr) {
        console.error('Erro ao auto-criar perfil para vincular empresa:', insertProfileErr);
        // Verifica se mesmo com erro o perfil já está presente (ex.: concorrência ou trigger)
        const { data: recheckProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (!recheckProfile) {
          throw new Error(`Não foi possível criar o perfil do usuário no banco: ${insertProfileErr.message}`);
        }
      }
    }

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
      if (error.message?.includes('businesses_owner_id_fkey')) {
        throw new Error('Sua conta não possui um perfil ativo sincronizado no banco. Por favor, clique em Sair no topo da página e faça login novamente para sincronizar sua conta.');
      }
      throw new Error(error.message || 'Erro ao persistir empresa no banco de dados');
    }

    // Tenta atualizar a role do perfil para 'business' se o banco permitir
    try {
      await supabase
        .from('profiles')
        .update({ role: 'business' })
        .eq('id', authData.user.id);
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

  async toggleBusinessFeatured(id: string, featured: boolean, days = 7, notes = 'Ativação administrativa manual'): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    if (featured) {
      await this.adminGrantFeaturedHighlight(id, days, notes);
    } else {
      await this.adminRemoveFeaturedHighlight(id);
    }
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
        profiles:user_id (
          full_name
        ),
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
      // Prioriza o nome real e atualizado do perfil do solicitante
      userName: (qr as any).profiles?.full_name || qr.user_name || 'Cliente Consumidor',
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
    // JOIN com profiles para obter o nome real do solicitante
    let queryData: any[] | null = null;
    const { data, error } = await supabase
      .from('secure_leads_view')
      .select('*, profiles:user_id ( full_name )')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      queryData = data;
    } else {
      if (error?.message?.includes('Failed to fetch')) {
        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida.');
        return [];
      }
      // Fallback resiliente: busca diretamente de quote_requests onde target_business_id é nulo
      // ou pedidos abertos da região/marketplace
      try {
        const { data: directQuotes, error: directErr } = await supabase
          .from('quote_requests')
          .select('*')
          .is('target_business_id', null)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!directErr && directQuotes) {
          queryData = directQuotes;
        }
      } catch (fbErr) {
        console.warn('Aviso no fallback de quote_requests:', fbErr);
      }
    }

    if (!queryData) return [];
    const dataList = queryData;

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
    return dataList
      .filter((qr: any) => !deletedIds.has(qr.id) && qr.status !== 'cancelado')
      .map((qr: any) => ({
      id: qr.id,
      userId: qr.user_id,
      targetBusinessId: qr.target_business_id,
      // Prioriza o nome real do perfil; cai para user_name salvo como fallback
      userName: (qr as any).profiles?.full_name || qr.user_name,
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
        profiles:user_id (
          full_name
        ),
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
        // Prioriza o nome real e atualizado do perfil do solicitante; fallback para o gravado na cotação
        userName: (qr as any).profiles?.full_name || qr.user_name || 'Cliente Consumidor',
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
   * Sincronização unificada com normalização e deduplicação profunda:
   * Combina cotações de marketplace, direcionadas às empresas do parceiro e cotações do consumidor.
   * Garante que dados completos (não mascarados) nunca sejam sobrescritos por parciais,
   * preserva propostas consolidadas e identifica a origem com precisão.
   */
  async syncAllQuoteRequests(userId?: string, ownedBusinessIds: string[] = []): Promise<QuoteRequest[]> {
    const deletedIds = getDeletedQuoteIds();
    const map = new Map<string, QuoteRequest>();

    const mergeQuote = (newQuote: QuoteRequest, source: 'marketplace' | 'direct' | 'user') => {
      if (!newQuote || deletedIds.has(newQuote.id) || newQuote.status === 'cancelado') {
        return;
      }

      // Determina origem canônica
      let calculatedOrigin: 'geral' | 'direcionado' | 'proprio_consumidor' | 'recebido_parceiro' = 'geral';
      if (userId && newQuote.userId === userId) {
        calculatedOrigin = 'proprio_consumidor';
      } else if (newQuote.targetBusinessId && ownedBusinessIds.includes(newQuote.targetBusinessId)) {
        calculatedOrigin = 'recebido_parceiro';
      } else if (newQuote.targetBusinessId) {
        calculatedOrigin = 'direcionado';
      }

      const existing = map.get(newQuote.id);
      if (!existing) {
        map.set(newQuote.id, {
          ...newQuote,
          origin: calculatedOrigin,
          proposals: newQuote.proposals || [],
        });
        return;
      }

      // Se já existe, mescla sem perder informações sensíveis desmascaradas
      const isNewPhoneReal = newQuote.userPhone && !newQuote.userPhone.includes('****');
      const isExistingPhoneMasked = !existing.userPhone || existing.userPhone.includes('****');

      const isNewEmailReal = newQuote.userEmail && !newQuote.userEmail.includes('oculto@');
      const isExistingEmailMasked = !existing.userEmail || existing.userEmail.includes('oculto@');

      const isNewNameReal = newQuote.userName && !newQuote.userName.includes('(Cliente)');
      const isExistingNameMasked = !existing.userName || existing.userName.includes('(Cliente)');

      // Consolidação atômica de propostas por id único
      const proposalMap = new Map<string, QuoteProposal>();
      (existing.proposals || []).forEach((p) => proposalMap.set(p.id, p));
      (newQuote.proposals || []).forEach((p) => proposalMap.set(p.id, p));

      const merged: QuoteRequest = {
        ...existing,
        ...newQuote,
        userName: isNewNameReal || !isExistingNameMasked ? (isNewNameReal ? newQuote.userName : existing.userName) : existing.userName,
        userPhone: isNewPhoneReal || !isExistingPhoneMasked ? (isNewPhoneReal ? newQuote.userPhone : existing.userPhone) : existing.userPhone,
        userEmail: isNewEmailReal || !isExistingEmailMasked ? (isNewEmailReal ? newQuote.userEmail : existing.userEmail) : existing.userEmail,
        targetBusinessId: newQuote.targetBusinessId || existing.targetBusinessId,
        origin: calculatedOrigin,
        proposals: Array.from(proposalMap.values()),
      };

      map.set(newQuote.id, merged);
    };

    // 1. Marketplace (oportunidades gerais da região via secure_leads_view)
    try {
      const marketQuotes = await this.getMarketplaceQuoteRequests();
      (marketQuotes || []).forEach((q) => mergeQuote(q, 'marketplace'));
    } catch (e) {
      console.warn('Aviso ao sincronizar cotações do marketplace:', e);
    }

    // 2. Cotações direcionadas diretamente às empresas do usuário parceiro
    if (ownedBusinessIds && ownedBusinessIds.length > 0) {
      try {
        const directQuotes = await this.getBusinessDirectQuoteRequests(ownedBusinessIds);
        (directQuotes || []).forEach((q) => mergeQuote(q, 'direct'));
      } catch (e) {
        console.warn('Aviso ao sincronizar cotações direcionadas às empresas:', e);
      }
    }

    // 3. Cotações do próprio usuário consumidor autenticado
    if (userId) {
      try {
        const userQuotes = await this.getUserQuoteRequests(userId);
        (userQuotes || []).forEach((q) => mergeQuote(q, 'user'));
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

    const realUserId = authData.user.id;
    if (!realUserId || realUserId.startsWith('local-u-')) {
      throw new Error('Sessão local inválida. É necessário autenticar com uma conta real para solicitar orçamentos.');
    }

    // Garante que o registro em public.profiles existe para o user_id antes de vincular à cotação,
    // eliminando a violação da foreign key quote_requests_user_id_fkey.
    let resolvedUserName = quote.userName;
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', realUserId)
        .maybeSingle();

      if (existingProfile?.full_name) {
        resolvedUserName = existingProfile.full_name;
      } else {
        const userEmail = authData.user.email || quote.userEmail || `${realUserId}@economizaja.app`;
        const userName = authData.user.user_metadata?.full_name || quote.userName || 'Cliente Consumidor';
        resolvedUserName = userName;

        const profilePayload: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          city: string;
          state: string;
          phone?: string;
          neighborhood?: string;
        } = {
          id: realUserId,
          email: userEmail,
          full_name: userName,
          role: 'customer',
          city: quote.city || 'São Paulo',
          state: quote.state || 'SP',
          phone: quote.userPhone || undefined,
          neighborhood: quote.neighborhood || undefined,
        };

        const { error: insertProfileErr } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' });

        if (insertProfileErr) {
          console.warn('Aviso ao auto-provisionar perfil em public.profiles:', insertProfileErr.message);
        }
      }
    } catch (profErr) {
      console.warn('Exceção defensiva ao verificar perfil para cotação:', profErr);
    }

    const { data, error } = await supabase
      .from('quote_requests')
      .insert({
        user_id: realUserId,
        target_business_id: quote.targetBusinessId || null,
        user_name: resolvedUserName,
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

    // Se a cotação for geral (sem empresa direcionada), o trigger tr_auto_create_lead_from_quote
    // do Supabase gera automaticamente o lead comercial com a precificação dinâmica configurada pelo Admin.
    // Como fallback resiliente de integração:
    if (!quote.targetBusinessId) {
      try {
        const settings = await this.getMonetizationSettings();
        const leadPrice = settings?.costPerLead || 15.00;
        await supabase.from('leads').upsert(
          {
            quote_request_id: data.id,
            category_id: quote.categoryId,
            city: quote.city,
            state: quote.state,
            neighborhood: quote.neighborhood,
            title: quote.title,
            description: quote.description,
            price: leadPrice,
            status: 'AVAILABLE',
            origin: 'organic',
          },
          { onConflict: 'quote_request_id' }
        );
      } catch (leadErr) {
        // Ignora silenciosamente se o trigger do banco já tiver gerado o lead
      }
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

    // 1. Invoca a RPC atômica submit_quote_proposal (Migration 00027)
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_quote_proposal', {
      p_quote_request_id: params.quoteRequestId,
      p_business_id: params.businessId,
      p_price: params.price,
      p_deadline_text: params.deadlineText,
      p_description: params.description,
    });

    if (rpcError) {
      console.error('Erro na RPC submit_quote_proposal:', rpcError);
      throw new Error(rpcError.message || 'Não foi possível enviar a proposta comercial.');
    }

    if (!rpcData?.proposal_id) {
      throw new Error('Falha ao obter confirmação de envio da proposta no banco de dados.');
    }

    return rpcData.proposal_id;
  },

  async acceptProposal(quoteRequestId: string, proposalId: string): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    // 1. Executa a transação atômica de aceite via RPC com SECURITY DEFINER (Migration 00027)
    // Atualiza a proposta para 'escolhida', as outras para 'recusada' e o pedido para 'escolhido'
    const { data, error } = await supabase.rpc('accept_quote_proposal', {
      p_quote_request_id: quoteRequestId,
      p_proposal_id: proposalId,
    });

    if (error) {
      console.error('Erro ao aceitar proposta no Supabase (RPC):', error);
      throw new Error(error.message || 'Erro ao registrar aceite da proposta no banco de dados.');
    }

    if (!data || data.success !== true) {
      throw new Error('Não foi possível confirmar o aceite da proposta no banco de dados.');
    }

    return data;
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

  // ==========================================
  // PLAN SUBSCRIPTIONS, HIGHLIGHTS & LEADS
  // ==========================================
  async initiatePlanSubscription(businessId: string, planTier: 'pro' | 'premium', billingProvider = 'google_play_billing'): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('initiate_plan_subscription', {
      p_business_id: businessId,
      p_plan_tier: planTier,
      p_billing_provider: billingProvider,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async confirmPlanSubscription(subscriptionId: string, providerTransactionId?: string): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('confirm_plan_subscription', {
      p_subscription_id: subscriptionId,
      p_provider_transaction_id: providerTransactionId || null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async initiateFeaturedListing(businessId: string, days: number, offerId?: string): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    // 1. Prevenção de duplicação: se já houver destaque pendente para esta empresa, atualiza e reutiliza o existente
    const { data: existingList } = await supabase
      .from('featured_listings')
      .select('id, daily_cost')
      .eq('business_id', businessId)
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingList && existingList.length > 0) {
      const existingId = existingList[0].id;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await supabase
        .from('featured_listings')
        .update({
          start_date: startDate,
          end_date: endDate,
          offer_id: offerId || null,
        })
        .eq('id', existingId);

      const dailyRate = Number(existingList[0].daily_cost) || 19.9;
      return { listing_id: existingId, total_cost: dailyRate * days };
    }

    // Chama a RPC segura que gera cobrança PENDING e NÃO ativa destaque prematuramente
    const { data, error } = await supabase.rpc('initiate_featured_listing', {
      p_business_id: businessId,
      p_days: days,
      p_offer_id: offerId || null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  // Mantém retrocompatibilidade chamando a versão segura com status PENDING
  async createFeaturedListing(businessId: string, days: number, offerId?: string): Promise<any> {
    return this.initiateFeaturedListing(businessId, days, offerId);
  },

  async confirmFeaturedListing(listingId: string, providerTransactionId?: string): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');

    let rpcSucceeded = false;
    let rpcData: any = null;
    try {
      const { data, error } = await supabase.rpc('confirm_featured_listing', {
        p_listing_id: listingId,
        p_provider_transaction_id: providerTransactionId || null,
      });
      if (!error) {
        rpcSucceeded = true;
        rpcData = data;
      } else {
        console.warn('RPC confirm_featured_listing retornou erro:', error.message);
        // Se for erro da coluna updated_at inexistente ou RPC desatualizada, segue para o fallback
        if (
          !error.message?.includes('updated_at') &&
          !error.message?.includes('does not exist') &&
          !error.message?.includes('function')
        ) {
          throw new Error(error.message);
        }
      }
    } catch (err: any) {
      console.warn('Exceção ao chamar confirm_featured_listing:', err.message);
      if (
        !err.message?.includes('updated_at') &&
        !err.message?.includes('does not exist') &&
        !err.message?.includes('function')
      ) {
        throw err;
      }
    }

    if (rpcSucceeded) {
      // Limpa duplicatas pendentes da mesma empresa após a ativação
      try {
        if (rpcData?.business_id) {
          await supabase
            .from('featured_listings')
            .delete()
            .eq('business_id', rpcData.business_id)
            .eq('active', false);
        }
      } catch (cleanupErr) {
        console.warn('Aviso ao limpar duplicatas pendentes após ativação:', cleanupErr);
      }
      return rpcData;
    }

    // Fallback resiliente direto no Supabase (dispensa updated_at e ativa imediatamente):
    const { data: listing, error: lErr } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (lErr || !listing) {
      throw new Error(lErr?.message || 'Solicitação de destaque não encontrada.');
    }

    // Atualiza featured_listings para active = true SEM referenciar coluna updated_at
    const { error: fUpdateErr } = await supabase
      .from('featured_listings')
      .update({ active: true })
      .eq('id', listingId);

    if (fUpdateErr) {
      throw new Error(fUpdateErr.message);
    }

    // Ativa destaque na empresa vinculada
    await supabase
      .from('businesses')
      .update({ featured: true })
      .eq('id', listing.business_id);

    // Confirma o pagamento pendente correspondente
    await supabase
      .from('payments')
      .update({ status: 'CONFIRMED', provider_payment_id: providerTransactionId || listingId })
      .eq('provider_payment_id', listingId);

    // Limpa quaisquer outras solicitações duplicadas pendentes da mesma empresa
    try {
      await supabase
        .from('featured_listings')
        .delete()
        .eq('business_id', listing.business_id)
        .eq('active', false);
    } catch (cleanupErr) {
      console.warn('Aviso ao limpar duplicatas pendentes:', cleanupErr);
    }

    return {
      success: true,
      listing_id: listingId,
      business_id: listing.business_id,
      active_until: listing.end_date,
      message: 'Destaque ativado com sucesso.',
    };
  },

  async rejectFeaturedListing(listingId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await Promise.all([
      supabase.from('featured_listings').delete().eq('id', listingId),
      supabase.from('payments').delete().eq('provider_payment_id', listingId),
    ]);
  },

  async rejectSubscription(subscriptionId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await Promise.all([
      supabase.from('subscriptions').delete().eq('id', subscriptionId),
      supabase.from('payments').delete().eq('provider_payment_id', subscriptionId),
    ]);
  },

  async adminGrantFeaturedHighlight(businessId: string, days: number, reason = 'Ativação Manual pelo Administrador'): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    const initRes = await this.initiateFeaturedListing(businessId, days);
    const listingId = initRes?.listing_id || initRes?.id;
    if (!listingId) {
      throw new Error('Não foi possível gerar a entrada de destaque no banco de dados.');
    }
    return this.confirmFeaturedListing(listingId, `MANUAL_ADMIN: ${reason}`);
  },

  async adminRemoveFeaturedHighlight(businessId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    await Promise.all([
      supabase.from('featured_listings').update({ active: false }).eq('business_id', businessId),
      supabase.from('businesses').update({ featured: false }).eq('id', businessId),
    ]);
  },

  async purchaseLead(leadId: string, businessId: string): Promise<any> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('purchase_lead_with_credits', {
      p_lead_id: leadId,
      p_business_id: businessId,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getAdminPendingMonetization(): Promise<{
    subscriptions: any[];
    featuredListings: any[];
    payments: any[];
  }> {
    if (!isSupabaseConfigured || !supabase) return { subscriptions: [], featuredListings: [], payments: [] };

    const [subsRes, featRes, payRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(`
          *,
          businesses (
            id,
            name,
            whatsapp,
            city,
            state
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false }),

      supabase
        .from('featured_listings')
        .select(`
          *,
          businesses (
            id,
            name,
            whatsapp,
            city,
            state
          )
        `)
        .eq('active', false)
        .order('created_at', { ascending: false }),

      supabase
        .from('payments')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false }),
    ]);

    return {
      subscriptions: subsRes.data || [],
      featuredListings: featRes.data || [],
      payments: payRes.data || [],
    };
  },

  // ==========================================
  // ADMIN AUDIT LOGS
  // ==========================================

  /**
   * Registra uma ação administrativa no log de auditoria via RPC.
   * Falha silenciosamente para não quebrar o fluxo principal.
   */
  async logAdminAction(
    action: string,
    entityType: 'business' | 'offer' | 'quote' | 'featured' | 'subscription',
    entityId?: string,
    entityName?: string,
    notes?: string
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.rpc('log_admin_action', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_entity_name: entityName || null,
        p_notes: notes || null,
      });
    } catch (err) {
      // Log silencioso — não deve bloquear a ação principal
      console.warn('[AdminAudit] Falha ao registrar log de ação:', err);
    }
  },

  /**
   * Retorna os logs de ações administrativas para exibição no painel.
   */
  async getAdminActionLogs(limit = 100): Promise<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    entityName: string | null;
    notes: string | null;
    performedBy: string | null;
    performerName: string;
    createdAt: string;
  }[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase.rpc('get_admin_action_logs', { p_limit: limit });
      if (error || !data) {
        console.warn('Aviso ao buscar logs de auditoria:', error?.message);
        return [];
      }
      return (data as any[]).map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id || null,
        entityName: r.entity_name || null,
        notes: r.notes || null,
        performedBy: r.performed_by || null,
        performerName: r.performer_name || 'Admin',
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn('[AdminAudit] Erro ao carregar logs:', err);
      return [];
    }
  },
};
