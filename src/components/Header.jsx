import { useEffect, useRef } from 'react';
import { Home, LayoutGrid, Menu, MessageCircle, Smartphone, Sparkles, Tag, X } from 'lucide-react';

/**
 * Cabecera principal de LEONTEK STORE.
 * Barra superior limpia y profesional con logo, navegación por píldoras e icono de WhatsApp destacado.
 */
export function Header({ mobileMenu, setMobileMenu, whatsappUrl }) {
  const headerRef = useRef(null);

  // Cierre con tecla Escape y clic afuera
  useEffect(() => {
    if (!mobileMenu) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenu, setMobileMenu]);

  return (
    <>
      <div className="announcement">
        <Sparkles size={14} />
        <span>Accesorios premium para tu celular · Envíos en Goya y alrededores</span>
      </div>

      <header className="header" ref={headerRef}>
        <a className="brand" href="#inicio" aria-label="LEONTEK STORE inicio">
          <div className="brand-icon-box" aria-hidden="true">
            <Smartphone size={22} className="brand-phone-svg" />
          </div>
          <div className="brand-copy">
            <strong className="brand-name">
              LEONTEK <span className="brand-accent">STORE</span>
            </strong>
            <span className="brand-subtitle">— Fundas y templados premium —</span>
          </div>
        </a>

        {/* Navegación central con píldoras de navegación e iconos */}
        <nav
          id="main-navigation"
          className={mobileMenu ? 'nav nav-open' : 'nav'}
          aria-label="Navegación principal"
        >
          <a
            href="#inicio"
            className="nav-link nav-link-active"
            onClick={() => setMobileMenu(false)}
          >
            <Home size={15} />
            <span>Inicio</span>
          </a>
          <a
            href="#catalogo"
            className="nav-link"
            onClick={() => setMobileMenu(false)}
          >
            <LayoutGrid size={15} />
            <span>Catálogo</span>
          </a>
          <a
            href="#combos"
            className="nav-link"
            onClick={() => setMobileMenu(false)}
          >
            <Tag size={15} />
            <span>Promociones</span>
          </a>
          <a
            href="#contacto"
            className="nav-link"
            onClick={() => setMobileMenu(false)}
          >
            <MessageCircle size={15} />
            <span>Contacto</span>
          </a>
        </nav>

        {/* Botón destacado de WhatsApp */}
        <a
          className="header-whatsapp-cta"
          href={whatsappUrl || '#contacto'}
          target={whatsappUrl ? '_blank' : undefined}
          rel="noreferrer"
          aria-label="Consultas por WhatsApp"
        >
          <MessageCircle size={17} />
          <span>Consultas por WhatsApp</span>
        </a>

        <button
          className="menu-toggle"
          aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenu}
          aria-controls="main-navigation"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {mobileMenu && (
        <div
          className="nav-backdrop"
          aria-hidden="true"
          onClick={() => setMobileMenu(false)}
        />
      )}
    </>
  );
}

export default Header;
