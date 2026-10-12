# Plan de colores de la landing de IngreSaaS

Objetivo: que el negro (en realidad un azul casi negro, `#070a18`) deje de predominar en el portal y que la landing use la paleta del logo nuevo de IngreSaaS.
Estado: **solo plan**, todavía no se aplicó ningún cambio de color.

## 1. Diagnóstico (lo que hay hoy)

| Dónde | Qué pasa | Ejemplo |
|---|---|---|
| `src/routes/index.tsx` (landing) | Fondo de toda la página oscuro | `bg-[#070a18] text-white` |
| `src/routes/terminos.tsx`, `src/routes/seguridad.tsx` | Mismo fondo oscuro | `bg-[#070a18]` |
| Landing | Tarjetas, franja de confianza, CTA final y footer en "azul-negro" translúcido | `#0d1330`, `#0a1028`, `#1a2452`, `bg-white/5` |
| Landing | Botón "Ingresar" casi negro | `bg-[#070a18]` |
| Landing | Colores que no son de la marca | morado `#8b5cf6`, `#a78bfa` en halos y degradados |
| `src/assets/hero-fintech-mockup.jpg` | Imagen del hero sobre fondo oscuro, promedio RGB ≈ (16, 27, 58) | tarjetas neón azul/verde |
| `src/styles.css` | La app interna ya es clara. Solo existe el modo `.dark` | `:root` claro, `--primary` azul |

La app interna (dashboard, facturas, etc.) ya usa fondo claro. El problema está en la landing y en las dos páginas legales.

## 2. Paleta (tomada del logo)

| Rol | Color | Uso |
|---|---|---|
| Azul marino | `#063266` | Texto "Ingre", títulos, fondo de secciones de contraste |
| Azul flecha | `#024A8E` | Color primario: botones, enlaces, íconos |
| Verde menta | `#02BE96` | Acento: "Saas", destacados, insignias, detalles |
| Verde profundo | `#00856B` | Verde para texto sobre blanco (el menta solo da contraste 2.4:1) |
| Gris del eslogan | `#424242` | Texto secundario |
| Fondo claro | `#F5F8FC` | Fondo base de página (blanco azulado) |
| Fondo alterno | `#EAF1F8` | Secciones alternas |
| Blanco | `#FFFFFF` | Tarjetas |

Contrastes calculados (WCAG): marino sobre blanco 13:1, azul sobre blanco 8.8:1, blanco sobre azul 8.8:1, marino sobre verde menta 5.7:1. Blanco sobre verde menta solo 2.4:1, por eso **nunca** va texto blanco sobre el verde menta: se usa texto marino.

Regla: el azul marino (`#063266`) puede ocupar como máximo 1 o 2 bloques de contraste por página (hero o CTA y footer). Nunca el fondo de toda la página.

## 3. Cambios por sección de la landing

| Sección | Hoy | Propuesto |
|---|---|---|
| Fondo de página | `#070a18` | `#F5F8FC`, texto `#063266` |
| Halos de fondo | azul, verde y morado difusos | halos suaves azul `#024A8E` y menta `#02BE96` al 8-12 %, sin morado |
| Header | Blanco translúcido, botón casi negro | Blanco; "Ingresar" en azul `#024A8E`; "Empezar" en degradado azul→menta |
| Hero: título | Degradado azul claro, verde y morado | Marino con la parte destacada en degradado `#024A8E`→`#02BE96` |
| Hero: subtítulo | Blanco 80 % | Gris `#424242` / slate-600 |
| Hero: botón principal | Degradado `#3b6ef5`→`#10b981` | Degradado `#024A8E`→`#02BE96`, texto blanco sobre la parte azul |
| Hero: botón secundario | Borde blanco translúcido | Borde `#024A8E`, texto `#024A8E`, fondo blanco |
| Hero: imagen | Mockup oscuro | Mockup claro nuevo (ver punto 5) |
| Franja de confianza | `bg-white/[0.02]` | Blanco con cifras en degradado azul→menta |
| Características | Tarjetas `white/4 %` sobre oscuro | Tarjetas blancas, borde `#E2EAF3`, sombra suave; ícono en cuadro con degradado azul→menta |
| Precios | Plan destacado `#1a2452`→`#0d1330` | Plan destacado en azul marino `#063266` (único bloque oscuro de la sección), otros planes blancos con borde |
| Precios: insignia "Popular" | degradado azul→verde | menta `#02BE96` con texto marino |
| CTA final | `#0d1330`→`#0a1028` | Bloque azul marino `#063266`→`#024A8E` con halo menta; **segundo y último bloque oscuro** |
| Footer | Casi negro | Fondo `#EAF1F8` con texto marino (o azul marino si se prefiere cierre oscuro); usar el logo oscuro o `logo-ingresaas-horizontal-light.png` según el fondo |
| Términos y Seguridad | Fondo `#070a18` | Mismo fondo claro y tarjetas blancas; cambiar el logo a la versión oscura |

