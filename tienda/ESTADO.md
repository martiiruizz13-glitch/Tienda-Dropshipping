# ESTADO de la tienda

- Tienda: smzt7r-bs.myshopify.com (admin: https://admin.shopify.com/store/smzt7r-bs)
- Carpeta del proyecto: /tienda (dentro del repositorio Tienda-Dropshipping)
- Tema base: Dawn (rama main, commit del 2026-08-10)
- Fase completada: 0 (entorno: Node 22 + Shopify CLI 4.9.3) y 2 (tema base descargado)
- Fase 1: conectado vía conector de Shopify (tienda "Mi tienda 2", plan Basic,
  EUR, España). La red del entorno sigue bloqueando *.shopify.com y
  *.myshopify.com, así que aún no se puede subir el tema con el CLI.
- Pendiente: brief (fase 3, rama B: sin producto).

## Producto leído
Ninguno: la tienda tiene 0 productos (12/10/2026). Cuando cree uno, asignarle
la plantilla `mt` y escribir título/descripción.

## Secciones creadas
(ninguna todavía)

## Decisiones de diseño
(pendiente del brief)

## 13/10/2026 — Tema "TermoCalm (Claude)" (id 201680290175, NO publicado)
- La tienda ya tiene producto: "TermoCalm · Almohadilla Térmica 30x60 cm"
  (54,99 €, sin precio tachado), con la plantilla `product.30-60cm-electric-heating`.
- El diseño real de la tienda es el tema TermoCalm (secciones `tc-*`), no la
  carpeta Dawn de `/tienda`. Las copias de lo que se edita van a `/termocalm`.
- Se sube con el conector de Shopify (themeFilesUpsert solo funciona en temas
  no publicados), porque la red de este entorno bloquea el CLI.
- `tc-antes-despues` rehecho: "De la rigidez al alivio", estados
  Rígida y cargada → Suelta y aliviada, panel de tensión muscular con silueta
  y puntos de tensión, tarjetas clicables, pista "Desliza", nota sanitaria.
  Estilos y JS van dentro de la propia sección (atributo `data-tc-ad2`), así
  que no depende de `tc-styles.css` ni de `tc-scripts.js`.
- Precio tachado falso: NO aplicado (ilegal en España/UE si no hubo precio
  anterior real). Pendiente de que el usuario elija una alternativa honesta.
