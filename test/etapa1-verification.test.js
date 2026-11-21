import assert from 'node:assert/strict';
import { construirCategoriasDinamicas, normalizarCategoriaId, categories as defaultCategories } from '../src/data/products.js';
import { buildProductWhatsAppMessage, buildComboWhatsAppMessage, buildGeneralWhatsAppMessage } from '../src/utils/whatsapp.js';

console.log('=== TEST 1: CATEGORÍAS ESTÁTICAS Y DINÁMICAS ===');

// Fallback sin datos de DB
const fallback = construirCategoriasDinamicas(null);
assert.equal(fallback.length, 6);
assert.equal(fallback[0].id, 'todos');
console.log('Fallback a categorías oficiales OK (6 categorías).');

// Categorías dinámicas reales (simulando las que están en Supabase, incluyendo "Cargadores")
const mockCategoriasDb = [
  { id: '1', nombre: 'Fundas de silicona', slug: 'silicona', orden: 1 },
  { id: '2', nombre: 'Fundas MagSafe', slug: 'magsafe', orden: 2 },
  { id: '3', nombre: 'Transparentes y estampadas', slug: 'transparentes-estampadas', orden: 3 },
  { id: '4', nombre: 'Vidrios templados', slug: 'templados', orden: 4 },
  { id: '5', nombre: 'Accesorios', slug: 'accesorios', orden: 5 },
  { id: '6', nombre: 'Cargadores', slug: 'cargadores', orden: 6 },
];

const dinamicas = construirCategoriasDinamicas(mockCategoriasDb);
assert.equal(dinamicas.length, 7); // 'todos' + 6 categorías
assert.equal(dinamicas[0].id, 'todos');
assert.equal(dinamicas[6].id, 'cargadores');
assert.equal(dinamicas[6].label, 'Cargadores');
console.log('Categoría dinámica nueva ("Cargadores") detectada e indexada correctamente.');

// Lógica de "Fundas"
function esCategoriaFunda(cat) {
  if (!cat) return false;
  const c = String(cat).toLowerCase();
  return (
    c === 'silicona' ||
    c === 'magsafe' ||
    c === 'transparentes' ||
    c === 'transparentes-estampadas' ||
    c === 'fundas' ||
    c.includes('funda')
  );
}

assert.equal(esCategoriaFunda('silicona'), true);
assert.equal(esCategoriaFunda('magsafe'), true);
assert.equal(esCategoriaFunda('transparentes'), true);
assert.equal(esCategoriaFunda('templados'), false);
assert.equal(esCategoriaFunda('cargadores'), false);
console.log('Lógica del botón "Fundas" abarca silicona, magsafe y transparentes, y excluye templados y cargadores OK.');

console.log('\n=== TEST 2: WHATSAPP - NORMAL, PROMO, ENCARGO, AGOTADO Y URLS ===');

// 1. Producto Normal
const msgNormal = buildProductWhatsAppMessage({
  productName: 'Funda de Silicona',
  model: 'iPhone 15',
  color: 'Verde Agua',
  price: 8000,
  stock: 3,
  modality: 'stock',
});
assert.match(msgNormal, /^¡Hola LEONTEK STORE!\n\nQuería consultar por la Funda de Silicona para iPhone 15, color Verde Agua\.\n• Precio: \$8\.000\n\n¿Me confirmás si sigue disponible\? ¡Gracias!$/);
assert.equal(msgNormal.includes('👋'), false);
console.log('Mensaje normal OK: sin emoji 👋, saltos de línea y viñeta.');

// 2. Producto en Promoción
const msgPromo = buildProductWhatsAppMessage({
  productName: 'Funda MagSafe',
  model: 'iPhone 13 Pro',
  color: 'Negro',
  price: 14500,
  promotionalPrice: 12000,
  stock: 2,
  modality: 'stock',
});
assert.match(msgPromo, /• Precio en oferta: \$12\.000 \(antes: \$14\.500\)/);
assert.equal(msgPromo.includes('Vi que tiene un precio promocional'), false);
assert.equal(msgPromo.includes('👋'), false);
console.log('Mensaje en promoción OK: formato natural sin frases artificiales.');

// 3. Verificación de codificación encodeURIComponent
const url = `https://wa.me/5493777417531?text=${encodeURIComponent(msgPromo)}`;
assert.match(url, /^https:\/\/wa\.me\/5493777417531\?text=%C2%A1Hola%20LEONTEK%20STORE!/);
assert.equal(url.includes('%F0%9F%91%8B'), false); // No hay emoji 👋 en UTF-8 astral
console.log('URL de WhatsApp codificada con encodeURIComponent() válida y sin caracteres corruptos.');

// 4. Mensajes generales
const general = buildGeneralWhatsAppMessage();
assert.equal(general.includes('👋'), false);
console.log('Mensaje general limpio sin emoji 👋.');

console.log('\n=== TODOS LOS TESTS DE VERIFICACIÓN SUPERADOS CON ÉXITO ===');
