/**
 * LEONTEK STORE — CLIENTE Y HOOK DE SUPABASE REALTIME (CATÁLOGO PÚBLICO)
 * ============================================================================
 * Permite que el catálogo público (Cloudflare Pages) se actualice en tiempo real
 * cuando el administrador realiza cambios desde el panel local (Supabase).
 *
 * Principios de diseño y ciclo de vida definitivo:
 * 1. Canal persistente mientras el catálogo esté abierto:
 *    En una SPA de comercio electrónico, el canal Realtime debe mantenerse activo
 *    y no ser destruido por ciclos de render o React StrictMode (autoTeardown = false).
 * 2. Reconexión no destructiva:
 *    No se destruye el canal con removeChannel() ante variaciones transitorias.
 *    Supabase / Phoenix Socket gestiona automáticamente los heartbeats (cada 30s)
 *    y re-une el canal si hay una desconexión de red.
 * 3. Invalidación rápida (Debounce 150ms con MaxWait 300ms):
 *    Múltiples escrituras concurrentes (producto, imágenes, variantes, stock)
 *    se consolidan en una sola recarga limpia sin retrasos perceptibles.
 * 4. Actualización silenciosa de React:
 *    La recarga en segundo plano no activa skeletons ni parpadeos,
 *    reconciliando productos en memoria sin perder filtros, búsqueda ni scroll.
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export const CATALOG_CHANNEL_NAME = 'public-catalog-realtime';
export const DEFAULT_DEBOUNCE_MS = 150;
export const MAX_DEBOUNCE_WAIT_MS = 300;
export const DEFAULT_FALLBACK_POLL_MS = 5 * 60 * 1000;

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

/**
 * Retorna la hora local con precisión de milisegundos para telemetría precisa
 */
