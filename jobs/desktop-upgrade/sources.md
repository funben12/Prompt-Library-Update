# Sources: desktop upgrade

* Advisor tool type `advisor_20260301`, beta header `advisor-tool-2026-03-01`, optional `max_uses` and `max_tokens`, `pause_turn` resume by resending the assistant message | Eugene's advisor-tool skill, citing Anthropic docs | https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool | 11-11-2026
* Haiku 4.5 and Sonnet 4.6 can be advised by Opus 4.8 | advisor-tool skill, model pairing table | same | 11-11-2026
* Live advisor behaviour against a real key | UNVERIFIED, no API key in the cloud session
* Default models before the change: gpt-5.4-mini, claude-haiku-4-5-20251001, gemini-2.5-flash, openai/gpt-5.4-mini, command-a-03-2025 | `_rollbacks/app v-pre-desktop-upgrade.js` | repo | 11-11-2026
* Board routes return no pin membership, only `pin_count` | `app.py` `/api/boards*` | repo | 11-11-2026
* Pinterest patterns used: masonry grid, hover Save with board chooser, close up with related pins, collage board covers | common knowledge
