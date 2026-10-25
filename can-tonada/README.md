# Can Tonada · web

Web de una sola página para **Can Tonada by Templo Cafés** (Sant Cugat Centre Comercial).
HTML + CSS + JS sin dependencias ni compilación: se puede subir tal cual a cualquier hosting
(Netlify, Vercel, GitHub Pages, el hosting actual…).

```
index.html   contenido (en castellano) y estructura
styles.css   diseño: colores, tipografías, animaciones
i18n.js      traducción al catalán (botón ES / CA)
main.js      menú móvil, carta por pestañas, horario en vivo, reservas
favicon.svg  icono de la pestaña
```

Para verla en local: abre `index.html` en el navegador o ejecuta `python3 -m http.server` en esta carpeta.

## Cambiar cosas habituales

- **Precios y platos**: en `index.html`, sección `<!-- ============ CARTA ============ -->`.
  Si cambias el texto en castellano de un plato, cambia también esa misma frase en `i18n.js`
  (es la clave de la traducción).
- **Fotos**: ahora son fotos de stock de Unsplash (uso libre). Lo ideal es sustituirlas por fotos
  propias de los platos y del local: guarda las imágenes en una carpeta `img/` y cambia el `src`
  de cada `<img>` (busca `images.unsplash.com`). Si una foto no carga, se muestra un fondo de color
  de la marca en su lugar.
- **Horario**: en `index.html` (tabla `.hours` y el bloque JSON-LD del `<head>`) y en `main.js` (`HOURS`).
- **Reservas**: el formulario abre el correo del cliente con la solicitud dirigida a
  `restaurant@cantonada.cat`. Si más adelante usáis CoverManager, TheFork, etc., se sustituye el
  formulario por su widget.
