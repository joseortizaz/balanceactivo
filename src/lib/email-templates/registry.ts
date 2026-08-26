import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as reciboCobro } from './recibo-cobro'
import { template as factura } from './factura'
import { template as recordatorioCuota } from './recordatorio-cuota'
import { template as avisoMora } from './aviso-mora'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'recibo-cobro': reciboCobro,
  'factura': factura,
  'recordatorio-cuota': recordatorioCuota,
  'aviso-mora': avisoMora,
}
