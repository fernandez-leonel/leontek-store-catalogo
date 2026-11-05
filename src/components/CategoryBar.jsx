import { Headphones, Layers, ShieldCheck, Smartphone, Tag } from 'lucide-react';

/**
 * Franja visual de accesos rápidos a categorías, promociones y asesoramiento.
 * Conecta directamente con las secciones reales del catálogo.
 */
export function CategoryBar({ onSelectCategory, onNavigateCombos, onAskAdvice }) {
  return (
    <section className="category-bar-section" aria-label="Accesos rápidos a categorías y servicios">
      <div className="category-bar-container">
        {/* Acceso 1: Fundas */}
        <button
          type="button"
          className="category-bar-item"
          onClick={() => onSelectCategory && onSelectCategory('fundas')}
          aria-label="Ver fundas de silicona, anti-shock y MagSafe"
        >
          <div className="category-bar-icon-wrap icon-blue">
            <Smartphone size={22} />
          </div>
          <div className="category-bar-text">
            <strong className="category-bar-title">Fundas</strong>
            <span className="category-bar-desc">Silicona, anti-shock, MagSafe y más</span>
          </div>
        </button>

        {/* Acceso 2: Templados */}
        <button
          type="button"
          className="category-bar-item"
          onClick={() => onSelectCategory && onSelectCategory('templados')}
          aria-label="Ver vidrios templados 9D y full cover"
        >
          <div className="category-bar-icon-wrap icon-cyan">
            <Layers size={22} />
          </div>
          <div className="category-bar-text">
            <strong className="category-bar-title">Templados</strong>
            <span className="category-bar-desc">9D, full cover y alta resistencia</span>
          </div>
        </button>

        {/* Acceso 3: Promociones */}
        <button
          type="button"
          className="category-bar-item"
          onClick={() => onNavigateCombos && onNavigateCombos()}
          aria-label="Ver combos y ofertas especiales"
        >
          <div className="category-bar-icon-wrap icon-indigo">
            <Tag size={22} />
          </div>
          <div className="category-bar-text">
            <strong className="category-bar-title">Promociones</strong>
            <span className="category-bar-desc">Combos y ofertas especiales</span>
          </div>
        </button>

        {/* Acceso 4: Asesoramiento */}
        <button
          type="button"
          className="category-bar-item"
          onClick={() => onAskAdvice && onAskAdvice()}
          aria-label="Solicitar asesoramiento personalizado por WhatsApp"
        >
          <div className="category-bar-icon-wrap icon-navy">
            <Headphones size={22} />
          </div>
          <div className="category-bar-text">
            <strong className="category-bar-title">Asesoramiento</strong>
            <span className="category-bar-desc">Te ayudamos a elegir el ideal</span>
          </div>
        </button>
      </div>
    </section>
  );
}

export default CategoryBar;
