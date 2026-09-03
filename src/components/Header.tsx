import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
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
    setUserRole,
    setIsPlayStoreModalOpen,
    currentUser,
    setIsAuthModalOpen,
    logout,
    isDatabaseConnected,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Real Infrastructure Status Banner */}
      <div className={`text-xs px-3 py-1 text-center font-medium flex items-center justify-center gap-1.5 transition ${
        isDatabaseConnected 
          ? 'bg-emerald-900 text-emerald-100 border-b border-emerald-800' 
          : 'bg-slate-900 text-slate-300 border-b border-slate-800'
      }`}>
        {isDatabaseConnected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>
              <strong className="text-white">CONEXÃO ATIVA:</strong> Banco de Dados Supabase Conectado • PostgreSQL em Produção
            </span>
          </>
        ) : (
          <>
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">ECONOMIZAJÁ:</strong> Configure <code>VITE_SUPABASE_URL</code> no arquivo <code>.env</code> para sincronização instantânea em nuvem.
            </span>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => {
                setActiveTab('home');
              }}
              className="flex items-center gap-2.5 text-left focus:outline-hidden group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-200 text-white font-bold transition group-hover:scale-105">
                <span className="text-lg font-black tracking-tight">E$</span>
              </div>
              <div>
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 flex items-center">
                  Economiza<span className="text-emerald-600">Já</span>
                </span>
                <span className="hidden sm:block text-[11px] font-medium text-slate-500 leading-tight">
                  Antes de comprar, compare.
                </span>
              </div>
            </button>

            {/* Location selector trigger */}
            <button
              id="header-location-pill"
              onClick={() => setIsLocationSelectorOpen(true)}
              className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 px-3.5 py-1.5 text-xs font-medium transition active:scale-95 border border-slate-200"
              title="Alterar cidade ou usar GPS"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate font-semibold text-slate-700">
                {currentLocation.neighborhood ? `${currentLocation.neighborhood}, ` : ''}{currentLocation.city}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Play Store & AAB readiness badge button */}
            <button
              id="btn-open-playstore-guide"
              onClick={() => setIsPlayStoreModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold transition"
              title="Estrutura Google Play Store & Android App Bundle (AAB)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Google Play AAB</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Install PWA Button */}
            <PWAInstallButton />

            {/* Auth / Account Profile Button */}
            {currentUser ? (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1 px-2 py-1 text-slate-800 font-semibold max-w-[120px] truncate">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{currentUser.fullName.split(' ')[0]}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition"
                  title="Sair da conta"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                id="btn-open-auth-modal"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* User Profile / Role Switcher for instant MVP validation */}
            <div className="relative">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  id="role-btn-customer"
                  onClick={() => {
                    setUserRole('customer');
                    if (activeTab === 'business_portal' || activeTab === 'admin_portal') setActiveTab('home');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    userRole === 'customer'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Modo Consumidor: Pesquise e compare orçamentos"
                >
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">Cliente</span>
                  </span>
                </button>

                <button
                  id="role-btn-business"
                  onClick={() => {
                    setUserRole('business');
                    setActiveTab('business_portal');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    userRole === 'business'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Modo Empresa: Receba leads e envie propostas"
                >
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Empresa</span>
                  </span>
                </button>

                <button
                  id="role-btn-admin"
                  onClick={() => {
                    setUserRole('admin');
                    setActiveTab('admin_portal');
                  }}
                  className={`px-2 py-1 rounded-lg font-medium transition ${
                    userRole === 'admin'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Painel Administrativo: Leads, Comissões e Monetização"
                >
                  <span className="flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span className="hidden lg:inline">Admin</span>
                  </span>
                </button>
              </div>
            </div>

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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
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
                            n.read ? 'bg-transparent hover:bg-slate-50' : 'bg-emerald-50/70 hover:bg-emerald-50'
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
