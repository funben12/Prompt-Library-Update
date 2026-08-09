# 05_Design_System — CLAUDE.md

## Purpose

Document the live visual system — tokens, typography, component patterns actually shipped.

## Rules for Claude

- **Theme correction is load-bearing:** root MEMORY.md still has a stale "cool-slate" entry from 09-06-2026 that was itself superseded and then re-confirmed wrong on 25-07-2026. The live theme is warm beige + teal. Don't trust the first cool-slate mention you find in MEMORY.md — check the 25-07-2026 correction note.
- CSS duplication (Hard Rule 6, root CLAUDE.md) is this project's most common visual bug pattern — grep before appending new rules to the same selector.
- This project does not use the MX Phillips Cowork OS design system tokens (oklch neumorphic palette) — it has its own distinct brand (warm beige/teal, Fraunces/Instrument Sans). Don't cross-apply Cowork OS tokens here.
