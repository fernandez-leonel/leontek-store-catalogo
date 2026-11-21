import { WhatsAppIcon } from './WhatsAppIcon.jsx';

/**
 * Icono vectorial oficial de Instagram.
 */
function InstagramIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="6.6" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Sección de contacto directo vía WhatsApp e Instagram oficial.
 */
export function ContactCard({ whatsappUrl, instagramUrl }) {
  return (
    <section className="contact-section section-wrap" id="contacto">
      <div className="contact-card">
        <div className="contact-icon" aria-hidden="true">
          <WhatsAppIcon size={26} />
        </div>

        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />
            ¿TENÉS DUDAS?
          </div>

          <h2>Hablemos de lo que buscás.</h2>
          <p>Mandanos el modelo de tu celular y te ayudamos a elegir.</p>
        </div>

        <div className="contact-actions">
          <a
            className="contact-whatsapp-btn"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir conversación en WhatsApp con LEONTEK STORE"
          >
            <WhatsAppIcon size={19} />
            <span>WhatsApp</span>
          </a>

          <a
            className="instagram-link"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Perfil de Instagram @leontek_store"
          >
            <InstagramIcon size={20} />
            <span>@leontek_store</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default ContactCard;
