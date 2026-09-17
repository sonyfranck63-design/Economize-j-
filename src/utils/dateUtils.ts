/**
 * Utilitários para manipulação e validação de datas no EconomizaJá
 */

/**
 * Verifica se uma string de data (formato ISO, YYYY-MM-DD ou equivalente)
 * pertence ao mês e ano atuais.
 *
 * @param dateStr Data no formato texto ou ISO
 * @returns true se a data pertence ao mês e ano correntes, false caso contrário
 */
export function isThisMonth(dateStr?: string | null): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}
