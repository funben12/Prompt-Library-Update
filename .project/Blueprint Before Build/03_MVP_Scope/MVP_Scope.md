# MVP Scope — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective — V1/V2 history)
**Status:** Past MVP; product has since expanded well beyond it

---

## 1. Core Hypothesis (original)

People who work with AI prompts regularly want a dedicated, private, local tool to store and organise them — and will pay once for a Pro tier that removes limits and adds power features, rather than subscribe to a cloud service.

## 2. V1 — What Shipped First (historical)

V1 was a monolith: app.js ~88KB, index.html ~76KB. Functional but unmaintainable — this is documented in root MEMORY.md as the reason for the V2 rebuild.

## 3. V2 — The Actual MVP Baseline

| Feature | Why It Was Essential |
|---------|------------------------|
| Prompt CRUD with folders/tags | Core value proposition — organise prompts |
| Variable system | Differentiator vs. plain notes app |
| SQLite local storage | Local-first requirement, no cloud dependency |
| Free/Pro licence gating | Monetisation model requires a functional gate from day one |
| Windows installer (Inno Setup) | Distribution requires a real installer, not just a script |

## 4. Deferred at MVP (later built or still planned)

| Feature | Status Now |
|---------|--------------|
| Command palette | Now live, Pro |
| Chain prompting | Now live (detail panel, not standalone workspace — reverted after being over-engineered) |
| Roles/Agents workspace | Now live, Free |
| Advanced workspaces (Forge/Lab/Playground/Components/Optimizer) | Now live, Pro |
| Dashboard workspace | Still planned — not in live files |
| Trash & Restore workspace | Still planned — not in live files |
| Template Gallery workspace | Still planned — not in live files |
| Text Expansion (system-wide) | Still planned — deferred over AV flag risk |

## 5. Success Metrics / KPIs

No formal MVP-stage metrics were documented. Current success signal is Payhip sales plus licence key activation count (`/api/admin/licence/count`).

## 6. Timeline & Milestones (actual, retrospective)

| Milestone | Date |
|-----------|------|
| V1 built | Prior to 2026 |
| V2 rebuild (modular architecture) | Prior to 17-05-2026 |
| Onboarding tour shipped | 15-06-2026 |
| Payhip launch | 24-06-2026 |
| Batch Runner workspace (phase 3) | 25-07-2026 |

---

## Notes

- This MVP Scope is historical — the product has moved well past "minimum" and into a maturing feature set. For active scoping of new work, treat this document as context on what MVP discipline looked like here, not a current gate.
- The V1 → V2 rewrite is the clearest lesson in this codebase: monolith growth without size limits caused real pain. Hard Rule 4 (no arbitrary growth of app.js/index.html) exists directly because of this history.
