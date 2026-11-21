import { ShoppingBag } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon.jsx';
import { money } from '../utils/format.js';
import { buildComboWhatsAppMessage } from '../utils/whatsapp.js';

/**
 * Tarjeta para mostrar combos promocionales armados por LEONTEK STORE.
 * Expone exclusivamente estados comerciales ("Disponible" o "Consultar disponibilidad")
 * sin revelar cantidades de unidades ni cálculos internos.
 */
export function ComboCard({ combo, products = [], whatsappNumber }) {
  const retailTotal = combo.components.reduce((total, component) => {
    const product = products.find((item) => item.id === component.productId);
    return total + (product ? product.price * component.quantity : 0);
  }, 0);

  const componentSummary = combo.components
    .map(
      (component) =>
        `${component.productName}${
          component.label.includes(' · ') ? ` (${component.label.split(' · ').slice(1).join(' · ')})` : ''
        } x${component.quantity}`
    )
    .join(', ');

  const isComboAvailable = combo.maxUnits > 0;
  const commercialComboStatus = isComboAvailable ? 'Disponible' : 'Consultar disponibilidad';

  const buildComboWhatsAppLink = () => {
    const message = buildComboWhatsAppMessage({
      comboName: combo.nombre,
      price: combo.precio,
      componentSummary,
      isAvailable: isComboAvailable,
    });

    const isNumberValid = /^\d{10,15}$/.test(whatsappNumber);
    if (isNumberValid) {
      return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <article className="combo-offer-card">
      {combo.image ? (
        <img src={combo.image} alt={combo.nombre} loading="lazy" />
      ) : (
        <div className="combo-offer-image-placeholder">
          <ShoppingBag size={25} />
        </div>
      )}

      <div className="combo-offer-copy">
        <span className="combo-offer-label">COMBO</span>
        <h4>{combo.nombre}</h4>
        {combo.descripcion && <p>{combo.descripcion}</p>}

        <ul>
          {combo.components.map((component, index) => (
            <li key={`${component.productId}-${index}`}>
              {component.label} × {component.quantity}
            </li>
          ))}
        </ul>

        {/* Estado comercial público sin revelar cantidades exactas */}
        <div className="combo-offer-stock">
          {commercialComboStatus}
        </div>

        <div className="combo-offer-buy">
          <div>
            <strong>{money(combo.precio)}</strong>
            {retailTotal > combo.precio && <del>{money(retailTotal)}</del>}
          </div>

          <a
            className="product-cta product-cta-in-stock"
            href={buildComboWhatsAppLink()}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={16} /> Consultar combo
          </a>
        </div>
      </div>
    </article>
  );
}

export default ComboCard;
