# 07_Permissions_Roles — CLAUDE.md

## Purpose

Document Free/Pro feature gating — this app has no multi-user roles, so "permissions" means tier gating, not authorization.

## Rules for Claude

- Don't confuse this document with the product's "Roles/Agents workspace" feature (`roles` table) — that's an AI persona-building feature, unrelated to access control.
- Gating is enforced client-side (DOM class + JS state check), not server-side beyond licence validation — this is a known, accepted trade-off for this product, not a bug to fix reflexively.
- Update the Feature Gate Matrix whenever a new Pro-gated workspace ships — cross-check against root MEMORY.md's Feature Inventory table.
