import { MessageCircle, ShieldCheck, ShoppingBag } from 'lucide-react';

/**
 * Tira de beneficios comerciales y propuesta de valor de LEONTEK STORE.
 */
export function BenefitStrip() {
  return (
    <section className="benefit-strip">
      <div>
        <span className="benefit-icon">
          <ShoppingBag size={19} />
        </span>
        <span>
          <strong>Variedad de modelos</strong>
          <small>Consultá por tu celular</small>
        </span>
      </div>

      <div>
        <span className="benefit-icon">
          <ShieldCheck size={19} />
        </span>
        <span>
          <strong>Protección y estilo</strong>
          <small>Opciones para cada gusto</small>
        </span>
      </div>

      <div>
        <span className="benefit-icon">
          <MessageCircle size={19} />
        </span>
        <span>
          <strong>Atención directa</strong>
          <small>Te ayudamos a elegir</small>
        </span>
      </div>
    </section>
  );
}

export default BenefitStrip;
