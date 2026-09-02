import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface RecordatorioCuotaProps {
  companyName?: string
  companyRnc?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  clientName?: string
  invoiceNcf?: string
  cuotaNumero?: number | string
  cuotaMonto?: string
  cuotaFechaVencimiento?: string
  diasParaVencer?: number | string
  saldoPendiente?: string
  invoiceTotal?: string
}

const RecordatorioCuotaEmail = ({
  companyName = 'Su empresa',
  companyRnc,
  companyAddress,
  companyPhone,
  clientName = 'Cliente',
  invoiceNcf = '',
  cuotaNumero = '',
  cuotaMonto = '',
  cuotaFechaVencimiento = '',
  diasParaVencer = '',
  saldoPendiente = '',
  invoiceTotal = '',
}: RecordatorioCuotaProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Recordatorio: cuota {String(cuotaNumero)} de la factura {invoiceNcf} vence pronto</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{companyName}</Heading>
        {companyRnc ? <Text style={meta}>RNC: {companyRnc}</Text> : null}
        {companyAddress ? <Text style={meta}>{companyAddress}</Text> : null}
        {companyPhone ? <Text style={meta}>Tel: {companyPhone}</Text> : null}

        <Hr style={hr} />
        <Heading style={h2}>Recordatorio de pago</Heading>
        <Text style={body}>Hola {clientName},</Text>
        <Text style={body}>
          Le recordamos que tiene una cuota próxima a vencer de la factura <strong>{invoiceNcf}</strong>
          {typeof diasParaVencer === 'number' || diasParaVencer !== ''
            ? <> en {diasParaVencer} día(s)</>
            : null}.
        </Text>

        <Section style={card}>
          <Text style={label}>Cuota</Text>
          <Text style={value}>No. {cuotaNumero}</Text>

          <Text style={label}>Fecha de vencimiento</Text>
          <Text style={value}>{cuotaFechaVencimiento}</Text>

          <Text style={label}>Monto de esta cuota</Text>
          <Text style={amount}>{cuotaMonto}</Text>

          <Text style={label}>Saldo pendiente de la factura</Text>
          <Text style={value}>{saldoPendiente}</Text>

          <Text style={label}>Total de la factura</Text>
          <Text style={value}>{invoiceTotal}</Text>
        </Section>

        <Text style={footer}>
          Si ya realizó este pago, puede ignorar este mensaje. Gracias por su preferencia.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RecordatorioCuotaEmail,
  subject: (d: Record<string, any>) =>
    `Recordatorio: cuota ${d.cuotaNumero ?? ''} de la factura ${d.invoiceNcf ?? ''} vence pronto`.trim(),
  displayName: 'Recordatorio de cuota',
  previewData: {
    companyName: 'Ceapsi SRL',
    companyRnc: '131-12345-6',
    clientName: 'Cliente Ejemplo',
    invoiceNcf: 'B0200000001',
    cuotaNumero: 2,
    cuotaMonto: 'RD$3,250.00',
    cuotaFechaVencimiento: '25/09/2026',
    diasParaVencer: 5,
    saldoPendiente: 'RD$9,750.00',
    invoiceTotal: 'RD$15,000.00',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 4px' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0f172a', margin: '8px 0 4px' }
const meta = { fontSize: '12px', color: '#64748b', margin: '0 0 2px' }
const body = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '16px 0 24px',
}
const label = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, margin: '10px 0 2px', letterSpacing: '0.05em' }
const value = { fontSize: '14px', color: '#0f172a', margin: '0 0 4px', fontWeight: 500 as const }
const amount = { fontSize: '18px', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }
