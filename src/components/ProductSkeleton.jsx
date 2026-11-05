/**
 * Skeleton animado para carga inicial de tarjetas de producto en el catálogo.
 * Adapta su estructura visual automáticamente para escritorio y móviles.
 */
export function ProductSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: count }).map((_, index) => (
        <article className="product-card skeleton-card" key={`skeleton-${index}`}>
          <div className="product-visual skeleton-visual skeleton-shimmer" />
          <div className="product-info">
            <div className="skeleton-line skeleton-category skeleton-shimmer" />
            <div className="skeleton-line skeleton-title skeleton-shimmer" />
            <div className="skeleton-line skeleton-title-short skeleton-shimmer" />

            {/* Vista esqueleto para escritorio (>768px) */}
            <div className="product-card-desktop skeleton-desktop-body">
              <div className="skeleton-variant-box">
                <div className="skeleton-line skeleton-label skeleton-shimmer" />
                <div className="skeleton-input skeleton-shimmer" />
              </div>
              <div className="skeleton-footer">
                <div className="skeleton-line skeleton-price skeleton-shimmer" />
                <div className="skeleton-button skeleton-shimmer" />
              </div>
            </div>

            {/* Vista esqueleto para móviles (<=768px) */}
            <div className="product-card-mobile skeleton-mobile-body">
              <div className="skeleton-line skeleton-price skeleton-shimmer" />
              <div className="skeleton-button skeleton-shimmer" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default ProductSkeleton;
