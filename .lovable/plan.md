## Arreglo de la tabla Clientes

### Causa raíz
- En `src/routes/_authenticated/clientes.tsx` el `AccordionTrigger` usa `grid-cols-subgrid col-span-4`, pero Radix envuelve el trigger en un `<AccordionPrimitive.Header>` (flex). Ese wrapper rompe la cadena de subgrid → las 4 columnas se colapsan al ancho de la primera letra.
- Además el botón Editar está fuera del trigger, lo que desalinea aún más la fila respecto al encabezado.

### Cambios (solo `src/routes/_authenticated/clientes.tsx`)

1. **Definir una sola plantilla de columnas** reutilizada por el header y por cada fila:
   `grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]`
   - Razón social · Documento · Teléfono · Email · acciones.
   - `minmax(0, …)` permite que `truncate` funcione dentro de la celda.

2. **Reestructurar cada `AccordionItem`:**
   - El `AccordionTrigger` pasa a ser él mismo la grid con esa plantilla (sin subgrid, sin `col-span`). El icono chevron se ubica en una celda propia al final del trigger.
   - El botón Editar se saca del trigger y se renderiza como hermano absoluto a la derecha de la fila, dentro de un contenedor `relative`, con `onClick` que detiene la propagación para no abrir/cerrar el acordeón.
   - Cada celda usa `truncate` y `text-left` para que el texto se lea completo dentro del ancho asignado.

3. **Responsive:**
   - En `md+` se muestran las 4 columnas alineadas con el header.
   - En móvil (`<md`) se oculta el header y la fila pasa a layout apilado de 2 líneas: línea 1 razón social + chevron + editar; línea 2 documento · teléfono · email en texto pequeño con `truncate`. Esto evita el colapso vertical que se ve en la captura cuando el viewport es estrecho.

4. **Detalle del contenido expandido (`AccordionContent`)** se mantiene igual (tipo documento, provincia, dirección, listas de cotizaciones y facturas).

### Resultado esperado
- En el viewport actual (~1067px) las 4 columnas se alinean perfectamente bajo su encabezado, con textos legibles y truncado elegante cuando exceden el ancho.
- El botón Editar queda siempre visible a la derecha sin interferir con el toggle del acordeón.
- En móvil la información se reorganiza en líneas apiladas legibles.

### Archivos
- `src/routes/_authenticated/clientes.tsx` (único cambio).