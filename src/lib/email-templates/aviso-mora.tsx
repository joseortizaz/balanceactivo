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

interface AvisoMoraProps {
  companyName?: string
  companyRnc?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  clientName?: string
  invoiceNcf?: string
  cuotaNumero?: number | string
  cuotaMonto?: string
  cuotaFechaVencimiento?: string
  diasMora?: number | string
  saldoPendiente?: string
  invoiceTotal?: string
}

const AvisoMoraEmail = ({
  companyName = 'Su empresa',
  companyRnc,
  companyAddress,
  companyPhone,
  clientName = 'Cliente',
  invoiceNcf = '',
  cuotaNumero = '',
  cuotaMonto = '',
  cuotaFechaVencimiento = '',
  diasMora = '',
  saldoPendiente = '',
  invoiceTotal = '',
}: AvisoMoraProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Aviso de atraso en el pago de la factura {invoiceNcf}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{companyName}</Heading>
        {companyRnc ? <Text style={meta}>RNC: {companyRnc}</Text> : null}
        {companyAddress ? <Text style={meta}>{companyAddress}</Text> : null}
        {companyPhone ? <Text style={meta}>Tel: {companyPhone}</Text> : null}

        <Hr style={hr} />
        <Heading style={{ ...h2, color: '#b91c1c' }}>Aviso de atraso en el pago</Heading>
        <Text style={body}>Hola {clientName},</Text>
        <Text style={body}>
          Tiene una cuota vencida de la factura <strong>{invoiceNcf}</strong> con {diasMora} día(s) de atraso.
          Le agradecemos regularizar su pago a la brevedad.
        </Text>

        <Section style={card}>
          <Text style={label}>Cuota vencida</Text>
          <Text style={value}>No. {cuotaNumero}</Text>

          <Text style={label}>Fecha en que venció</Text>
          <Text style={value}>{cuotaFechaVencimiento}</Text>

          <Text style={label}>Días de atraso</Text>
          <Text style={amountAlert}>{diasMora}</Text>

          <Text style={label}>Monto de esta cuota</Text>
          <Text style={value}>{cuotaMonto}</Text>

          <Text style={label}>Saldo pendiente de la factura</Text>
          <Text style={value}>{saldoPendiente}</Text>

          <Text style={label}>Total de la factura</Text>
          <Text style={value}>{invoiceTotal}</Text>
        </Section>

        <Text style={footer}>
          Si ya realizó este pago, por favor ignore este mensaje o contáctenos para confirmarlo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AvisoMoraEmail,
  subject: (d: Record<string, any>) =>
    `Aviso de atraso en el pago — Factura ${d.invoiceNcf ?? ''}`.trim(),
  displayName: 'Aviso de mora',
  previewData: {
    companyName: 'Ceapsi SRL',
    companyRnc: '131-12345-6',
    clientName: 'Cliente Ejemplo',
    invoiceNcf: 'B0200000001',
    cuotaNumero: 1,
    cuotaMonto: 'RD$3,250.00',
    cuotaFechaVencimiento: '25/08/2026',
    diasMora: 7,
    saldoPendiente: 'RD$13,000.00',
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
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '16px 0 24px',
  backgroundColor: '#fef2f2',
}
const label = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, margin: '10px 0 2px', letterSpacing: '0.05em' }
const value = { fontSize: '14px', color: '#0f172a', margin: '0 0 4px', fontWeight: 500 as const }
const amountAlert = { fontSize: '18px', color: '#b91c1c', margin: '0 0 4px', fontWeight: 700 as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }
