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

## 15/10/2026 — Producto nuevo: Pisalma (separado de TermoCalm)
- Shopify: gid://shopify/Product/16018364793215, handle
  `pisalma-masajeador-de-pies-ems-con-mando-a-distancia`, ACTIVO, plantilla por
  defecto (no usa la de TermoCalm). Marca/vendor "Pisalma".
- AutoDS: producto 6ad0fdf9bd70fc0f9efbc94d, proveedor AliExpress 3256811521161420
  (YuKui-Healthy-H3 Store), región ES, envío gratis ~14 días.
  Pedido automático ACTIVADO; seguimiento de precio y de stock DESACTIVADOS.
- Variantes: "Con mando a distancia" 39,99 € (coste 9,48 €) y "Sin mando" 34,99 €
  (coste 9,16 €). Inventario sin seguimiento (se puede vender siempre).
- Descripción en /pisalma/descripcion.html, con aviso de uso seguro.
- Pendiente: fotos propias/limpias, página de producto a medida.

## 15/10/2026 (tarde) — Pisalma pasa a llamarse **Soléa Pulse**
- Título: "Soléa Pulse · Masajeador de Pies EMS con Mando a Distancia",
  handle `solea-pulse-masajeador-de-pies-ems` (redirección desde el antiguo), vendor "Soléa".
- Variante única "Con mando a distancia" a 35,99 € (coste ~9,48 €). "Sin mando" eliminada.
- Descripción ampliada (en /solea-pulse/descripcion.html) con "Diseñado para sentirse
  especial" y cierre "Compra con total tranquilidad".
- Fotos: 3 imágenes 2048x2048 del diseño de Canva DAHYGNBIf2I ("Soléa Pulse · Fotos tienda"):
  principal generada con IA (Canva) a partir del producto real, ficha de características
  y tarjeta de confianza. Las 8 fotos del proveedor se borraron.
- Canva: créditos de IA agotados y sin plan Pro (no hay quitar fondo). Faltan fotos de
  estilo de vida (pies sobre la alfombrilla, bajo el escritorio, detalle del mando).

## 15/10/2026 (noche) — Nombre definitivo: **Pulsia** · todo en BORRADOR
- El usuario NO quiere vender todavía: todo lo que se cree va en borrador.
  TermoCalm y Pulsia están en DRAFT. El tema TermoCalm sigue sin publicar.
- Producto: "Pulsia · Masajeador de Pies EMS con Mando a Distancia", handle
  `pulsia-masajeador-de-pies-ems`, vendor "Pulsia", 35,99 €. Descripción en /pulsia/.
- Fotos (diseño de Canva DAHYGNBIf2I, ahora "Pulsia · Fotos tienda"): principal,
  características y confianza, ya con el nombre PULSIA.
- Nombres descartados por el usuario: Pisalma, Soléa / Soléa Pulse.

## 16/10/2026 — Producto nuevo: **Vortix** (shaker eléctrico) · BORRADOR
- Shopify gid://shopify/Product/16020491469183, handle `vortix-shaker-electrico-proteinas`,
  vendor "Vortix", DRAFT. Descripción en /vortix/descripcion.html.
- AutoDS 6ad2415e35c9808409e79e45, proveedor CJdropshipping (CJYD209276603CX), región ES.
  Pedido automático activado; seguimiento de precio y stock desactivados.
  OJO: AutoDS muestra envío 0 € / 999 días y stock 0 (no cargó los datos de envío de CJ).
  Envío real CJ a España ≈ 6,2–6,8 € (12–25 días).
- 6 variantes a 29,99 €, sin inventario: Classic (Negro 5,34 · Blanco 3,77 · Crema 3,19 €)
  y Slim (Blanco · Rosa · Verde, 5,09 €). Costes sin envío.
- Fotos: 7 del proveedor sin texto en inglés (se borraron 5 con textos en inglés).
