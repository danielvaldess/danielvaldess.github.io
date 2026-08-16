# Shadow del turno

> Backup parcial de /etc/shadow del servidor de consola. El password de operador.turno también abre el ZIP. Recupera `WHOAMI{...}`.
>
> **Consejo:** el hash empieza por `$6$` → sha512crypt.

**Flag:** `WHOAMI{sh4d0w_turn0_n0rt3}`

---

## Resolución

El pack contiene un fragmento de `/etc/shadow` con el hash del usuario `operador.turno` y un ZIP cifrado con la misma contraseña. Si se craquea el hash se obtiene la clave que desbloquea el ZIP y la flag.

### 1. Descomprimir y ver los archivos

```bash
$ unzip shadow_turno.zip
```

Tres archivos:

- `shadow_turno.txt` — el hash del usuario
- `export_consola.txt` — contexto (indica que la misma contraseña abre el ZIP)
- `consola.zip` — el archivo cifrado

### 2. Identificar el tipo de hash

**`shadow_turno.txt`:**
```
operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/:20345:0:99999:7:::
```

El hash empieza por **`$6$`**, que es la firma de **sha512crypt** (el algoritmo de hashing de contraseñas de Linux en `/etc/shadow`). El salt es `blackoutlatam`.

### 3. Craquear el hash con john

**Herramienta:** `john`. **Por qué:** es el crackeador estándar de hashes de contraseñas; soporta el formato `sha512crypt` nativo y los formatos de `/etc/shadow`.

**Parámetros:** `--format=sha512crypt` fija el algoritmo (evita que john adivine), `--wordlist=/usr/share/wordlists/rockyou.txt` usa el diccionario común.

```bash
$ printf 'operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/\n' > shadow.hash
$ john --format=sha512crypt --wordlist=/usr/share/wordlists/rockyou.txt shadow.hash
electric         (operador.turno)
```

**Lo que vi:** john recuperó la contraseña **`electric`** en menos de un segundo usando el diccionario rockyou.

### 4. Abrir el ZIP con la contraseña

**Herramienta:** `unzip`. **Por qué:** abre el archivo cifrado con la clave recuperada.

**Parámetros:** `-P electric` provee la contraseña directamente sin pedirla interactivamente.

```bash
$ unzip -P electric consola.zip
extracting: flag.txt
```

### 5. Leer la flag

```bash
$ cat flag.txt
WHOAMI{sh4d0w_turn0_n0rt3}
```

## Lección

Un hash `$6$` (sha512crypt) de `/etc/shadow` no se puede invertir matemáticamente: se adivina. Con una contraseña débil en un diccionario, `john --format=sha512crypt` la recupera al instante, y esa misma clave suele reutilizarse para desbloquear otros archivos del reto.