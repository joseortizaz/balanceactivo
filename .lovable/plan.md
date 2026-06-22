
# Diagnóstico de los registros DNS en Hostinger

Hay dos problemas que explican por qué el sitio aparece como "no seguro" y por qué el correo de `notify.balanceactivo.net` sigue sin verificar.

## 1) El dominio raíz no apunta a Lovable (causa del "sitio no seguro")

Registro actual:

```text
A   @   2.57.91.91
```

`2.57.91.91` es una IP del hosting compartido de Hostinger, no de Lovable. Por eso el navegador llega a un servidor que no tiene el certificado SSL de `balanceactivo.net` y muestra "no seguro".

**Acción:** cambiar ese registro A para que apunte a la IP de Lovable.

```text
Tipo: A
Nombre: @
Valor: 185.158.133.1
TTL: 14400 (o el que permita Hostinger; 300–14400 está bien)
```

Y añadir también el `www` apuntando a Lovable. Hoy hay un `CNAME www → balanceactivo.net`, que no es válido para servir el sitio en Lovable. Reemplazarlo por:

```text
Tipo: A
Nombre: www
Valor: 185.158.133.1
TTL: 14400
```

(O borrar el CNAME y dejar solo el A para `www`.)

Una vez propague (puede tardar hasta 72 horas, normalmente minutos), Lovable provisionará automáticamente el certificado SSL y el sitio dejará de aparecer como "no seguro".

## 2) La delegación de `notify` está mal: hay MX donde deben ir NS

Registros actuales relacionados con `notify`:

```text
MX   notify              10   ns4.lovable.cloud
MX   ns3.lovable.cloud   10   ns3.lovable.cloud
```

Esto está incorrecto:
- El segundo registro (`MX ns3.lovable.cloud → ns3.lovable.cloud`) no tiene sentido y debe **eliminarse**.
- El primero usa tipo MX, pero lo que Lovable necesita son **NS** (delegación de zona), no MX. Con MX, Hostinger sigue siendo autoritativo de `notify` y Lovable no puede gestionar SPF/DKIM/MX por debajo, por eso el dominio sigue en "Pending".

**Acción:** borrar los dos MX de arriba y crear en su lugar **dos registros NS** para el subdominio `notify`:

```text
Tipo: NS    Nombre: notify    Valor: ns3.lovable.cloud    TTL: 14400
Tipo: NS    Nombre: notify    Valor: ns4.lovable.cloud    TTL: 14400
```

(Hostinger los pide como dos entradas separadas con el mismo Nombre `notify`.)

El TXT `_lovable-email` y el TXT `_dmarc` actuales se pueden dejar; no estorban.

## Resumen de cambios en Hostinger

Borrar:
- `A @ 2.57.91.91`
- `CNAME www → balanceactivo.net`
- `MX notify 10 ns4.lovable.cloud`
- `MX ns3.lovable.cloud 10 ns3.lovable.cloud`

Crear:
- `A @ 185.158.133.1`
- `A www 185.158.133.1`
- `NS notify ns3.lovable.cloud`
- `NS notify ns4.lovable.cloud`

Mantener:
- `TXT _lovable-email "lovable_email_verify=…"`
- `TXT _dmarc "v=DMARC1; …"`

## Después de aplicar los cambios

1. Esperar a la propagación DNS (minutos a 72 h).
2. Lovable emitirá automáticamente el certificado SSL de `balanceactivo.net` y `www.balanceactivo.net`.
3. El dominio de correo `notify.balanceactivo.net` pasará de "Pending" a verificado y podrá enviar correos como `notify@balanceactivo.net`.
4. No hay cambios de código en la app; todo es configuración de DNS.
