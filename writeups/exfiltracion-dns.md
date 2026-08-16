# Exfiltración DNS

> Consultas DNS anómalas hacia `exfil.blackout.redlatam`. Reconstruye la secuencia y envía `WHOAMI{...}`.
>
> **Consejo:** filtra `dns.qry.name` o protocolo DNS en Wireshark.

**Flag:** `WHOAMI{dns_3xf1l_bl4ck0ut}`

---

## Resolución

Las consultas DNS son la vía de exfiltración: el nombre consultado esconde los datos en base32, numerados por fragmento.

### 1. Ver el tráfico DNS

**Herramienta:** `tshark`. **Por qué:** analiza PCAP por CLI; lo primero es listar los paquetes para ver qué hay.

```bash
$ tshark -r exfil_dns.pcap
  1  DNS  Standard query 0x0000 TXT 03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
  2  DNS  Standard query 0x0000 TXT 02-mrxhgxy.exfil.blackout.redlatam
  3  DNS  Standard query 0x0000 TXT 01-k5ee6qknjf5q.exfil.blackout.redlatam
```

Cada consulta es `NN-<payload base32>.exfil.blackout.redlatam`: un número de secuencia más un fragmento en base32. **Lo que vi:** el prefijo numérico sugiere que hay que ordenar por ese número.

### 2. Extraer los nombres y ordenar por secuencia

**Herramienta:** `tshark` con filtro de display y campos. **Por qué:** extraer solo los nombres consultados y ordenarlos, en lugar de leer las líneas sueltas.

**Parámetros:** `-Y "dns.qry.type == 16"` filtra consultas TXT (tipo 16, las que llevan datos); `-T fields -e dns.qry.name` saca solo el campo del nombre; `sort` ordena.

```bash
$ tshark -r exfil_dns.pcap -Y "dns.qry.type == 16" -T fields -e dns.qry.name | sort
01-k5ee6qknjf5q.exfil.blackout.redlatam
02-mrxhgxy.exfil.blackout.redlatam
03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
```

### 3. Decodificar base32 en orden

**Herramienta:** `base32 -d`. **Por qué:** los fragmentos son base32. El base32 usa mayúsculas; el dominio va en minúsculas, así que se normaliza a mayúsculas antes de decodificar:

```bash
$ echo "K5EE6QKNJF5Q" | base32 -d   # WHOAMI{
$ echo "MRXHGXY"      | base32 -d   # dns_
$ echo "GN4GMMLML5RGYNDDNMYHK5D5" | base32 -d   # 3xf1l_bl4ck0ut}
```

Concatenando `01` → `02` → `03`:

```
WHOAMI{ + dns_ + 3xf1l_bl4ck0ut}  =  WHOAMI{dns_3xf1l_bl4ck0ut}
```

## Lección

En un PCAP con DNS sospechoso, filtra por `dns.qry.name`, fíjate en dominios raros con prefijos numerados y decodifica cada fragmento: la exfiltración por DNS suele esconder la flag en base32/base64 dentro de los nombres consultados.