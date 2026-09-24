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

export interface PurchaseResult {
  success: boolean;
  purchaseToken?: string;
  orderId?: string;
  productId?: string;
  isPending?: boolean;
  transaction?: any;
  error?: string;
}

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
   * Retorna o purchaseToken e identificadores necessários para validação server-side.
   *
   * @param plan 'pro' ou 'premium'
   * @param accountToken identificador da empresa compradora
   */
  async purchasePlan(
    plan: 'pro' | 'premium',
    accountToken?: string
  ): Promise<PurchaseResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        error: 'O faturamento nativo está disponível apenas no aplicativo Android.',
      };
    }

    const config = BILLING_PLANS[plan];

    try {
      const transaction: any = await NativePurchases.purchaseProduct({
        productIdentifier: config.productId,
        planIdentifier: config.basePlanId,
        productType: PURCHASE_TYPE.SUBS,
        quantity: 1,
        appAccountToken: accountToken || null,
        autoAcknowledgePurchases: true,
      });

      // Extrai campos do comprovante da Google Play
      const purchaseToken =
        transaction?.purchaseToken ||
        transaction?.token ||
        transaction?.transactionId ||
        '';

      const orderId =
        transaction?.orderId ||
        transaction?.transactionId ||
        `gp-${Date.now()}`;

      const isPending =
        transaction?.purchaseState === 4 || // 4 = PENDING no Billing v5/v6
        transaction?.isPending === true;

      return {
        success: true,
        purchaseToken,
        orderId,
        productId: config.productId,
        isPending,
        transaction,
      };
    } catch (err: any) {
      console.error('[BillingService] Falha ao processar assinatura no Google Play:', err);
      const isCancelled =
        err?.message?.toLowerCase().includes('cancel') ||
        err?.code === 'USER_CANCELED';

      return {
        success: false,
        error: isCancelled
          ? 'Operação cancelada pelo usuário.'
          : err?.message || 'A compra não pôde ser concluída no Google Play.',
      };
    }
  }

  /**
   * Restaura compras/assinaturas ativas do usuário no Google Play.
   */
  async restorePurchases(): Promise<{
    activePlans: ('pro' | 'premium')[];
    purchases: Array<{ plan: 'pro' | 'premium'; purchaseToken: string; orderId?: string }>;
    error?: string;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { activePlans: [], purchases: [] };
    }

    try {
      if (typeof (NativePurchases as any).restorePurchases === 'function') {
        await (NativePurchases as any).restorePurchases();
      }

      const res = await NativePurchases.getPurchases({
        productType: PURCHASE_TYPE.SUBS,
      });

      const activePlans: ('pro' | 'premium')[] = [];
      const purchasesList: Array<{ plan: 'pro' | 'premium'; purchaseToken: string; orderId?: string }> = [];
      const purchases = res?.purchases || [];

      for (const purchase of purchases) {
        let plan: 'pro' | 'premium' | null = null;
        if (purchase.productIdentifier === BILLING_PLANS.premium.productId) {
          plan = 'premium';
        } else if (purchase.productIdentifier === BILLING_PLANS.pro.productId) {
          plan = 'pro';
        }

        if (plan) {
          if (!activePlans.includes(plan)) {
            activePlans.push(plan);
          }
          purchasesList.push({
            plan,
            purchaseToken: purchase.purchaseToken || purchase.token || '',
            orderId: purchase.orderId,
          });
        }
      }

      return { activePlans, purchases: purchasesList };
    } catch (err: any) {
      console.warn('[BillingService] Erro ao restaurar compras:', err);
      return {
        activePlans: [],
        purchases: [],
        error: err?.message || 'Erro ao consultar compras anteriores no Google Play.',
      };
    }
  }
}

export const billingService = new BillingService();
