import React from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Lock, Heart, Smartphone } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActiveTab, setIsPlayStoreModalOpen, currentUser } = useApp();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 */}
          <div className="space-y-3">
            <BrandLogo size="md" textColor="light" showSlogan={false} />
            <p className="text-slate-400 text-xs leading-relaxed">
              Antes de comprar ou contratar, compare. A plataforma que ajuda consumidores a economizar e conecta empresas locais a clientes reais.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Google Play AAB Ready
              </span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Para Você</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => setActiveTab('home')} className="hover:text-white transition">
                  Início
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('search')} className="hover:text-white transition">
                  Buscar Empresas & Serviços
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('offers')} className="hover:text-white transition">
                  Ofertas Próximas
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('quotes')} className="hover:text-white transition">
                  Minhas Cotações
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('favorites')} className="hover:text-white transition">
                  Meus Favoritos
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">Para Empresas</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => setActiveTab('business_portal')} className="hover:text-white transition">
                  Portal do Parceiro
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('business_portal')} className="hover:text-white transition">
                  Receber Leads Locais
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('business_portal')} className="hover:text-white transition">
                  Planos & Destaque
                </button>
              </li>
              {currentUser?.role === 'admin' && (
                <li>
                  <button onClick={() => setActiveTab('admin_portal')} className="hover:text-white transition text-slate-500">
                    Painel de Administração
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">LGPD & Google Play</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => {
                    window.location.hash = 'privacy';
                  }}
                  className="hover:text-emerald-400 transition"
                >
                  Política de Privacidade (LGPD)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = 'terms';
                  }}
                  className="hover:text-emerald-400 transition"
                >
                  Termos e Condições de Uso
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.location.hash = 'delete-account';
                  }}
                  className="hover:text-rose-400 transition text-slate-400"
                >
                  Exclusão de Conta & Dados
                </button>
              </li>
            </ul>
            <button
              onClick={() => setIsPlayStoreModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition text-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver Detalhes do AAB</span>
            </button>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EconomizaJá. Todos os direitos reservados. Dados para fins de demonstração.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Conexão Segura SSL/TLS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