export function getTimestamp() {
  const d = new Date();
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export class CatalogRealtimeManager {
  constructor(supabaseClient, options = {}) {
    this.supabase = supabaseClient;
    this.debounceMs = options.debounceMs || DEFAULT_DEBOUNCE_MS;
    this.maxWaitMs = options.maxWaitMs || MAX_DEBOUNCE_WAIT_MS;
    this.fallbackPollMs = options.fallbackPollMs || DEFAULT_FALLBACK_POLL_MS;
    this.enableFallbackPolling = options.enableFallbackPolling !== false;
    this.autoTeardown = options.autoTeardown === true; // En producción es false para mantener la conexión viva
    this.monitoredTables = options.monitoredTables || ['productos']; // Prueba mínima: exclusivamente productos

    this.subscribers = new Set();
    this.channel = null;
    this.connectionState = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
    this.debounceTimer = null;
    this.firstEventTime = null;
    this.fallbackTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.lastInvalidatedAt = 0;

    this.handleOnline = this.handleOnline.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Obtiene dinámicamente el estado exacto actual del socket y del canal
   */
  getConnectionStateString() {
    const isSocketOpen = Boolean(this.supabase?.realtime?.isConnected?.());
    const channelState = this.channel?.state || 'sin_canal';
    return `${this.connectionState} (Socket: ${isSocketOpen ? 'OPEN' : 'CLOSED'}, Canal: ${channelState})`;
  }

  /**
   * Suscribe un callback a eventos de cambio en el catálogo.
   * Inicia la conexión Realtime si el canal aún no existe o está desconectado.
   */
  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};

    this.subscribers.add(callback);

    if (!this.channel || this.connectionState === 'DISCONNECTED') {
      this.initConnection();
      this.bindWindowEvents();
    }

    return () => {
      this.subscribers.delete(callback);
      // Solo en modo de testing (autoTeardown: true) se destruye el canal al desuscribirse
      if (this.subscribers.size === 0 && this.autoTeardown) {
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

    // Si ya existe un canal activo o uniéndose, evitar suscripciones duplicadas
    if (this.channel && (this.channel.state === 'joined' || this.channel.state === 'joining')) {
      return;
    }

    this.connectionState = 'CONNECTING';

    try {
      this.channel = this.supabase.channel(CATALOG_CHANNEL_NAME);

      // Escuchar cambios exclusivamente en las tablas monitoreadas (prueba mínima: productos)
      for (const table of this.monitoredTables) {
        this.channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => this.handleEvent(table, payload)
        );
      }

      // Canal de broadcast opcional para invalidaciones explícitas
      this.channel.on(
        'broadcast',
        { event: 'catalog_invalidate' },
        (payload) => this.handleEvent('broadcast_invalidate', payload)
      );

      this.channel.subscribe((status, err) => {
        const ts = getTimestamp();
        if (status === 'SUBSCRIBED') {
          this.connectionState = 'CONNECTED';
          this.reconnectAttempts = 0;
          this.notifyStatusChange('CONNECTED');

          const registeredFilters = this.channel?.bindings?.postgres_changes?.map((b) => ({
            table: b.filter?.table || '*',
            event: b.filter?.event,
            serverId: b.id,
          }));

          console.info(`[CatalogRealtime] ✅ [${ts}] Conectado exitosamente al canal en tiempo real. Estado: ${this.getConnectionStateString()}`);
          console.info(`[CatalogRealtime] 📋 Filtros registrados (${registeredFilters?.length || 0}):`, registeredFilters);
        } else if (
          status === 'TIMED_OUT' ||
          status === 'CHANNEL_ERROR' ||
          status === 'CLOSED'
        ) {
          this.connectionState = 'DISCONNECTED';
          this.notifyStatusChange('DISCONNECTED', err);
          console.warn(`[CatalogRealtime] ⚠️ [${ts}] Estado del canal (${status}):`, err || 'Desconexión transitoria');
          this.scheduleReconnect();
        }
      });

      this.setupFallbackPolling();
    } catch (err) {
      const ts = getTimestamp();
      console.warn(`[CatalogRealtime] ❌ [${ts}] Error al iniciar canal WebSocket:`, err);
      this.connectionState = 'ERROR';
      this.scheduleReconnect();
    }
  }

  /**
   * Reintenta conectar de manera no destructiva (sin remover ni destruir el canal)
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.channel && this.channel.state !== 'joined') {
        const ts = getTimestamp();
        console.info(`[CatalogRealtime] 🔄 [${ts}] Reintentando suscripción al canal (intento #${this.reconnectAttempts})...`);
        try {
          this.channel.subscribe();
        } catch (_err) {
          // Si el canal estaba en un estado inválido, reinicializar limpiamente
          this.cleanupConnection();
          this.initConnection();
        }
      }
    }, delay);
  }

  /**
   * Procesa eventos filtrando cambios que no afectan al catálogo público
   */
  handleEvent(entity, payload) {
    const timeStr = getTimestamp();
    const wsStatus = this.getConnectionStateString();
    const eventType = payload?.eventType || payload?.event || 'UPDATE';
    const recordId = payload?.new?.id || payload?.old?.id || 'N/A';

    console.info(`[CatalogRealtime] 🔔 [${timeStr}] Hora de recepción del evento: '${entity}' (${eventType}) id=${recordId} | Estado WebSocket: ${wsStatus}`);

    // Si es un producto que era borrador y sigue siendo borrador, ignorar
    if (
      entity === 'productos' &&
      payload?.new?.estado === 'borrador' &&
      payload?.old?.estado === 'borrador'
    ) {
      console.info(`[CatalogRealtime] ⏭️ [${timeStr}] Ignorando cambio en producto no publicado (borrador).`);
      return;
    }

    // Si es un producto que estaba pausado y sigue pausado (sin cambiar a publicado), ignorar
    if (
      entity === 'productos' &&
      payload?.new?.estado === 'pausado' &&
      payload?.old?.estado === 'pausado'
    ) {
      console.info(`[CatalogRealtime] ⏭️ [${timeStr}] Ignorando cambio en producto pausado sin cambio de estado.`);
      return;
    }

    this.scheduleInvalidation({
      entity,
      eventType,
      recordId,
      timestamp: Date.now(),
      receivedAt: timeStr,
    });
  }

  /**
   * Agrupa ráfagas de eventos en un único refresco consolidado (Debounce con MaxWait)
   * Garantiza que la invalidación se ejecute sin demora excesiva incluso con múltiples eventos sucesivos.
   */
  scheduleInvalidation(meta) {
    const now = Date.now();
    const timeStr = getTimestamp();

    if (!this.firstEventTime) {
      this.firstEventTime = now;
    }

    // Si alcanzamos el tiempo máximo de espera desde el primer evento, invalidar inmediatamente
    if (now - this.firstEventTime >= this.maxWaitMs) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.firstEventTime = null;
      console.info(`[CatalogRealtime] ⚡ [${timeStr}] MaxWait (${this.maxWaitMs}ms) alcanzado. Invalidando inmediatamente.`);
      this.triggerInvalidate(meta);
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const remainingMaxWait = Math.max(0, this.maxWaitMs - (now - this.firstEventTime));
    const delay = Math.min(this.debounceMs, remainingMaxWait);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.firstEventTime = null;
      this.triggerInvalidate(meta);
    }, delay);
  }

  /**
   * Notifica a todos los suscriptores activos para que recarguen datos
   */
  triggerInvalidate(meta = {}) {
    this.lastInvalidatedAt = Date.now();
    const timeStr = getTimestamp();
    const wsStatus = this.getConnectionStateString();

    console.info(`[CatalogRealtime] 🔄 [${timeStr}] Disparando invalidación a suscriptores | Estado WebSocket: ${wsStatus}`);

    for (const callback of this.subscribers) {
      try {
        callback(meta);
      } catch (err) {
        console.error('[CatalogRealtime] Error en callback de suscriptor:', err);
      }
    }
  }

  /**
   * Cierra el canal WebSocket y limpia timers (usado al destruir la aplicación o en tests)
   */
  cleanupConnection() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.firstEventTime = null;

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
   * Destrucción explícita para pruebas unitarias o reinicio completo
   */
  destroy() {
    this.cleanupConnection();
    this.unbindWindowEvents();
    this.subscribers.clear();
  }

  /**
   * Listeners de ventana para reconexión y foco de pestaña
   */
  bindWindowEvents() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.handleOnline);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  unbindWindowEvents() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleOnline);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  handleOnline() {
    const ts = getTimestamp();
    console.info(`[CatalogRealtime] 🌐 [${ts}] Conexión de red recuperada (online). Verificando canal...`);
    if (this.channel && this.channel.state !== 'joined') {
      try {
        this.channel.subscribe();
      } catch (_e) {
        this.cleanupConnection();
        this.initConnection();
      }
    }
    this.scheduleInvalidation({ reason: 'network_online' });
  }

  handleVisibilityChange() {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'visible') {
      const now = Date.now();
      const ts = getTimestamp();

      // Si el canal no está unido, re-suscribirlo
      if (this.channel && this.channel.state !== 'joined') {
        console.info(`[CatalogRealtime] 👁️ [${ts}] Pestaña visible: re-suscribiendo canal inactivo...`);
        try {
          this.channel.subscribe();
        } catch (_e) {
          this.cleanupConnection();
          this.initConnection();
        }
      }

      // Respaldo pasivo: si pasaron más de 60 segundos en segundo plano, sincronizar catálogo
      if (now - this.lastInvalidatedAt > 60000) {
        console.info(`[CatalogRealtime] 👁️ [${ts}] Pestaña visible tras más de 60s sin sincronización. Sincronizando respaldo.`);
        this.scheduleInvalidation({ reason: 'visibility_change_backup' });
      }
    }
  }

  setupFallbackPolling() {
    if (this.enableFallbackPolling && !this.fallbackTimer) {
      this.fallbackTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        this.triggerInvalidate({ reason: 'fallback_polling' });
      }, this.fallbackPollMs);
      if (typeof this.fallbackTimer?.unref === 'function') {
        this.fallbackTimer.unref();
      }
    }
  }

  notifyStatusChange(state, _err) {
    this.connectionState = state;
  }
}

