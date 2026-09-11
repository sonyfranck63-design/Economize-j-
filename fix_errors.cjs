const fs = require('fs');
let content = fs.readFileSync('src/services/dataService.ts', 'utf8');

content = content.replace(
  "console.warn('Erro ao carregar empresas do Supabase:', error?.message);",
  "if (error?.message?.includes('Failed to fetch')) {\n        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL.');\n      } else {\n        console.warn('Erro ao carregar empresas do Supabase:', error?.message);\n      }"
);

content = content.replace(
  "console.warn('Erro ao carregar ofertas:', error?.message);",
  "if (error?.message?.includes('Failed to fetch')) {\n        console.error('ERRO CRÍTICO DE REDE: O projeto Supabase está offline, pausado ou a URL é inválida. Verifique sua VITE_SUPABASE_URL.');\n      } else {\n        console.warn('Erro ao carregar ofertas:', error?.message);\n      }"
);

fs.writeFileSync('src/services/dataService.ts', content);
