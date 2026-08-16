# Bóveda KeePass

> Bóveda KeePass (ingeniero.kdbx) con las claves de recuperación del sector 14. Abre la entrada y envía `WHOAMI{...}`.
>
> **Consejo:** KeePassXC + politica_acceso.txt, o keepass2john / hashcat -m 13400.

**Flag:** `WHOAMI{k33p4ss_b0v3d4_14}`

---

## Resolución

El pack contiene una bóveda KeePass (`ingeniero.kdbx`) y un archivo `politica_acceso.txt` que da la clave para derivar la contraseña maestra de la bóveda. Si se abre la bóveda, la entrada "Recuperación sector 14" guarda la flag.

### 1. Descomprimir y ver los archivos

```bash
$ unzip boveda_keepass.zip
```

- `ingeniero.kdbx` — base de datos KeePass (Keepass password database 2.x KDBX)
- `politica_acceso.txt` — la política de contraseñas

### 2. Leer la política de acceso

```bash
$ cat politica_acceso.txt
Política de acceso — Red LATAM Energía (2026)
Las bóvedas personales deben usar: RolDominio.Año
Ejemplo de forma: Ingeniero.Norte2026
No reutilizar PIN de panel local.
```

**Lo que vi:** la política da el formato exacto de la contraseña maestra: `RolDominio.Año`. La bóveda es del *Ingeniero*, y el ejemplo es `Ingeniero.Norte2026` → contraseña candidata: **`Ingeniero.Norte2026`**.

### 3. Abrir la bóveda con KeePassXC

**Herramienta:** `keepassxc-cli`. **Por qué:** KeePassXC es un gestor de contraseñas compatible con KDBX; su CLI permite listar y mostrar entradas sin interfaz gráfica.

Primero listamos para confirmar que la contraseña abre la bóveda y ver su estructura:

```bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli ls -R -f ingeniero.kdbx
Blackout LATAM/
Blackout LATAM/Recuperación sector 14
```

**Lo que vi:** la bóveda se abrió y contiene una única entrada, "Recuperación sector 14".

### 4. Mostrar la entrada protegida

La flag suele vivir en campos marcados como *protegidos*, así que se muestra todo en claro.

**Parámetros:** `-q` (silencia el prompt), `-s --show-protected` (muestra los atributos protegidos en claro), `--all` (todos los campos).

```bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli show -q -s --all "ingeniero.kdbx" "Blackout LATAM/Recuperación sector 14"
Title: Recuperación sector 14
UserName: ingeniero.campo@redlatam.energia
Password: WHOAMI{k33p4ss_b0v3d4_14}
URL:
Notes: Solo usar si el SCADA central no responde.
```

La flag estaba en el campo `Password` de la entrada. ## Lección

Una bóveda KeePass vale lo que vale su contraseña maestra: si el formato de esa contraseña sigue una política corporativa predecible (`RolDominio.Año`) y el archivo de política se filtra junto a la bóveda, la "protección" desaparece. Además, la flag en campos protegidos se lee con `--show-protected`.