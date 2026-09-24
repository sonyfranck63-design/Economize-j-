import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert, User, LogIn, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';

interface Props {
  onBack?: () => void;
}

export const DeleteAccountView: React.FC<Props> = ({ onBack }) => {
  const { currentUser, setCurrentUser, deleteAccountAndData, setActiveTab, setPublicRoute, setIsAuthModalOpen } = useApp();
  const [emailInput, setEmailInput] = useState(currentUser?.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentUser?.email) {
      setEmailInput(currentUser.email);
    }
  }, [currentUser]);

  const handleLoginFirst = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!emailInput || !passwordInput) {
      setErrorMessage('Informe e-mail e senha para autenticar sua identidade antes de prosseguir.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const user = await authService.signIn(emailInput, passwordInput);
      setCurrentUser(user);
      setPasswordInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar. Verifique e-mail e senha.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Você precisa se autenticar para confirmar que é o proprietário desta conta.');
      return;
    }

    if (confirmPhrase.trim().toUpperCase() !== 'EXCLUIR') {
      setErrorMessage('Por favor, digite exatamente a palavra EXCLUIR para confirmar a ação.');
      return;
    }

    setIsDeleting(true);
    try {
      // Executa a exclusão definitiva no backend via RPC delete_own_account
      await authService.deleteAccount(currentUser.id);
      
      // Limpa os dados em memória e no storage local SOMENTE após o backend confirmar
      deleteAccountAndData();
      setDeletedSuccess(true);
    } catch (err: any) {
      console.error('[DeleteAccountView] Erro real na exclusão de conta:', err);
      // REGRA: NÃO finge sucesso quando o backend falha. Mostra o erro real e permite nova tentativa.
      setDeletedSuccess(false);
      setErrorMessage(
        err.message || 'Falha ao processar a exclusão no servidor. Seus dados permanecem intactos. Tente novamente mais tarde.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 text-slate-800 space-y-6 animate-in fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao EconomizaJá
        </button>
      )}

      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
          <Trash2 className="w-4 h-4" />
          Diretrizes Google Play & LGPD Art. 18
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
          Exclusão de Conta e Dados Pessoais
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Solicitação formal de eliminação definitiva de cadastro no EconomizaJá
        </p>
      </div>

      {deletedSuccess ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 text-emerald-950">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 className="w-6 h-6" />
            <h2 className="text-lg">Sua conta e seus dados foram excluídos com sucesso</h2>
          </div>
          <p className="text-sm leading-relaxed text-emerald-900">
            Sua conta de acesso, perfil, histórico de orçamentos, cotações, favoritos e notificações foram permanentemente apagados dos nossos servidores.
          </p>
          <p className="text-xs text-emerald-800">
            Agradecemos pelo tempo em que esteve conosco. Caso deseje retornar futuramente, poderá criar um novo cadastro.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  setPublicRoute('app');
                  setActiveTab('home');
                }
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Voltar à Página Inicial
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Informações de Transparência exigidas pela Google Play */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-slate-700">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              O que acontece ao excluir sua conta?
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados excluídos permanentemente:</strong> Nome, telefone, e-mail de acesso, senha, orçamentos cadastrados, cotações recebidas, favoritos e alertas de preço.</li>
              <li><strong>Dados de empresas parceiras vinculadas:</strong> Se você for titular de uma empresa, ela será desativada do catálogo público.</li>
              <li><strong>Retenção legal obrigatória:</strong> Em estrito cumprimento ao Artigo 15 da Lei Federal nº 12.965/2014 (Marco Civil da Internet), registros de data, hora e IP de conexão são mantidos em sigilo judicial pelo prazo legal de 6 meses, sendo expurgados automaticamente após esse prazo.</li>
            </ul>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!currentUser ? (
            /* Se o usuário estiver na web deslogado, exige autenticação para proteger a identidade */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Verificação de Segurança Obrigatória:</strong> Para garantir que ninguém exclua sua conta indevidamente, confirme seu e-mail e senha cadastrados no EconomizaJá.
              </div>

              <form onSubmit={handleLoginFirst} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail da Conta
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sua Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {isAuthenticating ? 'Verificando identidade...' : 'Entrar para Confirmar Exclusão'}
                </button>
              </form>
            </div>
          ) : (
            /* Usuário autenticado: Formulário com confirmação estrita */
            <form onSubmit={handleDelete} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>
                    Conectado como: <strong>{currentUser.fullName}</strong> ({currentUser.email})
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  Conta Verificada
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo da exclusão (opcional)
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">Selecione uma opção...</option>
                  <option value="not_using">Não estou mais utilizando o aplicativo</option>
                  <option value="privacy">Preocupações com privacidade de dados</option>
                  <option value="found_alternative">Encontrei outra solução de economia</option>
                  <option value="technical">Problemas técnicos ou dificuldades de uso</option>
                  <option value="other">Outro motivo</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 text-rose-700">
                  Digite "EXCLUIR" em maiúsculas para confirmar:
                </label>
                <input
                  type="text"
                  required
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isDeleting || confirmPhrase.trim().toUpperCase() !== 'EXCLUIR'}
                className="w-full mt-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Processando exclusão no servidor...' : 'Excluir Definitivamente Minha Conta'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};
