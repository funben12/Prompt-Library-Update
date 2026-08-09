# Permissions & Roles (Authorization Matrix) — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live — no user-account roles exist; this is a Free/Pro feature-gating matrix instead

---

## Important Context

This app has no multi-user accounts, no admin/moderator/guest roles in the traditional sense — it's a single-user local app. "Permissions" here means **Free vs Pro feature gating**, not user authorization. Don't confuse this with the "Roles workspace" (`roles` table, Agents/Roles feature) — that's a product feature for building AI persona prompts, unrelated to this document.

## 1. Tier Definitions

| Tier | Description |
|------|-------------|
| Free | Default on install. Capped limits, core features only |
| Pro | Unlocked via one-off licence key purchase (Payhip). Removes caps, unlocks 18+ additional features |

## 2. Feature Gate Matrix

| Feature / Resource | Free | Pro |
|----------------------|------|-----|
| Prompts | 35 max | Unlimited |
| Folders | 8 max | Unlimited |
| Tags per prompt | 5 max | Unlimited |
| Categories per prompt | 8 max | Unlimited |
| Command palette | ✗ | ✓ |
| Forge / Lab / Playground workspaces | ✗ | ✓ |
| Components workspace | ✗ | ✓ |
| Optimizer / Tone Calibrator | ✗ | ✓ |
| Context Bank | ✗ | ✓ |
| Batch Runner | ✗ | ✓ |
| Version history | ✗ | ✓ |
| Analytics | ✗ | ✓ |
| Duplicate prompt | ✗ | ✓ |
| Markdown/CSV/Bulk export | ✗ | ✓ |
| Chat format tab | ✗ | ✓ |
| Rating & notes | ✗ | ✓ |
| Ctrl+T case cycling | ✗ | ✓ |
| Theme toggle | ✗ | ✓ (Free is fixed dark) |
| Chain prompting (detail panel) | ✓ | ✓ — Free, not gated |
| Roles/Agents workspace | ✓ | ✓ — Free, not gated |

## 3. Escalation Rules

None — no request/approval flow. Escalation is a single event: enter a valid licence key, immediately unlock everything Pro.

## 4. Auditing Requirements

None formally implemented. Licence table logs `date_activated` and `machine_id` per key — this is the only audit trail that exists.

## 5. Session / Token Policies

No sessions in the web-auth sense — this is a local desktop app. The closest equivalent is licence state, stored in SQLite `settings`, persistent across restarts. No expiry — licence is permanent once activated per Key Facts in `LICENCE_SYSTEM.md`.

## 6. Enforcement Mechanism (technical, not policy)

Gating is DOM-based: `premium-locked` class + `data-premium="true"` attribute on gated elements, checked against `state.isPremium` in JS. This is **not server-enforced** beyond the licence validation call itself — a technically sophisticated user could bypass client-side gating. Acceptable risk for this product's threat model (low-value target, one-off purchase, not subscription revenue at stake per-session).

---

## Notes

- If this product ever adds multi-user or cloud sync, this document needs a real authorization matrix — current structure doesn't extend to that case.
- Gate enforcement being client-side-only is a known, accepted trade-off — not an oversight requiring immediate fixing.
