import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esVidrioTemplado,
  obtenerInventarioTotalProducto,
  obtenerDisponibilidad,
  obtenerOpcionesProducto,
  obtenerStock,
  obtenerStockCompartidoParaModelo,
} from './catalogo-stock.js';

test('recognizes tempered-glass categories by name or slug', () => {
  assert.equal(esVidrioTemplado({ nombre: 'Protector vidrio HD', slug: 'protector-hd' }), true);
  assert.equal(esVidrioTemplado({ nombre: 'Protector HD', slug: 'vidrio-templado-hd' }), true);
  assert.equal(esVidrioTemplado({ nombre: 'Fundas', slug: 'fundas' }), false);
});

test('sums compatible inventory groups for the same model', () => {
  const groups = [
    { id: 'group-1', productId: 'glass-a', stock: 7, modality: 'stock', modelIds: ['iphone-13', 'iphone-13-pro', 'iphone-14', 'iphone-14-pro'] },
    { id: 'group-2', productId: 'glass-a', stock: 9, modality: 'stock', modelIds: ['iphone-13', 'iphone-13-pro'] },
    { id: 'group-3', productId: 'glass-a', stock: 4, modality: 'stock', modelIds: ['iphone-15'] },
  ];

  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-13', groups).stock, 16);
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-13-pro', groups).stock, 16);
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-14', groups).stock, 7);
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-14-pro', groups).stock, 7);
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-15', groups).stock, 4);
});

test('returns no stock amount for products or models without matching groups', () => {
  const groups = [
    { id: 'group-1', productId: 'glass-a', stock: 7, modality: 'stock', modelIds: ['iphone-13'] },
    { id: 'group-2', productId: 'glass-a', stock: 11, modality: 'stock', modelIds: [] },
  ];
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', 'iphone-14', groups).stock, null);
  assert.equal(obtenerStockCompartidoParaModelo('glass-a', null, groups).stock, null);
  assert.equal(obtenerStockCompartidoParaModelo('glass-empty', 'iphone-13', groups).stock, null);
  assert.equal(obtenerDisponibilidad(null, 'stock').status, 'Consultar disponibilidad');
});

test('counts a matching inventory group once even if its model link is duplicated', () => {
  const duplicatedMembership = [
    { id: 'group-1', productId: 'glass-a', stock: 7, modality: 'stock', modelIds: ['iphone-13'] },
    { id: 'group-1', productId: 'glass-a', stock: 7, modality: 'stock', modelIds: ['iphone-13'] },
    { id: 'group-2', productId: 'glass-a', stock: 9, modality: 'stock', modelIds: ['iphone-13'] },
  ];

  const result = obtenerStockCompartidoParaModelo('glass-a', 'iphone-13', duplicatedMembership);
  assert.equal(result.stock, 16);
  assert.equal(result.groups.length, 2);
});

test('keeps inventory independent by product ID', () => {
  const groups = [
    { id: 'group-a', productId: 'glass-a', stock: 7, modality: 'stock', modelIds: ['iphone-13'] },
    { id: 'group-b', productId: 'glass-b', stock: 9, modality: 'stock', modelIds: ['iphone-13'] },
  ];
  const productA = { id: 'glass-a', isTemperedGlass: true, inventoryGroups: groups };
  const productB = { id: 'glass-b', isTemperedGlass: true, inventoryGroups: groups };

  assert.equal(obtenerStock(productA, { productId: 'glass-a', modelId: 'iphone-13' }), 7);
  assert.equal(obtenerStock(productB, { productId: 'glass-b', modelId: 'iphone-13' }), 9);
  assert.equal(obtenerStock(productA, { productId: 'glass-b', modelId: 'iphone-13' }), null);
  assert.equal(obtenerInventarioTotalProducto('glass-a', groups).stock, 7);
  assert.equal(obtenerInventarioTotalProducto('glass-b', groups).stock, 9);
});

