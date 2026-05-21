
# Plan — Módulo de Nómina (República Dominicana)

Módulo completo de nómina integrado a Balance Activo, cumpliendo con la legislación laboral dominicana (Código de Trabajo Ley 16-92, Ley 87-01 de Seguridad Social, Ley 11-92 Código Tributario).

## Alcance funcional

### 1. Gestión de empleados
- CRUD de empleados: nombre, cédula, fecha nacimiento, sexo, estado civil, dirección, teléfono, email, cuenta bancaria.
- Datos laborales: fecha ingreso, fecha salida, departamento, cargo, tipo contrato (indefinido/fijo/obra), jornada, salario base, forma de pago (mensual/quincenal/semanal).
- Dependientes (para cálculo ISR exento por familia).
- Estado: activo, suspendido, terminado (con causa: desahucio, despido justificado, dimisión, mutuo acuerdo).

### 2. Configuración de nómina (por empresa)
- Período de pago (mensual / quincenal / semanal).
- Departamentos y cargos.
- Conceptos personalizados (ingresos y deducciones).
- Tasas vigentes TSS y DGII (sembradas, editables por admin).

### 3. Cálculo de nómina
Procesar una nómina por período con:

**Ingresos**
- Salario base (proporcional a días trabajados)
- Horas extras (35 % diurnas, 100 % nocturnas / domingos / feriados)
- Comisiones, bonificaciones, incentivos
- Vacaciones disfrutadas

**Deducciones legales (Ley 87-01)**
- SFS (Seguro Familiar de Salud): empleado 3.04 %, empleador 7.09 %
- AFP (pensiones): empleado 2.87 %, empleador 7.10 %
- SRL (Riesgos Laborales): solo empleador, ~1.10 %
- INFOTEP: solo empleador, 1 % nómina + 0.5 % utilidades distribuidas
- Tope cotizable: salario hasta 10 SMN para AFP, 10 SMN para SFS

**ISR (Art. 296 CT)** — escala anual 2026 vigente, prorrateada al período:
- Exento hasta RD$416,220.00
- 15 %, 20 %, 25 % por tramo
- Base = salario bruto − (SFS + AFP empleado)

**Otras deducciones**
- Préstamos / adelantos
- Embargos judiciales
- Cooperativas, seguros voluntarios

### 4. Prestaciones laborales y beneficios anuales
- **Regalía Pascual (Art. 219 CT)**: 1/12 del salario anual, pagadera antes del 20 dic. Exenta de ISR hasta 1 SMN.
- **Bonificación (Art. 223)**: 10 % utilidades, tope 45–60 días según antigüedad.
- **Vacaciones (Art. 177)**: 14 días año 1–5, 18 días después.
- **Cesantía / preaviso** en terminaciones: calculadora con días por años trabajados.

### 5. Reportes y archivos oficiales
- **Volante de pago** (PDF descargable / enviable por email) por empleado.
- **Pre-nómina y nómina cerrada** (planilla mensual).
- **TSS — Archivo de Autodeterminación** (formato .txt según especificación SUIR+).
- **DGII IR-3** (retenciones ISR asalariados, mensual).
- **DGII IR-4** (informativa anual de retenciones).
- **Planilla de Personal Fijo (DGT-3)** para Ministerio de Trabajo.
- Reportes gerenciales: costo total por departamento, evolución, vacaciones disponibles.

### 6. Integración contable
Cada nómina cerrada genera asiento automático:
- Débito: Gastos de Sueldos, Gastos TSS patronal, Gastos INFOTEP
- Crédito: Sueldos por Pagar, TSS por Pagar (empleado + empleador), ISR Retenido por Pagar, Préstamos a Empleados

Al pagar la nómina → asiento contra Banco/Caja. Al pagar TSS/DGII → cancela los pasivos.

## Arquitectura técnica

### Base de datos (nuevas tablas, todas con `tenant_id` + RLS)

