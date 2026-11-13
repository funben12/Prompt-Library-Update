# Rubric: context bank

## Hard checks
```
must_include: Context Bank
```

## Judgement checks
* Can the Context Bank be opened from the Workspaces launcher and from the New prompt window, with no console errors?
* Can every block, including the 60 starter blocks, be reached through a category pill, and does search match on title and content?
* Does one click put a block into the prompt at the cursor, in the wrap style chosen (plain, labelled, XML tags)?
* Do blocks saved before this change still load, and do they come back after localStorage is cleared?
* Does delete offer undo, and does leaving an edited block warn before the changes are lost?
* Does the workspace meet the investor demo bar in light and dark (clear hierarchy, existing tokens, no overflow at 1280 px), with Snippets still looking right?
* Do `node --check static/app.js` and `python3 -m py_compile app.py` pass, with no schema change, no new dependency, a fresh cache hash and an updated `MEMORY.md`?
