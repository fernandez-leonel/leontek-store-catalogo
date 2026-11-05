/**
 * Formatea un valor numérico a moneda argentina (ARS).
 * @param {number|null|undefined|string} value
 * @returns {string}
 */
export function money(value) {
  if (value === null || value === undefined || value === '') {
    return 'Consultar precio';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}
