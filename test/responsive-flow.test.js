import test from 'node:test';
import assert from 'node:assert/strict';
import {
  obtenerOpcionesProducto,
  obtenerStock,
} from '../src/lib/catalogo-stock.js';
import {
  buildProductWhatsAppMessage,
  resolverEstadoComercial,
  formatDeviceModel,
} from '../src/utils/whatsapp.js';

test('Flujo Desktop: cambio de modelo y color actualiza disponibilidad y WhatsApp', () => {
  const product = {
    id: 'funda-silicona',
    name: 'Funda de Silicona',
    price: 8000,
    category: 'fundas',
    variants: [
      { id: 'v1', modelId: 'm-ip15', model: 'Apple iPhone 15', color: 'Verde Agua', stock: 5, modality: 'stock' },
      { id: 'v2', modelId: 'm-ip15', model: 'Apple iPhone 15', color: 'Negro', stock: 0, modality: 'pedido' },
      { id: 'v3', modelId: 'm-sam-a15', model: 'Samsung Galaxy A15', color: 'Azul', stock: 2, modality: 'ambos' },
    ],
  };

  // 1. Estado inicial con variante 1 (iPhone 15 - Verde Agua)
  let selectedVariantState = { modelId: 'm-ip15', color: 'Verde Agua' };
  let options = obtenerOpcionesProducto(product, selectedVariantState);
  let stock = obtenerStock(product, options.selectedVariant);
  let estado = resolverEstadoComercial({ stock, modality: options.selectedVariant?.modality });

  assert.equal(estado, 'DISPONIBLE');
  let msg1 = buildProductWhatsAppMessage({
    productName: product.name,
    model: formatDeviceModel(options.models.find(m => m.id === options.selectedModelId)?.name),
    color: options.selectedColor,
    price: product.price,
    stock,
    modality: options.selectedVariant?.modality,
    commercialStatus: estado,
  });
  assert.match(msg1, /Funda de Silicona para iPhone 15, color Verde Agua/);
  assert.match(msg1, /¿Me confirmás si sigue disponible\?/);

  // 2. Cliente cambia a color Negro (por encargo / pedido)
  selectedVariantState = { modelId: 'm-ip15', color: 'Negro' };
  options = obtenerOpcionesProducto(product, selectedVariantState);
  stock = obtenerStock(product, options.selectedVariant);
  estado = resolverEstadoComercial({ stock, modality: options.selectedVariant?.modality });

  assert.equal(estado, 'POR_ENCARGO');
  let msg2 = buildProductWhatsAppMessage({
    productName: product.name,
    model: formatDeviceModel(options.models.find(m => m.id === options.selectedModelId)?.name),
    color: options.selectedColor,
    price: product.price,
    stock,
    modality: options.selectedVariant?.modality,
    commercialStatus: estado,
  });
  assert.match(msg2, /Funda de Silicona para iPhone 15, color Negro/);
  assert.match(msg2, /¿Se puede conseguir por encargo y cuánto demora aproximadamente\?/);

  // 3. Cliente cambia a Samsung Galaxy A15 (stock = 2, modality = 'ambos') -> DISPONIBLE
  selectedVariantState = { modelId: 'm-sam-a15', color: 'Azul' };
  options = obtenerOpcionesProducto(product, selectedVariantState);
  stock = obtenerStock(product, options.selectedVariant);
  estado = resolverEstadoComercial({ stock, modality: options.selectedVariant?.modality });

  assert.equal(estado, 'DISPONIBLE');
  let msg3 = buildProductWhatsAppMessage({
    productName: product.name,
    model: formatDeviceModel(options.models.find(m => m.id === options.selectedModelId)?.name),
    color: options.selectedColor,
    price: product.price,
    stock,
    modality: options.selectedVariant?.modality,
    commercialStatus: estado,
  });
  assert.match(msg3, /Funda de Silicona para Samsung Galaxy A15, color Azul/);
  assert.match(msg3, /¿Me confirmás si sigue disponible\?/);
});
