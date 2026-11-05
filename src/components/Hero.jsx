import {
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from 'lucide-react';
import heroShowcaseImg from '../assets/hero-showcase.png';

/**
 * Sección Hero principal de LEONTEK STORE.
 * Diseño moderno y tecnológico de tienda especializada en fundas y vidrios templados.
 * Utiliza import de asset para garantizar compatibilidad con Vite base y GitHub Pages.
 */
export function Hero({ whatsappUrl }) {
  // Fallback seguro usando BASE_URL por si se requiere
  const imageSrc = heroShowcaseImg || `${import.meta.env.BASE_URL}images/hero-showcase.png`;

  return (
    <section className="hero" id="inicio">
      {/* Fondo orgánico de luz y gradiente celeste tenue */}
      <div className="hero-bg-glow" aria-hidden="true" />

      {/* Lado izquierdo: Propuesta comercial y llamados a la acción */}
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-line" />
          <span>ACCESORIOS PARA TU CELULAR</span>
        </div>

        <h1 className="hero-title">
          Protegé tu celular.
          <br />
          <span className="hero-title-accent">Con estilo y precisión.</span>
        </h1>

        <p className="hero-description">
          Fundas de alto impacto, fundas MagSafe, siliconas, diseños exclusivos y
          vidrios templados 9D. Encontrá el accesorio ideal para tu modelo.
        </p>

        <div className="hero-actions">
          <a className="hero-btn-primary" href="#catalogo">
            <ShoppingCart size={18} />
            <span>Ver catálogo</span>
            <ArrowRight size={17} className="hero-btn-arrow" />
          </a>

          <a
            className="hero-btn-secondary"
            href={whatsappUrl || '#contacto'}
            target={whatsappUrl ? '_blank' : undefined}
            rel="noreferrer"
            aria-label="Consultar disponibilidad por WhatsApp"
          >
            <MessageCircle size={18} />
            <span>Consultar disponibilidad</span>
          </a>
        </div>

        {/* Beneficios comerciales reales debajo de los botones */}
        <div className="hero-benefits">
          <div className="hero-benefit-item">
            <div className="hero-benefit-icon">
              <Truck size={17} />
            </div>
            <span>Envíos en Goya y alrededores</span>
          </div>

          <div className="hero-benefit-item">
            <div className="hero-benefit-icon">
              <ShieldCheck size={17} />
            </div>
            <span>Calidad y protección real</span>
          </div>

          <div className="hero-benefit-item">
            <div className="hero-benefit-icon">
              <Zap size={17} />
            </div>
            <span>Variedad de modelos y colores</span>
          </div>
        </div>
      </div>

      {/* Lado derecho: Composición visual de fundas y templados en podio */}
      <div className="hero-visual">
        <div className="hero-showcase-card">
          <img
            src={imageSrc}
            alt="Fundas MagSafe, siliconas y vidrios templados 9D - LEONTEK STORE"
            className="hero-showcase-image"
            loading="eager"
            width={1672}
            height={941}
            onError={(e) => {
              const fallback = `${import.meta.env.BASE_URL}images/hero-showcase.png`;
              if (e.target.src !== fallback) {
                e.target.src = fallback;
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default Hero;
