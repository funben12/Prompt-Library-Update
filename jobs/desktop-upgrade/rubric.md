# Rubric: desktop upgrade

## Hard checks
```
must_include: Prompt Board
```

## Judgement checks
* Does every AI feature go through the one shared `callAI`, with a model field per provider, and does a user who changes nothing get the same models as before?
* Would a Pinterest user know what to do on the Prompt Board within five seconds (masonry pins, hover Save, board picker, pin close up, collage board covers), while it still looks like this app and not a copy of Pinterest's brand?
* Can a prompt be pinned to a board from a library card and from the detail panel, without opening the board?
* Does `showcase/` hold a screenshot of every live screen in light and dark, with a gallery page that opens from the folder?
* Do `node --check static/app.js` and `python3 -m py_compile app.py` pass, with no console errors, no schema change, no new dependency, a fresh cache hash and an updated `MEMORY.md`?
