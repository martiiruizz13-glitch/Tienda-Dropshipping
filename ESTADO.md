# Estado del proyecto — Vortix (Mi tienda 2)

- Tienda: smzt7r-bs.myshopify.com
- Carpeta del tema: `vortix-theme/` (solo archivos propios `vx-*`; el resto del tema es un duplicado de "Pulsia (Claude)", base Dawn)
- Tema de trabajo: **Vortix Premium (Claude)** — `gid://shopify/OnlineStoreTheme/201894953343` (NO publicado)
- Vista previa: https://smzt7r-bs.myshopify.com/?preview_theme_id=201894953343
- Producto: `gid://shopify/Product/16020491469183` · handle `vortix-vaso-mezclador-electrico-proteinas` · plantilla `vortix`
- Proveedor (AutoDS): 69b30f2a9aa77e0001fd882a (CJ) · coste 2,85–4,77 + envío 6,16–6,75 → máx. ≈ 11,52 €
- Precio de venta: 39,95 € (≈ ×3,5 sobre el coste total más caro)

## Cómo se sube
Sin Shopify CLI: los archivos se suben con `themeFilesUpsert` (tipo URL) apuntando a
`raw.githubusercontent.com/.../<commit>/vortix-theme/...` (repo público).
Las plantillas se regeneran con `python3 vortix-theme/tools/build_templates.py`.

## Decisiones de diseño
- Paleta: tinta #141210, hueso #f1ece4, papel #faf7f2, acento naranja vórtice #ff5a1f
- Tipografía: Bricolage Grotesque (titulares) + Instrument Sans (texto)
- Movimiento: GSAP 3.12.5 + ScrollTrigger (servidos desde el CDN de Shopify), curvas ease-out,
  todo desactivado con `prefers-reduced-motion`
- Layout propio `layout/vortix.liquid` (cabecera, pie y carrito lateral propios)

## Secciones creadas
- vx-header: barra de avisos en movimiento + cabecera que se oculta al bajar
- vx-hero: preloader 0→7000 rpm, título con entrada por líneas, vórtice girando, parallax y tilt 3D
- vx-marquee: texto gigante en movimiento que se inclina con la velocidad del scroll
- vx-expand: imagen que se expande a pantalla completa al hacer scroll (pin + clip-path)
- vx-film: anuncio animado en bucle (polvo → líquido → botón → 7000 rpm → listo) o vídeo propio
- vx-stats: cifras con contador + barras comparativas animadas
- vx-people: galería horizontal con scroll (tarjetas con foto editable)
- vx-features: características con imagen fija (sticky) que cambia
- vx-compare: tabla comparativa
- vx-buy: galería, variantes, cantidad, añadir al carrito (AJAX), comprar ahora, fechas de entrega, barra flotante
- vx-reviews: nota media, reparto de estrellas, filtros, ver más, "útil", formulario de reseña (llega por email)
- vx-faq, vx-cta, vx-footer

## Pendiente
- Fotos de personas usando el vaso (IA o reales) → subirlas en "VX – Momentos" / "Imagen expansiva" / "Llamada final"
- Sustituir reseñas de ejemplo por reseñas reales (o instalar Judge.me) y desactivar la etiqueta "Ejemplo"
- Rellenar políticas en Configuración → Políticas
