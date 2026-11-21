import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Branding: index.html has complete favicon and manifest declarations', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert.match(indexHtml, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg\?v=2"/);
  assert.match(indexHtml, /<link rel="icon" type="image\/x-icon" href="\/favicon\.ico\?v=2"/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png\?v=2"/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="16x16" href="\/favicon-16x16\.png\?v=2"/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="192x192" href="\/favicon-192\.png\?v=2"/);
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="512x512" href="\/favicon-512\.png\?v=2"/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png\?v=2"/);
  assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.json"/);
});

test('Branding: Public favicon and PWA assets exist and have valid sizes', () => {
  const files = [
    { file: 'public/favicon.ico', minSize: 1000 },
    { file: 'public/favicon.svg', minSize: 1000 },
    { file: 'public/favicon-16x16.png', minSize: 500 },
    { file: 'public/favicon-32x32.png', minSize: 1000 },
    { file: 'public/favicon-48x48.png', minSize: 1500 },
    { file: 'public/favicon-192.png', minSize: 10000 },
    { file: 'public/favicon-512.png', minSize: 50000 },
    { file: 'public/apple-touch-icon.png', minSize: 10000 },
    { file: 'public/manifest.json', minSize: 100 },
  ];

  for (const { file, minSize } of files) {
    assert.ok(fs.existsSync(file), `Archivo inexistente: ${file}`);
    const stat = fs.statSync(file);
    assert.ok(stat.size >= minSize, `Archivo ${file} es demasiado pequeño (${stat.size} bytes < ${minSize})`);
  }
});

test('Branding: Header and Footer both use the official LT logo image', () => {
  const header = fs.readFileSync('src/components/Header.jsx', 'utf8');
  const footer = fs.readFileSync('src/components/Footer.jsx', 'utf8');

  assert.match(header, /import leontekLogo from '\.\.\/assets\/leontek-logo\.webp'/);
  assert.match(header, /className="brand-logo-header"/);
  assert.doesNotMatch(header, /<Smartphone/);

  assert.match(footer, /import leontekLogo from '\.\.\/assets\/leontek-logo\.webp'/);
  assert.match(footer, /className="brand-logo-footer"/);
  assert.doesNotMatch(footer, /brand-mark/);
});

test('Branding: All WhatsApp action triggers use WhatsAppIcon instead of MessageCircle', () => {
  const header = fs.readFileSync('src/components/Header.jsx', 'utf8');
  const hero = fs.readFileSync('src/components/Hero.jsx', 'utf8');
  const howToBuy = fs.readFileSync('src/components/HowToBuy.jsx', 'utf8');
  const productCard = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');
  const productModal = fs.readFileSync('src/components/ProductOptionsModal.jsx', 'utf8');
  const comboCard = fs.readFileSync('src/components/ComboCard.jsx', 'utf8');
  const contactCard = fs.readFileSync('src/components/ContactCard.jsx', 'utf8');

  // Header WhatsApp CTA
  assert.match(header, /header-whatsapp-cta[\s\S]*?<WhatsAppIcon/);

  // Hero WhatsApp CTA
  assert.match(hero, /hero-btn-secondary[\s\S]*?<WhatsAppIcon/);

  // HowToBuy WhatsApp CTA
  assert.match(howToBuy, /order-whatsapp-btn[\s\S]*?<WhatsAppIcon/);

  // ProductCard Desktop & Mobile CTA
  assert.match(productCard, /buttonStockClass}[\s\S]*?<WhatsAppIcon/);
  assert.match(productCard, /product-card-cta[\s\S]*?<WhatsAppIcon/);

  // ProductOptionsModal CTA
  assert.match(productModal, /buttonStockClass}[\s\S]*?<WhatsAppIcon/);

  // ComboCard CTA
  assert.match(comboCard, /product-cta product-cta-in-stock[\s\S]*?<WhatsAppIcon/);

  // ContactCard CTA
  assert.match(contactCard, /contact-whatsapp-btn[\s\S]*?<WhatsAppIcon/);
});

test('Branding: No emojis used as interface placeholder symbols', () => {
  const productCard = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');
  const productModal = fs.readFileSync('src/components/ProductOptionsModal.jsx', 'utf8');

  assert.doesNotMatch(productCard, /'⚡'/);
  assert.doesNotMatch(productModal, /'⚡'/);
  assert.doesNotMatch(productCard, /'L'/);
  assert.doesNotMatch(productModal, /'L'/);
});

test('WhatsApp Audit: Centralized phone number and URL encoding across all components', () => {
  const constants = fs.readFileSync('src/constants/index.js', 'utf8');
  assert.match(constants, /WHATSAPP_NUMBER = '5493777417531'/);

  const productCard = fs.readFileSync('src/components/ProductCard.jsx', 'utf8');
  const comboCard = fs.readFileSync('src/components/ComboCard.jsx', 'utf8');
  const app = fs.readFileSync('src/App.jsx', 'utf8');

  assert.match(productCard, /encodeURIComponent\(message\)/);
  assert.match(comboCard, /encodeURIComponent\(message\)/);
  assert.match(app, /encodeURIComponent\(generalWhatsAppText\)/);
  assert.match(app, /encodeURIComponent\(adviceWhatsAppText\)/);
});
