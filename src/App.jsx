
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { categories } from './data/products.js';
import { obtenerCatalogo } from './services/catalogo.service.js';

// IMPORTANTE:
// Reemplazá las X por tu número de WhatsApp.
// Argentina: 549 + característica + número, sin +, espacios ni guiones.
const WHATSAPP_NUMBER = '549xxxxxxxxxx';
const INSTAGRAM_URL = 'https://www.instagram.com/leontek_store/';

function money(value) {
  if (value === null || value === undefined || value === '') {
    return 'Consultar precio';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductImage({ product, onImageClick }) {
  const [failed, setFailed] = useState(false);

  if (product.image && !failed) {
    return (
      <button
        type="button"
        className="product-image-trigger"
        onClick={() => onImageClick({ src: product.image, alt: product.name })}
        aria-label={`Ampliar imagen de ${product.name}`}
        title="Tocá para ampliar la imagen"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'zoom-in',
        }}
      >
        <img
          className="product-image"
          src={product.image}
          alt={product.name}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      </button>
    );
  }

  return (
    <div className={`image-placeholder placeholder-${product.category}`}>
      <div className="placeholder-symbol">
        {product.category === 'templados'
          ? '9H'
          : product.category === 'magsafe'
            ? '◉'
            : product.category === 'accesorios'
              ? '⚡'
              : 'L'}
      </div>
      <span>Tu foto va acá</span>
    </div>
  );
}

function InstagramIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function App() {
  const [category, setCategory] = useState('todos');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [products, setProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const data = await obtenerCatalogo();
        if (!cancelled) setProducts(data);
      } catch (error) {
        if (!cancelled) setCatalogError(
          error instanceof Error ? error.message : 'Error desconocido al cargar el catálogo.'
        );
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  const visibleProducts = useMemo(
    () => products.filter((product) => {
      const matchesCategory = category === 'todos' || product.category === category;
      const searchText = `${product.name} ${product.description} ${product.models} ${product.colors}`.toLowerCase();
      return matchesCategory && searchText.includes(search.toLowerCase().trim());
    }),
    [products, category, search]
  );

  const whatsappReady = /^\d{10,15}$/.test(WHATSAPP_NUMBER);

  const isByOrder = (variant) => {
    const modality = String(variant?.modality || '').trim().toLowerCase().replace(/[ -]+/g, '_');
    return modality === 'por_encargo' || modality === 'encargo' || modality === 'a_pedido';
  };

  const getProductOptions = (product) => {
    const variants = product.variants || [];
    const models = [...new Map(
      variants.filter((variant) => variant.modelId && variant.model)
        .map((variant) => [variant.modelId, { id: variant.modelId, name: variant.model }])
    ).values()];
    const current = selectedVariants[product.id] || {};
    const selectedModelId = models.some((model) => model.id === current.modelId)
      ? current.modelId
      : (models[0]?.id || '');
    const modelVariants = selectedModelId
      ? variants.filter((variant) => variant.modelId === selectedModelId)
      : variants.filter((variant) => !variant.modelId);
    const colors = [...new Set(modelVariants.map((variant) => variant.color).filter(Boolean))];
    const selectedColor = colors.includes(current.color) ? current.color : (colors[0] || '');
    const selectedVariant = modelVariants.find((variant) => (variant.color || '') === selectedColor) || modelVariants[0] || null;
    return { models, selectedModelId, modelVariants, colors, selectedColor, selectedVariant };
  };

  const updateProductSelection = (product, change) => {
    const options = getProductOptions(product);
    setSelectedVariants((previous) => ({
      ...previous,
      [product.id]: { ...options, ...previous[product.id], ...change },
    }));
  };

  const makeWhatsAppLink = (product, model, color, variant) => {
    const stockMessage = Number(variant?.stock || 0) > 0
      ? 'Veo que figura disponible. ¿Me confirmás para hacer el pedido?'
      : 'Veo que figura sin stock. ¿Se puede conseguir por encargo y cuál sería el plazo?';
    const message =
      `Hola LEONTEK STORE! Quiero consultar por: ${product.name}. ` +
      `Modelo: ${model || 'A confirmar'}. Color: ${color || 'A confirmar'}. ` +
      `Precio publicado: ${money(product.price)}. ${stockMessage}`;

    if (whatsappReady) {
      return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const generalWhatsAppLink = whatsappReady
    ? `https://wa.me/${WHATSAPP_NUMBER}`
    : `https://wa.me/?text=${encodeURIComponent(
        'Hola LEONTEK STORE, quiero consultar por un producto.'
      )}`;

  return (
    <div className="site-shell">
      <div className="announcement">
        <Sparkles size={14} />
        Accesorios para tu celular · Pedidos y consultas por WhatsApp
      </div>

      <header className="header">
        <a
          className="brand"
          href="#inicio"
          aria-label="LEONTEK STORE inicio"
        >
          <span className="brand-mark">
            L<span>.</span>
          </span>
          <span className="brand-copy">
            <strong>
              LEONTEK <b>STORE</b>
            </strong>
            <small>ACCESORIOS MÓVILES</small>
          </span>
        </a>

        <nav className={mobileMenu ? 'nav nav-open' : 'nav'}>
          <a href="#catalogo" onClick={() => setMobileMenu(false)}>
            Catálogo
          </a>
          <a href="#como-comprar" onClick={() => setMobileMenu(false)}>
            Cómo comprar
          </a>
          <a href="#contacto" onClick={() => setMobileMenu(false)}>
            Contacto
          </a>
        </nav>

        <a
          className="header-cta"
          href={whatsappReady ? generalWhatsAppLink : '#contacto'}
          target={whatsappReady ? '_blank' : undefined}
          rel="noreferrer"
        >
          <MessageCircle size={17} />
          Consultar
        </a>

        <button
          className="menu-toggle"
          aria-label="Abrir menú"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              TU ESTILO, TU CELULAR
            </div>

            <h1>
              Protegé tu celu.
              <br />
              <span>Dale tu estilo.</span>
            </h1>

            <p>
              Fundas, vidrios templados y accesorios para acompañarte
              todos los días. Elegí tu favorito y consultá por tu modelo.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#catalogo">
                Ver catálogo <ArrowRight size={18} />
              </a>
              <a className="button button-ghost" href="#como-comprar">
                Cómo comprar <ArrowDown size={16} />
              </a>
            </div>

            <div className="hero-trust">
              <span>
                <ShieldCheck size={16} /> Atención personalizada
              </span>
              <span>
                <Check size={16} /> Pedidos por encargo
              </span>
            </div>
          </div>

          <div
            className="hero-art"
            aria-label="Diseño decorativo de fundas para celulares"
          >
            <div className="art-glow" />

            <div className="phone phone-back phone-lilac">
              <div className="camera-row">
                <i />
                <i />
                <i />
              </div>
              <div className="magsafe-ring" />
            </div>

            <div className="phone phone-back phone-blue">
              <div className="camera-row">
                <i />
                <i />
                <i />
              </div>
              <div className="magsafe-ring" />
            </div>

            <div className="phone phone-front">
              <div className="screen-pill" />
              <div className="screen-shape" />
              <div className="screen-bottom" />
            </div>

            <div className="floating-tag tag-top">
              <span className="tag-dot" /> FUNDAS
            </div>

            <div className="floating-tag tag-bottom">
              <span className="tag-star">✦</span> TU PRÓXIMO FAVORITO
            </div>
          </div>
        </section>

        <section className="benefit-strip">
          <div>
            <span className="benefit-icon">
              <ShoppingBag size={19} />
            </span>
            <span>
              <strong>Variedad de modelos</strong>
              <small>Consultá por tu celular</small>
            </span>
          </div>

          <div>
            <span className="benefit-icon">
              <ShieldCheck size={19} />
            </span>
            <span>
              <strong>Protección y estilo</strong>
              <small>Opciones para cada gusto</small>
            </span>
          </div>

          <div>
            <span className="benefit-icon">
              <MessageCircle size={19} />
            </span>
            <span>
              <strong>Atención directa</strong>
              <small>Te ayudamos a elegir</small>
            </span>
          </div>
        </section>

        <section className="catalog-section section-wrap" id="catalogo">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                EXPLORÁ LOS PRODUCTOS
              </div>
              <h2>
                Encontrá tu <span>estilo.</span>
              </h2>
              <p>
                Elegí una categoría y consultá por el modelo que necesitás.
              </p>
            </div>

            <div className="catalog-count">
              {visibleProducts.length} productos
            </div>
          </div>

          <div className="catalog-tools">
            <div
              className="category-tabs"
              role="group"
              aria-label="Filtrar por categoría"
            >
              {categories.map((item) => (
                <button
                  key={item.id}
                  className={
                    category === item.id
                      ? 'category-tab active'
                      : 'category-tab'
                  }
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto..."
                aria-label="Buscar producto"
              />

              {search && (
                <button
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch('')}
                >
                  <X size={15} />
                </button>
              )}
            </label>
          </div>

          {catalogLoading && (
            <div className="empty-state" role="status"><p>Cargando productos...</p></div>
          )}

          {!catalogLoading && catalogError && (
            <div className="empty-state" role="alert">
              <h3>No pudimos cargar el catálogo</h3>
              <p>{catalogError}</p>
              <p>Revisá la conexión a Supabase y las políticas de acceso.</p>
            </div>
          )}

          {!catalogLoading && !catalogError && products.length === 0 && (
            <div className="empty-state">
              <ShoppingBag size={30} />
              <h3>Estamos preparando el catálogo</h3>
              <p>Pronto vas a encontrar acá los productos disponibles de LEONTEK STORE.</p>
            </div>
          )}

          {!catalogLoading && !catalogError && products.length > 0 && (
            <>
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-visual">
                      <ProductImage product={product} onImageClick={setSelectedImage} />

                      {product.featured && (
                        <span className="product-badge">DESTACADO</span>
                      )}

                      <span className="availability-pill">
                        {product.available}
                      </span>
                    </div>

                    <div className="product-info">
                      <span className="product-category">
                        {categories.find(
                          (item) => item.id === product.category
                        )?.label || product.category}
                      </span>

                      <h3>{product.name}</h3>
                      <p>{product.description}</p>

                      {(() => {
                        const options = getProductOptions(product);
                        const selectedVariant = options.selectedVariant;
                        const hasModelChoices = options.models.length > 0;
                        const selectedStock = Number(selectedVariant?.stock || 0);
                        const status = !selectedVariant
                          ? 'Consultar disponibilidad'
                          : selectedStock > 0
                            ? `Disponible · ${selectedStock} en stock`
                            : isByOrder(selectedVariant)
                              ? 'Sin stock · disponible por encargo'
                              : 'Sin stock';
                        const statusClass = selectedStock > 0
                          ? 'variant-status variant-status-in-stock'
                          : 'variant-status variant-status-out-stock';
                        const selectedModel = options.models.find((model) => model.id === options.selectedModelId)?.name || '';
                        return (
                          <div className="variant-picker">
                            {hasModelChoices && (
                              <label className="variant-field">
                                <span>Modelo de celular</span>
                                <select
                                  value={options.selectedModelId}
                                  onChange={(event) => {
                                    const nextModelId = event.target.value;
                                    const nextVariant = (product.variants || []).find((variant) => variant.modelId === nextModelId);
                                    setSelectedVariants((previous) => ({
                                      ...previous,
                                      [product.id]: { modelId: nextModelId, color: nextVariant?.color || '' },
                                    }));
                                  }}
                                  aria-label={`Elegir modelo para ${product.name}`}
                                >
                                  {options.models.map((model) => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                  ))}
                                </select>
                              </label>
                            )}

                            <label className="variant-field">
                              <span>Color</span>
                              <select
                                value={options.selectedColor}
                                onChange={(event) => updateProductSelection(product, { color: event.target.value })}
                                disabled={options.colors.length === 0}
                                aria-label={`Elegir color para ${product.name}`}
                              >
                                {options.colors.length === 0
                                  ? <option value="">Consultar colores</option>
                                  : options.colors.map((color) => <option key={color} value={color}>{color}</option>)}
                              </select>
                            </label>

                            <div className={statusClass} role="status">
                              <span className="variant-status-dot" />
                              <span>{status}</span>
                            </div>
                            {selectedVariant && selectedStock <= 0 && (
                              <p className="variant-help">{isByOrder(selectedVariant) ? 'Podés consultarnos para pedirlo por encargo.' : 'No hay unidades disponibles ahora. Consultanos por WhatsApp para verificar reposición.'}</p>
                            )}

                            <div className="product-buy">
                              <strong className="product-price">{money(product.price)}</strong>
                              <a
                                className="product-cta"
                                href={makeWhatsAppLink(product, selectedModel, options.selectedColor, selectedVariant)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Consultar por ${product.name}${selectedModel ? `, ${selectedModel}` : ''}${options.selectedColor ? `, color ${options.selectedColor}` : ''}`}
                              >
                                <MessageCircle size={17} />
                                {selectedVariant && selectedStock <= 0 ? (isByOrder(selectedVariant) ? 'Consultar por encargo' : 'Consultar reposición') : 'Consultar'}
                              </a>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </article>
                ))}
              </div>

              {visibleProducts.length === 0 && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No encontramos productos</h3>
                  <p>Probá con otra palabra o categoría.</p>
                  <button
                    className="button button-primary"
                    onClick={() => {
                      setSearch('');
                      setCategory('todos');
                    }}
                  >
                    Ver todos
                  </button>
                </div>
              )}
            </>
          )}

          <p className="catalog-note">
            Los modelos, colores y precios están sujetos a disponibilidad.
            Consultanos antes de realizar tu pedido.
          </p>
        </section>

        <section className="order-section" id="como-comprar">
          <div className="order-inner">
            <div>
              <div className="eyebrow eyebrow-light">
                <span className="eyebrow-line" />
                SIMPLE Y DIRECTO
              </div>

              <h2>
                ¿Cómo hacemos
                <br />
                tu pedido?
              </h2>

              <p>
                Escribinos y te ayudamos a encontrar el accesorio correcto
                para tu celular.
              </p>

              <a
                className="button button-white"
                href={generalWhatsAppLink}
                target="_blank"
                rel="noreferrer"
              >
                Consultar por WhatsApp <ArrowRight size={18} />
              </a>
            </div>

            <div className="steps">
              <div className="step">
                <span>01</span>
                <div>
                  <strong>Elegí tu producto</strong>
                  <p>Buscá una funda, vidrio o accesorio.</p>
                </div>
              </div>

              <div className="step">
                <span>02</span>
                <div>
                  <strong>Confirmá tu modelo</strong>
                  <p>
                    Decinos marca y modelo exacto del celular.
                  </p>
                </div>
              </div>

              <div className="step">
                <span>03</span>
                <div>
                  <strong>Coordinamos el pedido</strong>
                  <p>
                    Confirmamos precio, disponibilidad, seña si
                    corresponde y entrega.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section section-wrap" id="contacto">
          <div className="contact-card">
            <div className="contact-icon">
              <MessageCircle size={25} />
            </div>

            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                ¿TENÉS DUDAS?
              </div>

              <h2>Hablemos de lo que buscás.</h2>
              <p>
                Mandanos el modelo de tu celular y te ayudamos a elegir.
              </p>
            </div>

            <div className="contact-actions">
              <a
                className="button button-primary"
                href={generalWhatsAppLink}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>

              <a
                className="instagram-link"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
              >
                <InstagramIcon size={17} />
                @leontek_store
              </a>
            </div>
          </div>
        </section>
      </main>

      {selectedImage && (
        <div
          role="presentation"
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(8, 14, 28, 0.88)',
            backdropFilter: 'blur(5px)',
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            aria-label="Cerrar imagen ampliada"
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '18px',
              right: '22px',
              width: '44px',
              height: '44px',
              border: '1px solid rgba(255,255,255,.35)',
              borderRadius: '50%',
              color: '#fff',
              background: 'rgba(255,255,255,.12)',
              fontSize: '28px',
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: 'block',
              maxWidth: 'min(100%, 1000px)',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '16px',
              boxShadow: '0 20px 70px rgba(0,0,0,.4)',
              cursor: 'default',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '18px',
              left: '16px',
              right: '16px',
              textAlign: 'center',
              color: '#fff',
              fontSize: '14px',
            }}
          >
            {selectedImage.alt} · Tocá fuera de la imagen para cerrar
          </span>
        </div>
      )}

      <footer className="footer">
        <a className="brand brand-footer" href="#inicio">
          <span className="brand-mark">
            L<span>.</span>
          </span>
          <span className="brand-copy">
            <strong>
              LEONTEK <b>STORE</b>
            </strong>
            <small>ACCESORIOS MÓVILES</small>
          </span>
        </a>

        <p>Tu celular, tu estilo.</p>
        <span className="copyright">
          © {new Date().getFullYear()} LEONTEK STORE
        </span>
      </footer>
    </div>
  );
}

export default App;
