import React, { useState } from 'react';
import { useUI, useAuth, useData } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { BrandLogo } from './BrandLogo';
import { NotificationItemSkeleton } from './Skeleton';
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
  X,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentLocation,
    setIsLocationSelectorOpen,
    setActiveTab,
    activeTab,
    setIsPlayStoreModalOpen,
    setPublicRoute,
  } = useUI();

  const {
    userRole,
    currentUser,
    setIsAuthModalOpen,
    logout,
  } = useAuth();

  const {
    notifications,
    markNotificationRead,
    isDatabaseConnected,
    isLoadingData,
    businesses,
  } = useData();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !(n.read || false)).length;

  const ownedBusinesses = currentUser
    ? (businesses || []).filter((b) => (b.ownerId || '').toLowerCase() === (currentUser.id || '').toLowerCase())
    : [];
  const hasOwnedBusiness = ownedBusinesses.length > 0 || currentUser?.role === 'business';
  const primaryBusiness = ownedBusinesses[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs pt-safe w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          
          {/* Lado Esquerdo: Brand Logo & Seletor de Localização */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <button
              id="brand-logo-btn"
              onClick={() => setActiveTab('home')}
              className="flex items-center text-left focus:outline-hidden group shrink-0"
              aria-label="Página Inicial EconomizaJá"
            >
              <BrandLogo size="md" textColor="dark" showSlogan={true} />
            </button>

            {/* Seletor de Localização Pill - Área de toque 38px/40px e visual refinado */}
            <button
              id="header-location-pill"
              onClick={() => setIsLocationSelectorOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 px-2.5 sm:px-3.5 h-9 sm:h-10 text-xs font-semibold transition active:scale-95 border border-emerald-200/80 min-w-0 shrink"
              title="Alterar cidade ou usar GPS"
            >
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="max-w-[75px] xs:max-w-[110px] sm:max-w-[170px] truncate">
                <span className="hidden sm:inline">
                  {currentLocation.neighborhood ? `${currentLocation.neighborhood}, ` : ''}
                </span>
                {currentLocation.city || 'Definir local'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700/60 shrink-0" />
            </button>
          </div>

          {/* Lado Direito: Ações Principais e Perfil */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Botão Seja Parceiro (visível no desktop quando não tem empresa) */}
            {(!currentUser || (!hasOwnedBusiness && currentUser.role === 'customer')) && (
              <button
                onClick={() => {
                  if (!currentUser) {
                    setIsAuthModalOpen(true);
                  } else {
                    setActiveTab('business_portal');
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 h-10 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-full text-xs font-bold transition shadow-2xs shrink-0"
                title="Cadastre sua empresa e receba orçamentos"
              >
                <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Seja Parceiro</span>
              </button>
            )}
            
            {(hasOwnedBusiness || currentUser?.role === 'business') && (
              <button
                onClick={() => setActiveTab('business_portal')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 h-10 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-full text-xs font-bold transition shadow-2xs shrink-0"
                title="Acessar o Painel da sua Empresa"
              >
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Painel Empresa</span>
              </button>
            )}

            {/* Painel Admin (visível no desktop para administradores) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin_portal')}
                className={`hidden sm:flex px-3.5 h-10 rounded-full text-xs font-bold transition items-center gap-1.5 ${
                  activeTab === 'admin_portal'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                }`}
                title="Acessar o Painel Administrativo"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Painel Admin</span>
              </button>
            )}

            {/* Botão de Notificações */}
            <div className="relative">
              <button
                id="btn-header-notifs"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotifOpen(!isNotifOpen);
                  if (isUserMenuOpen) setIsUserMenuOpen(false);
                }}
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition border cursor-pointer active:scale-95 ${
                  isNotifOpen 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Notificações"
                aria-label="Ver notificações"
              >
                <Bell className="w-5 h-5 shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificações */}
              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs transition-opacity"
                    onClick={() => setIsNotifOpen(false)}
                    aria-hidden="true"
                  />

                  <div 
                    className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full mt-1 sm:mt-2 w-[calc(100vw-24px)] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-sm text-slate-900">Notificações</span>
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                          {unreadCount} nova{unreadCount === 1 ? '' : 's'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        className="w-11 h-11 -mr-2 -my-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
                        title="Fechar notificações"
                        aria-label="Fechar notificações"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2 -mr-1 pr-1">
                      {isLoadingData ? (
                        <div className="py-2 space-y-2">
                          <NotificationItemSkeleton />
                          <NotificationItemSkeleton />
                          <NotificationItemSkeleton />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 space-y-1.5">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                          <p className="text-[11px] text-slate-400">Você não possui notificações no momento.</p>
                        </div>
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
                            className={`p-3 rounded-xl cursor-pointer transition text-left my-1 ${
                              (n.read || false) 
                                ? 'bg-transparent hover:bg-slate-50 opacity-80' 
                                : 'bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-100'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                                <span>{n.title}</span>
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">{n.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botão de Conta / Usuário */}
            {currentUser ? (
              <div className="relative">
                <button
                  id="header-user-menu-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen((prev) => !prev);
                    if (isNotifOpen) setIsNotifOpen(false);
                  }}
                  className={`relative z-50 flex items-center gap-1.5 h-11 px-2.5 sm:px-3 rounded-full border transition shrink-0 active:scale-95 min-h-[44px] cursor-pointer ${
                    isUserMenuOpen
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                  title="Opções da minha conta"
                  aria-label="Menu da conta"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                    {(currentUser.fullName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[75px] sm:max-w-[100px] truncate font-bold text-xs text-slate-800 hidden md:inline">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu do Usuário */}
                {isUserMenuOpen && (
                  <>
                    {/* Backdrop para toque fora no mobile e clique fora */}
                    <div
                      className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs transition-opacity"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div 
                      className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full mt-1 sm:mt-2 w-[calc(100vw-24px)] max-w-xs sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between px-4 pb-3 border-b border-slate-100">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                          <span className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                            {currentUser.role === 'admin' ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Administrador</span>
                              </>
                            ) : hasOwnedBusiness ? (
                              <>
                                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Parceiro</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Consumidor</span>
                              </>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition sm:hidden"
                          aria-label="Fechar menu"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Acessos Rápidos no Mobile e Desktop */}
                      <div className="py-1">
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('admin_portal');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-slate-600 shrink-0" />
                            <span>Painel Administrativo</span>
                          </button>
                        )}

                        {hasOwnedBusiness ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('business_portal');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="truncate">
                              {primaryBusiness ? `Painel: ${primaryBusiness.name}` : 'Painel da Minha Empresa'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('business_portal');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Cadastrar Minha Empresa</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('quotes');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <User className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Minhas Cotações</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPublicRoute('delete_account');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Excluir Minha Conta (LGPD)</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setIsUserMenuOpen(false);
                            await logout();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Sair da Conta</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                id="btn-open-auth-modal"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition shadow-xs shrink-0 active:scale-95"
                title="Fazer Login ou Criar Conta"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Entrar</span>
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
