import { money } from './format.js';

/**
 * Normaliza y limpia el nombre del modelo del dispositivo para que suene natural.
 * Evita redundancias como "Apple iPhone 15" -> "iPhone 15".
 * @param {string} rawModel
 * @returns {string}
 */
export function formatDeviceModel(rawModel) {
  if (!rawModel || typeof rawModel !== 'string') return '';

  let cleaned = rawModel.trim();

  // Quitar puntos finales accidentales (ej: "iPhone 11." -> "iPhone 11")
  cleaned = cleaned.replace(/\.+$/, '');

  // Evitar "Apple iPhone" -> "iPhone"
  cleaned = cleaned.replace(/^Apple\s+iPhone\b/i, 'iPhone');

  // Evitar "Samsung Samsung" -> "Samsung"
  cleaned = cleaned.replace(/^Samsung\s+Samsung\b/i, 'Samsung');

  // Quitar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Agrega el artículo determinado en español según el tipo de producto si no lo tiene.
 * Ej: "Funda de Silicona" -> "la Funda de Silicona", "Vidrio 9D" -> "el Vidrio 9D".
 * @param {string} name
 * @returns {string}
 */
export function getProductWithArticle(name) {
  if (!name || typeof name !== 'string') return 'este producto';
  const trimmed = name.trim();

  // Si ya comienza con artículo determinado o indeterminado
  if (/^(el|la|los|las|un|una|unos|unas)\s+/i.test(trimmed)) {
    return trimmed;
  }

  // Femeninos habituales
  if (/^funda/i.test(trimmed)) {
    return `la ${trimmed}`;
  }

  // Masculinos habituales
  if (/^(vidrio|cargador|cable|combo|soporte|protector|adaptador|auricular)/i.test(trimmed)) {
    return `el ${trimmed}`;
  }

  // Plurales
  if (/^(accesorios|cables|auriculares|protectores)/i.test(trimmed)) {
    return `los ${trimmed}`;
  }

  return trimmed;
}

/**
 * Resuelve el estado comercial del producto respetando la lógica de stock e inventario.
 * IMPORTANTE:
 * - Si stock > 0: DISPONIBLE (independientemente de que la modalidad sea 'stock' o 'ambos').
 * - Si stock == 0 o null y modalidad permite pedido ('pedido' o 'ambos'): POR_ENCARGO.
 * - Si stock == 0 en modalidad exclusiva de stock o sin stock/datos: SIN_DISPONIBILIDAD.
 *
 * @param {Object} params
 * @param {number|null} params.stock
 * @param {string} params.modality
 * @returns {'DISPONIBLE' | 'POR_ENCARGO' | 'SIN_DISPONIBILIDAD'}
 */
export function resolverEstadoComercial({ stock, modality }) {
  const numericStock = stock !== null && stock !== undefined ? Number(stock) : null;

  // 1. DISPONIBLE si hay stock numérico real mayor a cero
  if (numericStock !== null && numericStock > 0) {
    return 'DISPONIBLE';
  }

  // 2. POR ENCARGO si no hay stock inmediato pero la modalidad permite encargo o ambos
  const normalizedModality = String(modality || '').trim().toLowerCase();
  if (normalizedModality === 'pedido' || normalizedModality === 'ambos') {
    return 'POR_ENCARGO';
  }

  // 3. SIN DISPONIBILIDAD
  return 'SIN_DISPONIBILIDAD';
}

/**
 * Genera el mensaje automático para WhatsApp según los 3 estados comerciales obligatorios:
 * 1. DISPONIBLE: Consulta disponibilidad ("¿Me confirmás si sigue disponible?").
 * 2. POR ENCARGO: Consulta si se puede conseguir por encargo y plazo de demora.
 * 3. SIN DISPONIBILIDAD: Consulta posibilidad de conseguirla.
 */
export function buildProductWhatsAppMessage({
  productName,
  model,
  color,
  price,
  promotionalPrice,
  stock,
  modality,
  commercialStatus,
}) {
  // Resuelve el estado comercial respetando la lógica de inventario
  const estado = commercialStatus || resolverEstadoComercial({ stock, modality });

  const cleanModel = formatDeviceModel(model);
  const cleanColor = color && color !== 'No aplica' && color !== 'Consultar colores'
    ? color.trim()
    : '';

  const itemDescription = `${getProductWithArticle(productName)}${cleanModel ? ` para ${cleanModel}` : ''}${
    cleanColor ? `, color ${cleanColor}` : ''
  }`;

  // Formato monetario sin espacios no rompientes para WhatsApp (ej: "$8.000")
  const formatPrice = (val) => money(val).replace(/\s+/g, '');
  const hasPromo = promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice < price;

  let priceLine = '';
  if (estado !== 'SIN_DISPONIBILIDAD' && (price || promotionalPrice)) {
    if (hasPromo) {
      priceLine = `• Precio en oferta: ${formatPrice(promotionalPrice)} (antes: ${formatPrice(price)})`;
    } else {
      priceLine = `• Precio: ${formatPrice(price || promotionalPrice)}`;
    }
  }

  let closingQuestion = '';
  if (estado === 'DISPONIBLE') {
    closingQuestion = '¿Me confirmás si sigue disponible? ¡Gracias!';
  } else if (estado === 'POR_ENCARGO') {
    closingQuestion = '¿Se puede conseguir por encargo y cuánto demora aproximadamente? ¡Gracias!';
  } else {
    // SIN DISPONIBILIDAD: concordancia gramatical ("conseguirla" / "conseguirlo")
    const withArticle = getProductWithArticle(productName);
    const isFeminine = /^la\s+/i.test(withArticle);
    const isPlural = /^(los|las)\s+/i.test(withArticle);
    const pronoun = isPlural ? (isFeminine ? 'conseguirlas' : 'conseguirlos') : (isFeminine ? 'conseguirla' : 'conseguirlo');
    closingQuestion = `¿Hay posibilidad de ${pronoun}? ¡Gracias!`;
  }

  const lines = [
    '¡Hola LEONTEK STORE!',
    '',
    `Quería consultar por ${itemDescription}.`,
  ];

  if (priceLine) {
    lines.push(priceLine);
  }

  lines.push('');
  lines.push(closingQuestion);

  return lines.join('\n');
}

/**
 * Genera el mensaje para consultar por un combo promocional respetando su disponibilidad.
 */
export function buildComboWhatsAppMessage({ comboName, price, componentSummary, isAvailable = true }) {
  const formatPrice = (val) => money(val).replace(/\s+/g, '');
  const priceLine = isAvailable && price ? `• Precio: ${formatPrice(price)}` : '';
  const componentsLine = componentSummary ? `• Incluye: ${componentSummary}` : '';

  const lines = [
    '¡Hola LEONTEK STORE!',
    '',
    `Quería consultar por el combo "${comboName}":`,
  ];

  if (componentsLine) lines.push(componentsLine);
  if (priceLine) lines.push(priceLine);

  lines.push('');

  if (isAvailable) {
    lines.push('¿Me confirmás si sigue disponible? ¡Gracias!');
  } else {
    lines.push('¿Hay posibilidad de conseguirlo o armarlo? ¡Gracias!');
  }

  return lines.join('\n');
}

/**
 * Mensaje general de contacto para consultas de catálogo.
 */
export function buildGeneralWhatsAppMessage() {
  return '¡Hola LEONTEK STORE! Quería hacerles una consulta sobre accesorios para mi celular.';
}
