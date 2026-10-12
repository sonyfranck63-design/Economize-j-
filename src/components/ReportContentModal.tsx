import React, { useState } from 'react';
import { Flag, X, Ban } from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ReportableContentType = 'review' | 'business' | 'offer' | 'quote' | 'user';

export interface ReportTarget {
  contentType: ReportableContentType;
  contentId: string;
  /** Texto curto exibido no cabeçalho (ex.: nome da empresa ou autor da avaliação) */
  label: string;
  /** Autor do conteúdo; quando presente, permite bloquear o usuário */
  authorUserId?: string;
}

const REASONS = [
  'Conteúdo ofensivo, discurso de ódio ou assédio',
  'Spam, propaganda enganosa ou golpe',
  'Informação falsa ou fraudulenta',
  'Conteúdo sexual ou violento',
  'Violação de direitos autorais ou de privacidade',
  'Outro motivo',
];

interface ReportContentModalProps {
  target: ReportTarget | null;
  onClose: () => void;
}

/**
 * Denúncia e bloqueio de conteúdo gerado por usuários (política de UGC da Google Play).
 * As denúncias vão para a fila de moderação do Portal Administrativo.
 */
export const ReportContentModal: React.FC<ReportContentModalProps> = ({ target, onClose }) => {
  const { currentUser, setIsAuthModalOpen, submitContentReport, blockUser } = useApp();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!target) return null;

  const canBlock = Boolean(target.authorUserId && target.authorUserId !== currentUser?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      setIsAuthModalOpen(true);
      return;
    }
    setIsSending(true);
    try {
      await submitContentReport({
        contentType: target.contentType,
        contentId: target.contentId,
        reason,
        details: details.trim() || undefined,
      });
      if (alsoBlock && canBlock && target.authorUserId) {
        await blockUser(target.authorUserId);
      }
      alert(
        alsoBlock && canBlock
          ? 'Denúncia enviada e usuário bloqueado. Você não verá mais conteúdos dele.'
          : 'Denúncia enviada. Nossa equipe de moderação vai analisar o conteúdo.'
      );
      setDetails('');
      setAlsoBlock(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível enviar a denúncia. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" />
              <span>Denunciar conteúdo</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{target.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-slate-700 mb-1">Motivo</legend>
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="report-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-rose-600"
              />
              <span>{r}</span>
            </label>
          ))}
        </fieldset>

        <textarea
          rows={3}
          maxLength={1000}
          placeholder="Detalhes (opcional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
        />

        {canBlock && (
          <label className="flex items-start gap-2 text-xs text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
              className="mt-0.5 accent-rose-600"
            />
            <span>
              <strong className="flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" /> Bloquear este usuário
              </strong>
              Você deixará de ver avaliações, empresas e ofertas publicadas por ele.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold min-h-[44px]"
        >
          {isSending ? 'Enviando...' : currentUser ? 'Enviar denúncia' : 'Entrar para denunciar'}
        </button>
      </form>
    </div>
  );
};
