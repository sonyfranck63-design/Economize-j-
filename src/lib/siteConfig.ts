// Site público do EconomizaJá (políticas, exclusão de conta e redefinição de senha).
// O app é exclusivo para Android; este domínio hospeda apenas as páginas públicas exigidas pela Google Play.
export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://economizaja.ai.studio').replace(/\/+$/, '');

export const PUBLIC_PAGES = {
  privacy: `${PUBLIC_SITE_URL}/privacy.html`,
  terms: `${PUBLIC_SITE_URL}/terms.html`,
  deleteAccount: `${PUBLIC_SITE_URL}/delete-account.html`,
  resetPassword: `${PUBLIC_SITE_URL}/reset-password.html`,
};
