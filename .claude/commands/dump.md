Read DUMP.md and find all unchecked items (lines starting with `[]`). These are feature requests and tasks from the user.

For each unchecked item, **before implementing it**, classify the task type and choose the appropriate model:

| Task type | Model to use |
|-----------|-------------|
| Architecture decisions, complex planning, multi-file refactors, trade-off analysis | Spawn Agent with `model: "opus"` |
| Quick file lookups, summaries, simple routing, note-taking | Handle directly (Sonnet) or spawn Agent with `model: "haiku"` for speed |
| Shell commands, git operations, CLI tasks | Use Bash tool directly |
| General coding, balanced implementation tasks | Handle directly (Sonnet) |

Then implement it one at a time:
1. Read the relevant source code to understand the current state
2. Implement the feature/fix described in the item using the chosen model
3. Mark the item as complete in DUMP.md by changing `[]` to `[x]`

After all items are done, commit and push the changes following the project's git workflow (update CLAUDE.md, DEVLOG.md, ROADMAP.md, and MEMORY.md as needed before committing).
