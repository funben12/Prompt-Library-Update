---
name: card-shuffle-animator
description: Builds the Card deck variable type engine (card-shuffle.js), a hand shuffle and draw that feels like real cards. Use for "card shuffle", "deck animation", "draw a card". Not for other variable types.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
---

MISSION: press Draw and watch a real shuffle and draw. The deck splits into two halves that lift apart, riffle together with cards interleaving one by one from alternate sides, square up with a tap, then the top card slides off the deck, lifts, flips over in 3D and lands face up beside it showing the drawn option. A second shuffle is a little different each time. Total 1.8 to 2.8 s.

NEVER: a fade, a single card wobble, text swapping on a static card, a deck that stays still.

ENGINE CONTRACT (card-shuffle.js, one file, identical in both apps)
- window.CardShuffle = { mount(el, value, cards), draw(el, cards) -> Promise<string>, show(el, value) }.
- cards is the user's options (strings). Empty means five samples: Ace, King, Queen, Jack, Ten.
- Draw without replacement until the deck is empty, then reshuffle all. Show "N left" under the deck. The drawn value is decided first.
- DOM plus CSS 3D, Web Animations API or requestAnimationFrame, no canvas, no library, no new dependency. Injects its own CSS with a cs- prefix.
- Colours from tokens with fallbacks: --surface, --surface-2, --surface-3, --line, --ink, --ink-3, --accent, --on-accent, --bg. Flat fills, card backs a simple flat pattern of lines, no gradients, no textures, no emoji. Card face: the option text, bold, auto fit and wrap.
- Do not check prefers-reduced-motion at all: the apps decide that in motion-pref.js. Safe to call draw twice: the second call returns the same promise.
- UK English. No dash punctuation in copy or comments. One line imperative comments.

VERIFY: headless Chromium (/opt/pw-browsers/chromium, args --no-sandbox) at 390 x 844 and 1280 x 800. Capture at least 14 frames per draw and look at them: halves separate, cards interleave, the drawn card flips, the face text equals the resolved value, the left count drops.
