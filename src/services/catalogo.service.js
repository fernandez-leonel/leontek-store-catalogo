
import { supabase } from '../lib/supabase.js';

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

function calcularDisponibilidad(variantes = []) {
  if (variantes.some((v) => v.cantidad > 0)) {
    return 'Disponible';
  }

  if (variantes.some((v) => v.modalidad === 'por_encargo')) {
    return 'Por encargo';
  }

  return 'Agotado';
}

function obtenerModelos(variantes = []) {
  const modelos = variantes
    .map((v) => {
      const modelo = v.modelos_dispositivo;

      if (!modelo) return null;

      return `${modelo.marca} ${modelo.modelo}`;
    })
    .filter(Boolean);

  return [...new Set(modelos)].join(', ') || 'Consultar modelo disponible';
}

function obtenerColores(variantes = []) {
  const colores = variantes
    .map((v) => v.color)
    .filter(Boolean);

  return [...new Set(colores)].join(', ') || 'Consultar colores';
}

function transformarProducto(producto, categorias, imagenes, variantes) {
  const categoria = categorias.find(
    (c) => c.id === producto.categoria_id
  );

  const imagenesProducto = imagenes
    .filter((i) => i.producto_id === producto.id)
    .sort((a, b) => a.orden - b.orden);

  const variantesProducto = variantes
    .filter((v) => v.producto_id === producto.id && v.activa);

  const imagenPrincipal =
    imagenesProducto.find((i) => i.principal) || imagenesProducto[0];

  return {
    id: producto.id,
    name: producto.nombre,
    category: categoriasPorSlug[categoria?.slug] || categoria?.slug || 'accesorios',
    description: producto.descripcion || '',
    models: obtenerModelos(variantesProducto),
    colors: obtenerColores(variantesProducto),
    price: Number(producto.precio),
    image: obtenerImagen(imagenPrincipal?.url),
    featured: producto.destacado,
    available: calcularDisponibilidad(variantesProducto),

    // Se conservan las variantes para poder crear el selector
    // de modelos, colores y stock en el catálogo.
    variants: variantesProducto.map((v) => ({
      id: v.id,
      modelId: v.modelo_id,
      model: v.modelos_dispositivo
        ? `${v.modelos_dispositivo.marca} ${v.modelos_dispositivo.modelo}`
        : null,
      color: v.color,
      stock: v.cantidad,
      modality: v.modalidad,
      available: v.cantidad > 0 || v.modalidad === 'por_encargo',
    })),

    images: imagenesProducto.map((i) => ({
      id: i.id,
      url: obtenerImagen(i.url),
      alt: i.texto_alternativo || producto.nombre,
      principal: i.principal,
    })),
  };
}

export async function obtenerCatalogo() {
  const { data: productos, error: errorProductos } = await supabase
    .from('productos')
    .select('*')
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
  ] = await Promise.all([
    idsCategorias.length
      ? supabase
          .from('categorias')
          .select('*')
          .in('id', idsCategorias)
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('imagenes_producto')
      .select('*')
      .in('producto_id', idsProductos)
      .order('orden', { ascending: true }),

    supabase
      .from('variantes_producto')
      .select('*')
      .in('producto_id', idsProductos)
      .eq('activa', true),
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

  const variantes = resultadoVariantes.data || [];
  const idsModelos = [
    ...new Set(variantes.map((v) => v.modelo_id).filter(Boolean)),
  ];

  let modelos = [];

  if (idsModelos.length) {
    const { data, error } = await supabase
      .from('modelos_dispositivo')
      .select('*')
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

  return productos.map((producto) =>
    transformarProducto(
      producto,
      resultadoCategorias.data || [],
      resultadoImagenes.data || [],
      variantesConModelo
    )
  );
}
