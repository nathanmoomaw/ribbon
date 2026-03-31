Read DUMP.md and find all unchecked items (lines starting with `[]`). These are feature requests and tasks from the user.

For each unchecked item, **before implementing it**, use the `/route` skill to classify the task and dispatch it to the best model. If Claude is unavailable or context is exhausted, use `/fallback` instead.

Then implement it one at a time:
1. Read the relevant source code to understand the current state
2. Implement the feature/fix described in the item using the model chosen by `/route`
3. Mark the item as complete in DUMP.md by changing `[]` to `[x]`

After all items are done, commit and push the changes following the project's git workflow (update CLAUDE.md, DEVLOG.md, ROADMAP.md, and MEMORY.md as needed before committing).
