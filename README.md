# LEONTEK STORE — Catálogo online

Catálogo independiente hecho con React + Vite. Incluye diseño adaptable, filtros por categoría, buscador, fichas de productos y consultas por WhatsApp.

## 1. Requisitos
- Node.js (versión LTS recomendada)
- VS Code (opcional, recomendado)

## 2. Ejecutar en tu computadora
1. Abrí la carpeta `leontek-store-catalogo` en VS Code.
2. Configurá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env` con los valores publishable del proyecto Supabase existente.
3. Abrí una terminal dentro de esa carpeta y ejecutá:

   ```bash
   npm install
   npm run dev
   ```

4. Abrí la dirección local que muestra Vite, normalmente `http://localhost:5173`.

Para comprobar las reglas de stock y la compilación de producción: `npm test` y `npm run build`.

## 3. Fotos, precios y compatibilidades
Los productos publicados, sus precios, imágenes, modelos y stock se administran desde `leontek-store-admin` y se cargan desde el proyecto Supabase existente. No agregues productos publicados editando `src/data/products.js`; ese archivo mantiene las categorías de los filtros.

## 4. Configurar WhatsApp
En `src/App.jsx`, al comienzo, buscá:

```js
const WHATSAPP_NUMBER = '549XXXXXXXXXX';
```

Reemplazalo por tu número con código de país y característica, todo junto y solo números. Para Argentina suele comenzar con `549`; no agregues `+`, espacios ni guiones. Ejemplo de formato ficticio: `5493777123456`.

El botón de cada producto abre WhatsApp con un mensaje preparado. El cliente podrá completar el modelo de su celular y enviarte la consulta.

El Instagram ya está configurado como `@leontek_store`. Si cambia, editá `INSTAGRAM_URL` en `src/App.jsx`.

## 5. Grupos de stock
El catálogo obtiene productos, categorías, imágenes, variantes y grupos de inventario desde Supabase. Para vidrios templados, cada grupo tiene ID, modelos compatibles, cantidad y modalidad propios. El catálogo suma cada grupo compatible con el modelo seleccionado una sola vez; otros modelos y productos permanecen independientes. Las demás categorías conservan el stock individual por modelo y color.

Antes de desplegar, ejecutá en el SQL Editor del proyecto Supabase existente la migración `../leontek-store-admin/supabase/migrations/20261025190000_add_inventory_groups.sql`. Los stocks históricos por variante nunca se suman ni se borran automáticamente.

Las modalidades `stock`, `ambos` y `pedido` controlan los avisos y enlaces de consulta. El catálogo no procesa compras ni descuenta inventario: las consultas se realizan por WhatsApp. Ejecutá `npm test` y `npm run build` para validar cambios.

## 6. Publicarlo en internet
Podés subir el proyecto a GitHub y desplegarlo con Vercel o Netlify. Antes de publicarlo, configurá tu WhatsApp, cargá fotos reales y revisá precios/modelos. Después de `npm run build`, los archivos listos para publicar quedan en la carpeta `dist`.
