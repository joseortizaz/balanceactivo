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

interface ReciboCobroProps {
  companyName?: string
  companyRnc?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  clientName?: string
  invoiceNcf?: string
  invoiceTotal?: string
  amountPaid?: string
  amountPending?: string
  paymentDate?: string
  paymentMethod?: string
  bankName?: string | null
  note?: string | null
  receiptNumber?: string
}

const ReciboCobroEmail = ({
  companyName = 'Su empresa',
  companyRnc,
  companyAddress,
  companyPhone,
  clientName = 'Cliente',
  invoiceNcf = '',
  invoiceTotal = '',
  amountPaid = '',
  amountPending = '',
  paymentDate = '',
  paymentMethod = '',
  bankName,
  note,
  receiptNumber = '',
}: ReciboCobroProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Recibo de pago {receiptNumber} — Factura {invoiceNcf}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{companyName}</Heading>
        {companyRnc ? <Text style={meta}>RNC: {companyRnc}</Text> : null}
        {companyAddress ? <Text style={meta}>{companyAddress}</Text> : null}
        {companyPhone ? <Text style={meta}>Tel: {companyPhone}</Text> : null}

        <Hr style={hr} />
        <Heading style={h2}>Recibo de pago</Heading>
        <Text style={meta}>No. {receiptNumber}</Text>
        <Text style={meta}>Fecha: {paymentDate}</Text>

        <Section style={card}>
          <Text style={label}>Recibido de</Text>
          <Text style={value}>{clientName}</Text>

          <Text style={label}>Factura asociada</Text>
          <Text style={value}>{invoiceNcf}</Text>

          <Text style={label}>Total de la factura</Text>
          <Text style={value}>{invoiceTotal}</Text>

          <Text style={label}>Monto abonado</Text>
          <Text style={amount}>{amountPaid}</Text>

          <Text style={label}>Monto pendiente</Text>
          <Text style={value}>{amountPending}</Text>

          <Text style={label}>Vía de recepción</Text>
          <Text style={value}>
            {paymentMethod}
            {bankName ? ` — ${bankName}` : ''}
          </Text>

          {note ? (
            <>
              <Text style={label}>Nota</Text>
              <Text style={value}>{note}</Text>
            </>
          ) : null}
        </Section>

        <Text style={footer}>
          Gracias por su pago. Conserve este recibo como comprobante.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReciboCobroEmail,
  subject: (d: Record<string, any>) =>
    `Recibo de pago ${d.receiptNumber ?? ''} — Factura ${d.invoiceNcf ?? ''}`.trim(),
  displayName: 'Recibo de cobro',
  previewData: {
    companyName: 'Ceapsi SRL',
    companyRnc: '131-12345-6',
    clientName: 'Cliente Ejemplo',
    invoiceNcf: 'B0100000001',
    invoiceTotal: 'RD$10,000.00',
    amountPaid: 'RD$4,000.00',
    amountPending: 'RD$6,000.00',
    paymentDate: '24/05/2026',
    paymentMethod: 'Transferencia',
    bankName: 'Banco Popular',
    note: 'Abono parcial acordado por whatsapp.',
    receiptNumber: 'REC-000123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 4px' }
const h2 = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0f172a', margin: '8px 0 4px' }
const meta = { fontSize: '12px', color: '#64748b', margin: '0 0 2px' }
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