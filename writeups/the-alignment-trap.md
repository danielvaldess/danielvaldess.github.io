# The Alignment Trap

> Fluid Cloud Storage has a custom allocator that computes the allocation size in 32-bit arithmetic. A one-shot integer overflow gives a heap overflow, then tcache poisoning and House of Apple 2 reach `system()`.
> **Flag:** `flag{54966fed8c72d389}`

---

## Solution

### 1. Protections

```text
Full RELRO, PIE, NX, stack canary, SHSTK, IBT
glibc 2.39 (Ubuntu) — __free_hook is gone
```

### 2. The bug

The allocator sizes the block as:

```c
aligned    = (size + align - 1) & -align;   /* 32-bit */
alloc_size = aligned + 0x18;
```

With `align=0x80000000` and `size=0x80000001`:

```text
(0x80000001 + 0x7fffffff) & 0x80000000 = 0
alloc_size = 0x18
```

Only 24 bytes are reserved, but the block accepts up to `0x10000` bytes of data:
a massive heap overflow.

### 3. Heap layout

Four blocks:

```text
ID 0: overflow  (align=0x80000000, size=0x80000001)
ID 1: reader    (align=0x20, size=0x100)
ID 2: guard     (align=0x20, size=0x100)
ID 3: workspace (align=0x20, size=0x600)
```

Writing through ID 0 changes the logical size of ID 1 to `0x2000`, so it can read
past its own bounds.

### 4. Leaks

- Free ID 3 and read ID 1 **before** `compact`: at `+0x860` there is `heap_c`, a
  pointer to the workspace, still held by the freelist node.
- Run `compact` (the workspace goes to the unsorted bin) and read ID 1 again: at
  `+0x228` the unsorted-bin `fd` gives `libc_leak`, so
  `libc_base = libc_leak - 0x203b20`.

### 5. House of Apple 2

Recreate ID 3 from the unsorted bin (same address) and write a fake `_IO_FILE`
of `0x580` bytes:

- `" cat /flag*"` at the start of the structure,
- `_IO_write_ptr > _IO_write_base` to force a flush,
- `_wide_data` pointing to a fake structure,
- `_wide_vtable->__doallocate = system`,
- the main vtable set to `_IO_wfile_jumps` (a valid vtable).

### 6. Tcache poisoning

Free ID 1 and ID 2: both `0x120` chunks land in `tcache[0x120]`, and the tcache
`next` pointer sits in ID 1's user data.

Overwrite it through ID 0:

```text
target = stderr + 0x50          # writes land in _chain
encoded = target ^ (heap_base >> 12)   # safe-linking
```

The next `0x120` allocation returns `stderr+0x50`.

### 7. Chain the FILE

Allocate two `0x100` blocks: the first returns the original ID 1 chunk, the second
returns `stderr+0x50`. Writing through ID 2 places the fake FILE address at
`stderr+0x68`, which is `stderr->_chain`.

### 8. Trigger

Option 9 calls `exit()`, which runs `_IO_flush_all_lockp()` and walks
`_IO_list_all -> stderr -> fake FILE` through `_chain`. The fake FILE has
`_mode=1` and `_IO_write_ptr > _IO_write_base`, so the path is:

```text
_IO_OVERFLOW -> _IO_wfile_overflow -> _IO_wdoallocbuf -> _wide_vtable->__doallocate
```

which is `system(" cat /flag*")`.

### 9. Flag

```text
flag{54966fed8c72d389}
```

## Lesson

A 32-bit size computation inside a 64-bit allocator is an integer overflow with
extra steps. Modern glibc removed `__free_hook`, but FSOP through `_wide_vtable`
still turns a corrupted FILE into code execution.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
