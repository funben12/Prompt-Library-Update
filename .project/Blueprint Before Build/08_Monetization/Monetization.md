# Monetization Strategy — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live — model confirmed and operating since 24-06-2026

---

## 1. Model Selected

One-off lifetime licence purchase via Payhip. Not a subscription — confirmed explicitly in root MEMORY.md ("Plan modal ... confirmed Pro stays one-off lifetime licence (not subscription)"). No ads, no marketplace, no freemium recurring fee.

## 2. Tier Structure

| Tier | Price | What's Included |
|------|-------|-------------------|
| Free | £0 | 35 prompts, 8 folders, 5 tags/8 categories per prompt, core workspaces (Roles, Chain in detail panel) |
| Pro | One-off (see Payhip listing for current price) | Unlimited caps + 18 additional Pro-gated features |

## 3. Distribution & Fulfilment

- Sold on Payhip: https://payhip.com/b/WKSLO
- Payhip assigns a licence key from a pre-generated batch, emails it to the customer on purchase.
- Customer enters the key in-app; app validates locally against `/api/licence/validate`, locks to `machine_id`, unlocks permanently.
- Keys are generated in batches via `generate_keys.py`, loaded via `init_licences.py`. As of `LICENCE_SYSTEM.md`'s last update: 218 keys loaded (15 old format + 103 PROMPTLIB-PRO).

## 4. Launch Promotions

- Launch discount code `PlaygroundRelease` — 50% off, first 5 uses only (as of 24-06-2026 launch).
- A second 25%-off code was planned pending sales momentum — check current Payhip listing for whether this has since gone live.

## 5. Churn / Retention Considerations

Not applicable in the subscription sense — one-off purchase, no recurring billing, no churn risk from cancellation. Retention here means continued product use and word-of-mouth, not renewal.

---

## Notes

- This is a low-complexity monetisation model by design — a solo developer's local desktop app doesn't need marketplace fees, escrow, or ad placement logic. Don't over-engineer future monetisation proposals beyond what a one-off licence model needs.
- If a second Pro tier or add-on ever gets proposed, use the `pricing-strategy` skill for willingness-to-pay analysis before committing — this document should be updated with the outcome.
