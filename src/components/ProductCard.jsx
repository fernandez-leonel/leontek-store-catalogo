import { useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import {
  obtenerOpcionesProducto,
  obtenerStock,
} from '../lib/catalogo-stock.js';
import { money } from '../utils/format.js';
import {
  formatDeviceModel,
  buildProductWhatsAppMessage,
  resolverEstadoComercial,
} from '../utils/whatsapp.js';

function ProductVisualImage({ product, onImageClick }) {
  const [failed, setFailed] = useState(false);

  if (product.image && !failed) {
    return (
      <div className="product-image-container">
        <img
          className="product-image"
          src={product.image}
          alt={product.name}
          onError={() => setFailed(true)}
          loading="lazy"
        />
        {onImageClick && (
          <button
            type="button"
            className="product-image-zoom-btn"
            onClick={(event) => {
              event.stopPropagation();
              onImageClick({ src: product.image, alt: product.name });
            }}
            aria-label={`Ampliar imagen de ${product.name}`}
            title="Ampliar foto"
          >
            <Search size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`image-placeholder placeholder-${product.category}`}
      aria-label={`Imagen ilustrativa de ${product.name}`}
    >
      <div className="placeholder-symbol" aria-hidden="true">
        {product.category === 'templados' ? (
          '9H'
        ) : product.category === 'magsafe' ? (
          '◉'
        ) : product.category === 'accesorios' ? (
          <Zap size={28} />
        ) : (
          'LT'
        )}
      </div>
      <span className="placeholder-label">Foto ilustrativa</span>
    </div>
  );
}

/**
 * Tarjeta responsive de producto:
 * - En Computadora (>768px): muestra selectores de modelo/color, estado en vivo y botón WhatsApp directo.
 * - En Celulares (<=768px): tarjeta compacta de 2 columnas que abre ProductOptionsModal al tocarla.
 */
export function ProductCard({
  product,
  categoryLabel,
  selectedVariantState = {},
  onUpdateSelection,
  promotion,
  onOpenOptions,
  onImageClick,
  whatsappNumber,
}) {
  const options = obtenerOpcionesProducto(product, selectedVariantState);
  const displayPrice = promotion?.precioPromocional ?? product.price;
  const selectedVariant = options.selectedVariant;
  const hasModelChoices = options.models.length > 0;
  const selectedStock = obtenerStock(product, selectedVariant);

  // Resuelve el estado comercial respetando la lógica de stock físico y modalidades
  const estadoComercial = resolverEstadoComercial({
    stock: selectedStock,
    modality: selectedVariant?.modality,
  });

  let commercialStatus = 'Consultar disponibilidad';
  let buttonAction = 'Consultar disponibilidad';
  let pillClass = 'availability-pill pill-consult';
  let statusClass = 'variant-status variant-status-out-stock';
  let buttonStockClass = 'product-cta product-cta-out-stock';
  let commercialHelp = '';

  if (estadoComercial === 'DISPONIBLE') {
    commercialStatus = 'Disponible';
    buttonAction = 'Consultar disponibilidad';
    pillClass = 'availability-pill pill-available';
    statusClass = 'variant-status variant-status-in-stock';
    buttonStockClass = 'product-cta product-cta-in-stock';
    commercialHelp = '';
  } else if (estadoComercial === 'POR_ENCARGO') {
    commercialStatus = 'Por encargo';
    buttonAction = 'Consultar por encargo';
    pillClass = 'availability-pill pill-order';
    statusClass = 'variant-status variant-status-out-stock';
    buttonStockClass = 'product-cta product-cta-order';
    commercialHelp = 'Consultanos para pedirlo por encargo y coordinar el tiempo de entrega.';
  } else {
    commercialStatus = 'Consultar disponibilidad';
    buttonAction = 'Consultar disponibilidad';
    pillClass = 'availability-pill pill-consult';
    statusClass = 'variant-status variant-status-out-stock';
    buttonStockClass = 'product-cta product-cta-out-stock';
    commercialHelp = product.isTemperedGlass
      ? 'Consultanos por WhatsApp para confirmar compatibilidad con tu modelo exacto.'
      : 'Consultanos por WhatsApp para verificar reposición o alternativas.';
  }

  const rawSelectedModel = options.models.find((model) => model.id === options.selectedModelId)?.name || '';
  const cleanSelectedModel = formatDeviceModel(rawSelectedModel);

  const buildWhatsAppLink = () => {
    const message = buildProductWhatsAppMessage({
      productName: product.name,
      model: cleanSelectedModel,
      color: options.selectedColor,
      price: product.price,
      promotionalPrice: promotion?.precioPromocional,
      stock: selectedStock,
      modality: selectedVariant?.modality,
      commercialStatus: estadoComercial,
    });

    const isNumberValid = /^\d{10,15}$/.test(whatsappNumber);
    if (isNumberValid) {
      return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleCardClick = () => {
    // Abre el modal detallado tanto en móvil como en escritorio
    if (onOpenOptions) {
      onOpenOptions(product);
    }
  };

  return (
    <article
      className="product-card"
      onClick={handleCardClick}
      aria-label={`Producto ${product.name}`}
    >
      <div className="product-visual">
        <ProductVisualImage product={product} onImageClick={onImageClick} />

        {product.featured && <span className="product-badge">DESTACADO</span>}
        {promotion && <span className="promotion-badge">{promotion.nombre}</span>}
        <span className={pillClass}>{commercialStatus}</span>
      </div>

      <div className="product-info">
        <span className="product-category">{categoryLabel || product.category}</span>
        <h3 className="product-title" title="Ver detalle y descripción completa">
          {product.name}
        </h3>

        {product.description && (
          <p className="product-description" title="Ver descripción completa">
            {product.description}
          </p>
        )}

        {/* ------------------------------------------------------------------
            VISTA ESCRITORIO (>768px): Selectores, Estado Comercial y WhatsApp Directo
            ------------------------------------------------------------------ */}
        <div
          className="product-card-desktop"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="variant-picker">
            {hasModelChoices && (
              <div className="variant-field">
                <label htmlFor={`model-select-${product.id}`}>Modelo de celular</label>
                <select
                  id={`model-select-${product.id}`}
                  value={options.selectedModelId}
                  onChange={(event) => {
                    const nextModelId = event.target.value;
                    const nextVariant = (product.variants || []).find((v) => v.modelId === nextModelId);
                    if (onUpdateSelection) {
                      onUpdateSelection({ modelId: nextModelId, color: nextVariant?.color || '' });
                    }
                  }}
                  aria-label={`Elegir modelo para ${product.name}`}
                >
                  {options.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {formatDeviceModel(model.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {product.isTemperedGlass ? (
              !hasModelChoices && (
                <p className="variant-help">Consultar compatibilidad según modelo</p>
              )
            ) : options.colors.length > 0 && (
              <div className="variant-field">
                <label htmlFor={`color-select-${product.id}`}>Color</label>
                <select
                  id={`color-select-${product.id}`}
                  value={options.selectedColor}
                  onChange={(event) => {
                    if (onUpdateSelection) {
                      onUpdateSelection({ color: event.target.value });
                    }
                  }}
                  aria-label={`Elegir color para ${product.name}`}
                >
                  {options.colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Estado comercial en tiempo real para la variante elegida */}
            <div className={statusClass} role="status">
              <span className="variant-status-dot" />
              <span>{commercialStatus}</span>
            </div>

            {commercialHelp && <p className="variant-help">{commercialHelp}</p>}

            {promotion && (promotion.condiciones || promotion.descripcion) && (
              <p className="promotion-terms">{promotion.condiciones || promotion.descripcion}</p>
            )}

            <div className="product-buy">
              <div className="product-price-block">
                {promotion && <span className="promotion-price-note">OFERTA</span>}
                <strong className="product-price">{money(displayPrice)}</strong>
                {promotion && <del className="product-old-price">{money(product.price)}</del>}
              </div>

              <a
                className={buttonStockClass}
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                aria-label={`Consultar por ${product.name} en WhatsApp`}
              >
                <WhatsAppIcon size={16} />
                {buttonAction}
              </a>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            VISTA MÓVIL (<=768px): Tarjeta Compacta (abre ProductOptionsModal)
            ------------------------------------------------------------------ */}
        <div className="product-card-mobile">
          <div className="product-card-mobile-pricing">
            {promotion && <span className="promotion-price-note">OFERTA</span>}
            <div className="product-price-wrapper">
              <strong className="product-price">{money(displayPrice)}</strong>
              {promotion && <del className="product-old-price">{money(product.price)}</del>}
            </div>
          </div>

          <button
            type="button"
            className="product-card-cta"
            onClick={(event) => {
              event.stopPropagation();
              if (onOpenOptions) {
                onOpenOptions(product);
              }
            }}
            aria-label={`Ver opciones de ${product.name}`}
          >
            <WhatsAppIcon size={14} />
            <span>Consultar</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
