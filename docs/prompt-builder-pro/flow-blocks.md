# Parallel Execution and Merge blocks

Status: implemented on `feature/prompt-stress-lab`. Verified in headless Chromium. Not yet checked in the installed PyWebView build.

## What they are

Two blocks in the **Logic and flow** group of the Block Library, also listed at the top of **Your Blocks** marked "Included". They are the same two block types in both places, so a block added from either list is identical.

| Block | Type | Default | Range | Output |
| --- | --- | --- | --- | --- |
| Parallel Execution | `parallel_exec` | 2 inputs, 2 outputs | 2 to 8, set separately | one per track |
| Merge | `merge_n` | 2 inputs | 2 to 8 | one merged output |

The older **Parallel Split** (`parallel`) and **Merge Outputs** (`merge`) are untouched. They are fixed-port logic blocks that saved flows and the showcases use, so the new blocks are separate types rather than a change to shared logic.

## Changing the number of inputs and outputs

Select the block. The settings panel has a **Number of inputs** (and for Parallel Execution **Number of outputs**) control with minus and plus buttons. The buttons disable at 2 and 8, and any value written into a saved flow is pulled back into range. Making a count smaller takes off the wires that pointed at the removed port and says how many.

How it works: the engine reads fixed port lists, so each block registers its largest set (8) and the canvas shows the first n (`activeIn`, `activeOut`, `pruneFlow` in `builder-pro.js`). The engine only ever sees wires that are visible. The engine file is unchanged.

## Parallel execution setting

Above the prompt, beside the other switches:

- **Parallel execution** switch (on by default). On, Parallel Execution blocks write "Run the n tracks in parallel: at the same time and independently". Off, they write "Work through the n tracks one after another, in order". Checks notes when it is off.
- **Tracks** (2 to 8). The number of inputs and outputs a new Parallel Execution block starts with.

Both are saved with the canvas (`parallel` in `prompt-builder-pro.v5`).

## What goes into the prompt

Both blocks sit in the Workflow section. Their text is written from the wiring in `flowPrepare()` on a copy of the nodes, so what is stored on the canvas never changes.

- Parallel Execution lists each input and where it comes from, each output and where it goes, and either "Track n takes Input n and produces Output n" (counts equal and mode paired) or "Every output may draw on all of the inputs" (counts differ, or that mode chosen).
- Merge lists its inputs with their sources, then the chosen method: Combine everything in order, Reconcile conflicts, or Keep only the best parts.

Checks adds: a Merge with fewer than two wired inputs (warning), an unconnected input on either block (note), and the parallel-off note.

## Related fixes made in the same pass

- Wire loose blocks (`autoWire`) now wires into the first visible input port, not a fixed `in`. It used to create wires that the engine silently dropped for any block without an `in` port, including custom blocks.
- The library no longer shows "No blocks match" for the Yours filter when only included blocks, or only team blocks, exist.
