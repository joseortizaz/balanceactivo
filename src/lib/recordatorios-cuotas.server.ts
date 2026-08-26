// Job de servidor (disparado por el Cron Trigger de Cloudflare, ver
// server.ts) que revisa las cuotas de facturas a crédito y envía:
//  - un recordatorio cuando una cuota vence en exactamente
//    tenants.dias_aviso_cuota días, y
//  - un aviso de mora la primera vez que una cuota vencida sin pagar se
//    detecta (no se repite en corridas posteriores).
//
// Deliberadamente simple (varias queries por cuota en vez de un JOIN
// anidado): al no poder correr esto contra una base de datos real para
// verificarlo, se prioriza código fácil de revisar a mano sobre
// eficiencia de queries. El volumen esperado (facturas a crédito con
// cuotas próximas a vencer, por tenant, una vez al día) es bajo.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmailInternal } from "@/lib/email/send-internal.server";

function fmtMoneyServer(n: number): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);
}

function fmtDateServer(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysStr(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface RecordatoriosResult {
  recordatoriosEnviados: number;
  morasEnviadas: number;
  errores: number;
}

type TenantRow = {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  dias_aviso_cuota: number;
};

type CuotaRow = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  factura_id: string;
};

export async function ejecutarRecordatoriosDeCuotas(): Promise<RecordatoriosResult> {
  const result: RecordatoriosResult = { recordatoriosEnviados: 0, morasEnviadas: 0, errores: 0 };
  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  const { data: tenants, error: tErr } = await supabaseAdmin
    .from("tenants")
    .select("id, razon_social, nombre_comercial, rnc, direccion, telefono, dias_aviso_cuota");

  if (tErr || !tenants) {
    console.error("[recordatorios-cuotas] no se pudo leer tenants", tErr);
    return { ...result, errores: result.errores + 1 };
  }

  for (const tenant of tenants as TenantRow[]) {
    const diasAviso = tenant.dias_aviso_cuota ?? 5;
    const fechaObjetivo = addDaysStr(hoy, diasAviso);

    // --- Recordatorios: cuota vence en exactamente `diasAviso` días ---
    const { data: cuotasPorVencer, error: e1 } = await supabaseAdmin
      .from("factura_cuotas")
      .select("id, numero_cuota, fecha_vencimiento, monto, monto_pagado, factura_id")
      .eq("tenant_id", tenant.id)
      .eq("fecha_vencimiento", fechaObjetivo)
      .is("recordatorio_enviado_at", null);

    if (e1) {
      console.error("[recordatorios-cuotas] error leyendo cuotas por vencer", tenant.id, e1);
      result.errores++;
    } else {
      for (const cuota of (cuotasPorVencer ?? []) as CuotaRow[]) {
        if (Number(cuota.monto_pagado) >= Number(cuota.monto)) continue; // ya pagada, nada que avisar
        const ok = await notificarCuota({ tenant, cuota, tipo: "recordatorio", diasAviso });
        if (ok) {
          await supabaseAdmin
            .from("factura_cuotas")
            .update({ recordatorio_enviado_at: new Date().toISOString() })
            .eq("id", cuota.id);
          result.recordatoriosEnviados++;
        } else {
          result.errores++;
        }
      }
    }

    // --- Mora: cuota ya vencida, sin pagar, todavía no notificada ---
    const { data: cuotasVencidas, error: e2 } = await supabaseAdmin
      .from("factura_cuotas")
      .select("id, numero_cuota, fecha_vencimiento, monto, monto_pagado, factura_id")
      .eq("tenant_id", tenant.id)
      .lt("fecha_vencimiento", hoyStr)
      .is("mora_notificado_at", null);

    if (e2) {
      console.error("[recordatorios-cuotas] error leyendo cuotas vencidas", tenant.id, e2);
      result.errores++;
    } else {
      for (const cuota of (cuotasVencidas ?? []) as CuotaRow[]) {
        if (Number(cuota.monto_pagado) >= Number(cuota.monto)) continue;
        const diasMora = Math.floor(
          (Date.parse(`${hoyStr}T00:00:00Z`) - Date.parse(`${cuota.fecha_vencimiento}T00:00:00Z`)) / 86_400_000,
        );
        const ok = await notificarCuota({ tenant, cuota, tipo: "mora", diasMora });
        if (ok) {
          await supabaseAdmin
            .from("factura_cuotas")
            .update({ mora_notificado_at: new Date().toISOString() })
            .eq("id", cuota.id);
          result.morasEnviadas++;
        } else {
          result.errores++;
        }
      }
    }
  }

  return result;
}

async function notificarCuota(args: {
  tenant: TenantRow;
  cuota: CuotaRow;
  tipo: "recordatorio" | "mora";
  diasAviso?: number;
  diasMora?: number;
}): Promise<boolean> {
  const { tenant, cuota, tipo } = args;

  const { data: factura, error: fErr } = await supabaseAdmin
    .from("facturas")
    .select("id, ncf, total, monto_pagado, cliente_id, estado")
    .eq("id", cuota.factura_id)
    .maybeSingle();
  if (fErr || !factura) {
    console.error("[recordatorios-cuotas] no se encontró la factura de la cuota", cuota.id, fErr);
    return false;
  }
  // Factura anulada/cerrada: no hay nada que cobrar, no se notifica ni se
  // cuenta como error (se marca como "manejado" para no reintentar cada día).
  if (factura.estado === "anulada" || factura.estado === "cerrada") return true;

  const { data: cliente, error: clErr } = await supabaseAdmin
    .from("clientes")
    .select("razon_social, email")
    .eq("id", factura.cliente_id)
    .maybeSingle();
  if (clErr || !cliente) {
    console.error("[recordatorios-cuotas] no se encontró el cliente de la factura", factura.id, clErr);
    return false;
  }
  if (!cliente.email) {
    // No hay correo registrado: no es un fallo del sistema, simplemente no
    // hay a quién notificar. Se marca como manejado.
    return true;
  }

  const saldoPendiente = Math.max(0, Number(factura.total) - Number(factura.monto_pagado));
  const companyName = tenant.nombre_comercial || tenant.razon_social;
  const templateName = tipo === "recordatorio" ? "recordatorio-cuota" : "aviso-mora";

  const templateData: Record<string, unknown> = {
    companyName,
    companyRnc: tenant.rnc,
    companyAddress: tenant.direccion,
    companyPhone: tenant.telefono,
    clientName: cliente.razon_social,
    invoiceNcf: factura.ncf,
    cuotaNumero: cuota.numero_cuota,
    cuotaMonto: fmtMoneyServer(Number(cuota.monto)),
    cuotaFechaVencimiento: fmtDateServer(cuota.fecha_vencimiento),
    saldoPendiente: fmtMoneyServer(saldoPendiente),
    invoiceTotal: fmtMoneyServer(Number(factura.total)),
  };
  if (tipo === "recordatorio") {
    templateData.diasParaVencer = args.diasAviso;
  } else {
    templateData.diasMora = args.diasMora;
  }

  const sendResult = await sendTransactionalEmailInternal(supabaseAdmin, {
    templateName,
    recipientEmail: cliente.email,
    templateData,
    idempotencyKey: `${templateName}:${cuota.id}`,
  });

  if (!sendResult.ok) {
    console.error("[recordatorios-cuotas] no se pudo enviar", templateName, cuota.id, sendResult.reason);
    return false;
  }
  return true;
}
