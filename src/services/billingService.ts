import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export interface BillingProductInfo {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode: string;
}

export const BILLING_PLANS = {
  pro: {
    productId: 'economizaja_pro_monthly',
    basePlanId: 'pro-monthly',
    defaultPriceText: 'R$ 79,90/mês',
    defaultPrice: 79.90,
  },
  premium: {
    productId: 'economizaja_premium_monthly',
    basePlanId: 'premium-monthly',
    defaultPriceText: 'R$ 159,90/mês',
    defaultPrice: 159.90,
  },
} as const;

class BillingService {
  private productsCache: Map<string, BillingProductInfo> = new Map();
  private isInitialized = false;

  /**
   * Verifica se o faturamento nativo via Google Play Billing é suportado no ambiente atual.
   */
  async isSupported(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    try {
      const res = await NativePurchases.isBillingSupported();
      return Boolean(res?.isBillingSupported);
    } catch (err) {
      console.warn('[BillingService] isBillingSupported error:', err);
      return false;
    }
  }

  /**
   * Inicializa o serviço e busca os metadados dos produtos na Google Play Store.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (!Capacitor.isNativePlatform()) return;

    try {
      const supported = await this.isSupported();
      if (!supported) return;

      const productIdentifiers = [
        BILLING_PLANS.pro.productId,
        BILLING_PLANS.premium.productId,
      ];

      const res = await NativePurchases.getProducts({
        productIdentifiers,
        productType: PURCHASE_TYPE.SUBS,
      });

      if (res?.products && Array.isArray(res.products)) {
        for (const prod of res.products) {
          this.productsCache.set(prod.identifier, {
            identifier: prod.identifier,
            title: prod.title || '',
            description: prod.description || '',
            priceString: prod.priceString || '',
            price: prod.price || 0,
            currencyCode: prod.currencyCode || 'BRL',
          });
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[BillingService] Erro ao carregar produtos do Google Play:', err);
    }
  }

  /**
   * Retorna informações de preço e exibição de um plano.
   */
  getProductInfo(plan: 'pro' | 'premium'): BillingProductInfo | null {
    const config = BILLING_PLANS[plan];
    return this.productsCache.get(config.productId) || null;
  }

  /**
   * Executa a compra nativa de um plano via Google Play Billing.
   *
   * @param plan 'pro' ou 'premium'
   * @param accountToken identificador do usuário ou empresa para auditoria (opcional)
   */
  async purchasePlan(
    plan: 'pro' | 'premium',
    accountToken?: string
  ): Promise<{ success: boolean; transaction?: any; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        error: 'O faturamento nativo está disponível apenas no aplicativo Android.',
      };
    }

    const config = BILLING_PLANS[plan];

    try {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: config.productId,
        planIdentifier: config.basePlanId,
        productType: PURCHASE_TYPE.SUBS,
        quantity: 1,
        appAccountToken: accountToken || null,
        autoAcknowledgePurchases: true,
      });

      return {
        success: true,
        transaction,
      };
    } catch (err: any) {
      console.error('[BillingService] Falha ao processar assinatura no Google Play:', err);
      return {
        success: false,
        error: err?.message || 'A compra foi cancelada ou não pôde ser concluída no Google Play.',
      };
    }
  }

  /**
   * Restaura compras/assinaturas ativas do usuário no Google Play.
   */
  async restorePurchases(): Promise<{ activePlans: ('pro' | 'premium')[]; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      return { activePlans: [] };
    }

    try {
      if (typeof (NativePurchases as any).restorePurchases === 'function') {
        await (NativePurchases as any).restorePurchases();
      }

      const res = await NativePurchases.getPurchases({
        productType: PURCHASE_TYPE.SUBS,
      });

      const activePlans: ('pro' | 'premium')[] = [];
      const purchases = res?.purchases || [];

      for (const purchase of purchases) {
        if (purchase.productIdentifier === BILLING_PLANS.premium.productId) {
          activePlans.push('premium');
        } else if (purchase.productIdentifier === BILLING_PLANS.pro.productId) {
          activePlans.push('pro');
        }
      }

      return { activePlans };
    } catch (err: any) {
      console.warn('[BillingService] Erro ao restaurar compras:', err);
      return { activePlans: [], error: err?.message || 'Erro ao consultar compras anteriores.' };
    }
  }
}

export const billingService = new BillingService();
