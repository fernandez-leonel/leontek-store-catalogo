import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularDisponibilidadCombo,
  calcularPrecioPromocional,
  resolverPromocion,
} from './ofertas.js';

test('calculates promotion types without changing the base price', () => {
  assert.equal(calcularPrecioPromocional(10000, { tipo: 'porcentaje', valor: 15 }), 8500);
  assert.equal(calcularPrecioPromocional(10000, { tipo: 'importe_fijo', valor: 1200 }), 8800);
  assert.equal(calcularPrecioPromocional(10000, { tipo: 'precio_especial', valor: 7500 }), 7500);
  assert.equal(calcularPrecioPromocional(500, { tipo: 'importe_fijo', valor: 800 }), 0);
  assert.throws(() => calcularPrecioPromocional(1000, { tipo: 'porcentaje', valor: 101 }), /100%/);
});

test('resolves one in-date promotion by priority then scope specificity', () => {
  const product = { id: 'p1', categoryId: 'c1', price: 1000 };
  const promotions = [
    { id: 'future', estado: 'programada', alcance: 'general', tipo: 'porcentaje', valor: 80, inicia_at: '2026-11-04T00:00:00Z', productIds: [], categoryIds: [] },
    { id: 'general', estado: 'activa', alcance: 'general', tipo: 'porcentaje', valor: 10, prioridad: 2, inicia_at: '2026-11-01T00:00:00Z', productIds: [], categoryIds: [] },
    { id: 'product', estado: 'activa', alcance: 'productos', tipo: 'importe_fijo', valor: 200, prioridad: 2, inicia_at: '2026-11-01T00:00:00Z', productIds: ['p1'], categoryIds: [] },
    { id: 'expired', estado: 'activa', alcance: 'productos', tipo: 'porcentaje', valor: 99, inicia_at: '2026-11-01T00:00:00Z', finaliza_at: '2026-11-02T00:00:00Z', productIds: ['p1'], categoryIds: [] },
  ];
  const result = resolverPromocion(promotions, product, '2026-11-03T12:00:00Z');
  assert.equal(result.id, 'product');
  assert.equal(result.precioPromocional, 800);
  assert.equal(resolverPromocion([], product, '2026-11-03T12:00:00Z'), null);
});

test('combo availability is limited by the actual component destination stock', () => {
  assert.equal(calcularDisponibilidadCombo([
    { varianteId: 'v1', inventarioId: null, cantidad: 2, stock: 5 },
    { varianteId: null, inventarioId: 'g1', cantidad: 1, stock: 3 },
  ]), 2);
  assert.equal(calcularDisponibilidadCombo([
    { varianteId: 'v1', inventarioId: 'g1', cantidad: 1, stock: 8 },
  ]), 0);
  assert.equal(calcularDisponibilidadCombo([]), 0);
});