## 4. Cómo implementarlo (sin tocar 47 clases a mano)

1. **Tokens de marca.** Agregar en `src/styles.css` variables `--brand-navy`, `--brand-blue`, `--brand-green`, `--brand-green-deep`, `--surface`, `--surface-alt` (en `oklch`, como pide el archivo) y registrarlas en `@theme inline` para poder usar `bg-brand-navy`, `text-brand-blue`, etc.
2. **Ajustar `--primary` y `--accent`** de `:root` a los colores del logo, para que la app interna también quede alineada (hoy `--primary` es un azul genérico).
3. **Landing:** reemplazar los hexadecimales literales (`#3b6ef5`, `#10b981`, `#070a18`, `#0d1330`…) por las clases de marca, y cambiar `text-white` / `border-white/*` / `bg-white/*` por sus equivalentes sobre fondo claro. Son ~47 ocurrencias en `index.tsx` y 3 en cada página legal.
4. **Un solo componente de logo** (`<BrandLogo variant="dark|light" />`) para que cada fondo use la variante correcta. Ya existen `logo-ingresaas-horizontal.png` (para fondo claro) y `logo-ingresaas-horizontal-light.png` (para fondo oscuro).
5. **Modo oscuro:** dejar el `.dark` existente tal cual; no se usa en la landing.

## 5. Piezas gráficas que hay que rehacer

- **Imagen del hero** (`hero-fintech-mockup.jpg`): es oscura y dejaría de pegar con el fondo claro. Hay que reemplazarla por una captura real del panel de IngreSaaS (fondo claro) o por un mockup nuevo en azul/menta sobre fondo claro.
- **Imagen para redes (`og:image`):** hoy apunta a una imagen externa antigua; conviene generar una nueva con el logo de IngreSaaS sobre fondo claro (1200×630).

## 6. Fases propuestas

| Fase | Contenido | Esfuerzo |
|---|---|---|
| 1 | Tokens de marca en `styles.css` + componente de logo | pequeño |
| 2 | Landing completa (`index.tsx`) a tema claro | mediano |
| 3 | `terminos.tsx` y `seguridad.tsx` | pequeño |
| 4 | Imagen del hero y `og:image` nuevas | depende de la imagen |
| 5 | Revisión visual en escritorio y celular, y de contraste | pequeño |

## 7. Decisiones pendientes

1. ¿Footer claro (`#EAF1F8`) o azul marino de cierre? Recomendado: azul marino, junto con el CTA final, para que el portal tenga un cierre firme sin ser negro.
2. ¿Hero con captura real del panel o un mockup nuevo ilustrado?
3. ¿Se mantiene el degradado azul→verde en botones? Recomendado: sí, es la firma visual del logo.

## 8. Qué no cambia

Ningún texto legal, precio ni lógica. Solo estilos, el logo y las imágenes del hero y de redes.
