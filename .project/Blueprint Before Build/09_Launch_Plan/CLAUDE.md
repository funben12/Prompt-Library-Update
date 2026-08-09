# 09_Launch_Plan — CLAUDE.md

## Purpose

Retrospective record of how the actual 24-06-2026 launch went, including the pre-launch build fix and the gaps that remain (no telemetry, no update mechanism).

## Rules for Claude

- Before delivering any future update/rebuild, run the `batch-scaffold` skill check per root Cowork OS rules — never deliver a packaged app without it.
- The "no update-check mechanism" gap is real and worth surfacing if Eugene asks about post-launch reliability or plans a v2 distribution improvement.
- Don't invent a rollback plan modeled on web-app deployment — this product's distribution model (one-time installer) doesn't have that concept; the honest answer is "fix, rebuild, re-upload."
