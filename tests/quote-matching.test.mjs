import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isCategoryMatch, isLocationMatch, isQuoteMatchingBusiness } from '../src/utils/quoteStorage.js';

describe('Validação Funcional dos Algoritmos de Regra de Negócio do EconomizaJá', () => {

  test('1. Matching de Localização: deve permitir cidades iguais ou da mesma região metropolitana', () => {
    // Mesma cidade
    assert.strictEqual(
      isLocationMatch({ city: 'Porto Alegre', state: 'RS' }, { city: 'Porto Alegre', state: 'RS' }),
      true,
      'Mesma cidade deve bater'
    );

    // Bairro conhecido da capital
    assert.strictEqual(
      isLocationMatch({ city: 'Porto Alegre', state: 'RS' }, { city: 'Morro Santana', state: 'RS' }),
      true,
      'Bairro como Morro Santana em Porto Alegre deve bater'
    );

    // Mesmo estado deve permitir atendimento regional
    assert.strictEqual(
      isLocationMatch({ city: 'Canoas', state: 'RS' }, { city: 'Porto Alegre', state: 'RS' }),
      true,
      'Empresa no mesmo estado deve ser elegível ao atendimento regional'
    );
  });

  test('2. Matching de Categorias e Segmentos', () => {
    // Categoria idêntica
    assert.strictEqual(isCategoryMatch('automotivo', 'automotivo'), true);

    // Aliases automotivos
    assert.strictEqual(isCategoryMatch('Mecânica em Geral', 'automotivo'), true);
    assert.strictEqual(isCategoryMatch('Troca de Óleo', 'auto'), true);

    // Aliases casa & serviços
    assert.strictEqual(isCategoryMatch('casa', 'reforma'), true);
    assert.strictEqual(isCategoryMatch('Eletricista Residencial', 'casa'), true);

    // Categorias distintas
    assert.strictEqual(isCategoryMatch('alimentacao', 'automotivo'), false);
  });

  test('3. Matching Completo de Orçamento Regional (isQuoteMatchingBusiness)', () => {
    const biz = {
      categoryId: 'automotivo',
      city: 'Porto Alegre',
      state: 'RS',
      neighborhood: 'São Geraldo'
    };

    const regionalQuoteMatch = {
      categoryId: 'automotivo',
      city: 'Porto Alegre',
      state: 'RS',
      neighborhood: 'Centro'
    };

    assert.strictEqual(
      isQuoteMatchingBusiness(regionalQuoteMatch, biz),
      true,
      'Orçamento regional da mesma cidade e categoria deve ser visível para o parceiro'
    );

    const differentCategoryQuote = {
      categoryId: 'beleza',
      city: 'Porto Alegre',
      state: 'RS',
    };

    assert.strictEqual(
      isQuoteMatchingBusiness(differentCategoryQuote, biz),
      false,
      'Orçamento de categoria diferente NÃO deve ser entregue à empresa automotiva'
    );
  });
});
