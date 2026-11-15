# Call the Movers

> Follow-on activity in the water utility incident: the attacker scans internal hosts and then moves laterally over SMB. Which non-default share did they use?
> **Flag:** `IMPORTANT$`

---

## Solution

### 1. Conversations

```bash
$ tshark -r Callthemovers.pcap -q -z conv,tcp
```

`10.125.10.97` scans `10.12.29.93` and `10.12.29.94` on ports 1-1000+, then opens
SMB sessions to port 445.

### 2. Decode the SMB payloads

The capture is synthetic: the SMB2 payload is plain text (`fe534d42` is `\xfeSMB`),
so `tshark` labels it as NBSS.

```bash
$ tshark -r Callthemovers.pcap -Y "tcp.port==445 && tcp.len>0" \
    -T fields -e frame.number -e ip.src -e tcp.payload |
  while IFS=$'\t' read -r f s p; do
    printf '%s %s ' "$f" "$s"
    echo "$p" | xxd -r -p | tr -c '[:print:]' '.'; echo
  done
```

### 3. Read the sequence

```text
NEGOTIATE
SESSION_SETUP  USER=goodwater HASH=FA7A305180452A719D23DBC01478D998
TREE_CONNECT:IPC$
TREE_CONNECT:ADMIN$
TREE_CONNECT:C$
TREE_CONNECT:IMPORTANT$
SMB_OP:ACCESS_SENSITIVE_FILE_0 .. _4
```

`IPC$`, `ADMIN$` and `C$` are default Windows shares. `IMPORTANT$` is not.

### 4. Confirm lateral movement

The same pattern repeats from `10.12.29.93` to `10.12.29.94:445` with the same
`TREE_CONNECT` calls.

### 5. Flag

```text
IMPORTANT$
```

## Lesson

Default administrative shares are noisy but expected; a custom share name is a
clear signal of targeted staging. Baseline the share list per host and alert on
new ones.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline PCAP analysis (no live instance).
