/**
 * LEONTEK STORE — CLIENTE Y HOOK DE SUPABASE REALTIME (CATÁLOGO PÚBLICO)
 * ============================================================================
 * Permite que el catálogo público (Cloudflare Pages) se actualice en tiempo real
 * cuando el administrador realiza cambios desde el panel local (Supabase).
 *
 * Principios de diseño:
 * 1. Cache Invalidation Pattern con Debounce: Los eventos de WebSocket actúan
 *    como señales livianas de invalidación. Múltiples escrituras concurrentes
 *    (ej. producto + imágenes + variantes) se consolidan en una sola recarga limpia.
 * 2. Consulta pública segura: No se inyectan registros crudos del WebSocket. Los
 *    datos se consultan mediante la API pública de Supabase respetando RLS
 *    (solo productos publicados, sin costos ni datos administrativos).
 * 3. Actualización no intrusiva: La recarga en segundo plano no activa skeletons
 *    ni recarga la página, manteniendo filtros, búsqueda, scroll y selección.
 * 4. Singleton con Ref-Counting: Mantiene una única conexión WebSocket compartida
 *    para evitar saturación de conexiones.
 * 5. Sincronización al volver a la pestaña (visibilitychange) y reconexión (online).
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export const CATALOG_CHANNEL_NAME = 'public-catalog-realtime';
export const DEFAULT_DEBOUNCE_MS = 350;
export const DEFAULT_FALLBACK_POLL_MS = 5 * 60 * 1000; // 5 minutos de respaldo pasivo

export const MONITORED_TABLES = [
  'productos',
  'categorias',
  'imagenes_producto',
  'variantes_producto',
  'inventarios_producto',
  'modelos_inventario_producto',
  'combos',
  'combos_componentes',
  'promociones',
  'promociones_productos',
  'promociones_categorias',
];

export class CatalogRealtimeManager {
  constructor(supabaseClient, options = {}) {
    this.supabase = supabaseClient;
    this.debounceMs = options.debounceMs || DEFAULT_DEBOUNCE_MS;
    this.fallbackPollMs = options.fallbackPollMs || DEFAULT_FALLBACK_POLL_MS;
    this.enableFallbackPolling = options.enableFallbackPolling !== false;

    this.subscribers = new Set();
    this.channel = null;
    this.connectionState = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
    this.debounceTimer = null;
    this.fallbackTimer = null;
    this.lastInvalidatedAt = 0;
    this.isSyncing = false;

    this.handleOnline = this.handleOnline.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowFocus = this.handleWindowFocus.bind(this);
  }

  /**
   * Suscribe un callback a eventos de cambio en el catálogo.
   * Inicia la conexión Realtime si es el primer suscriptor.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};

    this.subscribers.add(callback);

    if (this.subscribers.size === 1) {
      this.initConnection();
      this.bindWindowEvents();
    }

    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.cleanupConnection();
        this.unbindWindowEvents();
      }
    };
  }

  /**
   * Inicializa el canal de Supabase Realtime escuchando todas las entidades del catálogo.
   */
  initConnection() {
    if (!this.supabase || typeof this.supabase.channel !== 'function') {
      this.connectionState = 'ERROR';
      return;
    }

    if (this.channel) return;

    this.connectionState = 'CONNECTING';

    try {
      this.channel = this.supabase.channel(CATALOG_CHANNEL_NAME);

      // Escuchar cambios en cada una de las tablas del catálogo
      for (const table of MONITORED_TABLES) {
        this.channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => this.handleEvent(table, payload)
        );
      }

      // Canal de broadcast opcional para invalidaciones explícitas desde el administrador
      this.channel.on(
        'broadcast',
        { event: 'catalog_invalidate' },
        (payload) => this.handleEvent('broadcast_invalidate', payload)
      );

      this.channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.connectionState = 'CONNECTED';
          this.notifyStatusChange('CONNECTED');
        } else if (
          status === 'TIMED_OUT' ||
          status === 'CHANNEL_ERROR' ||
          status === 'CLOSED'
        ) {
          this.connectionState = 'DISCONNECTED';
          this.notifyStatusChange('DISCONNECTED', err);
        }
      });

      this.setupFallbackPolling();
    } catch (err) {
      console.warn('[CatalogRealtime] Error al iniciar canal WebSocket:', err);
      this.connectionState = 'ERROR';
    }
  }

  /**
   * Procesa eventos filtrando cambios que no afectan al catálogo público
   */
  handleEvent(entity, payload) {
    // Si es un producto que era borrador y sigue siendo borrador, ignorar
    if (
      entity === 'productos' &&
      payload?.new?.estado === 'borrador' &&
      payload?.old?.estado === 'borrador'
    ) {
      return;
    }

    // Si es un producto que estaba pausado y sigue pausado (sin cambiar a publicado), ignorar
    if (
      entity === 'productos' &&
      payload?.new?.estado === 'pausado' &&
      payload?.old?.estado === 'pausado'
    ) {
      return;
    }

    this.scheduleInvalidation({
      entity,
      eventType: payload?.eventType || 'UNKNOWN',
      timestamp: Date.now(),
    });
  }

  /**
   * Agrupa ráfagas de eventos en un único refresco consolidado (Debounce)
   */
  scheduleInvalidation(meta) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.triggerInvalidate(meta);
    }, this.debounceMs);
  }

  /**
   * Notifica a todos los suscriptores activos para que recarguen datos
   */
  triggerInvalidate(meta = {}) {
    this.lastInvalidatedAt = Date.now();
    for (const callback of this.subscribers) {
      try {
        callback(meta);
      } catch (err) {
        console.error('[CatalogRealtime] Error en callback de suscriptor:', err);
      }
    }
  }

  /**
   * Cierra el canal WebSocket y limpia timers
   */
  cleanupConnection() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.channel) {
      try {
        this.supabase.removeChannel(this.channel);
      } catch (_e) {
        // Ignorar si ya estaba cerrado
      }
      this.channel = null;
    }

    this.connectionState = 'DISCONNECTED';
  }

  /**
   * Listeners de ventana para reconexión y foco de pestaña
   */
  bindWindowEvents() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('focus', this.handleWindowFocus);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  unbindWindowEvents() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('focus', this.handleWindowFocus);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  handleOnline() {
    if (!this.channel || this.connectionState !== 'CONNECTED') {
      this.cleanupConnection();
      this.initConnection();
    }
    this.scheduleInvalidation({ reason: 'network_online' });
  }

  handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      const now = Date.now();
      // Si pasaron más de 30 segundos en segundo plano, sincronizar catálogo
      if (now - this.lastInvalidatedAt > 30000) {
        this.scheduleInvalidation({ reason: 'visibility_change' });
      }
    }
  }

  handleWindowFocus() {
    const now = Date.now();
    if (now - this.lastInvalidatedAt > 45000) {
      this.scheduleInvalidation({ reason: 'window_focus' });
    }
  }

  setupFallbackPolling() {
    if (!this.enableFallbackPolling || this.fallbackTimer) return;
    this.fallbackTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      this.triggerInvalidate({ reason: 'fallback_polling' });
    }, this.fallbackPollMs);
  }

  notifyStatusChange(state, _err) {
    this.connectionState = state;
  }
}

