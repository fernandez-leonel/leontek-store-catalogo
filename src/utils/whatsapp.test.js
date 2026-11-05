import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDeviceModel,
  getProductWithArticle,
  resolverEstadoComercial,
  buildProductWhatsAppMessage,
  buildComboWhatsAppMessage,
} from './whatsapp.js';

test('formatDeviceModel cleans redundant brand prefixes and trailing punctuation', () => {
  assert.equal(formatDeviceModel('Apple iPhone 15'), 'iPhone 15');
  assert.equal(formatDeviceModel('Apple iPhone 15 Pro Max'), 'iPhone 15 Pro Max');
  assert.equal(formatDeviceModel('iPhone 11.'), 'iPhone 11');
  assert.equal(formatDeviceModel('Samsung Galaxy A15'), 'Samsung Galaxy A15');
  assert.equal(formatDeviceModel('Motorola G54'), 'Motorola G54');
});

test('getProductWithArticle prepends proper grammatical articles', () => {
  assert.equal(getProductWithArticle('Funda de Silicona'), 'la Funda de Silicona');
  assert.equal(getProductWithArticle('la Funda de Silicona'), 'la Funda de Silicona');
  assert.equal(getProductWithArticle('Vidrio templado 9D'), 'el Vidrio templado 9D');
  assert.equal(getProductWithArticle('Cargador 20W USB-C'), 'el Cargador 20W USB-C');
});

test('resolverEstadoComercial prioritizes real stock over modality', () => {
  // Caso 1: Con stock real > 0 es siempre DISPONIBLE (incluso con modalidad 'ambos')
  assert.equal(resolverEstadoComercial({ stock: 4, modality: 'ambos' }), 'DISPONIBLE');
  assert.equal(resolverEstadoComercial({ stock: 1, modality: 'stock' }), 'DISPONIBLE');

  // Caso 2: Sin stock inmediato pero con modalidad 'pedido' o 'ambos' es POR_ENCARGO
  assert.equal(resolverEstadoComercial({ stock: 0, modality: 'ambos' }), 'POR_ENCARGO');
  assert.equal(resolverEstadoComercial({ stock: 0, modality: 'pedido' }), 'POR_ENCARGO');
  assert.equal(resolverEstadoComercial({ stock: null, modality: 'pedido' }), 'POR_ENCARGO');

  // Caso 3: Sin stock en modalidad exclusiva de stock directo o sin datos es SIN_DISPONIBILIDAD
  assert.equal(resolverEstadoComercial({ stock: 0, modality: 'stock' }), 'SIN_DISPONIBILIDAD');
  assert.equal(resolverEstadoComercial({ stock: null, modality: 'stock' }), 'SIN_DISPONIBILIDAD');
  assert.equal(resolverEstadoComercial({ stock: null, modality: null }), 'SIN_DISPONIBILIDAD');
});

test('Estado 1: DISPONIBLE genera el mensaje de consulta de disponibilidad obligatorio', () => {
  // Caso real reportado: Funda de Silicona, iPhone 15, 46 verde agua, $8.000, DISPONIBLE
  const message = buildProductWhatsAppMessage({
    productName: 'Funda de Silicona',
    model: 'Apple iPhone 15',
    color: '46 verde agua',
    price: 8000,
    stock: 4,
    modality: 'ambos',
  });

  const expected =
    '¡Hola LEONTEK STORE! 👋 Quería consultar por la Funda de Silicona para iPhone 15, color 46 verde agua. Vi que tiene un precio publicado de $8.000. ¿Me confirmás si sigue disponible? ¡Gracias!';

  assert.equal(message, expected);
});

test('Estado 2: POR ENCARGO genera el mensaje específico de encargo y demora obligatorio', () => {
  const message = buildProductWhatsAppMessage({
    productName: 'Funda de Silicona',
    model: 'iPhone 15',
    color: '46 verde agua',
    price: 8000,
    stock: 0,
    modality: 'ambos',
  });

  const expected =
    '¡Hola LEONTEK STORE! 👋 Quería consultar por la Funda de Silicona para iPhone 15, color 46 verde agua. Vi que tiene un precio publicado de $8.000. ¿Se puede conseguir por encargo y cuánto demora aproximadamente? ¡Gracias!';

  assert.equal(message, expected);
});

test('Estado 3: SIN DISPONIBILIDAD genera el mensaje de consulta de posibilidad obligatorio', () => {
  const message = buildProductWhatsAppMessage({
    productName: 'Funda de Silicona',
    model: 'iPhone 15',
    color: '46 verde agua',
    price: 8000,
    stock: 0,
    modality: 'stock',
  });

  const expected =
    '¡Hola LEONTEK STORE! 👋 Quería consultar por la Funda de Silicona para iPhone 15, color 46 verde agua. ¿Hay posibilidad de conseguirla? ¡Gracias!';

  assert.equal(message, expected);
});

test('Combos WhatsApp message formats correctly according to availability', () => {
  const availableMessage = buildComboWhatsAppMessage({
    comboName: 'Dúo Protección',
    price: 15000,
    componentSummary: 'Funda MagSafe x1, Vidrio 9D x1',
    isAvailable: true,
  });

  assert.equal(
    availableMessage,
    '¡Hola LEONTEK STORE! 👋 Quería consultar por el combo "Dúo Protección" (Funda MagSafe x1, Vidrio 9D x1), publicado en $15.000. ¿Me confirmás si sigue disponible? ¡Gracias!'
  );

  const unavailableMessage = buildComboWhatsAppMessage({
    comboName: 'Dúo Protección',
    price: 15000,
    componentSummary: 'Funda MagSafe x1, Vidrio 9D x1',
    isAvailable: false,
  });

  assert.equal(
    unavailableMessage,
    '¡Hola LEONTEK STORE! 👋 Quería consultar por el combo "Dúo Protección" (Funda MagSafe x1, Vidrio 9D x1). ¿Hay posibilidad de conseguirlo o armarlo? ¡Gracias!'
  );
});
