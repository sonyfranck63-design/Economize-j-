import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, FileText, Mail } from 'lucide-react';

interface Props {
  onBack?: () => void;
}

export const PrivacyPolicyView: React.FC<Props> = ({ onBack }) => {
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
          <ShieldCheck className="w-4 h-4" />
          LGPD • Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2 font-display">
          Política de Privacidade do EconomizaJá
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Última atualização: Setembro de 2026 • Versão 1.0
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Introdução e Compromisso</h2>
          <p>
            O <strong>EconomizaJá</strong> (aplicativo operado pela equipe EconomizaJá, inscrito sob as normas brasileiras de proteção de dados) valoriza a privacidade de seus usuários. Esta Política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais ao utilizar nosso aplicativo móvel e nossa plataforma de cotação e busca de preços locais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Dados Pessoais que Coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados de Cadastro (Consumidores):</strong> Nome completo, endereço de e-mail, telefone/WhatsApp e cidade/bairro de residência.</li>
            <li><strong>Dados de Empresas e Prestadores:</strong> Razão social, nome fantasia, CNPJ/CPF, endereço comercial, telefone, WhatsApp, fotos dos serviços e catálogo.</li>
            <li><strong>Dados de Geolocalização:</strong> Localização aproximada ou precisa mediante consentimento expresso em seu aparelho, utilizada estritamente para ordenar empresas e ofertas por distância até você. Se você recusar a permissão de GPS, o aplicativo continuará plenamente operacional através da seleção manual de sua cidade.</li>
            <li><strong>Conteúdo Fornecido pelo Usuário:</strong> Descrição de solicitações de orçamento, fotos de orçamentos, mensagens do chat integrado e avaliações legítimas de empresas.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Finalidade e Base Legal para o Tratamento</h2>
          <p>
            Tratamos seus dados sob as bases legais do Artigo 7º da LGPD:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Execução de Contrato e Procedimentos Preliminares:</strong> Para viabilizar a conexão entre consumidores e empresas fornecedoras de orçamentos e ofertas.</li>
            <li><strong>Consentimento:</strong> Para envio de notificações push de alerta de preços e acesso à geolocalização do dispositivo móvel.</li>
            <li><strong>Legítimo Interesse:</strong> Para aprimoramento da segurança, moderação de fraudes, prevenção contra spam e análise estatística de mercado.</li>
            <li><strong>Cumprimento de Obrigação Legal:</strong> Guarda de registros de acesso a aplicações de internet pelo prazo de 6 meses, conforme o Art. 15 do Marco Civil da Internet (Lei 12.965/2014).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Compartilhamento de Dados com Terceiros</h2>
          <p>
            O EconomizaJá <strong>NUNCA comercializa listas de dados pessoais de usuários para terceiros anunciantes</strong>. O compartilhamento ocorre exclusivamente:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Com empresas parceiras que você optar por solicitar orçamento, permitindo que elas enviem propostas com valores e prazos.</li>
            <li>Com provedores essenciais de infraestrutura em nuvem (banco de dados seguro Supabase/PostgreSQL com criptografia em repouso e em trânsito).</li>
            <li>Mediante ordem judicial expedida por autoridade competente brasileira.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Seus Direitos como Titular (Artigo 18 da LGPD)</h2>
          <p>Você possui o direito de a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirmar a existência de tratamento e acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
            <li>Revogar o consentimento previamente fornecido.</li>
            <li>Solicitar a <strong>exclusão integral de sua conta e dos dados pessoais armazenados</strong> diretamente pelo aplicativo ou pela página de exclusão.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">6. Segurança da Informação</h2>
          <p>
            Adotamos medidas técnicas e organizacionais como comunicação exclusivamente via HTTPS/TLS, criptografia de senhas (bcrypt/Argon2 via Supabase Auth), controle de acesso por linha (Row Level Security no PostgreSQL) e restrição total de tráfego em texto claro no arquivo de segurança de rede do Android.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-bold text-slate-900">7. Contato do Encarregado de Dados (DPO)</h2>
          <p>
            Para exercer qualquer direito previsto na LGPD ou esclarecer dúvidas sobre esta Política, entre em contato com nosso Encarregado pelo tratamento de dados pessoais:
          </p>
          <div className="bg-slate-100 p-4 rounded-xl text-xs space-y-1 border border-slate-200">
            <p><strong>Encarregado pelo Tratamento de Dados (DPO):</strong> Equipe de Privacidade EconomizaJá</p>
            <p className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <strong>E-mail de contato exclusivo:</strong> privacidade@economizaja.app
            </p>
            <p><strong>Endereço para correspondência:</strong> São Paulo - SP, Brasil</p>
          </div>
        </section>
      </div>
    </div>
  );
};
