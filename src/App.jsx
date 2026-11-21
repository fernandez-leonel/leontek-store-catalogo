import { useMemo, useState } from 'react';
import { categories as defaultCategories } from './data/products.js';
import { resolverPromocion } from './lib/ofertas.js';
import { useCatalog } from './hooks/useCatalog.js';
import { WHATSAPP_NUMBER, INSTAGRAM_URL } from './constants/index.js';

import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import CategoryBar from './components/CategoryBar.jsx';
import CatalogGrid from './components/CatalogGrid.jsx';
import HowToBuy from './components/HowToBuy.jsx';
import ContactCard from './components/ContactCard.jsx';
import Footer from './components/Footer.jsx';
import ImageModal from './components/ImageModal.jsx';

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

function App() {
  const [category, setCategory] = useState('todos');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({});

  const {
    products,
    categories: dynamicCategories,
    offers,
    offersError,
    catalogLoading,
    catalogError,
  } = useCatalog();

  const categories = useMemo(
    () => (dynamicCategories && dynamicCategories.length ? dynamicCategories : defaultCategories),
    [dynamicCategories]
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          category === 'todos' ||
          (category === 'fundas'
            ? esCategoriaFunda(product.category)
            : product.category === category);
        const searchText = `${product.name} ${product.description} ${product.models} ${product.colors}`.toLowerCase();
        return matchesCategory && searchText.includes(search.toLowerCase().trim());
      }),
    [products, category, search]
  );

  const promotionsByProduct = useMemo(
    () =>
      new Map(
        products.map((product) => [product.id, resolverPromocion(offers.promotions, product)])
      ),
    [products, offers.promotions]
  );

  const whatsappReady = /^\d{10,15}$/.test(WHATSAPP_NUMBER);
  const generalWhatsAppText = '¡Hola LEONTEK STORE! Quería hacerles una consulta sobre accesorios para mi celular.';
  const generalWhatsAppLink = whatsappReady
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(generalWhatsAppText)}`
    : `https://wa.me/?text=${encodeURIComponent(generalWhatsAppText)}`;

  const adviceWhatsAppText = '¡Hola LEONTEK STORE! Me gustaría recibir asesoramiento para elegir la funda o vidrio templado ideal para mi celular.';
  const adviceWhatsAppLink = whatsappReady
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adviceWhatsAppText)}`
    : `https://wa.me/?text=${encodeURIComponent(adviceWhatsAppText)}`;

  const updateProductSelection = (product, change) => {
    setSelectedVariants((previous) => ({
      ...previous,
      [product.id]: { ...previous[product.id], ...change },
    }));
  };

  const handleSelectCategoryQuickLink = (targetCat) => {
    if (targetCat === 'fundas') {
      setCategory('fundas');
    } else if (targetCat === 'templados') {
      setCategory('templados');
    } else {
      setCategory(targetCat);
    }
    const catalogEl = document.getElementById('catalogo');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigateCombos = () => {
    const combosEl = document.getElementById('combos') || document.getElementById('catalogo');
    if (combosEl) {
      combosEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAskAdvice = () => {
    window.open(adviceWhatsAppLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="site-shell">
      <Header
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        whatsappUrl={generalWhatsAppLink}
      />

      <main>
        <Hero whatsappUrl={generalWhatsAppLink} />

        <CategoryBar
          onSelectCategory={handleSelectCategoryQuickLink}
          onNavigateCombos={handleNavigateCombos}
          onAskAdvice={handleAskAdvice}
        />

        <CatalogGrid
          categories={categories}
          category={category}
          setCategory={setCategory}
          search={search}
          setSearch={setSearch}
          products={products}
          visibleProducts={visibleProducts}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          offers={offers}
          offersError={offersError}
          promotionsByProduct={promotionsByProduct}
          selectedVariants={selectedVariants}
          onUpdateProductSelection={updateProductSelection}
          onImageClick={setSelectedImage}
          whatsappNumber={WHATSAPP_NUMBER}
        />

        <HowToBuy whatsappUrl={generalWhatsAppLink} />

        <ContactCard
          whatsappUrl={generalWhatsAppLink}
          instagramUrl={INSTAGRAM_URL}
        />
      </main>

      <ImageModal
        selectedImage={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <Footer />
    </div>
  );
}

export default App;
