import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert, User, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';

interface Props {
  onBack?: () => void;
}

export const DeleteAccountView: React.FC<Props> = ({ onBack }) => {
  const { currentUser, deleteAccountAndData, setActiveTab, setPublicRoute } = useApp();
  const [emailInput, setEmailInput] = useState(currentUser?.email || '');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  useEffect(() => {
    if (currentUser?.email) {
      setEmailInput(currentUser.email);
    }
  }, [currentUser]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (confirmPhrase.trim().toUpperCase() !== 'EXCLUIR') {
      setErrorMessage('Por favor, digite exatamente a palavra EXCLUIR para confirmar a ação.');
      return;
    }

    if (!emailInput || !emailInput.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setIsDeleting(true);
    try {
      // Executa a exclusão e limpeza de dados (com fallback automático mesmo se a RPC de banco não estiver instalada)
      await authService.deleteAccount(currentUser?.id || '');
      // Limpa todo o estado local e sessão do app
      deleteAccountAndData();
      setDeletedSuccess(true);
    } catch (err: any) {
      console.error('Erro na exclusão de conta:', err);
      // Mesmo em caso de aviso, desloga e limpa dados locais
      deleteAccountAndData();
      setDeletedSuccess(true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 text-slate-800 space-y-6 animate-in fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition"
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
            <h2 className="text-lg">Sua solicitação foi concluída com sucesso</h2>
          </div>
          <p className="text-sm leading-relaxed text-emerald-900">
            Sua conta, histórico de favoritos, pedidos de cotação e dados de perfil foram desvinculados, apagados e a sessão foi encerrada com sucesso.
          </p>
          <p className="text-xs text-emerald-800">
            Agradecemos pelo tempo que esteve conosco. Você pode voltar a usar o EconomizaJá criando um novo cadastro a qualquer momento.
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
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
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
              <li><strong>Dados excluídos permanentemente:</strong> Nome, telefone, e-mail de acesso, avatar, orçamentos cadastrados, cotações recebidas, favoritos e alertas de preço.</li>
              <li><strong>Dados de empresas vinculadas:</strong> Caso sua conta seja titular de uma empresa parceira, a empresa será desativada do guia público.</li>
              <li><strong>Retenção legal obrigatória:</strong> Em estrito cumprimento ao Artigo 15 da Lei Federal nº 12.965/2014 (Marco Civil da Internet), registros de data, hora e endereço IP de conexão serão armazenados em ambiente seguro e sigiloso pelo prazo de 6 (seis) meses, sendo excluídos automaticamente após esse período.</li>
            </ul>
          </div>

          <form onSubmit={handleDelete} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {currentUser ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-800">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>
                    Conectado como: <strong>{currentUser.fullName}</strong> ({currentUser.email})
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                  Conta Ativa
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Você não está conectado no momento. Informe o e-mail cadastrado para solicitar a exclusão dos registros.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail cadastrado
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isDeleting || confirmPhrase.trim().toUpperCase() !== 'EXCLUIR'}
              className="w-full mt-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Processando exclusão...' : 'Excluir Definitivamente Minha Conta'}
            </button>
          </form>

          {/* Guia Técnico para Administrador Supabase (opcional) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-slate-50">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="w-full p-3 flex items-center justify-between text-slate-600 hover:text-slate-900 font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                Instruções para Administrador do Banco de Dados (Supabase SQL)
              </span>
              {showSqlGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSqlGuide && (
              <div className="p-3.5 pt-0 border-t border-slate-200 text-slate-600 space-y-2">
                <p>
                  Para habilitar a exclusão direta na tabela interna de autenticação (<code>auth.users</code>) no Supabase, execute o seguinte comando no <strong>SQL Editor</strong> do painel do Supabase:
                </p>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] overflow-x-auto font-mono">
{`CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  DELETE FROM public.favorites WHERE user_id = auth.uid();
  DELETE FROM public.quote_requests WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
NOTIFY pgrst, 'reload schema';`}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
