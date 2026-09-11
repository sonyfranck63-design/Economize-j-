import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setCurrentUser, setUserRole } = useApp();
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Modo local quando as credenciais ainda não foram inseridas no .env
        const isMaster = email.toLowerCase().trim() === 'matheusfranck2013@gmail.com';
        const assignedRole = isMaster ? 'admin' : (tab === 'signup' && role === 'business' ? 'business' : 'customer');
        const dummyUser = {
          id: `local-u-${Date.now()}`,
          email,
          fullName: fullName || email.split('@')[0],
          role: assignedRole,
          city,
          state,
          phone,
        };
        setCurrentUser(dummyUser);
        setUserRole(dummyUser.role);
        setSuccessMessage('Acesso realizado com sucesso (Modo Local/Dev).');
        setTimeout(() => setIsAuthModalOpen(false), 800);
        return;
      }

      if (tab === 'login') {
        const res = await authService.signIn(email, password);
        const profile = await authService.getCurrentProfile();
        if (profile) {
          setCurrentUser(profile);
          setUserRole(profile.role);
        }
        setSuccessMessage('Login efetuado com sucesso!');
        setTimeout(() => setIsAuthModalOpen(false), 800);
      } else if (tab === 'signup') {
        await authService.signUp({
          email,
          password,
          fullName,
          role,
          city,
          state,
          phone,
        });
        setSuccessMessage('Conta criada com sucesso! Verifique seu e-mail para confirmar a ativação.');
        setTimeout(() => setTab('login'), 2000);
      } else if (tab === 'forgot') {
        await authService.resetPassword(email);
        setSuccessMessage('Instruções de redefinição de senha enviadas para o seu e-mail.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Autenticação Segura EconomizaJá
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-1">
          {tab === 'login' && 'Entrar na sua conta'}
          {tab === 'signup' && 'Criar sua conta gratuita'}
          {tab === 'forgot' && 'Recuperar senha'}
        </h2>

        {!isSupabaseConfigured && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Configuração Supabase Pendente</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Para autenticação em produção real, configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no seu arquivo <code>.env</code>.
            </p>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 rounded-lg transition ${
              tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 rounded-lg transition ${
              tab === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {tab === 'signup' && (
            <>
              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      role === 'customer'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Consumidor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('business')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      role === 'business'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Empresa / Parceiro</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo {role === 'business' ? 'do Responsável' : ''}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp de Contato
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
                  <input
                    type="text"
                    required
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm uppercase"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Senha</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Processando...' : tab === 'login' ? 'Entrar' : tab === 'signup' ? 'Cadastrar Gratuitamente' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Ao continuar, você concorda com nossos{' '}
          <span className="font-semibold text-slate-700">Termos de Uso</span> e nossa{' '}
          <span className="font-semibold text-slate-700">Política de Privacidade</span> sob a LGPD.
        </p>
      </div>
    </div>
  );
};
