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
  getTimestamp,
  getCatalogRealtimeManager,
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
  const needsRefetchRef = useRef(false);

  /**
   * Helper para obtener el estado WebSocket en vivo en el momento exacto del log
   */
  const getLiveWsStatus = useCallback(() => {
    return getCatalogRealtimeManager(supabase)?.getConnectionStateString?.() || 'N/A';
  }, []);

  /**
   * Carga los datos públicos del catálogo.
   * Si options.background es true (ej: actualización Realtime), no activa skeletons
   * para no interrumpir la navegación, búsqueda o selección del usuario.
   */
  const loadData = useCallback(async ({ background = false } = {}) => {
    const startTime = performance.now();
    const timeStartStr = getTimestamp();

    // Si ya hay una consulta HTTP en curso, agendar otra para cuando termine sin perderla
    if (isFetchingRef.current) {
      console.info(`[useCatalog] ⏸️ [${timeStartStr}] Consulta en vuelo. Encolando recarga inmediata para cuando finalice.`);
      needsRefetchRef.current = true;
      return;
    }
    isFetchingRef.current = true;

    if (!background) {
      setCatalogLoading(true);
      setCatalogError('');
    } else {
      console.info(`[useCatalog] 📥 [${timeStartStr}] Hora de inicio de la consulta (segundo plano) | Estado WebSocket: ${getLiveWsStatus()}`);
    }

    try {
      const [data, categoriasDb] = await Promise.all([
        obtenerCatalogo(),
        obtenerCategorias(),
      ]);

      if (background) {
        setProducts((prev) => {
          const reconciled = reconcileProductList(prev, data);
          return reconciled;
        });
      } else {
        setProducts(data);
      }

      if (categoriasDb && categoriasDb.length) {
        setCategories(construirCategoriasDinamicas(categoriasDb));
      }

      const durationMs = Math.round(performance.now() - startTime);
      const timeEndStr = getTimestamp();
      console.info(`[useCatalog] ✅ [${timeEndStr}] Hora de finalización de la consulta (duración: ${durationMs}ms, ${data.length} productos) | Estado WebSocket: ${getLiveWsStatus()}`);

      // Las ofertas se cargan de forma desacoplada para que los productos se actualicen de inmediato en pantalla
      obtenerOfertas(data)
        .then((offerData) => {
          setOffers(offerData);
          setOffersError('');
        })
        .catch((offersErr) => {
          if (!background) {
            setOffers({ combos: [], promotions: [] });
          }
          setOffersError('');
          console.warn('[useCatalog] Advertencia al sincronizar ofertas:', offersErr?.message);
        });

    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const timeEndStr = getTimestamp();
      console.warn(`[useCatalog] ❌ [${timeEndStr}] Error en consulta de catálogo (${durationMs}ms):`, error);
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
      // Si se produjo una invalidación mientras la petición estaba en vuelo, ejecutarla ahora
      if (needsRefetchRef.current) {
        needsRefetchRef.current = false;
        console.info('[useCatalog] 🔁 Ejecutando recarga encolada pendiente...');
        loadData({ background: true });
      }
    }
  }, [getLiveWsStatus]);

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
