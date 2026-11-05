import { ArrowRight } from 'lucide-react';

/**
 * Sección explicativa de los pasos para realizar un pedido en LEONTEK STORE.
 */
export function HowToBuy({ whatsappUrl }) {
  return (
    <section className="order-section" id="como-comprar">
      <div className="order-inner">
        <div>
          <div className="eyebrow eyebrow-light">
            <span className="eyebrow-line" />
            SIMPLE Y DIRECTO
          </div>

          <h2>
            ¿Cómo hacemos
            <br />
            tu pedido?
          </h2>

          <p>
            Escribinos y te ayudamos a encontrar el accesorio correcto para tu celular.
          </p>

          <a
            className="button button-white"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp <ArrowRight size={18} />
          </a>
        </div>

        <div className="steps">
          <div className="step">
            <span>01</span>
            <div>
              <strong>Elegí tu producto</strong>
              <p>Buscá una funda, vidrio o accesorio.</p>
            </div>
          </div>

          <div className="step">
            <span>02</span>
            <div>
              <strong>Confirmá tu modelo</strong>
              <p>Decinos marca y modelo exacto del celular.</p>
            </div>
          </div>

          <div className="step">
            <span>03</span>
            <div>
              <strong>Coordinamos el pedido</strong>
              <p>
                Confirmamos precio, disponibilidad, seña si corresponde y entrega.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowToBuy;
