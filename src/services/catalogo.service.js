
import { supabase } from '../lib/supabase.js';
import {
  esVidrioTemplado,
  normalizarModalidad,
  obtenerDisponibilidad,
} from '../lib/catalogo-stock.js';
import { calcularDisponibilidadCombo } from '../lib/ofertas.js';

const BUCKET_PRODUCTOS = 'Productos';

const categoriasPorSlug = {
  silicona: 'silicona',
  magsafe: 'magsafe',
  'transparentes-estampadas': 'transparentes',
  templados: 'templados',
  accesorios: 'accesorios',
};

function obtenerImagen(url) {
  if (!url) return '';

  // Si la base ya contiene una URL completa, la usamos directamente.
  if (/^https?:\/\//i.test(url)) return url;

  // Si contiene una ruta relativa dentro del bucket, obtenemos
  // su URL pública.
  const ruta = url.replace(/^\/+/, '');

  const { data } = supabase.storage
    .from(BUCKET_PRODUCTOS)
    .getPublicUrl(ruta);

  return data.publicUrl;
}

function calcularDisponibilidad(productoId, variantes = [], isTemperedGlass = false, inventoryGroups = []) {
  if (isTemperedGlass) {
    return inventoryGroups.some((group) => group.productId === productoId && group.models.length)
      ? 'Disponibilidad según modelo'
      : 'Consultar compatibilidad';
  }
  const availability = variantes.map((variant) =>
    obtenerDisponibilidad(variant.cantidad, variant.modalidad)
  );
  if (availability.some((state) => state.status.startsWith('Disponible'))) return 'Disponible';
  if (availability.some((state) => state.status === 'Por pedido')) return 'Por pedido';
  if (availability.some((state) => state.status.includes('encargo'))) return 'Por encargo';
  return 'Agotado';
}

function obtenerModelos(variantes = [], isTemperedGlass = false, inventoryGroups = []) {
  if (isTemperedGlass) {
    const groupModels = inventoryGroups.flatMap((group) => group.models.map((model) => model.name));
    return [...new Set(groupModels)].join(', ') || 'Consultar compatibilidad';
  }
  const modelos = variantes
    .map((v) => {
      const modelo = v.modelos_dispositivo;

      if (!modelo) return null;

      return `${modelo.marca} ${modelo.modelo}`;
    })
    .filter(Boolean);

  return [...new Set(modelos)].join(', ') || (isTemperedGlass
    ? 'Consultar compatibilidad'
    : 'Consultar modelo disponible');
}

function obtenerColores(variantes = [], isTemperedGlass = false) {
  if (isTemperedGlass) return '';
  const colores = variantes
    .map((v) => v.color)
    .filter(Boolean);

  return [...new Set(colores)].join(', ') || 'Consultar colores';
}

function transformarProducto(producto, categorias, imagenes, variantesPorProducto, inventoryGroupsPorProducto) {
  const categoria = categorias.find(
    (c) => c.id === producto.categoria_id
  );
  const isTemperedGlass = esVidrioTemplado(categoria);
  const inventoryGroups = inventoryGroupsPorProducto.get(producto.id) || [];

  const imagenesProducto = imagenes
    .filter((i) => i.producto_id === producto.id)
    .sort((a, b) => a.orden - b.orden);

  const variantesProducto = (variantesPorProducto.get(producto.id) || [])
    .filter((v) => v.activa);

  const imagenPrincipal =
    imagenesProducto.find((i) => i.principal) || imagenesProducto[0];

  return {
    id: producto.id,
    name: producto.nombre,
    categoryId: producto.categoria_id,
    category: isTemperedGlass
      ? 'templados'
      : categoriasPorSlug[categoria?.slug] || categoria?.slug || 'accesorios',
    categoryName: categoria?.nombre || '',
    description: producto.descripcion || '',
    models: obtenerModelos(variantesProducto, isTemperedGlass, inventoryGroups),
    colors: obtenerColores(variantesProducto, isTemperedGlass),
    price: Number(producto.precio),
    image: obtenerImagen(imagenPrincipal?.url),
    featured: producto.destacado,
    isTemperedGlass,
    inventoryGroups,
    available: calcularDisponibilidad(
      producto.id,
      variantesProducto,
      isTemperedGlass,
      inventoryGroups
    ),

    // Se conservan las variantes para poder crear el selector
    // de modelos, colores y stock en el catálogo.
    variants: isTemperedGlass
      ? [...new Map(inventoryGroups.flatMap((group) => group.models.map((model) => [
          model.id,
          {
            id: model.id,
            productId: producto.id,
            modelId: model.id,
            model: model.name,
            color: '',
            stock: 0,
            modality: 'stock',
            available: true,
          },
        ]))).values()]
      : variantesProducto.map((v) => ({
      id: v.id,
      productId: v.producto_id,
      modelId: v.modelo_id,
      model: v.modelos_dispositivo
        ? `${v.modelos_dispositivo.marca} ${v.modelos_dispositivo.modelo}`
        : null,
      color: v.color,
      stock: Number(v.cantidad || 0),
      modality: normalizarModalidad(v.modalidad),
      available: obtenerDisponibilidad(v.cantidad, v.modalidad).available,
    })),

    images: imagenesProducto.map((i) => ({
      id: i.id,
      url: obtenerImagen(i.url),
      alt: i.texto_alternativo || producto.nombre,
      principal: i.principal,
    })),
  };
}

async function obtenerFilasPaginadas(consulta, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await consulta().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function obtenerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, slug, activa, orden')
    .eq('activa', true)
    .order('orden', { ascending: true });

  if (error) {
    console.warn(`No se pudieron cargar las categorías: ${error.message}`);
    return [];
  }

  return data || [];
}

export async function obtenerCatalogo() {
  const { data: productos, error: errorProductos } = await supabase
    .from('productos')
    .select('id, nombre, categoria_id, descripcion, precio, destacado, orden, estado')
    .eq('estado', 'publicado')
    .order('orden', { ascending: true });

  if (errorProductos) {
    throw new Error(`No se pudieron cargar los productos: ${errorProductos.message}`);
  }

  if (!productos?.length) return [];

  const idsProductos = productos.map((p) => p.id);
  const idsCategorias = [
    ...new Set(productos.map((p) => p.categoria_id).filter(Boolean)),
  ];

  const [
    resultadoCategorias,
    resultadoImagenes,
    resultadoVariantes,
    resultadoInventarios,
    resultadoModelosInventario,
  ] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, slug, activa, orden')
      .eq('activa', true)
      .order('orden', { ascending: true }),

    supabase
      .from('imagenes_producto')
      .select('id, producto_id, url, principal, orden, texto_alternativo')
      .in('producto_id', idsProductos)
      .order('orden', { ascending: true }),

    supabase
      .from('variantes_producto')
      .select('id, producto_id, modelo_id, color, cantidad, modalidad, activa')
      .in('producto_id', idsProductos)
      .eq('activa', true),

    supabase
      .from('inventarios_producto')
      .select('id, producto_id, cantidad, modalidad')
      .in('producto_id', idsProductos),

    supabase
      .from('modelos_inventario_producto')
      .select('inventario_id, modelo_id, producto_id')
      .in('producto_id', idsProductos),
  ]);

  if (resultadoCategorias.error) {
    throw new Error(`No se pudieron cargar las categorías: ${resultadoCategorias.error.message}`);
  }

  if (resultadoImagenes.error) {
    throw new Error(`No se pudieron cargar las imágenes: ${resultadoImagenes.error.message}`);
  }

  if (resultadoVariantes.error) {
    throw new Error(`No se pudieron cargar las variantes: ${resultadoVariantes.error.message}`);
  }
  if (resultadoInventarios.error) {
    throw new Error(`No se pudieron cargar los inventarios compartidos: ${resultadoInventarios.error.message}`);
  }
  if (resultadoModelosInventario.error) {
    throw new Error(`No se pudieron cargar los modelos compatibles de inventario: ${resultadoModelosInventario.error.message}`);
  }

  const variantes = resultadoVariantes.data || [];
  const idsModelos = [
    ...new Set([
      ...variantes.map((v) => v.modelo_id),
      ...(resultadoModelosInventario.data || []).map((row) => row.modelo_id),
    ].filter(Boolean)),
  ];

  let modelos = [];

  if (idsModelos.length) {
    const { data, error } = await supabase
      .from('modelos_dispositivo')
      .select('id, marca, modelo')
      .in('id', idsModelos);

    if (error) {
      throw new Error(`No se pudieron cargar los modelos: ${error.message}`);
    }

    modelos = data || [];
  }

  const variantesConModelo = variantes.map((v) => ({
    ...v,
    modelos_dispositivo: modelos.find((m) => m.id === v.modelo_id) || null,
  }));

  const variantesPorProducto = new Map();
  for (const variante of variantesConModelo) {
    const productoVariantes = variantesPorProducto.get(variante.producto_id) || [];
    productoVariantes.push(variante);
    variantesPorProducto.set(variante.producto_id, productoVariantes);
  }
  const modeloPorId = new Map(modelos.map((modelo) => [
    modelo.id,
    `${modelo.marca} ${modelo.modelo}`,
  ]));
  const modelosPorInventario = new Map();
  for (const row of resultadoModelosInventario.data || []) {
    const associatedModels = modelosPorInventario.get(row.inventario_id) || [];
    if (!associatedModels.some((model) => model.id === row.modelo_id)) {
      associatedModels.push({
        id: row.modelo_id,
        name: modeloPorId.get(row.modelo_id) || '',
      });
    }
    modelosPorInventario.set(row.inventario_id, associatedModels);
  }
  const inventoryGroupsPorProducto = new Map();
  for (const group of resultadoInventarios.data || []) {
    const productGroups = inventoryGroupsPorProducto.get(group.producto_id) || [];
    productGroups.push({
      id: group.id,
      productId: group.producto_id,
      stock: Number(group.cantidad || 0),
      modality: normalizarModalidad(group.modalidad),
      models: modelosPorInventario.get(group.id) || [],
      modelIds: (modelosPorInventario.get(group.id) || []).map((model) => model.id),
    });
    inventoryGroupsPorProducto.set(group.producto_id, productGroups);
  }

  return productos.map((producto) =>
    transformarProducto(
      producto,
      resultadoCategorias.data || [],
      resultadoImagenes.data || [],
      variantesPorProducto,
      inventoryGroupsPorProducto
    )
  );
}

