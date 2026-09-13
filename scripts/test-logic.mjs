// Teste real das funções de lógica implementadas
import { formatWhatsAppNumber, buildWhatsAppLink, maskPhoneBR } from '../src/utils/whatsappUtils.js';

console.log('--- TESTE 1: WhatsApp Formatting e Link Generation ---');

const testCasesPhone = [
  { input: '51985661499', expectedNum: '5551985661499' },
  { input: '(51) 98566-1499', expectedNum: '5551985661499' },
  { input: '5551985661499', expectedNum: '5551985661499' },
  { input: '+55 51 98566-1499', expectedNum: '5551985661499' },
  { input: '051985661499', expectedNum: '5551985661499' },
  { input: '5132221234', expectedNum: '555132221234' },
];

let allPassed = true;

for (const tc of testCasesPhone) {
  const formatted = formatWhatsAppNumber(tc.input);
  const link = buildWhatsAppLink(tc.input, 'Olá teste');
  const pass = formatted === tc.expectedNum && link.startsWith(`https://wa.me/${tc.expectedNum}`);
  console.log(`Input: "${tc.input}" -> Formatted: "${formatted}" | Link: ${link.substring(0, 35)}... [${pass ? 'PASS' : 'FAIL'}]`);
  if (!pass) allPassed = false;
}

console.log('\n--- TESTE 2: Máscara Telefônica Brasil (maskPhoneBR) ---');
const maskCases = [
  { input: '51985661499', expected: '(51) 98566-1499' },
  { input: '5132221234', expected: '(51) 3222-1234' },
];

for (const mc of maskCases) {
  const res = maskPhoneBR(mc.input);
  const pass = res === mc.expected;
  console.log(`Input: "${mc.input}" -> Mask: "${res}" [${pass ? 'PASS' : 'FAIL'}]`);
  if (!pass) allPassed = false;
}

import { isLocationMatch, isCategoryMatch } from '../src/utils/quoteStorage.js';

console.log('\n--- TESTE 3: Matching Regional de Orçamentos (isLocationMatch) ---');
const locationCases = [
  { quoteLoc: 'POA', quoteState: 'RS', bizCity: 'Porto Alegre', bizState: 'RS', expected: true, desc: 'POA vs Porto Alegre' },
  { quoteLoc: 'Porto Alegre', quoteState: 'RS', bizCity: 'poa', bizState: 'RS', expected: true, desc: 'Porto Alegre vs poa' },
  { quoteLoc: 'Porto Alegre', quoteState: 'RS', bizCity: 'Porto Alegre', bizState: 'RS', expected: true, desc: 'Porto Alegre vs Porto Alegre' },
  { quoteLoc: 'Canoas', quoteState: 'RS', bizCity: 'Porto Alegre', bizState: 'RS', expected: true, desc: 'Mesmo estado RS (Canoas vs Porto Alegre)' },
  { quoteLoc: 'São Paulo', quoteState: 'SP', bizCity: 'Porto Alegre', bizState: 'RS', expected: false, desc: 'São Paulo vs Porto Alegre (SP vs RS)' },
  { quoteLoc: 'Belo Horizonte', quoteState: 'MG', bizCity: 'BH', bizState: 'MG', expected: true, desc: 'Belo Horizonte vs BH' },
];

for (const lc of locationCases) {
  const biz = { city: lc.bizCity, state: lc.bizState };
  const quote = { city: lc.quoteLoc, state: lc.quoteState };
  const res = isLocationMatch(biz, quote);
  const pass = res === lc.expected;
  console.log(`${lc.desc} -> Result: ${res} [${pass ? 'PASS' : 'FAIL'}]`);
  if (!pass) allPassed = false;
}

console.log('\n--- TESTE 4: Matching de Categoria / Serviços (isCategoryMatch) ---');
const categoryCases = [
  { quoteCat: 'Troca de oleo motor', bizCat: 'Automotivo', expected: true, desc: 'Troca de oleo vs Automotivo' },
  { quoteCat: 'Conserto vazamento cano', bizCat: 'Hidráulica', expected: true, desc: 'Vazamento cano vs Hidráulica' },
  { quoteCat: 'Instalação de ar condicionado', bizCat: 'Climatização', expected: true, desc: 'Ar condicionado vs Climatização' },
  { quoteCat: 'Pintura de parede sala', bizCat: 'Pintura', expected: true, desc: 'Pintura de parede vs Pintura' },
  { quoteCat: 'Pintura', bizCat: 'Mecânica', expected: false, desc: 'Pintura vs Mecânica' },
];

for (const cc of categoryCases) {
  const res = isCategoryMatch(cc.bizCat, cc.quoteCat);
  const pass = res === cc.expected;
  console.log(`${cc.desc} -> Result: ${res} [${pass ? 'PASS' : 'FAIL'}]`);
  if (!pass) allPassed = false;
}

if (allPassed) {
  console.log('\n>>> TODOS OS TESTES UNITARIOS DE LÓGICA PASSARAM COM SUCESSO! <<<');
  process.exit(0);
} else {
  console.error('\n>>> ALGUNS TESTES FALHARAM! <<<');
  process.exit(1);
}
