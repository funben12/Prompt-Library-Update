# Prompt Stress Lab

Status: first implementation on feature branch, awaiting browser and desktop verification.

## Purpose

A dedicated quality assurance workspace for inspecting existing prompts without turning the Prompt Builder into an overloaded tool. It complements Prompt Auditor, Prompt Surgeon, Prompt Red Team and Gauntlet Loop rather than replacing them.

## Operating model

- QUICK: clarity, ambiguity, input contract and output contract.
- HARDEN: QUICK plus one-shot execution, handoff, constraint integrity and future failure.
- CRITICAL: HARDEN plus adversarial pressure checks.
- Local checks run first and use no AI provider or API tokens.
- AI review is a separate, explicit user action. It makes one bounded request, not a multi-agent chain.
- The original prompt is never overwritten. Findings and patch recommendations are advisory.
- A clean structural scan is not described as proof of runtime reliability.

## Context

- Optional Context Bank inclusion is off by default.
- When enabled, the workspace reads up to two locally stored Context Bank blocks, ranked by simple term overlap and capped before inclusion in the optional AI request.
- Recurring failure patterns are counted in a separate localStorage key, `promptlib.stresslab.patterns.v1`. This avoids polluting the user's Context Bank with QA telemetry.
- Pattern history can be exported as JSON.

## Integration

- The launcher card is injected into the existing Inspect group.
- The workspace is registered through the existing launcher card catalogue and workspace registry.
- The workspace uses a standalone JS and CSS file. No database schema change, new dependency, account system or cloud storage is introduced.
- The existing Gauntlet suite loads the new workspace module.
- Prompt reports are saved through the existing local prompt API.

## Token discipline

- Opening the workspace costs zero AI tokens.
- QUICK, HARDEN and CRITICAL local scans cost zero AI tokens.
- AI review runs only when explicitly requested.
- One request per review, with a bounded output budget of 1,600 tokens, or 2,200 for CRITICAL.
- Optional Context Bank material is limited to two blocks and 2,800 characters.
- The prompt supplied for analysis is capped at 20,000 characters.

## Known limitations

- Local checks are heuristic signals, not model execution tests.
- AI review depends on the user's configured provider.
- Recurring pattern memory is separate from Context Bank and remains local to the WebView profile. Export is available for portability.
- Browser and installed PyWebView verification are still required before merging.