export async function obtenerOfertas(productos) {
  let combos;
  let componentesCombo;
  let promociones;
  let productosPromocion;
  let categoriasPromocion;
  try {
    [combos, componentesCombo, promociones, productosPromocion, categoriasPromocion] = await Promise.all([
      obtenerFilasPaginadas(() => supabase.from('combos')
        .select('id, slug, nombre, descripcion, imagen_url, precio')
        .order('nombre')),
      obtenerFilasPaginadas(() => supabase.from('combos_componentes')
        .select('combo_id, producto_id, variante_id, inventario_id, cantidad')),
      obtenerFilasPaginadas(() => supabase.from('promociones')
        .select('id, nombre, descripcion, tipo, valor, alcance, inicia_at, finaliza_at, prioridad, imagen_url, condiciones')),
      obtenerFilasPaginadas(() => supabase.from('promociones_productos')
        .select('promocion_id, producto_id')),
      obtenerFilasPaginadas(() => supabase.from('promociones_categorias')
        .select('promocion_id, categoria_id')),
    ]);
  } catch (error) {
    throw new Error(`No se pudieron cargar las ofertas: ${error.message}`);
  }

  const productosPorId = new Map((productos || []).map(producto => [producto.id, producto]));
  const promocionesMapeadas = promociones.map(promocion => ({
    ...promocion,
    estado: 'activa',
    productIds: productosPromocion
      .filter(row => row.promocion_id === promocion.id)
      .map(row => row.producto_id),
    categoryIds: categoriasPromocion
      .filter(row => row.promocion_id === promocion.id)
      .map(row => row.categoria_id),
  }));
  const combosMapeados = combos.map(combo => {
    const componentes = componentesCombo
      .filter(componente => componente.combo_id === combo.id)
      .map(componente => {
        const producto = productosPorId.get(componente.producto_id);
        const variante = producto?.variants.find(item => item.id === componente.variante_id);
        const grupo = producto?.inventoryGroups.find(item => item.id === componente.inventario_id);
        const destinoValido = componente.variante_id ? variante : grupo;
        const modelo = variante?.model || grupo?.models.map(item => item.name).filter(Boolean).join(', ');
        return {
          productId: componente.producto_id,
          variantId: componente.variante_id,
          inventoryId: componente.inventario_id,
          quantity: Number(componente.cantidad),
          stock: destinoValido ? Number(destinoValido.stock) : 0,
          productName: producto?.name || 'Producto no disponible',
          label: `${producto?.name || 'Producto no disponible'}${modelo ? ` · ${modelo}` : ''}${variante?.color ? ` / ${variante.color}` : ''}`,
        };
      });
    return {
      ...combo,
      image: obtenerImagen(combo.imagen_url),
      components: componentes,
      maxUnits: calcularDisponibilidadCombo(componentes),
    };
  });

  return { combos: combosMapeados, promotions: promocionesMapeadas };
}
