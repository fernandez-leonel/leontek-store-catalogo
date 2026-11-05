import { useState } from 'react';
import { Search, ShoppingBag, Sparkles, X } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import ProductOptionsModal from './ProductOptionsModal.jsx';
import ComboCard from './ComboCard.jsx';
import ProductSkeleton from './ProductSkeleton.jsx';

/**
 * Cuadrícula principal de catálogo con filtrado por categoría en scroll horizontal,
 * buscador compacto, listado de productos en tarjetas responsivas y modal de selección de variantes.
 */
export function CatalogGrid({
  categories = [],
  category,
  setCategory,
  search,
  setSearch,
  products = [],
  visibleProducts = [],
  catalogLoading,
  catalogError,
  offers = { combos: [], promotions: [] },
  offersError,
  promotionsByProduct = new Map(),
  selectedVariants = {},
  onUpdateProductSelection,
  onImageClick,
  whatsappNumber,
}) {
  const [modalProduct, setModalProduct] = useState(null);

  return (
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
          <p>Elegí una categoría y consultá por el modelo que necesitás.</p>
        </div>

        <div className="catalog-count">{visibleProducts.length} productos</div>
      </div>

      <div className="catalog-tools">
        <div className="category-tabs" role="group" aria-label="Filtrar por categoría">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? 'category-tab active' : 'category-tab'}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar modelo o accesorio..."
            aria-label="Buscar producto"
          />

          {search && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearch('')}
            >
              <X size={15} />
            </button>
          )}
        </label>
      </div>

      {catalogLoading && <ProductSkeleton count={6} />}

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
          {offersError && (
            <div className="offers-unavailable" role="status">
              <Sparkles size={16} />
              <span>{offersError}</span>
            </div>
          )}

          <div className="product-grid">
            {visibleProducts.map((product) => {
              const categoryMatch = categories.find((item) => item.id === product.category);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryLabel={categoryMatch?.label}
                  selectedVariantState={selectedVariants[product.id] || {}}
                  onUpdateSelection={(change) => onUpdateProductSelection(product, change)}
                  promotion={promotionsByProduct.get(product.id)}
                  onOpenOptions={(prod) => setModalProduct(prod)}
                  onImageClick={onImageClick}
                  whatsappNumber={whatsappNumber}
                />
              );
            })}
          </div>

          {modalProduct && (
            <ProductOptionsModal
              isOpen={Boolean(modalProduct)}
              product={modalProduct}
              onClose={() => setModalProduct(null)}
              categoryLabel={categories.find((c) => c.id === modalProduct.category)?.label}
              selectedVariantState={selectedVariants[modalProduct.id] || {}}
              onUpdateSelection={(change) => onUpdateProductSelection(modalProduct, change)}
              promotion={promotionsByProduct.get(modalProduct.id)}
              whatsappNumber={whatsappNumber}
              onImageClick={onImageClick}
            />
          )}

          {offers.combos.length > 0 && (
            <section className="combo-offers" id="combos">
              <div className="combo-offers-heading">
                <div className="eyebrow">
                  <span className="eyebrow-line" /> COMBOS LEONTEK
                </div>
                <h3>Elegí tu combo</h3>
                <p>La disponibilidad se calcula con el stock real de cada componente.</p>
              </div>

              <div className="combo-offers-grid">
                {offers.combos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    products={products}
                    whatsappNumber={whatsappNumber}
                  />
                ))}
              </div>
            </section>
          )}

          {visibleProducts.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>No encontramos productos</h3>
              <p>Probá con otra palabra o categoría.</p>
              <button
                type="button"
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
        Los modelos, colores y precios están sujetos a disponibilidad. Consultanos antes de realizar tu
        pedido.
      </p>
    </section>
  );
}

export default CatalogGrid;
