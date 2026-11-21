import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  obtenerCatalogo,
  obtenerCategorias,
  obtenerOfertas,
} from '../services/catalogo.service.js';
import {
  categories as defaultCategories,
  construirCategoriasDinamicas,
} from '../data/products.js';
import {
  useCatalogRealtime,
  reconcileProductList,
} from '../lib/catalog-realtime.js';

/**
 * Hook para gestionar la carga, caché y sincronización en tiempo real
 * del catálogo y ofertas de LEONTEK STORE desde Supabase.
 *
 * @param {object} options
 * @param {boolean} options.enableRealtime - Activar suscripción Realtime (por defecto true)
 * @param {number} options.debounceMs - Tiempo de consolidación de eventos en ms
 */
export function useCatalog(options = {}) {
  const { enableRealtime = true, debounceMs } = options;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [offers, setOffers] = useState({ combos: [], promotions: [] });
  const [offersError, setOffersError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const isInitialMount = useRef(true);
  const isFetchingRef = useRef(false);

  /**
   * Carga los datos públicos del catálogo.
   * Si options.background es true (ej: actualización Realtime), no activa skeletons
   * para no interrumpir la navegación, búsqueda o selección del usuario.
   */
  const loadData = useCallback(async ({ background = false } = {}) => {
    // Evitar múltiples peticiones HTTP concurrentes si ya hay una en curso
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!background) {
      setCatalogLoading(true);
      setCatalogError('');
    }

    try {
      const [data, categoriasDb] = await Promise.all([
        obtenerCatalogo(),
        obtenerCategorias(),
      ]);

      if (background) {
        setProducts((prev) => reconcileProductList(prev, data));
      } else {
        setProducts(data);
      }

      if (categoriasDb && categoriasDb.length) {
        setCategories(construirCategoriasDinamicas(categoriasDb));
      }

      try {
        const offerData = await obtenerOfertas(data);
        setOffers(offerData);
        setOffersError('');
      } catch (offersLoadError) {
        // En modo background, no destruir ofertas existentes si una petición aislada falla
        if (!background) {
          setOffers({ combos: [], promotions: [] });
        }
        setOffersError('');
      }
    } catch (error) {
      console.warn('[useCatalog] Error al cargar catálogo:', error);
      if (!background) {
        setCatalogError(
          error instanceof Error
            ? error.message
            : 'Error desconocido al cargar el catálogo.'
        );
      }
    } finally {
      isFetchingRef.current = false;
      if (!background) {
        setCatalogLoading(false);
      }
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData({ background: false });
    }
  }, [loadData]);

  // Manejador de invalidación por tiempo real
  const handleRealtimeChange = useCallback(
    (_meta) => {
      // Actualización silenciosa en segundo plano
      loadData({ background: true });
    },
    [loadData]
  );

  // Suscripción Realtime a través del hook unificado
  const { connectionState, lastInvalidatedAt, triggerRefresh } =
    useCatalogRealtime(supabase, handleRealtimeChange, {
      active: enableRealtime,
      debounceMs,
    });

  return {
    products,
    categories,
    offers,
    offersError,
    catalogLoading,
    catalogError,
    realtimeStatus: {
      connectionState,
      lastInvalidatedAt,
    },
    refetch: () => loadData({ background: false }),
    refreshRealtime: triggerRefresh,
  };
}

export default useCatalog;
