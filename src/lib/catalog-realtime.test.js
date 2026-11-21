import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CatalogRealtimeManager,
  getCatalogRealtimeManager,
  reconcileProductList,
  MONITORED_TABLES,
  CATALOG_CHANNEL_NAME,
} from './catalog-realtime.js';

// Mock de Supabase Client para pruebas de Realtime
function createMockSupabase() {
  const listeners = [];
  const channelMock = {
    on: (type, filter, handler) => {
      listeners.push({ type, filter, handler });
      return channelMock;
    },
    subscribe: (callback) => {
      if (typeof callback === 'function') {
        callback('SUBSCRIBED');
      }
      return channelMock;
    },
  };

  return {
    channel: (name) => {
      channelMock.name = name;
      return channelMock;
    },
    removeChannel: () => {},
    listeners,
  };
}

test('Realtime: MONITORED_TABLES includes all catalog impact entities', () => {
  const expected = [
    'productos',
    'categorias',
    'imagenes_producto',
    'variantes_producto',
    'inventarios_producto',
    'combos',
    'promociones',
  ];
  for (const table of expected) {
    assert.ok(
      MONITORED_TABLES.includes(table),
      `MONITORED_TABLES debe incluir ${table}`
    );
  }
});

test('Realtime: Manager initializes channel and subscribes on first subscriber', () => {
  const mockSupabase = createMockSupabase();
  const manager = new CatalogRealtimeManager(mockSupabase, { debounceMs: 50, autoTeardown: true });

  assert.equal(manager.subscribers.size, 0);
  assert.equal(manager.connectionState, 'DISCONNECTED');

  let callCount = 0;
  const unsubscribe = manager.subscribe(() => {
    callCount++;
  });

  assert.equal(manager.subscribers.size, 1);
  assert.equal(manager.connectionState, 'CONNECTED');
  assert.ok(manager.channel !== null);

  // Unsubscribe cleans up
  unsubscribe();
  assert.equal(manager.subscribers.size, 0);
  assert.equal(manager.connectionState, 'DISCONNECTED');
  assert.equal(manager.channel, null);
});

test('Realtime: Ref-counting shares single channel among multiple subscribers', () => {
  const mockSupabase = createMockSupabase();
  const manager = new CatalogRealtimeManager(mockSupabase, { debounceMs: 50, autoTeardown: true });

  const unsub1 = manager.subscribe(() => {});
  const unsub2 = manager.subscribe(() => {});

  assert.equal(manager.subscribers.size, 2);
  const activeChannel = manager.channel;
  assert.ok(activeChannel);

  // Removing 1 subscriber keeps the channel open
  unsub1();
  assert.equal(manager.subscribers.size, 1);
  assert.equal(manager.channel, activeChannel);

  // Removing last subscriber closes channel
  unsub2();
  assert.equal(manager.subscribers.size, 0);
  assert.equal(manager.channel, null);
});

test('Realtime: Event debouncing consolidates bursts into single invalidation', async () => {
  const mockSupabase = createMockSupabase();
  const manager = new CatalogRealtimeManager(mockSupabase, { debounceMs: 30 });

  let invalidateCount = 0;
  const unsubscribe = manager.subscribe(() => {
    invalidateCount++;
  });

  // Emulate rapid burst of 5 changes in different tables
  manager.handleEvent('productos', { eventType: 'UPDATE', new: { estado: 'publicado' } });
  manager.handleEvent('imagenes_producto', { eventType: 'INSERT' });
  manager.handleEvent('variantes_producto', { eventType: 'UPDATE' });
  manager.handleEvent('inventarios_producto', { eventType: 'UPDATE' });
  manager.handleEvent('combos', { eventType: 'UPDATE' });

  // Right away count should still be 0 because of debounce
  assert.equal(invalidateCount, 0);

  // Wait for debounce timer to fire
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(invalidateCount, 1, 'Múltiples eventos deben consolidarse en una sola invalidación');
  unsubscribe();
});

test('Realtime: Ignores draft-to-draft and paused-to-paused product changes', async () => {
  const mockSupabase = createMockSupabase();
  const manager = new CatalogRealtimeManager(mockSupabase, { debounceMs: 20 });

  let invalidateCount = 0;
  const unsubscribe = manager.subscribe(() => {
    invalidateCount++;
  });

  // Draft staying draft -> ignored
  manager.handleEvent('productos', {
    eventType: 'UPDATE',
    old: { estado: 'borrador' },
    new: { estado: 'borrador' },
  });

  // Paused staying paused -> ignored
  manager.handleEvent('productos', {
    eventType: 'UPDATE',
    old: { estado: 'pausado' },
    new: { estado: 'pausado' },
  });

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(invalidateCount, 0, 'No debe invalidar por cambios en borradores o pausados estáticos');

  // Transition from paused to publicado -> MUST invalidate
  manager.handleEvent('productos', {
    eventType: 'UPDATE',
    old: { estado: 'pausado' },
    new: { estado: 'publicado' },
  });

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(invalidateCount, 1, 'Debe invalidar cuando un producto cambia a publicado');

  // Transition from publicado to pausado -> MUST invalidate
  manager.handleEvent('productos', {
    eventType: 'UPDATE',
    old: { estado: 'publicado' },
    new: { estado: 'pausado' },
  });

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(invalidateCount, 2, 'Debe invalidar cuando un producto se despublica o pausa');

  unsubscribe();
});

test('Realtime: reconcileProductList updates existing, drops deleted/paused, and appends new', () => {
  const current = [
    { id: 1, name: 'Funda Silicona', price: 10000, orden: 1 },
    { id: 2, name: 'Vidrio 9D', price: 5000, orden: 2 },
    { id: 3, name: 'Funda MagSafe', price: 12000, orden: 3 }, // Will be paused/deleted
  ];

  const incoming = [
    { id: 1, name: 'Funda Silicona', price: 9500, orden: 1 }, // Updated price
    { id: 2, name: 'Vidrio 9D', price: 5000, orden: 2 },      // Unchanged
    { id: 4, name: 'Cargador 20W', price: 15000, orden: 4 },  // Truly new
  ];

  const result = reconcileProductList(current, incoming);

  assert.equal(result.length, 3);
  // Item 1 price updated
  assert.equal(result.find((p) => p.id === 1).price, 9500);
  // Item 2 kept
  assert.equal(result.find((p) => p.id === 2).name, 'Vidrio 9D');
  // Item 3 removed because it is no longer published in incoming
  assert.equal(result.find((p) => p.id === 3), undefined);
  // Item 4 appended
  assert.equal(result.find((p) => p.id === 4).name, 'Cargador 20W');
});
