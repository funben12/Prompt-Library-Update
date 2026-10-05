# Prompt Library Pro licence system

The live app uses a local licence allowlist. Licence material is not stored in a separate
SQLite `licences` table.

## Current implementation

### Key generation

`generate_keys.py` creates random keys in the format:

```
PROMPTLIB-PRO-XXXX-XXXX-XXXX
```

Example:

```
python generate_keys.py 100
```

Generated plaintext keys should be kept outside the repository and supplied to the
payment provider as required.

### Key storage

`app.py` stores shipped licence values as SHA-256 hashes. The application hashes a
submitted key after trimming and upper-casing it, then compares the digest against the
allowlist.

Plaintext licence values must not be added to comments, documentation, source code, or
committed files.

### Activation flow

The UI validates a submitted key through:

```
POST /api/licence/validate
```

A valid key unlocks Pro features for the current session.

The user can save the validated licence state through the existing local settings flow.

The application rechecks the local licence state at startup and exposes it through the existing licence status endpoint.

### Current status endpoint

The application also exposes:

```
GET /api/licence/status
```

This endpoint is retained for status display. The main UI uses the local settings flow above.

## Security notes

Licence keys in the repository are represented by hashes only. Weak or explicitly
revoked keys should be removed from the shipped hash allowlist.

The application does not use the old standalone `licences` SQLite table or the old
`init_licences.py` / `licence_api.py` workflow.
