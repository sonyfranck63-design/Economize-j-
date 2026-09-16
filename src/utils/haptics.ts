import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Vibração de impacto suave (ex: curtir, favoritar, alternar abas, toques leves)
 */
export async function hapticImpactLight(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  } catch {
    // No-op gracioso caso o dispositivo ou browser não suporte
  }
}

/**
 * Vibração de impacto médio (ex: abrir modais principais, ações de destaque)
 */
export async function hapticImpactMedium(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(25);
    }
  } catch {
    // No-op gracioso
  }
}

/**
 * Vibração de notificação de sucesso (ex: pedido enviado, proposta contratada, confetes)
 */
export async function hapticNotificationSuccess(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([20, 60, 20]);
    }
  } catch {
    // No-op gracioso
  }
}

/**
 * Vibração de notificação de aviso/alerta (ex: cancelamento, exclusão de pedido)
 */
export async function hapticNotificationWarning(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([40, 40, 40]);
    }
  } catch {
    // No-op gracioso
  }
}

/**
 * Vibração de seleção rápida (ex: mudança de filtro ou radio)
 */
export async function hapticSelection(): Promise<void> {
  try {
    if (isNative) {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
  } catch {
    // No-op gracioso
  }
}
