import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { BrandLogo } from './BrandLogo';
import {
  MapPin,
  Bell,
  Search,
  ShieldCheck,
  Building2,
  User,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  Info,
  CheckCircle2,
  Trash2,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentLocation,
    setIsLocationSelectorOpen,
    setActiveTab,
    activeTab,
    notifications,
    markNotificationRead,
    userRole,
    setIsPlayStoreModalOpen,
    currentUser,
    setIsAuthModalOpen,
    logout,
    isDatabaseConnected,
    setPublicRoute,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !(n.read || false)).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs pt-safe">
      {/* Banner de Modo de Demonstração — visível para TODOS quando banco não está configurado */}
      {!isDatabaseConnected && (
        <div className="text-xs px-3 py-1.5 text-center font-medium flex items-center justify-center gap-1.5 bg-amber-50 border-b border-amber-200 text-amber-800">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Modo de Demonstração</strong> — Os dados exibidos são fictícios para fins ilustrativos.
            {currentUser?.role === 'admin' && (
              <span className="ml-1 text-amber-700">
                Configure <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> no <code className="bg-amber-100 px-1 rounded">.env</code> para ativar dados reais.
              </span>
            )}
          </span>
        </div>
      )}

      {/* Banner de Conexão Ativa — apenas para administradores */}
      {isDatabaseConnected && currentUser?.role === 'admin' && (
        <div className="text-xs px-3 py-1 text-center font-medium flex items-center justify-center gap-1.5 bg-emerald-900 text-emerald-100 border-b border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>
            <strong className="text-white">CONEXÃO ATIVA:</strong> Banco de Dados Supabase Conectado • PostgreSQL em Produção
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-3">
          
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0">
            <button
              id="brand-logo-btn"
              onClick={() => {
                setActiveTab('home');
              }}
              className="flex items-center text-left focus:outline-hidden group shrink-0"
            >
              <BrandLogo size="md" textColor="dark" showSlogan={true} />
            </button>

            {/* Location selector trigger */}
            <button
              id="header-location-pill"
              onClick={() => setIsLocationSelectorOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 sm:px-3.5 py-1 sm:py-1.5 text-xs font-medium transition active:scale-95 border border-slate-200 min-w-0"
              title="Alterar cidade ou usar GPS"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="max-w-[70px] sm:max-w-[160px] truncate font-semibold text-slate-700">
                {currentLocation.neighborhood ? `${currentLocation.neighborhood}, ` : ''}{currentLocation.city}
              </span>
              <ChevronDown className="hidden sm:block w-3 h-3 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            
            {/* Play Store & AAB readiness badge button */}
            <button
              id="btn-open-playstore-guide"
              onClick={() => setIsPlayStoreModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold transition"
              title="Estrutura Google Play Store & Android App Bundle (AAB)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Google Play AAB</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Cadastrar Empresa / Painel da Empresa Button */}
            {(!currentUser || currentUser.role === 'customer') && (
              <button
                onClick={() => {
                  if (!currentUser) {
                    setIsAuthModalOpen(true);
                  } else {
                    setActiveTab('business_portal');
                  }
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-full text-xs font-bold transition shadow-xs shrink-0"
                title="Cadastre sua empresa e receba orçamentos"
              >
                <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span className="hidden sm:inline">Seja Parceiro</span>
              </button>
            )}
            
            {currentUser?.role === 'business' && (
              <button
                onClick={() => setActiveTab('business_portal')}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-full text-xs font-bold transition shadow-xs shrink-0"
                title="Acessar o Painel da sua Empresa"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">Painel da Empresa</span>
              </button>
            )}

            {/* Install PWA Button */}
            <PWAInstallButton />

            {/* Auth / Account Profile Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 p-1.5 rounded-xl border border-slate-200 text-xs transition shrink-0"
                  title="Opções da minha conta"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {(currentUser.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate font-bold text-slate-800 hidden sm:inline">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'business' ? 'Parceiro' : 'Consumidor'}
                      </span>
                    </div>

                    {currentUser.role === 'customer' && (
                      <button
                        onClick={() => setActiveTab('quotes')}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        Minhas Cotações
                      </button>
                    )}

                    <button
                      onClick={() => setPublicRoute('delete_account')}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Minha Conta
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-open-auth-modal"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}

            {/* User Profile / Role Switcher for instant MVP validation */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin_portal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'admin_portal'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Painel Admin</span>
              </button>
            )}

            {/* Notifications Menu */}
            <div className="relative">
              <button
                id="btn-header-notifs"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 sm:max-w-none bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 -mr-4 sm:mr-0">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-900">Notificações</span>
                    <span className="text-xs text-slate-500 font-medium">{unreadCount} não lidas</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Nenhuma notificação no momento.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.linkAction) {
                              setActiveTab(n.linkAction as any);
                              setIsNotifOpen(false);
                            }
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition text-left ${
                            (n.read || false) ? 'bg-transparent hover:bg-slate-50' : 'bg-emerald-50/70 hover:bg-emerald-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                            <span className="text-[10px] text-slate-500 shrink-0">{n.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
