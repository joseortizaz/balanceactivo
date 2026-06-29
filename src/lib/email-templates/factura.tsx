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

interface LineaProps {
  descripcion?: string
  cantidad?: number | string
  precio?: string
  subtotal?: string
}

interface FacturaEmailProps {
  companyName?: string
  companyRnc?: string | null
  companyAddress?: string | null
  companyPhone?: string | null
  clientName?: string
  ncf?: string
  fechaEmision?: string
  fechaVencimiento?: string | null
  estado?: string
  subtotal?: string
  descuento?: string | null
  itbis?: string
  total?: string
  montoPagado?: string | null
  saldoPendiente?: string | null
  lineas?: LineaProps[]
  mensaje?: string | null
}

const FacturaEmail = ({
  companyName = 'Su empresa',
  companyRnc,
  companyAddress,
  companyPhone,
  clientName = 'Cliente',
  ncf = '',
  fechaEmision = '',
  fechaVencimiento,
  estado,
  subtotal = '',
  descuento,
  itbis = '',
  total = '',
  montoPagado,
  saldoPendiente,
  lineas = [],
  mensaje,
}: FacturaEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Factura {ncf} — {total}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{companyName}</Heading>
        {companyRnc ? <Text style={meta}>RNC: {companyRnc}</Text> : null}
        {companyAddress ? <Text style={meta}>{companyAddress}</Text> : null}
        {companyPhone ? <Text style={meta}>Tel: {companyPhone}</Text> : null}

        <Hr style={hr} />
        <Heading style={h2}>Factura {ncf}</Heading>
        <Text style={meta}>Fecha de emisión: {fechaEmision}</Text>
        {fechaVencimiento ? <Text style={meta}>Vencimiento: {fechaVencimiento}</Text> : null}
        {estado ? <Text style={meta}>Estado: {estado}</Text> : null}

        <Section style={card}>
          <Text style={label}>Cliente</Text>
          <Text style={value}>{clientName}</Text>

          {mensaje ? (
            <>
              <Text style={label}>Mensaje</Text>
              <Text style={value}>{mensaje}</Text>
            </>
          ) : null}
        </Section>

        {lineas.length > 0 ? (
          <Section style={card}>
            <Text style={label}>Detalle</Text>
            {lineas.map((l, i) => (
              <Text key={i} style={lineItem}>
                {l.cantidad} × {l.descripcion} — {l.subtotal}
              </Text>
            ))}
          </Section>
        ) : null}

        <Section style={card}>
          <Text style={label}>Subtotal</Text>
          <Text style={value}>{subtotal}</Text>
          {descuento ? (
            <>
              <Text style={label}>Descuento</Text>
              <Text style={value}>{descuento}</Text>
            </>
          ) : null}
          <Text style={label}>ITBIS</Text>
          <Text style={value}>{itbis}</Text>
          <Text style={label}>Total</Text>
          <Text style={amount}>{total}</Text>
          {montoPagado ? (
            <>
              <Text style={label}>Monto pagado</Text>
              <Text style={value}>{montoPagado}</Text>
            </>
          ) : null}
          {saldoPendiente ? (
            <>
              <Text style={label}>Saldo pendiente</Text>
              <Text style={value}>{saldoPendiente}</Text>
            </>
          ) : null}
        </Section>

        <Text style={footer}>
          Gracias por su preferencia. Si tiene preguntas sobre esta factura, responda a este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FacturaEmail,
  subject: (d: Record<string, any>) =>
    `Factura ${d.ncf ?? ''} — ${d.companyName ?? ''}`.trim(),
  displayName: 'Factura',
  previewData: {
    companyName: 'Ceapsi SRL',
    companyRnc: '131-12345-6',
    clientName: 'Cliente Ejemplo',
    ncf: 'B0100000001',
    fechaEmision: '24/05/2026',
    estado: 'pagada',
    subtotal: 'RD$10,000.00',
    itbis: 'RD$1,800.00',
    total: 'RD$11,800.00',
    montoPagado: 'RD$11,800.00',
    saldoPendiente: 'RD$0.00',
    lineas: [
      { cantidad: 2, descripcion: 'Servicio de consultoría', subtotal: 'RD$10,000.00' },
    ],
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
  margin: '16px 0 0',
}
const label = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, margin: '10px 0 2px', letterSpacing: '0.05em' }
const value = { fontSize: '14px', color: '#0f172a', margin: '0 0 4px', fontWeight: 500 as const }
const amount = { fontSize: '18px', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 as const }
const lineItem = { fontSize: '13px', color: '#0f172a', margin: '0 0 4px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', textAlign: 'center' as const }