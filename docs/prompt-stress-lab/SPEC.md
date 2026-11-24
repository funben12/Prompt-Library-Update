# Unified Prompt Testing Workspace

Status: implemented on `feature/prompt-stress-lab`. Awaiting interactive browser and installed PyWebView verification before merge.

## Purpose

Bring Prompt Surgeon, Prompt Red Team and Prompt Stress Lab into one shared assessment workflow. The user supplies one target prompt and one objective. The selected specialist checks operate on that same input and contribute to one combined report.

Gauntlet Loop is a separate tool. It is not part of this workspace and must not be wired into its launcher, interface or execution flow.

## Shared workflow

1. Load one saved prompt or paste one prompt.
2. Optionally describe the intended outcome or concern.
3. Choose Automatic recommendation, one specialist, or Full assessment.
4. Run local analysis first.
5. Optionally request one combined AI review.
6. Review, copy or save the shared report. The original prompt is never overwritten.

## Specialist responsibilities

- **Prompt Surgeon:** reuse the existing local structural diagnosis and provide repair guidance through the combined AI review.
- **Prompt Red Team:** reuse the existing adversarial checklist and request concrete attack scenarios, likely failures and regression tests when selected.
- **Prompt Stress Lab:** reuse the existing structural analysis engine, with QUICK, HARDEN and CRITICAL depth settings.

The three capabilities share one prompt field, objective, assessment route and report. They are not separate workspace panels.

## Intelligent routing

Automatic routing uses the objective and prompt text as signals:

- Repair, improve, rewrite, refine or strengthen requests select Surgeon plus Stress Lab.
- Security, injection, attack, hostile or exploit concerns select Red Team plus Stress Lab.
- Readiness, reliability, quality or production assessment selects Stress Lab plus Red Team.
- If no stronger intent is detected, Stress Lab is the default.
- Users can override automatic routing with a specialist selection or Full assessment.

Routing is a lightweight heuristic, not an AI call. The user can explicitly choose the assessment scope.

## Local analysis and AI use

- Opening the workspace and running local checks use zero AI tokens.
- The three local specialist checks run against the same prompt.
- Combined AI review is a separate, explicit action.
- One bounded AI request is used for the selected specialists, with a 2,600 token output limit.
- AI review does not run automatically and does not rewrite the saved prompt.
- The original prompt is capped at 20,000 characters in the AI request.
- Optional Context Bank inclusion is off by default, limited to two relevant local blocks and 2,800 characters.
- Local findings are preserved if AI review fails.

## Stress Lab continuity

- QUICK, HARDEN and CRITICAL modes remain available.
- Recurring findings remain in localStorage key `promptlib.stresslab.patterns.v1`, separate from Context Bank.
- Pattern history is displayed in the shared workspace and can be exported as JSON.
- Context Bank material is read only when the user opts in.

## Integration and constraints

- One launcher card opens the shared workspace.
- The former separate Surgeon and Red Team launcher cards and workspace markup are removed.
- The workspace is loaded after the Stress Lab analysis core is available.
- The workspace picker registry and preview represent the combined tool.
- No database schema changes, new dependencies, cloud storage, accounts or authentication changes.
- Prompt reports use the existing local prompt API.
- Existing Teammate Studio and other unrelated workspaces remain separate.
- Gauntlet Loop remains untouched and separate.

## Known limitations and verification

- Local checks are heuristic signals, not model execution tests.
- Automatic routing is keyword based and can be overridden manually.
- AI review depends on the user's configured provider.
- JavaScript syntax and specialist engine smoke checks have passed.
- Interactive browser testing and installed Windows PyWebView testing are still required before merge.