// Instancia singleton para reutilizar la conexión WebSocket en toda la aplicación
let globalManagerInstance = null;

export function getCatalogRealtimeManager(supabaseClient, options = {}) {
  if (!globalManagerInstance || (supabaseClient && globalManagerInstance.supabase !== supabaseClient)) {
    globalManagerInstance = new CatalogRealtimeManager(supabaseClient, options);
  }
  return globalManagerInstance;
}

/**
 * Hook de React para suscribir el catálogo a actualizaciones en tiempo real
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

  // 1. Conservar y actualizar productos existentes
  const updated = currentList
    .filter((item) => incomingMap.has(item.id))
    .map((item) => ({
      ...item,
      ...incomingMap.get(item.id),
    }));

  // 2. Incorporar nuevos productos agregados
  const currentIds = new Set(currentList.map((i) => i.id));
  const trulyNew = incomingList.filter((item) => !currentIds.has(item.id));

  // 3. Ordenar respetando la secuencia oficial de incomingList
  const incomingOrderMap = new Map(incomingList.map((item, index) => [item.id, index]));
  const result = [...updated, ...trulyNew];
  result.sort((a, b) => (incomingOrderMap.get(a.id) ?? 9999) - (incomingOrderMap.get(b.id) ?? 9999));

  return result;
}
