# LEONTEK STORE — Catálogo online

Catálogo independiente hecho con React + Vite. Incluye diseño adaptable, filtros por categoría, buscador, fichas de productos y consultas por WhatsApp.

## 1. Requisitos
- Node.js (versión LTS recomendada)
- VS Code (opcional, recomendado)

## 2. Ejecutar en tu computadora
1. Descomprimí el ZIP.
2. Abrí la carpeta `leontek-store-catalogo` en VS Code.
3. Abrí una terminal dentro de esa carpeta.
4. Ejecutá:

   ```bash
   npm install
   npm run dev
   ```

5. Abrí la dirección local que muestra Vite, normalmente `http://localhost:5173`.

Para comprobar la compilación de producción: `npm run build`.

## 3. Cómo agregar tus fotos
1. Copiá las fotos de tus productos a `public/images/productos/`.
2. Usá nombres simples, sin espacios ni tildes. Ejemplos:
   - `funda-silicona-iphone-13.jpg`
   - `funda-magsafe-iphone-15.jpg`
   - `vidrio-privacidad-samsung-a04.jpg`
3. Abrí `src/data/products.js`.
4. Encontrá el producto y editá la propiedad `image`. Ejemplo:

   ```js
   image: '/images/productos/funda-silicona-iphone-13.jpg',
   ```

5. Guardá el archivo. La página se actualiza sola si está ejecutándose.

**Importante:** la ruta comienza con `/images/productos/`, no con `public/`.

## 4. Cómo cambiar precios y datos
En `src/data/products.js`, cada producto tiene propiedades como estas:

```js
{
  id: 1,
  name: 'Funda de silicona',
  category: 'silicona',
  description: 'Terminación suave y variedad de colores.',
  models: 'iPhone 13 / consultar otros modelos',
  colors: 'Negro, azul, rosa',
  price: 8500,
  image: '/images/productos/funda-silicona-iphone-13.jpg',
  featured: true,
  available: 'Por encargo',
}
```

- `price`: precio final al público en pesos argentinos. Poné un número sin `$` ni puntos (ej. `8500`). Si todavía no definiste el precio, dejá `null` y aparecerá “Consultar precio”.
- `models`: modelos de celular compatibles. No publiques compatibilidad hasta confirmarla con el proveedor.
- `colors`: colores que realmente podés conseguir.
- `image`: ruta de la foto.
- `featured`: `true` muestra la etiqueta “DESTACADO”; `false` la oculta.
- `available`: por ejemplo, `En stock`, `Por encargo` o `Consultar`.
- `category`: debe ser una de las categorías existentes en `categories`.

Para agregar un producto nuevo, copiá un objeto, pegalo dentro del array `products`, cambiá el `id` por uno que no exista y completá sus datos. Separá cada objeto con una coma.

## 5. Configurar WhatsApp
En `src/App.jsx`, al comienzo, buscá:

```js
const WHATSAPP_NUMBER = '549XXXXXXXXXX';
```

Reemplazalo por tu número con código de país y característica, todo junto y solo números. Para Argentina suele comenzar con `549`; no agregues `+`, espacios ni guiones. Ejemplo de formato ficticio: `5493777123456`.

El botón de cada producto abre WhatsApp con un mensaje preparado. El cliente podrá completar el modelo de su celular y enviarte la consulta.

El Instagram ya está configurado como `@leontek_store`. Si cambia, editá `INSTAGRAM_URL` en `src/App.jsx`.

## 6. Qué incluye y qué no incluye
Incluye catálogo frontend, búsqueda, filtros, tarjetas de producto y enlaces de consulta. No incluye pagos online, base de datos, stock sincronizado ni panel privado de administración. Para esta primera versión, los productos y precios se editan en `src/data/products.js`.

## 7. Publicarlo en internet
Podés subir el proyecto a GitHub y desplegarlo con Vercel o Netlify. Antes de publicarlo, configurá tu WhatsApp, cargá fotos reales y revisá precios/modelos. Después de `npm run build`, los archivos listos para publicar quedan en la carpeta `dist`.