test('keeps stock independent for non-glass model variants', () => {
  const product = { id: 'case', isTemperedGlass: false };

  assert.equal(obtenerStock(product, { stock: 3 }), 3);
  assert.equal(obtenerStock(product, { stock: 7 }), 7);
});

test('preserves funda models, per-model colors, and independent variant stock', () => {
  const product = {
    id: 'silicone-case',
    isTemperedGlass: false,
    variants: [
      { id: 'variant-13-black', modelId: 'iphone-13', model: 'Apple iPhone 13', color: 'Negro', stock: 4, modality: 'ambos' },
      { id: 'variant-13-blue', modelId: 'iphone-13', model: 'Apple iPhone 13', color: 'Azul', stock: 2, modality: 'stock' },
      { id: 'variant-14-black', modelId: 'iphone-14', model: 'Apple iPhone 14', color: 'Negro', stock: 7, modality: 'stock' },
    ],
    inventoryGroups: [],
  };

  const defaultOptions = obtenerOpcionesProducto(product);
  assert.deepEqual(defaultOptions.models, [
    { id: 'iphone-13', name: 'Apple iPhone 13' },
    { id: 'iphone-14', name: 'Apple iPhone 14' },
  ]);
  assert.deepEqual(defaultOptions.colors, ['Negro', 'Azul']);
  assert.equal(defaultOptions.selectedVariant.id, 'variant-13-black');
  assert.equal(obtenerStock(product, defaultOptions.selectedVariant), 4);
  assert.equal(obtenerDisponibilidad(4, defaultOptions.selectedVariant.modality).status, 'Disponible · 4 en stock');

  const otherModel = obtenerOpcionesProducto(product, { modelId: 'iphone-14' });
  assert.deepEqual(otherModel.colors, ['Negro']);
  assert.equal(otherModel.selectedVariant.id, 'variant-14-black');
  assert.equal(obtenerStock(product, otherModel.selectedVariant), 7);
});

test('does not fabricate variants, colors, or stock when normal product data is absent', () => {
  const options = obtenerOpcionesProducto({
    id: 'case-empty',
    isTemperedGlass: false,
    variants: [],
    inventoryGroups: [],
  });

  assert.deepEqual(options.models, []);
  assert.deepEqual(options.colors, []);
  assert.equal(options.selectedVariant, null);
});

test('uses inventory groups and no colors for tempered glass products', () => {
  const product = {
    id: 'glass-a',
    isTemperedGlass: true,
    variants: [],
    inventoryGroups: [
      {
        id: 'group-1',
        productId: 'glass-a',
        stock: 7,
        modality: 'stock',
        models: [{ id: 'iphone-13', name: 'Apple iPhone 13' }],
        modelIds: ['iphone-13'],
      },
      {
        id: 'group-2',
        productId: 'glass-a',
        stock: 9,
        modality: 'stock',
        models: [{ id: 'iphone-13', name: 'Apple iPhone 13' }],
        modelIds: ['iphone-13'],
      },
    ],
  };
  const options = obtenerOpcionesProducto(product);

  assert.deepEqual(options.models, [{ id: 'iphone-13', name: 'Apple iPhone 13' }]);
  assert.deepEqual(options.colors, []);
  assert.equal(options.selectedVariant.stock, 16);
  assert.equal(obtenerStock(product, options.selectedVariant), 16);
});

test('interprets stock-only, stock-and-order, and order-only modalities', () => {
  assert.equal(obtenerDisponibilidad(0, 'stock').status, 'Sin stock');
  assert.equal(obtenerDisponibilidad(0, 'stock').action, 'Consultar reposición');
  assert.equal(obtenerDisponibilidad(2, 'ambos').status, 'Disponible · 2 en stock');
  assert.equal(obtenerDisponibilidad(0, 'ambos').action, 'Consultar por encargo');
  assert.equal(obtenerDisponibilidad(0, 'pedido').status, 'Por pedido');
  assert.equal(obtenerDisponibilidad(0, 'pedido').available, true);
});
