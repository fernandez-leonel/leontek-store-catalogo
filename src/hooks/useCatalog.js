import { useEffect, useState, useCallback } from 'react';
import { obtenerCatalogo, obtenerOfertas } from '../services/catalogo.service.js';

/**
 * Hook para gestionar la carga y sincronización del catálogo y ofertas desde Supabase.
 */
export function useCatalog() {
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState({ combos: [], promotions: [] });
  const [offersError, setOffersError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const loadData = useCallback(async () => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError('');

    try {
      const data = await obtenerCatalogo();
      if (cancelled) return;
      setProducts(data);

      try {
        const offerData = await obtenerOfertas(data);
        if (!cancelled) {
          setOffers(offerData);
          setOffersError('');
        }
      } catch (offersLoadError) {
        console.warn('Ofertas o combos no disponibles:', offersLoadError);
        if (!cancelled) {
          setOffers({ combos: [], promotions: [] });
          // Ocultar mensajes técnicos de migración y permisos al usuario final
          setOffersError('');
        }
      }
    } catch (error) {
      if (!cancelled) {
        setCatalogError(
          error instanceof Error ? error.message : 'Error desconocido al cargar el catálogo.'
        );
      }
    } finally {
      if (!cancelled) {
        setCatalogLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cleanup;
    loadData().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [loadData]);

  return {
    products,
    offers,
    offersError,
    catalogLoading,
    catalogError,
    refetch: loadData,
  };
}
