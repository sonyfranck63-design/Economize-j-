import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { useApp } from '../context/AppContext';

/**
 * Hook para integração nativa com Android via Capacitor.
 * Gerencia o botão físico/gestual de Voltar e o comportamento do Teclado virtual.
 */
export function useNativeAndroid() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    selectedBusinessId,
    setSelectedBusinessId,
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    comparingQuoteRequestId,
    setComparingQuoteRequestId,
    isPriceAlertModalOpen,
    setIsPriceAlertModalOpen,
    isPlayStoreModalOpen,
    setIsPlayStoreModalOpen,
    isLegalModalOpen,
    setIsLegalModalOpen,
    isLocationSelectorOpen,
    setIsLocationSelectorOpen,
    activeChatBusinessId,
    setActiveChatBusinessId,
    publicRoute,
    setPublicRoute,
    activeTab,
    setActiveTab,
  } = useApp();

  const lastBackPressRef = useRef<number>(0);

  // Configuração do Teclado Nativo no Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    } catch (e) {
      console.warn('[NativeAndroid] Aviso ao configurar teclado nativo:', e);
    }
  }, []);

  // Listener Global do Botão Voltar (Hardware Back Button)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let removeListener: (() => void) | null = null;

    CapApp.addListener('backButton', () => {
      if (!isMounted) return;

      // 1. Modais abertos (prioridade máxima — fecha o modal sem sair do app)
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      if (isPriceAlertModalOpen) {
        setIsPriceAlertModalOpen(false);
        return;
      }
      if (isPlayStoreModalOpen) {
        setIsPlayStoreModalOpen(false);
        return;
      }
      if (isLegalModalOpen) {
        setIsLegalModalOpen(false);
        return;
      }
      if (isLocationSelectorOpen) {
        setIsLocationSelectorOpen(false);
        return;
      }
      if (comparingQuoteRequestId) {
        setComparingQuoteRequestId(null);
        return;
      }
      if (isQuoteModalOpen) {
        setIsQuoteModalOpen(false);
        return;
      }
      if (activeChatBusinessId) {
        setActiveChatBusinessId(null);
        return;
      }
      if (selectedBusinessId) {
        setSelectedBusinessId(null);
        return;
      }

      // 2. Rotas públicas secundárias (privacidade, termos, exclusão de conta)
      if (publicRoute !== 'app') {
        window.location.hash = '';
        setPublicRoute('app');
        return;
      }

      // 3. Abas secundárias: se estiver em outra aba, retorna para o início (Home)
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      // 4. Na tela inicial sem modais: duplo clique em 2 segundos para sair de forma segura
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
      }
    }).then((handle) => {
      removeListener = () => handle.remove();
    }).catch((err) => {
      console.warn('[NativeAndroid] Aviso ao registrar listener do botão voltar:', err);
    });

    return () => {
      isMounted = false;
      if (removeListener) {
        removeListener();
      }
    };
  }, [
    isAuthModalOpen,
    setIsAuthModalOpen,
    selectedBusinessId,
    setSelectedBusinessId,
    isQuoteModalOpen,
    setIsQuoteModalOpen,
    comparingQuoteRequestId,
    setComparingQuoteRequestId,
    isPriceAlertModalOpen,
    setIsPriceAlertModalOpen,
    isPlayStoreModalOpen,
    setIsPlayStoreModalOpen,
    isLegalModalOpen,
    setIsLegalModalOpen,
    isLocationSelectorOpen,
    setIsLocationSelectorOpen,
    activeChatBusinessId,
    setActiveChatBusinessId,
    publicRoute,
    setPublicRoute,
    activeTab,
    setActiveTab,
  ]);
}
