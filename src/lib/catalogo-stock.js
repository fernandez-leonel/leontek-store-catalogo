export function esVidrioTemplado(categoria = {}) {
  return /vidrio|templad/i.test(`${categoria.nombre || ''} ${categoria.slug || ''}`);
}

export function normalizarModalidad(modalidad) {
  const value = String(modalidad || 'stock').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (['por_encargo', 'encargo', 'a_pedido'].includes(value)) return 'pedido';
  return ['stock', 'ambos', 'pedido'].includes(value) ? value : 'stock';
}

export function obtenerStockCompartidoParaModelo(productoId, modeloId, grupos) {
  const compatibles = new Map();

  for (const grupo of grupos) {
    if (grupo.productId !== productoId) continue;
    const modelIds = grupo.modelIds || [];
    const compatible = Boolean(modeloId) && modelIds.includes(modeloId);
    if (compatible) compatibles.set(grupo.id, grupo);
  }

  const gruposCompatibles = [...compatibles.values()];
  return {
    stock: gruposCompatibles.length
      ? gruposCompatibles.reduce((total, grupo) => total + Number(grupo.stock || 0), 0)
      : null,
    groups: gruposCompatibles,
  };
}

export function obtenerInventarioTotalProducto(productoId, grupos) {
  const productGroups = new Map();
  for (const grupo of grupos) {
    if (grupo.productId === productoId) productGroups.set(grupo.id, grupo);
  }
  const uniqueGroups = [...productGroups.values()];
  return {
    stock: uniqueGroups.reduce((total, grupo) => total + Number(grupo.stock || 0), 0),
    groups: uniqueGroups,
  };
}

export function obtenerModalidadInventario(grupos) {
  const modalidades = grupos.map((grupo) => normalizarModalidad(grupo.modality));
  if (grupos.some((grupo) =>
    normalizarModalidad(grupo.modality) !== 'pedido' && Number(grupo.stock || 0) > 0
  )) return 'stock';
  if (modalidades.includes('ambos')) return 'ambos';
  if (modalidades.includes('pedido')) return 'pedido';
  if (modalidades.includes('stock')) return 'stock';
  return 'stock';
}

export function obtenerStock(producto, variante) {
  if (producto.isTemperedGlass) {
    if (variante && variante.productId !== producto.id) return null;
    return obtenerStockCompartidoParaModelo(
      producto.id,
      variante?.modelId || null,
      producto.inventoryGroups || []
    ).stock;
  }
  return Number(variante?.stock || 0);
}

export function obtenerOpcionesProducto(producto, seleccionActual = {}) {
  const variantes = producto.variants || [];
  const modelos = [...new Map(
    (producto.isTemperedGlass
      ? (producto.inventoryGroups || []).flatMap((grupo) => grupo.models || [])
      : variantes.filter((variante) => variante.modelId && variante.model)
    ).map((modelo) => {
      const modelId = producto.isTemperedGlass
        ? (modelo.id || modelo.modelId)
        : modelo.modelId;
      return [modelId, {
        id: modelId,
        name: modelo.name || modelo.model,
      }];
    })
  ).values()];
  const selectedModelId = modelos.some((modelo) => modelo.id === seleccionActual.modelId)
    ? seleccionActual.modelId
    : (modelos[0]?.id || '');

  if (producto.isTemperedGlass) {
    const { stock, groups } = obtenerStockCompartidoParaModelo(
      producto.id,
      selectedModelId || null,
      producto.inventoryGroups || []
    );
    return {
      models: modelos,
      selectedModelId,
      modelVariants: [],
      colors: [],
      selectedColor: '',
      selectedVariant: {
        productId: producto.id,
        modelId: selectedModelId || null,
        stock,
        modality: obtenerModalidadInventario(groups),
      },
    };
  }

  const modelVariants = selectedModelId
    ? variantes.filter((variante) => variante.modelId === selectedModelId)
    : variantes.filter((variante) => !variante.modelId);
  const colors = [...new Set(modelVariants.map((variante) => variante.color).filter(Boolean))];
  const selectedColor = colors.includes(seleccionActual.color)
    ? seleccionActual.color
    : (colors[0] || '');
  const selectedVariant = modelVariants.find(
    (variante) => (variante.color || '') === selectedColor
  ) || modelVariants[0] || null;

  return {
    models: modelos,
    selectedModelId,
    modelVariants,
    colors,
    selectedColor,
    selectedVariant,
  };
}

export function obtenerDisponibilidad(stock, modalidad = 'stock') {
  const mode = normalizarModalidad(modalidad);
  if (stock === null || stock === undefined) {
    return {
      status: 'Consultar disponibilidad',
      help: 'Consultanos por WhatsApp para confirmar compatibilidad y stock.',
      action: 'Consultar disponibilidad',
      available: false,
    };
  }
  const quantity = Number(stock || 0);

  if (mode === 'pedido') {
    return {
      status: 'Por pedido',
      help: 'Consultanos para realizar un pedido.',
      action: 'Consultar por pedido',
      available: true,
    };
  }

  if (quantity > 0) {
    return {
      status: `Disponible · ${quantity} en stock`,
      help: '',
      action: 'Consultar',
      available: true,
    };
  }

  if (mode === 'ambos') {
    return {
      status: 'Sin stock · disponible por encargo',
      help: 'Podés consultarnos para pedirlo por encargo.',
      action: 'Consultar por encargo',
      available: true,
    };
  }

  return {
    status: 'Sin stock',
    help: 'No hay unidades disponibles ahora. Consultanos por WhatsApp para verificar reposición.',
    action: 'Consultar reposición',
    available: false,
  };
}
