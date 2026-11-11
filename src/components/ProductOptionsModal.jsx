import { useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Sparkles } from 'lucide-react';
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

/**
 * Modal / Bottom-Sheet para seleccionar modelo y color de un producto
 * y consultar directamente por WhatsApp con el mensaje exacto.
 */
export function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  categoryLabel,
  selectedVariantState = {},
  onUpdateSelection,
  promotion,
  whatsappNumber,
  onImageClick,
}) {
  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen || !product) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, product, onClose]);

  if (!isOpen || !product) return null;

  const options = obtenerOpcionesProducto(product, selectedVariantState);
  const displayPrice = promotion?.precioPromocional ?? product.price;
  const selectedVariant = options.selectedVariant;
  const hasModelChoices = options.models.length > 0;
  const selectedStock = obtenerStock(product, selectedVariant);

  // Resolver estado comercial respetando inventario y modalidad
  const estadoComercial = resolverEstadoComercial({
    stock: selectedStock,
    modality: selectedVariant?.modality,
  });

  let commercialStatus = 'Consultar disponibilidad';
  let buttonAction = 'Consultar disponibilidad';
  let statusClass = 'variant-status variant-status-out-stock';
  let buttonStockClass = 'product-cta product-cta-out-stock';
  let commercialHelp = '';

  if (estadoComercial === 'DISPONIBLE') {
    commercialStatus = 'Disponible';
    buttonAction = 'Consultar disponibilidad';
    statusClass = 'variant-status variant-status-in-stock';
    buttonStockClass = 'product-cta product-cta-in-stock';
    commercialHelp = '';
  } else if (estadoComercial === 'POR_ENCARGO') {
    commercialStatus = 'Por encargo';
    buttonAction = 'Consultar por encargo';
    statusClass = 'variant-status variant-status-out-stock';
    buttonStockClass = 'product-cta product-cta-order';
    commercialHelp = 'Consultanos para pedirlo por encargo y coordinar el tiempo de entrega.';
  } else {
    commercialStatus = 'Consultar disponibilidad';
    buttonAction = 'Consultar disponibilidad';
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

  return (
    <div
      className="options-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      onClick={onClose}
    >
      <div
        className="options-modal-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="options-modal-close"
          aria-label="Cerrar opciones"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="options-modal-header">
          {product.image ? (
            <button
              type="button"
              className="options-modal-thumb-btn"
              onClick={() => onImageClick && onImageClick({ src: product.image, alt: product.name })}
              title="Tocá para ampliar la imagen"
            >
              <img
                src={product.image}
                alt={product.name}
                className="options-modal-thumb"
                loading="lazy"
              />
            </button>
          ) : (
            <div className={`options-modal-placeholder placeholder-${product.category}`}>
              <span>
                {product.category === 'templados'
                  ? '9H'
                  : product.category === 'magsafe'
                    ? '◉'
                    : product.category === 'accesorios'
                      ? '⚡'
                      : 'L'}
              </span>
            </div>
          )}

          <div className="options-modal-title-wrap">
            <span className="product-category">{categoryLabel || product.category}</span>
            <h2 id="modal-product-title" className="options-modal-title">
              {product.name}
            </h2>
            <div className="options-modal-price-row">
              <strong className="options-modal-price">{money(displayPrice)}</strong>
              {promotion && (
                <>
                  <del className="product-old-price">{money(product.price)}</del>
                  <span className="promotion-price-note">OFERTA</span>
                </>
              )}
            </div>
          </div>
        </div>

        {product.description && (
          <p className="options-modal-desc">{product.description}</p>
        )}

        <div className="options-modal-body">
          {hasModelChoices && (
            <div className="variant-field">
              <label htmlFor="modal-model-select">Modelo de celular</label>
              <select
                id="modal-model-select"
                value={options.selectedModelId}
                onChange={(event) => {
                  const nextModelId = event.target.value;
                  const nextVariant = (product.variants || []).find((v) => v.modelId === nextModelId);
                  onUpdateSelection({ modelId: nextModelId, color: nextVariant?.color || '' });
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
              <label htmlFor="modal-color-select">Color</label>
              <select
                id="modal-color-select"
                value={options.selectedColor}
                onChange={(event) => onUpdateSelection({ color: event.target.value })}
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

          {/* Estado comercial público sin revelar números de stock */}
          <div className={statusClass} role="status">
            <span className="variant-status-dot" />
            <span>{commercialStatus}</span>
          </div>

          {commercialHelp && <p className="variant-help">{commercialHelp}</p>}

          {promotion && (promotion.condiciones || promotion.descripcion) && (
            <p className="promotion-terms">{promotion.condiciones || promotion.descripcion}</p>
          )}
        </div>

        <div className="options-modal-footer">
          <a
            className={buttonStockClass}
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noreferrer"
            aria-label={`Consultar por ${product.name} en WhatsApp`}
          >
            <MessageCircle size={18} />
            {buttonAction} por WhatsApp
          </a>

          <div className="options-modal-trust">
            <span>
              <ShieldCheck size={14} /> Atención directa y personalizada
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductOptionsModal;
