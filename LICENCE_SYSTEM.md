# Prompt Library Pro — Licence System Setup

## What's been created

### 1. Key Generator (`generate_keys.py`)
Generate new licence keys in batches.

```bash
python3 generate_keys.py 100
```
Creates `keys_batch_100.txt` with 100 unique keys in format: `PROMPTLIB-PRO-XXXX-XXXX-XXXX`

### 2. Licence Database Initializer (`init_licences.py`)
Loads keys into SQLite. Run once per batch:

```bash
python3 init_licences.py all_keys_to_load.txt
```

Creates `licences` table with columns:
- `key_hash` — SHA256 of the key (for lookup)
- `key_display` — the actual key
- `is_used` — 0 (available) or 1 (activated)
- `date_activated` — when it was used
- `machine_id` — which machine activated it

### 3. Flask API Endpoints (added to `app.py`)

#### `POST /api/licence/validate`
Validate and activate a key.
```javascript
fetch('/api/licence/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'PROMPTLIB-PRO-XXXX-XXXX-XXXX' })
})
.then(r => r.json())
.then(data => {
  if (data.valid) {
    console.log('✓ Licence activated');
    // Unlock premium features
  } else {
    console.log('✗ ' + data.message);
  }
});
```

**Returns:**
```json
{
  "valid": true/false,
  "message": "...",
  "already_activated": true/false
}
```

#### `GET /api/licence/status`
Check if current machine is licensed.
```javascript
fetch('/api/licence/status')
  .then(r => r.json())
  .then(data => {
    if (data.licensed) {
      console.log('Machine is licensed as of:', data.activated);
    }
  });
```

**Returns:**
```json
{
  "licensed": true/false,
  "key": "PROMPTLIB-PRO-XXXX****-XXXX",
  "activated": "2026-06-23T10:30:00.000Z"
}
```

#### `GET /api/admin/licence/count`
Count available keys (admin only).
```json
{
  "total": 218,
  "used": 5,
  "available": 213
}
```

---

## Workflow

### 1. Generate keys in batches
```bash
python3 generate_keys.py 500  # Create 500 new keys
```

### 2. Upload to Payhip
Copy all keys from `all_keys_to_load.txt` → paste into Payhip's "License Key Settings" → "From a list" field.

### 3. Customer buys on Payhip
- Payhip assigns a key from your list
- Payhip emails it to the customer
- Customer enters key into Prompt Library

### 4. App validates locally
User launches app → goes to Settings → enters key → app calls `/api/licence/validate` → key is marked as used → unlock features

---

## Key Facts

✓ **Fully local** — no internet required, no Payhip API calls from the app  
✓ **One key per machine** — locked to `machine_id` in DB  
✓ **Persistent** — stored in SQLite, survives app restart  
✓ **Unlimited keys** — generate 10,000+ as needed  
✓ **No expiry** — once activated, licence is permanent  

---

## Current Status

- **Licence table:** ✓ Initialized
- **Keys loaded:** 218 (15 old format + 103 PROMPTLIB-PRO)
- **API endpoints:** ✓ Added to app.py
- **Syntax check:** ✓ Passed

---

## Next: Add UI to Prompt Library

You need to add a licence entry screen to your app. This should:

1. Show current licence status on startup
2. If not licensed → show a modal with a text input
3. User pastes key → app calls `/api/licence/validate`
4. On success → unlock premium features
5. Store `isPremium` in state so features check it

Can build this in `static/app.js` + `static/index.html`. Want me to do that next?
