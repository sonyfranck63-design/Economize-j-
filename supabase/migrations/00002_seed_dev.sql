-- ==============================================================================
-- EconomizaJá — Seed de Desenvolvimento / Configurações Base
-- Migração 00002: Categorias Iniciais e Configurações Administrativas
-- ==============================================================================

-- Categorias Padrão
INSERT INTO public.categories (id, name, icon_name, description) VALUES
  ('automotivo', 'Automotivo', 'Car', 'Oficinas mecânicas, auto elétricas, pneus, funilaria e estética automotiva'),
  ('casa', 'Casa & Reformas', 'Home', 'Eletricistas, encanadores, pintores, marcenaria, pedreiros e reparos gerais'),
  ('saude', 'Saúde & Beleza', 'Activity', 'Clínicas odontológicas, salões, barbearias, fisioterapia e estética'),
  ('alimentacao', 'Alimentação & Gastronomia', 'Utensils', 'Restaurantes, marmitarias, padarias, açougues e distribuidoras de bebidas'),
  ('tecnologia', 'Tecnologia & Celulares', 'Smartphone', 'Conserto de smartphones, notebooks, formatação, redes e acessórios'),
  ('educacao', 'Educação & Aulas', 'GraduationCap', 'Aulas particulares, escolas de idiomas, reforço escolar e cursos livres'),
  ('animais', 'Pet Shop & Veterinária', 'Dog', 'Clínicas veterinárias, banho e tosa, rações e adestramento'),
  ('servicos', 'Serviços Gerais', 'Wrench', 'Chaveiros, costureiras, mudanças, dedetização e limpeza profissional')
ON CONFLICT (id) DO NOTHING;

-- Subcategorias Padrão
INSERT INTO public.subcategories (category_id, name) VALUES
  ('automotivo', 'Mecânica Geral'),
  ('automotivo', 'Auto Elétrica'),
  ('automotivo', 'Pneus e Alinhamento'),
  ('automotivo', 'Funilaria e Pintura'),
  ('automotivo', 'Estética Automotiva e Lava Rápido'),
  ('casa', 'Eletricista'),
  ('casa', 'Encanador'),
  ('casa', 'Pintor Residencial'),
  ('casa', 'Marcenaria e Móveis'),
  ('casa', 'Ar-Condicionado e Refrigeração'),
  ('saude', 'Dentista / Odontologia'),
  ('saude', 'Salão de Beleza / Cabeleireiro'),
  ('saude', 'Barbearia'),
  ('saude', 'Fisioterapia e Pilates'),
  ('alimentacao', 'Restaurantes e Almoço Executivo'),
  ('alimentacao', 'Pizzaria e Hamburgueria'),
  ('alimentacao', 'Açougue e Carnes Nobres'),
  ('tecnologia', 'Conserto de Celular e Troca de Tela'),
  ('tecnologia', 'Manutenção de Computadores e Notebooks'),
  ('animais', 'Clínica Veterinária 24h'),
  ('animais', 'Banho e Tosa'),
  ('servicos', 'Chaveiro Residencial e Automotivo'),
  ('servicos', 'Diarista e Limpeza Pós-Obra')
ON CONFLICT (category_id, name) DO NOTHING;

-- Configurações Dinâmicas da Plataforma (Preços de Monetização)
INSERT INTO public.app_settings (key, value, description) VALUES
  ('monetization', '{
    "costPerLead": 15.00,
    "packLeads5": 65.00,
    "packLeads20": 220.00,
    "planProMonthly": 59.90,
    "planPremiumMonthly": 119.90,
    "featuredDailyRate": 9.90,
    "platformCommissionPercent": 0
  }'::jsonb, 'Parâmetros de precificação de leads, assinaturas e anúncios patrocinados')
ON CONFLICT (key) DO NOTHING;
