/**
 * Pie de página oficial de LEONTEK STORE con marca y derechos reservados.
 */
export function Footer() {
  return (
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
  );
}

export default Footer;
