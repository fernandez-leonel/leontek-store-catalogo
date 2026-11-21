import leontekLogo from '../assets/leontek-logo.webp';

/**
 * Pie de página oficial de LEONTEK STORE con marca, logo oficial y derechos reservados.
 */
export function Footer() {
  return (
    <footer className="footer">
      <a className="brand brand-footer" href="#inicio" aria-label="Volver al inicio - LEONTEK STORE">
        <img
          src={leontekLogo}
          alt="Logo LEONTEK STORE"
          className="brand-logo-footer"
          width="42"
          height="42"
          loading="lazy"
        />
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
  );
}

export default Footer;
