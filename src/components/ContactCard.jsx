import { MessageCircle } from 'lucide-react';

function InstagramIcon({ size = 17 }) {
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
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.8" r="1.1" fill="currentColor" />
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
        <div className="contact-icon">
          <MessageCircle size={25} />
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
            className="button button-primary"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            WhatsApp
          </a>

          <a
            className="instagram-link"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            <InstagramIcon size={17} />
            @leontek_store
          </a>
        </div>
      </div>
    </section>
  );
}

export default ContactCard;
