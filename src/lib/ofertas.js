function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calcularPrecioPromocional(precioBase, promocion) {
  const base = Number(precioBase);
  const valor = Number(promocion?.valor);
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(valor) || valor < 0) {
    throw new Error('El precio y el valor promocional deben ser válidos.');
  }
  if (promocion.tipo === 'porcentaje') {
    if (valor > 100) throw new Error('El descuento porcentual no puede superar el 100%.');
    return roundCurrency(base * (1 - valor / 100));
  }
  if (promocion.tipo === 'importe_fijo') return roundCurrency(Math.max(0, base - valor));
  if (promocion.tipo === 'precio_especial') return roundCurrency(valor);
  throw new Error('Tipo de promoción no reconocido.');
}

function prioridadAlcance(promocion) {
  if (promocion.alcance === 'productos') return 2;
  if (promocion.alcance === 'categorias') return 1;
  return 0;
}

export function resolverPromocion(promociones, producto, ahora = new Date()) {
  const timestamp = ahora instanceof Date ? ahora.getTime() : Date.parse(ahora);
  const candidatas = (promociones || []).filter(promocion => {
    const inicio = Date.parse(promocion.inicia_at);
    const fin = promocion.finaliza_at ? Date.parse(promocion.finaliza_at) : null;
    const coincide = promocion.alcance === 'general'
      || (promocion.alcance === 'productos' && promocion.productIds.includes(producto.id))
      || (promocion.alcance === 'categorias' && promocion.categoryIds.includes(producto.categoryId));
    return ['activa', 'programada'].includes(promocion.estado) && coincide &&
      Number.isFinite(inicio) && inicio <= timestamp &&
      (fin === null || (Number.isFinite(fin) && fin > timestamp));
  });
  candidatas.sort((a, b) =>
    Number(b.prioridad || 0) - Number(a.prioridad || 0) ||
    prioridadAlcance(b) - prioridadAlcance(a) ||
    String(a.id).localeCompare(String(b.id))
  );
  const promocion = candidatas[0];
  return promocion
    ? { ...promocion, precioPromocional: calcularPrecioPromocional(producto.price, promocion) }
    : null;
}

export function calcularDisponibilidadCombo(componentes) {
  if (!Array.isArray(componentes) || !componentes.length) return 0;
  return Math.min(...componentes.map(componente => {
    const destinoValido = Boolean(componente.varianteId) !== Boolean(componente.inventarioId);
    const cantidad = Number(componente.cantidad);
    const stock = Number(componente.stock);
    return destinoValido && Number.isInteger(cantidad) && cantidad > 0 &&
      Number.isFinite(stock) && stock > 0
      ? Math.floor(stock / cantidad)
      : 0;
  }));
}
