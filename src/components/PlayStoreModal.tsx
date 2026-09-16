import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Download,
  Terminal,
  FileCode,
  FileText,
  Lock,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../utils/motionVariants';

export const PlayStoreModal: React.FC = () => {
  const { isPlayStoreModalOpen, setIsPlayStoreModalOpen } = useApp();
  const [activeTab, setActiveTab] = useState<'checklist' | 'commands' | 'listing' | 'security'>('checklist');

  // Fechar com ESC para acessibilidade
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPlayStoreModalOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setIsPlayStoreModalOpen]);

  return (
    <AnimatePresence>
      {isPlayStoreModalOpen && (
        <motion.div
          key="playstore-modal-backdrop"
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="fixed inset-0" onClick={() => setIsPlayStoreModalOpen(false)} />
          <motion.div
            key="playstore-modal-card"
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-5 max-h-[90vh] flex flex-col"
          >
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Google Play Store • AAB Ready
                </span>
                <span className="text-xs text-slate-500 font-semibold">Android 14 (API 34)</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                Prontidão para Publicação na Play Store
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsPlayStoreModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'checklist' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Checklist Google Play
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'commands' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Comandos de Geração do AAB
          </button>
          <button
            onClick={() => setActiveTab('listing')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'listing' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ficha do App na Play Store
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl font-bold transition ${
              activeTab === 'security' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Segurança & Privacidade
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-700">
          
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Arquitetura 100% Configurada para Android App Bundle
                </h4>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  O projeto inclui a pasta <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">android/</code> completa com Gradle 8, Capacitor bridge, manifesto em conformidade com o Google Play Target API 34 e certificados de segurança.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Package Name Único</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">com.economizaja.app</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target SDK API 34</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Exigência estrita da Google Play Store para 2024-2026</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sem Cleartext Traffic</span>
                  </div>
                  <p className="text-[11px] text-slate-500">network_security_config.xml bloqueia tráfego HTTP inseguro</p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Deep Links Ativos</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Suporta https://economizaja.app e economizaja://</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Para compilar o pacote de produção <strong>.aab</strong> (Android App Bundle) em sua máquina ou CI/CD:
              </p>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] block"># 1. Compilar o frontend web e PWA:</span>
                  <p className="text-emerald-400">npm run build</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] block"># 2. Sincronizar os assets com o projeto nativo Android:</span>
                  <p className="text-emerald-400">npx cap sync android</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] block"># 3. Gerar o Android App Bundle (.aab) assinado para a Play Store:</span>
                  <p className="text-emerald-400">cd android && ./gradlew bundleRelease</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[11px]">
                O arquivo final será gerado em: <br />
                <code className="font-mono text-emerald-700">android/app/build/outputs/bundle/release/app-release.aab</code>
              </div>
            </div>
          )}

          {activeTab === 'listing' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Nome do Aplicativo (Máx. 30 caracteres):</span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800">
                  EconomizaJá - Compare & Poupe
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Descrição Curta (Máx. 80 caracteres):</span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800">
                  Antes de comprar ou contratar, compare ofertas e orçamentos na sua região.
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Categoria na Google Play Store:</span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800">
                  Compras / Negócios & Serviços Locais (Shopping & Business)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  Conformidade com a Declaração de Segurança de Dados (Data Safety)
                </span>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Os dados de localização são solicitados de forma explícita apenas no momento da pesquisa ou geolocalização e nunca são vendidos a terceiros. A comunicação com servidores utiliza TLS/HTTPS estrito.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block">Permissões Declaradas:</span>
                <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-1">
                  <li><code className="font-mono">ACCESS_COARSE_LOCATION</code> (localização aproximada por cidade/bairro para ofertas e empresas na região)</li>
                  <li><code className="font-mono">INTERNET</code> & <code className="font-mono">ACCESS_NETWORK_STATE</code> (comunicação segura com a nuvem)</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={() => setIsPlayStoreModalOpen(false)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
