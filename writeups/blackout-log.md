# Blackout Log

> Partial SCADA shift export + audio alarm. Reconstruct the sequence and submit `WHOAMI{...}`.
> **Tip:** not all `[SYNC-FRAG]` lines are useful.

**Flag:** `WHOAMI{b17ac0r4_4ud10_m0r53}`

---

## Solution

The package contains two files: a log (`turno.log`) and an audio alarm (`alerta.wav`). The first step is to check what they are before touching anything:

```bash
$ file turno.log alerta.wav
turno.log: ASCII text
alerta.wav: RIFF (little-endian) data, WAVE audio, Mono 8000 Hz
```

A text log and a mono 8 kHz WAV. The decision: since there is a short-duration audio file, it is almost always worth looking at its spectrogram — that is usually where messages hidden from plain sight are concealed.

### 1. Decode the base32 fragments

**Tool:** `base32 -d`. **Why:** when reading the log, the `[SYNC-FRAG]` lines contain a `payload=` with a pattern of uppercase letters and `=`, which is the signature of **base32** (base-32 encoding with `=` padding).

```bash
$ echo "K5EE6QKNJF5Q====" | base32 -d   # WHOAMI{
$ echo "MIYTOYLDGBZDIXY=" | base32 -d   # b17ac0r4_
$ echo "GR2WIMJQL4======" | base32 -d   # 4ud10_
$ echo "NUYHENJTPU======" | base32 -d   # m0r53}
```

| Line | Time | payload (base32) | Decoded |
|---|---|---|---|
| SYNC-FRAG-04 | 03:14:01 | `K5EE6QKNJF5Q====` | `WHOAMI{` |
| SYNC-FRAG-02 | 03:14:08 | `MIYTOYLDGBZDIXY=` | `b17ac0r4_` |
| SYNC-FRAG-03 | 03:14:15 | `GR2WIMJQL4======` | `4ud10_` |
| SYNC-FRAG-01 | 03:14:22 | `NUYHENJTPU======` | `m0r53}` |

> Note: the line `[ERROR] FRAG false positive payload=JBSWY3DPEEQ====` decodes to `Hello` — a decoy. The challenge hint ("not all SYNC-FRAG lines are useful") warns that there are false fragments. That is why I did **not** rely on the fragment number.

### 2. Determine the order: the audio is Morse

**Tool:** `sox` / spectrogram + interval analysis. **Why:** since the fragments decode correctly but there is a correct order, the audio must provide the instruction on how to arrange them.

`alerta.wav` is an 879 Hz tone with on/off bursts. Measuring the tone and silence intervals reveals the pattern:

- Short tone (~3.4 s) = **dot**
- Long tone (~10 s) = **dash**
- Short silence = separator between symbols
- Long silence (~13 s) = separator between letters

```
—  ..  ——  .        →  T  I  M  E
```

The Morse spells **TIME**: the key is the **temporal order** (the timestamps), not the fragment number.

### 3. Reconstruct the flag

Sorting by time: `WHOAMI{` + `b17ac0r4_` + `4ud10_` + `m0r53}`

```
WHOAMI{b17ac0r4_4ud10_m0r53}
```

## Lesson

When a challenge combines log + audio, look at what is *inside* the audio (spectrogram/Morse) before guessing the order: it usually contains the instruction on how to combine the log fragments.
