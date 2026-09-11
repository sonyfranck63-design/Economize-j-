const fs = require('fs');
let content = fs.readFileSync('src/services/dataService.ts', 'utf8');

content = content.replace(
  "const { data, error } = await query;\n    if (error || !data) return [];\n\n    return data.map((qr: any) => ({",
  "const { data, error } = await query;\n    if (error || !data) {\n      if (error?.message?.includes('Failed to fetch')) {\n        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL (quote_requests).');\n      }\n      return [];\n    }\n\n    return data.map((qr: any) => ({"
);

content = content.replace(
  "const { data, error } = await query;\n    if (error || !data) return [];\n\n    return data.map((r: any) => ({",
  "const { data, error } = await query;\n    if (error || !data) {\n      if (error?.message?.includes('Failed to fetch')) {\n        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL (reviews).');\n      }\n      return [];\n    }\n\n    return data.map((r: any) => ({"
);

fs.writeFileSync('src/services/dataService.ts', content);
