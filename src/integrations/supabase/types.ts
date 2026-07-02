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
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bancos: {
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
          banco_id: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_cobro"]
          factura_id: string
          fecha: string
          id: string
          metodo: string | null
          monto: number
          motivo_estado: string | null
          nota: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asiento_id?: string | null
          banco_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_cobro"]
          factura_id: string
          fecha?: string
          id?: string
          metodo?: string | null
          monto: number
          motivo_estado?: string | null
          nota?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asiento_id?: string | null
          banco_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_cobro"]
          factura_id?: string
          fecha?: string
          id?: string
          metodo?: string | null
          monto?: number
          motivo_estado?: string | null
          nota?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "cobros_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
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
          producto_id: string | null
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
          producto_id?: string | null
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
          producto_id?: string | null
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          producto_id: string | null
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
          producto_id?: string | null
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
          producto_id?: string | null
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
          motivo_estado: string | null
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
          motivo_estado?: string | null
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
          motivo_estado?: string | null
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
      gastos: {
        Row: {
          asiento_id: string | null
          categoria: Database["public"]["Enums"]["categoria_gasto_606"]
          concepto: string
          condicion_pago: Database["public"]["Enums"]["condicion_pago"]
          created_at: string
          created_by: string | null
          cuenta_gasto_id: string
          cuenta_pago_id: string | null
          estado: Database["public"]["Enums"]["estado_gasto"]
          fecha: string
          fecha_vencimiento: string | null
          id: string
          isr_retenido: number
          itbis: number
          itbis_retenido: number
          monto_pagado: number
          ncf: string | null
          notas: string | null
          proveedor_id: string
          subtotal: number
          tenant_id: string
          tipo_ncf_compra: Database["public"]["Enums"]["tipo_ncf_compra"]
          total: number
        }
        Insert: {
          asiento_id?: string | null
          categoria?: Database["public"]["Enums"]["categoria_gasto_606"]
          concepto: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          cuenta_gasto_id: string
          cuenta_pago_id?: string | null
          estado?: Database["public"]["Enums"]["estado_gasto"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          isr_retenido?: number
          itbis?: number
          itbis_retenido?: number
          monto_pagado?: number
          ncf?: string | null
          notas?: string | null
          proveedor_id: string
          subtotal?: number
          tenant_id: string
          tipo_ncf_compra?: Database["public"]["Enums"]["tipo_ncf_compra"]
          total?: number
        }
        Update: {
          asiento_id?: string | null
          categoria?: Database["public"]["Enums"]["categoria_gasto_606"]
          concepto?: string
          condicion_pago?: Database["public"]["Enums"]["condicion_pago"]
          created_at?: string
          created_by?: string | null
          cuenta_gasto_id?: string
          cuenta_pago_id?: string | null
          estado?: Database["public"]["Enums"]["estado_gasto"]
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          isr_retenido?: number
          itbis?: number
          itbis_retenido?: number
          monto_pagado?: number
          ncf?: string | null
          notas?: string | null
          proveedor_id?: string
          subtotal?: number
          tenant_id?: string
          tipo_ncf_compra?: Database["public"]["Enums"]["tipo_ncf_compra"]
          total?: number
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
      movimientos_inventario: {
        Row: {
          cantidad: number
          created_at: string
          created_by: string | null
          factura_id: string | null
          fecha: string
          id: string
          motivo: string | null
          producto_id: string
          stock_anterior: number
          stock_nuevo: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Insert: {
          cantidad: number
          created_at?: string
          created_by?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id: string
          stock_anterior: number
          stock_nuevo: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Update: {
          cantidad?: number
          created_at?: string
          created_by?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id?: string
          stock_anterior?: number
          stock_nuevo?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Relationships: []
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
      pagos_gasto: {
        Row: {
          asiento_id: string | null
          created_at: string
          created_by: string | null
          cuenta_pago_id: string
          fecha: string
          gasto_id: string
          id: string
          metodo: string | null
          monto: number
          tenant_id: string
        }
        Insert: {
          asiento_id?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_pago_id: string
          fecha?: string
          gasto_id: string
          id?: string
          metodo?: string | null
          monto: number
          tenant_id: string
        }
        Update: {
          asiento_id?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_pago_id?: string
          fecha?: string
          gasto_id?: string
          id?: string
          metodo?: string | null
          monto?: number
          tenant_id?: string
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
          controla_inventario: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          precio: number
          stock: number
          stock_minimo: number
          tasa_itbis: number
          tenant_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo?: string | null
          controla_inventario?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          precio?: number
          stock?: number
          stock_minimo?: number
          tasa_itbis?: number
          tenant_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string | null
          controla_inventario?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          precio?: number
          stock?: number
          stock_minimo?: number
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      suscripciones: {
        Row: {
          activado_at: string | null
          activado_por: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_suscripcion"]
          fecha_inicio: string | null
          fecha_solicitud: string
          fecha_termino: string | null
          id: string
          incluye_nomina: boolean
          limite_facturacion_mensual: number
          metodo_pago: string
          nomina_activado_at: string | null
          nomina_activado_por: string | null
          nomina_estado: Database["public"]["Enums"]["estado_modulo_nomina"]
          nomina_fecha_inicio: string | null
          nomina_fecha_termino: string | null
          notas_admin: string | null
          plan: Database["public"]["Enums"]["plan_codigo"]
          precio_nomina: number
          precio_plan: number
          precio_total: number
          referencia_pago: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activado_at?: string | null
          activado_por?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          fecha_inicio?: string | null
          fecha_solicitud?: string
          fecha_termino?: string | null
          id?: string
          incluye_nomina?: boolean
          limite_facturacion_mensual?: number
          metodo_pago?: string
          nomina_activado_at?: string | null
          nomina_activado_por?: string | null
          nomina_estado?: Database["public"]["Enums"]["estado_modulo_nomina"]
          nomina_fecha_inicio?: string | null
          nomina_fecha_termino?: string | null
          notas_admin?: string | null
          plan: Database["public"]["Enums"]["plan_codigo"]
          precio_nomina?: number
          precio_plan?: number
          precio_total?: number
          referencia_pago?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activado_at?: string | null
          activado_por?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_suscripcion"]
          fecha_inicio?: string | null
          fecha_solicitud?: string
          fecha_termino?: string | null
          id?: string
          incluye_nomina?: boolean
          limite_facturacion_mensual?: number
          metodo_pago?: string
          nomina_activado_at?: string | null
          nomina_activado_por?: string | null
          nomina_estado?: Database["public"]["Enums"]["estado_modulo_nomina"]
          nomina_fecha_inicio?: string | null
          nomina_fecha_termino?: string | null
          notas_admin?: string | null
          plan?: Database["public"]["Enums"]["plan_codigo"]
          precio_nomina?: number
          precio_plan?: number
          precio_total?: number
          referencia_pago?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
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
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          last_error: string | null
          next_retry_at: string
          payload: Json
          response_body: string | null
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          payload: Json
          response_body?: string | null
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          secret: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          secret: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          secret?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
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
      actualizar_cotizacion: {
        Args: {
          _cliente_id: string
          _cotizacion_id: string
          _descuento_valor: number
          _fecha: string
          _lineas: Json
          _notas: string
          _tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
          _validez_dias: number
        }
        Returns: string
      }
      actualizar_factura: {
        Args: {
          _cliente_id: string
          _condicion: Database["public"]["Enums"]["condicion_pago"]
          _cuotas?: Json
          _descuento_valor: number
          _factura_id: string
          _fecha: string
          _lineas: Json
          _tipo_descuento: Database["public"]["Enums"]["tipo_descuento"]
        }
        Returns: string
      }
      actualizar_gasto: {
        Args: {
          _categoria: Database["public"]["Enums"]["categoria_gasto_606"]
          _concepto: string
          _condicion_pago: Database["public"]["Enums"]["condicion_pago"]
          _cuenta_gasto_id: string
          _cuenta_pago_id: string
          _fecha: string
          _fecha_vencimiento: string
          _gasto_id: string
          _isr_retenido: number
          _itbis_retenido: number
          _ncf: string
          _notas: string
          _proveedor_id: string
          _subtotal: number
          _tasa_itbis: number
          _tipo_ncf_compra: Database["public"]["Enums"]["tipo_ncf_compra"]
        }
        Returns: string
      }
      anular_cobro: {
        Args: { _cobro_id: string; _motivo: string }
        Returns: undefined
      }
      anular_factura: {
        Args: { _factura_id: string; _motivo: string }
        Returns: undefined
      }
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
      cerrar_factura: {
        Args: { _factura_id: string; _motivo: string }
        Returns: undefined
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      editar_cobro: {
        Args: {
          _banco_id: string
          _cobro_id: string
          _fecha: string
          _metodo: string
          _monto: number
          _nota: string
        }
        Returns: undefined
      }
      emit_webhook: {
        Args: { _event: string; _payload: Json; _tenant: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      facturacion_mes_actual: { Args: never; Returns: number }
      generar_facturas_recurrentes: { Args: never; Returns: number }
      generar_ir3: { Args: { _anio: number; _mes: number }; Returns: Json }
      generar_regalia_pascual: { Args: { _anio: number }; Returns: string }
      get_cuenta_id: {
        Args: { _codigo: string; _tenant: string }
        Returns: string
      }
      get_planes_catalogo: {
        Args: never
        Returns: {
          codigo: Database["public"]["Enums"]["plan_codigo"]
          descripcion: string
          limite_facturacion: number
          max_administradores: number
          max_agentes_facturacion: number
          max_contadores: number
          nombre: string
          precio: number
          precio_nomina: number
        }[]
      }
      get_super_admin_emails: {
        Args: never
        Returns: {
          email: string
          nombre: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      procesar_nomina: { Args: { _nomina_id: string }; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      registrar_cobro:
        | {
            Args: {
              _factura_id: string
              _fecha: string
              _metodo: string
              _monto: number
            }
            Returns: string
          }
        | {
            Args: {
              _banco_id?: string
              _factura_id: string
              _fecha: string
              _metodo: string
              _monto: number
            }
            Returns: string
          }
        | {
            Args: {
              _banco_id?: string
              _factura_id: string
              _fecha: string
              _metodo: string
              _monto: number
              _nota?: string
            }
            Returns: string
          }
      registrar_gasto: { Args: { _gasto_id: string }; Returns: string }
      registrar_movimiento_inventario: {
        Args: {
          _cantidad: number
          _fecha?: string
          _motivo: string
          _producto_id: string
          _tipo: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Returns: string
      }
      registrar_pago_gasto: {
        Args: {
          _cuenta_pago_id: string
          _fecha: string
          _gasto_id: string
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
      verify_api_key: { Args: { _token: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "administrador"
        | "contador"
        | "agente_facturacion"
        | "super_admin"
      categoria_gasto_606:
        | "01_personal"
        | "02_trabajos_suministros"
        | "03_arrendamientos"
        | "04_activos_fijos"
        | "05_operacionales"
        | "06_financieros"
        | "07_seguros"
        | "08_combustibles"
        | "09_otros"
      condicion_pago: "contado" | "credito"
      estado_cobro: "activo" | "anulado"
      estado_cotizacion:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "convertida"
        | "vencida"
      estado_cuota: "pendiente" | "pagada" | "vencida" | "parcial"
      estado_empleado: "activo" | "suspendido" | "terminado"
      estado_factura: "pendiente" | "pagada" | "anulada" | "cerrada"
      estado_gasto: "pendiente" | "pagado" | "anulado"
      estado_modulo_nomina:
        | "no_solicitado"
        | "pendiente"
        | "activa"
        | "suspendida"
      estado_nomina: "borrador" | "cerrada" | "pagada"
      estado_prestamo: "activo" | "cancelado" | "pagado"
      estado_suscripcion:
        | "pendiente"
        | "activa"
        | "vencida"
        | "suspendida"
        | "cancelada"
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
      plan_codigo: "emprendedor" | "mipyme" | "corporativo"
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
      tipo_movimiento_inventario:
        | "entrada"
        | "salida"
        | "ajuste"
        | "venta"
        | "anulacion_venta"
      tipo_ncf: "B01" | "B02" | "B04" | "B15"
      tipo_ncf_compra: "B01" | "B11" | "B14" | "B15"
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
      categoria_gasto_606: [
        "01_personal",
        "02_trabajos_suministros",
        "03_arrendamientos",
        "04_activos_fijos",
        "05_operacionales",
        "06_financieros",
        "07_seguros",
        "08_combustibles",
        "09_otros",
      ],
      condicion_pago: ["contado", "credito"],
      estado_cobro: ["activo", "anulado"],
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
      estado_factura: ["pendiente", "pagada", "anulada", "cerrada"],
      estado_gasto: ["pendiente", "pagado", "anulado"],
      estado_modulo_nomina: [
        "no_solicitado",
        "pendiente",
        "activa",
        "suspendida",
      ],
      estado_nomina: ["borrador", "cerrada", "pagada"],
      estado_prestamo: ["activo", "cancelado", "pagado"],
      estado_suscripcion: [
        "pendiente",
        "activa",
        "vencida",
        "suspendida",
        "cancelada",
      ],
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
      plan_codigo: ["emprendedor", "mipyme", "corporativo"],
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
      tipo_movimiento_inventario: [
        "entrada",
        "salida",
        "ajuste",
        "venta",
        "anulacion_venta",
      ],
      tipo_ncf: ["B01", "B02", "B04", "B15"],
      tipo_ncf_compra: ["B01", "B11", "B14", "B15"],
      tipo_nomina: ["regular", "regalia_pascual", "bonificacion"],
    },
  },
} as const
