export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asiento_lineas: {
        Row: {
          asiento_id: string
          credito: number
          cuenta_id: string
          debito: number
          descripcion: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          asiento_id: string
          credito?: number
          cuenta_id: string
          debito?: number
          descripcion?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          asiento_id?: string
          credito?: number
          cuenta_id?: string
          debito?: number
          descripcion?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asiento_lineas_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asiento_lineas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asiento_lineas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asientos_contables: {
        Row: {
          concepto: string
          created_at: string
          fecha: string
          id: string
          numero: number
          origen: string | null
          origen_id: string | null
          tenant_id: string
          total_credito: number
          total_debito: number
        }
        Insert: {
          concepto: string
          created_at?: string
          fecha?: string
          id?: string
          numero?: number
          origen?: string | null
          origen_id?: string | null
          tenant_id: string
          total_credito?: number
          total_debito?: number
        }
        Update: {
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          numero?: number
          origen?: string | null
          origen_id?: string | null
          tenant_id?: string
          total_credito?: number
          total_debito?: number
        }
        Relationships: [
          {
            foreignKeyName: "asientos_contables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ausencias: {
        Row: {
          con_goce: boolean
          created_at: string
          created_by: string | null
          dias: number
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          notas: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Insert: {
          con_goce?: boolean
          created_at?: string
          created_by?: string | null
          dias: number
          empleado_id: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Update: {
          con_goce?: boolean
          created_at?: string
          created_by?: string | null
          dias?: number
          empleado_id?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Relationships: []
      }
      cargos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          documento: string
          email: string | null
          id: string
          nombre_comercial: string | null
          provincia: string | null
          razon_social: string
          telefono: string | null
          tenant_id: string
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          documento: string
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          provincia?: string | null
          razon_social: string
          telefono?: string | null
          tenant_id: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          documento?: string
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          provincia?: string | null
          razon_social?: string
          telefono?: string | null
          tenant_id?: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cobros: {
        Row: {
          asiento_id: string | null
          created_at: string
          created_by: string | null
          factura_id: string
          fecha: string
          id: string
          metodo: string | null
          monto: number
          tenant_id: string
        }
        Insert: {
          asiento_id?: string | null
          created_at?: string
          created_by?: string | null
          factura_id: string
          fecha?: string
          id?: string
          metodo?: string | null
          monto: number
          tenant_id: string
        }
        Update: {
          asiento_id?: string | null
          created_at?: string
          created_by?: string | null
          factura_id?: string
          fecha?: string
          id?: string
          metodo?: string | null
          monto?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_lineas: {
        Row: {
          cantidad: number
          cotizacion_id: string
          descripcion: string
          id: string
          itbis: number
          precio: number
          subtotal: number
          tasa_itbis: number
          tenant_id: string
          total: number
        }
        Insert: {
          cantidad?: number
          cotizacion_id: string
          descripcion: string
          id?: string
          itbis?: number
          precio?: number
          subtotal?: number
          tasa_itbis?: number
          tenant_id: string
          total?: number
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          descripcion?: string
          id?: string
          itbis?: number
          precio?: number
          subtotal?: number
          tasa_itbis?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_lineas_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          descuento: number
          descuento_valor: number
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          factura_id: string | null
          fecha: string
          id: string
          itbis: number
          notas: string | null
          numero: string
          subtotal: number
          tenant_id: string
          tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          total: number
          validez_dias: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descuento?: number
          descuento_valor?: number
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          factura_id?: string | null
          fecha?: string
          id?: string
          itbis?: number
          notas?: string | null
          numero: string
          subtotal?: number
          tenant_id: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          total?: number
          validez_dias?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descuento?: number
          descuento_valor?: number
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          factura_id?: string | null
          fecha?: string
          id?: string
          itbis?: number
          notas?: string | null
          numero?: string
          subtotal?: number
          tenant_id?: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          total?: number
          validez_dias?: number
        }
        Relationships: []
      }
      cuentas_contables: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          es_movimiento: boolean
          id: string
          nivel: number
          nombre: string
          parent_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_cuenta"]
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          es_movimiento?: boolean
          id?: string
          nivel?: number
          nombre: string
          parent_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_cuenta"]
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          es_movimiento?: boolean
          id?: string
          nivel?: number
          nombre?: string
          parent_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_cuenta"]
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_contables_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cuentas_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_contables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: []
      }
      empleados: {
        Row: {
          apellidos: string
          banco: string | null
          cargo_id: string | null
          cedula: string
          codigo: string | null
          created_at: string
          cuenta_bancaria: string | null
          departamento_id: string | null
          dependientes: number
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_empleado"]
          estado_civil: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          fecha_salida: string | null
          forma_pago: Database["public"]["Enums"]["forma_pago_empleado"]
          id: string
          motivo_salida:
            | Database["public"]["Enums"]["motivo_terminacion"]
            | null
          nombres: string
          notas: string | null
          salario_base: number
          sexo: string | null
          telefono: string | null
          tenant_id: string
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          tipo_cuenta: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          banco?: string | null
          cargo_id?: string | null
          cedula: string
          codigo?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          departamento_id?: string | null
          dependientes?: number
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_empleado"]
          estado_civil?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          fecha_salida?: string | null
          forma_pago?: Database["public"]["Enums"]["forma_pago_empleado"]
          id?: string
          motivo_salida?:
            | Database["public"]["Enums"]["motivo_terminacion"]
            | null
          nombres: string
          notas?: string | null
          salario_base?: number
          sexo?: string | null
          telefono?: string | null
          tenant_id: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_cuenta?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          banco?: string | null
          cargo_id?: string | null
          cedula?: string
          codigo?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          departamento_id?: string | null
          dependientes?: number
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_empleado"]
          estado_civil?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          fecha_salida?: string | null
          forma_pago?: Database["public"]["Enums"]["forma_pago_empleado"]
          id?: string
          motivo_salida?:
            | Database["public"]["Enums"]["motivo_terminacion"]
            | null
          nombres?: string
          notas?: string | null
          salario_base?: number
          sexo?: string | null
          telefono?: string | null
          tenant_id?: string
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          tipo_cuenta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_cuotas: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_cuota"]
          factura_id: string
          fecha_vencimiento: string
          id: string
          monto: number
          monto_pagado: number
          numero_cuota: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuota"]
          factura_id: string
          fecha_vencimiento: string
          id?: string
          monto: number
          monto_pagado?: number
          numero_cuota: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cuota"]
          factura_id?: string
          fecha_vencimiento?: string
          id?: string
          monto?: number
          monto_pagado?: number
          numero_cuota?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factura_cuotas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_lineas: {
        Row: {
          cantidad: number
          descripcion: string
          factura_id: string
          id: string
          itbis: number
          precio: number
          subtotal: number
          tasa_itbis: number
          tenant_id: string
          total: number
        }
        Insert: {
          cantidad?: number
          descripcion: string
          factura_id: string
          id?: string
          itbis?: number
          precio?: number
          subtotal?: number
          tasa_itbis?: number
          tenant_id: string
          total?: number
        }
        Update: {
          cantidad?: number
          descripcion?: string
          factura_id?: string
          id?: string
          itbis?: number
          precio?: number
          subtotal?: number
          tasa_itbis?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_lineas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_lineas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_recurrente_lineas: {
        Row: {
          cantidad: number
          descripcion: string
          id: string
          precio: number
          recurrente_id: string
          tasa_itbis: number
          tenant_id: string
        }
        Insert: {
          cantidad?: number
          descripcion: string
          id?: string
          precio?: number
          recurrente_id: string
          tasa_itbis?: number
          tenant_id: string
        }
        Update: {
          cantidad?: number
          descripcion?: string
          id?: string
          precio?: number
          recurrente_id?: string
          tasa_itbis?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "factura_recurrente_lineas_recurrente_id_fkey"
            columns: ["recurrente_id"]
            isOneToOne: false
            referencedRelation: "facturas_recurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          asiento_id: string | null
          cliente_id: string
          condicion_pago: Database["public"]["Enums"]["condicion_pago"]
          created_at: string
          created_by: string | null
          descuento: number
          descuento_valor: number
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          fecha_vencimiento: string | null
          id: string
          itbis: number
          monto_pagado: number
          ncf: string
          subtotal: number
          tenant_id: string
          tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf: Database["public"]["Enums"]["tipo_ncf"]
          total: number
        }
        Insert: {
          asiento_id?: string | null
          cliente_id: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          descuento?: number
          descuento_valor?: number
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          itbis?: number
          monto_pagado?: number
          ncf: string
          subtotal?: number
          tenant_id: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf: Database["public"]["Enums"]["tipo_ncf"]
          total?: number
        }
        Update: {
          asiento_id?: string | null
          cliente_id?: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          descuento?: number
          descuento_valor?: number
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          itbis?: number
          monto_pagado?: number
          ncf?: string
          subtotal?: number
          tenant_id?: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf?: Database["public"]["Enums"]["tipo_ncf"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_recurrentes: {
        Row: {
          activo: boolean
          cliente_id: string
          condicion_pago: Database["public"]["Enums"]["condicion_pago"]
          created_at: string
          created_by: string | null
          descuento_valor: number
          dia_emision: number
          fecha_fin: string | null
          fecha_inicio: string
          frecuencia: Database["public"]["Enums"]["frecuencia_recurrencia"]
          id: string
          nombre: string
          notas: string | null
          num_cuotas: number
          proxima_emision: string
          tenant_id: string
          tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf: Database["public"]["Enums"]["tipo_ncf"]
        }
        Insert: {
          activo?: boolean
          cliente_id: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          descuento_valor?: number
          dia_emision?: number
          fecha_fin?: string | null
          fecha_inicio?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_recurrencia"]
          id?: string
          nombre: string
          notas?: string | null
          num_cuotas?: number
          proxima_emision?: string
          tenant_id: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf?: Database["public"]["Enums"]["tipo_ncf"]
        }
        Update: {
          activo?: boolean
          cliente_id?: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          descuento_valor?: number
          dia_emision?: number
          fecha_fin?: string | null
          fecha_inicio?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_recurrencia"]
          id?: string
          nombre?: string
          notas?: string | null
          num_cuotas?: number
          proxima_emision?: string
          tenant_id?: string
          tipo_descuento?: Database["public"]["Enums"]["tipo_descuento"]
          tipo_ncf?: Database["public"]["Enums"]["tipo_ncf"]
        }
        Relationships: []
      }
      isr_escalas: {
        Row: {
          anio: number
          cuota_fija: number
          desde: number
          hasta: number | null
          id: string
          tasa: number
          tenant_id: string
          tramo: number
        }
        Insert: {
          anio: number
          cuota_fija?: number
          desde: number
          hasta?: number | null
          id?: string
          tasa: number
          tenant_id: string
          tramo: number
        }
        Update: {
          anio?: number
          cuota_fija?: number
          desde?: number
          hasta?: number | null
          id?: string
          tasa?: number
          tenant_id?: string
          tramo?: number
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          accion: string
          created_at: string
          detalles: Json | null
          id: string
          registro_id: string | null
          tabla_afectada: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          detalles?: Json | null
          id?: string
          registro_id?: string | null
          tabla_afectada?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          detalles?: Json | null
          id?: string
          registro_id?: string | null
          tabla_afectada?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ncf_secuencias: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          prefijo: string
          secuencia_actual: number
          secuencia_hasta: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_ncf"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          prefijo: string
          secuencia_actual?: number
          secuencia_hasta?: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_ncf"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          prefijo?: string
          secuencia_actual?: number
          secuencia_hasta?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_ncf"]
        }
        Relationships: [
          {
            foreignKeyName: "ncf_secuencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nomina_conceptos: {
        Row: {
          afecta_isr: boolean
          afecta_tss: boolean
          concepto: string
          created_at: string
          detalle_id: string
          id: string
          monto: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_concepto_nomina"]
        }
        Insert: {
          afecta_isr?: boolean
          afecta_tss?: boolean
          concepto: string
          created_at?: string
          detalle_id: string
          id?: string
          monto?: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_concepto_nomina"]
        }
        Update: {
          afecta_isr?: boolean
          afecta_tss?: boolean
          concepto?: string
          created_at?: string
          detalle_id?: string
          id?: string
          monto?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_concepto_nomina"]
        }
        Relationships: [
          {
            foreignKeyName: "nomina_conceptos_detalle_id_fkey"
            columns: ["detalle_id"]
            isOneToOne: false
            referencedRelation: "nomina_detalle"
            referencedColumns: ["id"]
          },
        ]
      }
      nomina_detalle: {
        Row: {
          afp: number
          afp_patronal: number
          created_at: string
          empleado_id: string
          id: string
          infotep_patronal: number
          isr: number
          neto_pagar: number
          nomina_id: string
          otras_deducciones: number
          salario_base: number
          sfs: number
          sfs_patronal: number
          srl_patronal: number
          tenant_id: string
          total_deducciones: number
          total_ingresos: number
        }
        Insert: {
          afp?: number
          afp_patronal?: number
          created_at?: string
          empleado_id: string
          id?: string
          infotep_patronal?: number
          isr?: number
          neto_pagar?: number
          nomina_id: string
          otras_deducciones?: number
          salario_base?: number
          sfs?: number
          sfs_patronal?: number
          srl_patronal?: number
          tenant_id: string
          total_deducciones?: number
          total_ingresos?: number
        }
        Update: {
          afp?: number
          afp_patronal?: number
          created_at?: string
          empleado_id?: string
          id?: string
          infotep_patronal?: number
          isr?: number
          neto_pagar?: number
          nomina_id?: string
          otras_deducciones?: number
          salario_base?: number
          sfs?: number
          sfs_patronal?: number
          srl_patronal?: number
          tenant_id?: string
          total_deducciones?: number
          total_ingresos?: number
        }
        Relationships: [
          {
            foreignKeyName: "nomina_detalle_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomina_detalle_nomina_id_fkey"
            columns: ["nomina_id"]
            isOneToOne: false
            referencedRelation: "nominas"
            referencedColumns: ["id"]
          },
        ]
      }
      nominas: {
        Row: {
          asiento_id: string | null
          asiento_pago_id: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_nomina"]
          fecha_pago: string
          forma_pago: Database["public"]["Enums"]["forma_pago_empleado"]
          id: string
          nombre: string
          notas: string | null
          periodo_fin: string
          periodo_inicio: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_nomina"]
          total_aportes_patronales: number
          total_deducciones: number
          total_ingresos: number
          total_neto: number
        }
        Insert: {
          asiento_id?: string | null
          asiento_pago_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_nomina"]
          fecha_pago?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago_empleado"]
          id?: string
          nombre: string
          notas?: string | null
          periodo_fin: string
          periodo_inicio: string
          tenant_id: string
          tipo?: Database["public"]["Enums"]["tipo_nomina"]
          total_aportes_patronales?: number
          total_deducciones?: number
          total_ingresos?: number
          total_neto?: number
        }
        Update: {
          asiento_id?: string | null
          asiento_pago_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_nomina"]
          fecha_pago?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago_empleado"]
          id?: string
          nombre?: string
          notas?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_nomina"]
          total_aportes_patronales?: number
          total_deducciones?: number
          total_ingresos?: number
          total_neto?: number
        }
        Relationships: []
      }
      prestamos_empleado: {
        Row: {
          created_at: string
          created_by: string | null
          cuota: number
          descontar_en_nomina: boolean
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_prestamo"]
          fecha_inicio: string
          id: string
          monto_original: number
          notas: string | null
          saldo: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cuota: number
          descontar_en_nomina?: boolean
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_prestamo"]
          fecha_inicio?: string
          id?: string
          monto_original: number
          notas?: string | null
          saldo: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cuota?: number
          descontar_en_nomina?: boolean
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_prestamo"]
          fecha_inicio?: string
          id?: string
          monto_original?: number
          notas?: string | null
          saldo?: number
          tenant_id?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          codigo: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          precio: number
          tasa_itbis: number
          tenant_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          precio?: number
          tasa_itbis?: number
          tenant_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          precio?: number
          tasa_itbis?: number
          tenant_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nombre: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          documento: string
          email: string | null
          id: string
          nombre_comercial: string | null
          razon_social: string
          telefono: string | null
          tenant_id: string
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          documento: string
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          razon_social: string
          telefono?: string | null
          tenant_id: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          documento?: string
          email?: string | null
          id?: string
          nombre_comercial?: string | null
          razon_social?: string
          telefono?: string | null
          tenant_id?: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          direccion: string | null
          firma_url: string | null
          id: string
          itbis_tasa_principal: number
          itbis_tasa_reducida: number
          logo_url: string | null
          nombre_comercial: string | null
          razon_social: string
          regimen_fiscal: Database["public"]["Enums"]["regimen_fiscal"]
          retencion_isr_alquileres: number
          retencion_isr_servicios: number
          rnc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          firma_url?: string | null
          id?: string
          itbis_tasa_principal?: number
          itbis_tasa_reducida?: number
          logo_url?: string | null
          nombre_comercial?: string | null
          razon_social: string
          regimen_fiscal?: Database["public"]["Enums"]["regimen_fiscal"]
          retencion_isr_alquileres?: number
          retencion_isr_servicios?: number
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          firma_url?: string | null
          id?: string
          itbis_tasa_principal?: number
          itbis_tasa_reducida?: number
          logo_url?: string | null
          nombre_comercial?: string | null
          razon_social?: string
          regimen_fiscal?: Database["public"]["Enums"]["regimen_fiscal"]
          retencion_isr_alquileres?: number
          retencion_isr_servicios?: number
          rnc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      terminaciones: {
        Row: {
          anos_servicio: number
          asiento_id: string | null
          cesantia_dias: number
          cesantia_monto: number
          created_at: string
          created_by: string | null
          empleado_id: string
          fecha_salida: string
          id: string
          motivo: Database["public"]["Enums"]["motivo_terminacion"]
          notas: string | null
          otros: number
          preaviso_dias: number
          preaviso_monto: number
          regalia_monto: number
          salario_promedio: number
          tenant_id: string
          total: number
          vacaciones_monto: number
        }
        Insert: {
          anos_servicio: number
          asiento_id?: string | null
          cesantia_dias?: number
          cesantia_monto?: number
          created_at?: string
          created_by?: string | null
          empleado_id: string
          fecha_salida: string
          id?: string
          motivo: Database["public"]["Enums"]["motivo_terminacion"]
          notas?: string | null
          otros?: number
          preaviso_dias?: number
          preaviso_monto?: number
          regalia_monto?: number
          salario_promedio: number
          tenant_id: string
          total?: number
          vacaciones_monto?: number
        }
        Update: {
          anos_servicio?: number
          asiento_id?: string | null
          cesantia_dias?: number
          cesantia_monto?: number
          created_at?: string
          created_by?: string | null
          empleado_id?: string
          fecha_salida?: string
          id?: string
          motivo?: Database["public"]["Enums"]["motivo_terminacion"]
          notas?: string | null
          otros?: number
          preaviso_dias?: number
          preaviso_monto?: number
          regalia_monto?: number
          salario_promedio?: number
          tenant_id?: string
          total?: number
          vacaciones_monto?: number
        }
        Relationships: []
      }
      tss_tasas: {
        Row: {
          activo: boolean
          afp_empleado: number
          afp_empleador: number
          created_at: string
          id: string
          infotep_empleador: number
          salario_minimo_cotizable: number
          sfs_empleado: number
          sfs_empleador: number
          srl_empleador: number
          tenant_id: string
          tope_afp: number
          tope_sfs: number
          vigente_desde: string
        }
        Insert: {
          activo?: boolean
          afp_empleado?: number
          afp_empleador?: number
          created_at?: string
          id?: string
          infotep_empleador?: number
          salario_minimo_cotizable?: number
          sfs_empleado?: number
          sfs_empleador?: number
          srl_empleador?: number
          tenant_id: string
          tope_afp?: number
          tope_sfs?: number
          vigente_desde?: string
        }
        Update: {
          activo?: boolean
          afp_empleado?: number
          afp_empleador?: number
          created_at?: string
          id?: string
          infotep_empleador?: number
          salario_minimo_cotizable?: number
          sfs_empleado?: number
          sfs_empleador?: number
          srl_empleador?: number
          tenant_id?: string
          tope_afp?: number
          tope_sfs?: number
          vigente_desde?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_pago_prestamos_nomina: {
        Args: { _nomina_id: string }
        Returns: undefined
      }
      calcular_descuento_abs: {
        Args: {
          _subtotal: number
          _tipo: Database["public"]["Enums"]["tipo_descuento"]
          _valor: number
        }
        Returns: number
      }
      calcular_isr_mensual: {
        Args: { _gravable_mensual: number; _tenant: string }
        Returns: number
      }
      calcular_prestaciones: {
        Args: {
          _empleado_id: string
          _fecha_salida: string
          _motivo: Database["public"]["Enums"]["motivo_terminacion"]
        }
        Returns: Json
      }
      cerrar_nomina: { Args: { _nomina_id: string }; Returns: string }
      convertir_cotizacion_a_factura: {
        Args: {
          _condicion: Database["public"]["Enums"]["condicion_pago"]
          _cotizacion_id: string
          _cuotas?: Json
          _tipo_ncf: Database["public"]["Enums"]["tipo_ncf"]
        }
        Returns: string
      }
      crear_cotizacion: {
        Args: {
          _cliente_id: string
          _descuento_valor: number
          _fecha: string
          _lineas: Json
          _notas: string
          _tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          _validez_dias: number
        }
        Returns: string
      }
      crear_factura: {
        Args: {
          _cliente_id: string
          _condicion: Database["public"]["Enums"]["condicion_pago"]
          _cuotas?: Json
          _descuento_valor: number
          _fecha: string
          _lineas: Json
          _tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          _tipo_ncf: Database["public"]["Enums"]["tipo_ncf"]
        }
        Returns: string
      }
      current_tenant_id: { Args: never; Returns: string }
      generar_facturas_recurrentes: { Args: never; Returns: number }
      generar_ir3: { Args: { _anio: number; _mes: number }; Returns: Json }
      generar_regalia_pascual: { Args: { _anio: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      procesar_nomina: { Args: { _nomina_id: string }; Returns: number }
      registrar_cobro: {
        Args: {
          _factura_id: string
          _fecha: string
          _metodo: string
          _monto: number
        }
        Returns: string
      }
      registrar_pago_nomina: {
        Args: { _cuenta_codigo: string; _nomina_id: string }
        Returns: string
      }
      registrar_terminacion: {
        Args: {
          _empleado_id: string
          _fecha_salida: string
          _motivo: Database["public"]["Enums"]["motivo_terminacion"]
          _notas: string
          _otros: number
        }
        Returns: string
      }
      seed_nomina_defaults: { Args: { _tenant_id: string }; Returns: undefined }
      seed_tenant_defaults: { Args: { _tenant_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "administrador"
        | "contador"
        | "agente_facturacion"
        | "super_admin"
      condicion_pago: "contado" | "credito"
      estado_cotizacion:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "convertida"
        | "vencida"
      estado_cuota: "pendiente" | "pagada" | "vencida" | "parcial"
      estado_empleado: "activo" | "suspendido" | "terminado"
      estado_factura: "pendiente" | "pagada" | "anulada"
      estado_nomina: "borrador" | "cerrada" | "pagada"
      estado_prestamo: "activo" | "cancelado" | "pagado"
      forma_pago_empleado: "mensual" | "quincenal" | "semanal"
      frecuencia_recurrencia:
        | "diaria"
        | "semanal"
        | "quincenal"
        | "mensual"
        | "bimestral"
        | "trimestral"
        | "anual"
      motivo_terminacion:
        | "desahucio"
        | "despido_justificado"
        | "dimision"
        | "mutuo_acuerdo"
        | "otro"
      regimen_fiscal: "ordinario" | "rst"
      tipo_ausencia:
        | "vacaciones"
        | "licencia_medica"
        | "permiso"
        | "maternidad"
        | "sin_goce"
        | "otro"
      tipo_concepto_nomina: "ingreso" | "deduccion"
      tipo_contrato: "indefinido" | "fijo" | "obra"
      tipo_cuenta:
        | "activo"
        | "pasivo"
        | "capital"
        | "ingreso"
        | "costo"
        | "gasto"
      tipo_descuento: "porcentaje" | "monto"
      tipo_documento: "rnc_empresa" | "rnc_persona" | "cedula"
      tipo_ncf: "B01" | "B02" | "B04" | "B15"
      tipo_nomina: "regular" | "regalia_pascual" | "bonificacion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrador",
        "contador",
        "agente_facturacion",
        "super_admin",
      ],
      condicion_pago: ["contado", "credito"],
      estado_cotizacion: [
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "convertida",
        "vencida",
      ],
      estado_cuota: ["pendiente", "pagada", "vencida", "parcial"],
      estado_empleado: ["activo", "suspendido", "terminado"],
      estado_factura: ["pendiente", "pagada", "anulada"],
      estado_nomina: ["borrador", "cerrada", "pagada"],
      estado_prestamo: ["activo", "cancelado", "pagado"],
      forma_pago_empleado: ["mensual", "quincenal", "semanal"],
      frecuencia_recurrencia: [
        "diaria",
        "semanal",
        "quincenal",
        "mensual",
        "bimestral",
        "trimestral",
        "anual",
      ],
      motivo_terminacion: [
        "desahucio",
        "despido_justificado",
        "dimision",
        "mutuo_acuerdo",
        "otro",
      ],
      regimen_fiscal: ["ordinario", "rst"],
      tipo_ausencia: [
        "vacaciones",
        "licencia_medica",
        "permiso",
        "maternidad",
        "sin_goce",
        "otro",
      ],
      tipo_concepto_nomina: ["ingreso", "deduccion"],
      tipo_contrato: ["indefinido", "fijo", "obra"],
      tipo_cuenta: ["activo", "pasivo", "capital", "ingreso", "costo", "gasto"],
      tipo_descuento: ["porcentaje", "monto"],
      tipo_documento: ["rnc_empresa", "rnc_persona", "cedula"],
      tipo_ncf: ["B01", "B02", "B04", "B15"],
      tipo_nomina: ["regular", "regalia_pascual", "bonificacion"],
    },
  },
} as const