// Instancia singleton para reutilizar la conexión WebSocket
let globalManagerInstance = null;

export function getCatalogRealtimeManager(supabaseClient, options) {
  if (!globalManagerInstance || globalManagerInstance.supabase !== supabaseClient) {
    globalManagerInstance = new CatalogRealtimeManager(supabaseClient, options);
  }
  return globalManagerInstance;
}

/**
 * Hook de React para suscribir el catálogo a actualizaciones en tiempo real
 *
 * @param {object} supabaseClient - Cliente de Supabase
 * @param {function} onInvalidate - Callback a ejecutar cuando se detecta un cambio
 * @param {object} options - Opciones de configuración
 */
export function useCatalogRealtime(supabaseClient, onInvalidate, options = {}) {
  const { active = true, debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const onInvalidateRef = useRef(onInvalidate);
  const [connectionState, setConnectionState] = useState('CONNECTING');
  const [lastInvalidatedAt, setLastInvalidatedAt] = useState(0);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

  useEffect(() => {
    if (!active || !supabaseClient) return;

    const manager = getCatalogRealtimeManager(supabaseClient, { debounceMs });

    const unsubscribe = manager.subscribe((meta) => {
      setLastInvalidatedAt(Date.now());
      if (typeof onInvalidateRef.current === 'function') {
        onInvalidateRef.current(meta);
      }
    });

    setConnectionState(manager.connectionState);

    return () => {
      unsubscribe();
    };
  }, [supabaseClient, active, debounceMs]);

  const triggerRefresh = useCallback(() => {
    if (globalManagerInstance) {
      globalManagerInstance.triggerInvalidate({ reason: 'manual_trigger' });
    } else if (typeof onInvalidateRef.current === 'function') {
      onInvalidateRef.current({ reason: 'manual_trigger' });
    }
  }, []);

  return {
    connectionState,
    lastInvalidatedAt,
    triggerRefresh,
  };
}

/**
 * Reconciliador de listas de productos para actualizar en memoria
 * preservando el orden, variantes seleccionadas y evitando saltos de UI.
 */
export function reconcileProductList(currentList = [], incomingList = []) {
  if (!Array.isArray(incomingList)) return currentList;
  if (!Array.isArray(currentList) || currentList.length === 0) return incomingList;

  const incomingMap = new Map(incomingList.map((item) => [item.id, item]));

  // 1. Actualizar productos existentes conservando la lista
  const updated = currentList
    .filter((item) => incomingMap.has(item.id))
    .map((item) => ({
      ...item,
      ...incomingMap.get(item.id),
    }));

  // 2. Incorporar nuevos productos agregados
  const currentIds = new Set(currentList.map((i) => i.id));
  const trulyNew = incomingList.filter((item) => !currentIds.has(item.id));

  return [...updated, ...trulyNew];
}