```
empleados            datos personales y laborales
departamentos        catálogo
cargos               catálogo
nominas              cabecera de período (mes, tipo, estado: borrador/cerrada/pagada, asiento_id)
nomina_detalle       una fila por empleado/nómina con totales calculados
nomina_conceptos     ingresos/deducciones de cada detalle (tipo, concepto, monto)
prestamos_empleado   saldo, cuota, descontar_en_nomina
ausencias            vacaciones, licencias, permisos
tss_tasas            histórico de tasas legales (sfs, afp, srl, infotep, smn)
isr_escalas          tramos anuales vigentes
terminaciones        liquidación final: preaviso, cesantía, vacaciones, regalía proporcional
```

### Server functions (`createServerFn` + `requireSupabaseAuth`)
- `procesarNomina(periodo_id)` — calcula todos los empleados, crea borrador
- `cerrarNomina(id)` — bloquea y genera asiento contable
- `registrarPagoNomina(id, metodo)` — asiento de salida de banco
- `generarArchivoTSS(periodo)` — devuelve .txt SUIR+
- `generarIR3(mes, anio)` — devuelve formato DGII
- `calcularPrestaciones(empleado_id, motivo)` — preaviso + cesantía + vacaciones + regalía
- `generarRegaliaPascual(anio)` — corre el cálculo en diciembre

### RBAC
- **Administrador**: todo.
- **Contador**: ver nóminas, cerrar, generar archivos fiscales, asientos.
- **Agente de Facturación**: sin acceso.
- Nuevo rol opcional **`gestor_nomina`** (RR.HH.) que pueda gestionar empleados y procesar nóminas sin tocar contabilidad/facturación.

### UI (nuevas rutas bajo `_authenticated/`)
```
/nomina                   dashboard del módulo
/nomina/empleados         listado + búsqueda + filtros
/nomina/empleados/nuevo   alta con tabs (personal / laboral / bancario / dependientes)
/nomina/empleados/$id     edición + historial
/nomina/periodos          listado de nóminas procesadas
/nomina/periodos/nuevo    crear y procesar nómina del período
/nomina/periodos/$id      detalle: tabla de empleados con cálculo, edición de conceptos, cerrar/pagar
/nomina/prestamos         gestión de préstamos a empleados
/nomina/terminaciones     calculadora de prestaciones laborales
/nomina/regalia           proceso anual de Regalía Pascual
/nomina/reportes          IR-3, TSS, IR-4, DGT-3
/nomina/configuracion     tasas, departamentos, cargos, conceptos
```

## Fases sugeridas de implementación

```text
Fase 1 — Cimientos          Empleados + departamentos/cargos + configuración tasas
Fase 2 — Cálculo            Períodos + motor de cálculo + UI de procesamiento
Fase 3 — Cierre contable    Asiento automático + pago + integración con cobros/bancos
Fase 4 — Beneficios         Regalía Pascual + Vacaciones + Bonificación
Fase 5 — Terminaciones      Calculadora preaviso/cesantía/liquidación
Fase 6 — Reportes oficiales TSS SUIR+, IR-3, IR-4, DGT-3, volantes PDF
Fase 7 — Pulido             Préstamos, ausencias, dashboards, auditoría
```

Cada fase queda funcional por sí sola; recomiendo entregar Fases 1–3 en el primer turno (núcleo usable), luego iterar.

## Preguntas para confirmar antes de construir

1. **Roles**: ¿agrego el rol `gestor_nomina` (RR.HH.) o mantengo solo Administrador/Contador con acceso?
2. **Períodos**: ¿la empresa pagará mensual, quincenal, semanal, o necesita los tres configurables por empleado?
3. **Alcance inicial**: ¿arranco con Fases 1–3 (empleados + cálculo + asiento) y dejo TSS/IR-3/Regalía/Cesantía para iteraciones posteriores, o priorizas algún reporte oficial desde el día 1?
4. **Volante de pago**: ¿PDF descargable basta, o también quieres envío automático por email a cada empleado?
