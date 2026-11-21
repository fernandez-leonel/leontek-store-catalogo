/**
 * Categorías oficiales de respaldo para el catálogo LEONTEK STORE.
 */
export const categories = [
  { id: 'todos', label: 'Todos' },
  { id: 'silicona', label: 'Silicona' },
  { id: 'magsafe', label: 'MagSafe' },
  { id: 'transparentes', label: 'Transparentes y estampadas' },
  { id: 'templados', label: 'Vidrios templados' },
  { id: 'accesorios', label: 'Accesorios' },
];

/**
 * Normaliza el slug de una categoría para asegurar compatibilidad
 * con las vistas y filtros del catálogo.
 */
export function normalizarCategoriaId(slug) {
  if (!slug) return 'accesorios';
  const mapa = {
    'transparentes-estampadas': 'transparentes',
  };
  return mapa[slug] || slug;
}

/**
 * Construye la lista de categorías dinámica a partir de las categorías activas
 * de Supabase, manteniendo 'todos' al inicio y fallback a las categorías oficiales.
 */
export function construirCategoriasDinamicas(categoriasDb) {
  if (!Array.isArray(categoriasDb) || !categoriasDb.length) {
    return categories;
  }

  const items = [{ id: 'todos', label: 'Todos' }];

  for (const cat of categoriasDb) {
    const id = normalizarCategoriaId(cat.slug);
    if (!items.some((item) => item.id === id)) {
      items.push({
        id,
        label: cat.nombre || id,
      });
    }
  }

  return items;
}

/**
 * Datos de respaldo para catálogo local en caso de ser requeridos.
 * En producción el catálogo se sincroniza dinámicamente desde Supabase.
 */
export const products = [];
