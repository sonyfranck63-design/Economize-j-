import React from 'react';
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  onBack?: () => void;
}

export const TermsOfServiceView: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 text-slate-800 space-y-8 animate-in fade-in">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao EconomizaJá
        </button>
      )}

      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Termos e Condições Gerais de Uso
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2 font-display">
          Termos de Uso do EconomizaJá
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Vigência: Setembro de 2026 • Versão 1.0
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. O Objeto da Plataforma</h2>
          <p>
            O <strong>EconomizaJá</strong> é um guia digital e plataforma de cotação que conecta consumidores que desejam economizar a empresas e profissionais prestadores de serviços locais. O aplicativo é <strong>100% gratuito para o consumidor final</strong> pesquisar, comparar orçamentos e visualizar ofertas promocionais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Responsabilidade das Partes</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Intermediação e Divulgação:</strong> O EconomizaJá atua como canal tecnológico de divulgação e aproximação. A execução física de serviços, garantia de qualidade, emissão de nota fiscal e prazos acordados são de inteira responsabilidade das empresas e profissionais contratados.</li>
            <li><strong>Veracidade das Informações:</strong> As empresas cadastradas são civil e penalmente responsáveis pela veracidade dos preços, descrições e descontos informados em seus anúncios.</li>
            <li><strong>Conduta do Consumidor:</strong> O consumidor se compromete a fornecer dados idôneos ao solicitar orçamentos e a não utilizar os canais de contato para envio de spam, fraudes ou mensagens ofensivas.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Conteúdo Gerado pelo Usuário e Moderação</h2>
          <p>
            Em conformidade com as diretrizes do Google Play Console e a legislação brasileira, avaliações, comentários e propostas que contenham:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Discurso de ódio, ofensas ou discriminação;</li>
            <li>Divulgação de produtos ou substâncias ilícitas;</li>
            <li>Manipulação de avaliações com notas falsas ou acordos fraudulentos;</li>
          </ul>
          <p>
            Serão imediatamente removidos pela equipe de moderação, sujeitando a conta do infrator à suspensão ou encerramento definitivo sem prévio aviso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Planos, Assinaturas e Cobranças de Empresas</h2>
          <p>
            Empresas parceiras podem contratar planos (Pro ou Premium) ou pacotes avulsos de visualização de leads de orçamentos.
          </p>
          <p>
            Assinaturas digitais contratadas via aplicativo Android seguem os termos de pagamento do <strong>Google Play Billing</strong>, podendo ser canceladas a qualquer momento pelo usuário diretamente em sua conta Google Play.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Foro e Legislação Aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor (Lei 8.078/1990), o Marco Civil da Internet (Lei 12.965/2014) e a LGPD (Lei 13.709/2018).
          </p>
        </section>
      </div>
    </div>
  );
};
