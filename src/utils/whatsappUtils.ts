/**
 * Utilitários centralizados para telefonia e WhatsApp no padrão brasileiro (E.164)
 * Previne que o WhatsApp confunda DDDs brasileiros (ex: DDD 51 de Porto Alegre)
 * com códigos internacionais de outros países (ex: +51 do Peru).
 */

/**
 * Normaliza qualquer número de telefone para o padrão E.164 do WhatsApp com DDI do Brasil (55).
 * Exemplos:
 *  '51985661499'         -> '5551985661499'
 *  '(51) 98566-1499'     -> '5551985661499'
 *  '5551985661499'       -> '5551985661499'
 *  '051985661499'        -> '5551985661499'
 *  '+55 (51) 98566-1499' -> '5551985661499'
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  // Remove zero à esquerda (ex: 051985661499 -> 51985661499)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Se já tem DDI 55 (Brasil) e tem 12 dígitos (fixo) ou 13 dígitos (celular)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se tem 10 dígitos (DDD + 8 fixo) ou 11 dígitos (DDD + 9 celular), adiciona DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Fallback: se tiver 12 ou 13 dígitos mas não começa com 55 (caso raro de digitação incorreta)
  // ou se tiver 8 ou 9 dígitos (sem DDD), retorna os dígitos limpos
  return digits;
}

/**
 * Gera URL segura e compatível para abertura direta do WhatsApp
 */
export function buildWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  if (!cleanPhone) return '#';
  const encodedText = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleanPhone}${encodedText}`;
}

/**
 * Aplica máscara visual de telefone brasileiro enquanto o usuário digita:
 * (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhoneBR(value: string | null | undefined): string {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');

  // Remove 55 se o usuário colou com DDI
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.substring(2);
  }

  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
