# Prompt Rush, spec

## What it is
A one-thumb mobile game. The player types one sentence describing an AI agent or persona. Seven fast rounds shape it into a finished, copy-ready prompt: Role, Voice, Knowledge, Tools, Guardrails, Output, Handoff. A plain-language summary card updates after every tap. Win state: the player finishes thinking "I want to build this."

## Hard rules
- Fully offline. No network calls, no API, no accounts, no backend, no CDN, no web fonts from the internet. Bundle everything.
- Save progress locally only (localStorage, wrapped in try/catch).
- Light for an older phone: vanilla HTML/CSS/JS, no framework, no build step, total www under 400 KB, transform/opacity animations only, respects prefers-reduced-motion.
- Portrait first (390 x 844 reference), working landscape (844 x 390).
- Restart available at all times (visible control on every screen, confirm before wiping).
- Any timer is optional and off by default (Rush mode toggle in settings).
- UI copy: UK English, never use em dashes, en dashes or hyphens as punctuation in visible copy. Use commas, colons, full stops.

## Visual direction (from the supplied logo)
- Warm cream neumorphic surfaces, soft top left light, no gradients on surfaces, no textures.
- Accent teal (close to #17706d), ink navy (#121a2b), cream base (#ece3d6 / #f6efe3).
- Chunky, tactile, game feel: pressable tiles with depth, satisfying press states, small celebratory motion.

## Files
- `www/index.html`, `www/game.css`, `www/game.js`, `www/content.js` (all option data), assets inline or in `www/`.
- `android/` minimal WebView wrapper loading `file:///android_asset/www/index.html`.
