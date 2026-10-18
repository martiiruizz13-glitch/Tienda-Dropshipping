# Zaldori · Sistema visual

Dirección: **«La exposición Zaldori»**. La página es una galería con tres salas; cada producto es un objeto expuesto con su cartela (etiqueta de museo), y la cartela es el bloque de compra.

Código: `theme/assets/zd.css` (tokens en `:root`), `theme/assets/zd.js` (movimiento y compra), secciones `theme/sections/zd-*.liquid`.

## Paleta

| Token | Valor | Uso |
| --- | --- | --- |
| `--zd-paper` | `#FAF7F2` | Fondo principal (blanco cálido) |
| `--zd-bone` | `#EFE8DD` | Fondo secundario: campaña, pie |
| `--zd-ink` | `#1F1A17` | Texto, botones neutros, sección de confianza |
| `--zd-ink-2` | `#5C524B` | Texto secundario (7,1:1 sobre paper) |
| `--zd-rasp` | `#B7355E` | **Único acento**: logo, botón de compra, «Descansa.» |
| `--zd-rasp-deep` | `#9E2A4F` | Hover y texto pequeño en rosa sobre tintes |
| `--zd-rasp-soft` | `#F0A9BF` | Rosa legible sobre fondo oscuro (9,1:1) |
| `--zd-wine` | `#6E1F3A` | Único secundario derivado del rosa (escala de calor, frases) |
| `--zd-sage` / `--zd-sand` / `--zd-rose` | `#DDE3D8` / `#EBDDCB` / `#F2DFE2` | Color de sala: Vortix / TermoCalm / Pulsia |

Contraste comprobado: rosa `#B7355E` sobre paper 5,3:1 (AA texto normal); sobre tintes 4,3–4,5:1, por eso en tintes el texto pequeño usa tinta o `--zd-rasp-deep`. Sobre `--zd-ink` el rosa solo da 3,0:1: allí se usa `--zd-rasp-soft`. Sin degradados decorativos (el único degradado oscurece la base de la banda fotográfica para leer el texto).

## Tipografía

- **Manrope** 700–800 para titulares, tracking −0,035/−0,05 em, interlineado 0,86–1,02.
- **Inter** 400–600 para texto y controles. Fallbacks métricos (`size-adjust`) para evitar saltos al cargar.
- Escala fluida con `clamp()` y tope en `vw` (resiste texto al 200 %): display 3–6 rem, nombre de sala 3,5–9 rem, h2 2–3,75 rem, entradilla 1,125–1,375 rem, cuerpo 1 rem, micro 0,75 rem (mayúsculas espaciadas solo en etiquetas de cartela).
- Cifras tabulares en precios y fichas.

## Espaciado y retícula

Escala de 8 pt: 4, 8, 12, 16, 24, 32, 48, 64 y dos pasos fluidos (72–128, 104–192 px). Retícula de 12 columnas en escritorio, margen lateral `clamp(16px, 4vw, 48px)`, ancho máximo 1440 px. Más aire encima de un titular que debajo.

## Componentes

- **Botones**: rectangulares (radio 4 px), 52 px de alto (44 px mínimo táctil). Primario rosa para comprar; tinta para navegar. Feedback `scale(0.97)` al pulsar; estados *cargando* (spinner), *añadido* (check) y *agotado* (deshabilitado).
- **Cartela** (`.zd-label`): número de sala en micro, filetes de 1 px, pares dato/valor. Se usa en salas, bloque de compra y selector.
- **Variantes**: radios reales; si el valor tiene la forma «Modelo · Color» se agrupan por modelo con muestra de color.
- **Imágenes**: marcos con radio 18–28 px que el scroll lleva a 0. Fotos de proveedor con fondo blanco se colocan «sobre la pared» de la sala (`mix-blend-mode: multiply`). Sin sombras.
- **Acordeones**: `<details>` nativos, altura animada solo donde el navegador lo soporta.

## Movimiento

| Token | Valor |
| --- | --- |
| `--zd-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` (entradas de interfaz) |
| `--zd-ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` |
| `--zd-ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` (cajón y menú) |
| Pulsación | 120 ms · interfaz 200–240 ms · cajón 420 ms |
| Narrativa (scroll) | GSAP `expo.out` 0,8–1,2 s; scrub 0,4–0,8; stagger 70–80 ms |

Momentos: preloader (Z dibujada, < 1,6 s, solo primera visita de la sesión), entrada del hero por máscara, **salas fijadas** (tinte, marco que crece, nombre por máscara, snap a cada sala), **expansión** de Vortix (inset redondeado → pantalla completa, reversible), parallax en TermoCalm y collage de profundidad en Pulsia. Solo `transform`, `opacity` y `clip-path`.

## Reglas por dispositivo

- **Escritorio con ratón**: Lenis, hover (solo `@media (hover: hover) and (pointer: fine)`), botón magnético en la CTA del hero.
- **Móvil**: salas fijadas más cortas con marco al 46 % de alto, expansión sin pin, carrusel de campaña con snap, selector en pestañas, barra de compra fija con zona segura inferior.
- **Movimiento reducido**: sin pins, sin parallax ni desplazamientos; fundidos de opacidad cortos; cajón y menú aparecen por opacidad.
