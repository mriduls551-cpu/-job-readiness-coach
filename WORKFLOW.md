# Team Workflow (for Claude)

Two contributors share `main`. This file tells Claude exactly what to run.
**The user works through Claude** — they say the phrase, Claude runs the steps.

---

## Quick commands (say these to Claude)

| Say this | Claude runs |
|----------|-------------|
| **"sync"** | Get the latest code before working (Start of session) |
| **"ship"** | Commit + pull + push my changes safely (End of session) |
| **"run"** | Start the app locally to test |
| **"status"** | Show what changed and whether I'm behind/ahead |

---

## What each command means

### `sync` — start of every session
```bash
git checkout main
git pull origin main
npm install        # only if package.json / package-lock.json changed
```
Then tell the user if anything changed and whether they need to re-run the app.

### `run` — test the latest version
```bash
npm run dev
```
Use the preview tools to verify, don't ask the user to check manually.

### `ship` — save and push work safely
```bash
git add .
git commit -m "<clear message of what changed>"
git pull origin main          # pull teammate's work FIRST
# if conflicts: resolve them, then commit
git push origin main
```
After pushing, re-run the app to confirm it still works.

### `status` — check state
```bash
git status -sb
git fetch origin
git log --oneline main..origin/main   # what teammate pushed that I don't have
```

---

## Rules for Claude

1. **Always `git pull origin main` before pushing** — never push without pulling first.
2. **If `npm install` is needed** (lockfile/package.json changed during pull), run it before `npm run dev`.
3. **On merge conflict:** resolve it, explain to the user what clashed, then continue the push.
4. **Never force-push** (`--force`) to `main`. If a push is rejected, pull and retry normally.
5. **Always re-test after merging** teammate's changes with the user's.
6. Use a clear commit message describing the actual change — not "update".

---

## If something breaks
- Push rejected? → `git pull origin main` then `git push origin main`.
- Lost on conflicts? → Claude resolves them; user just confirms which behavior is correct.
- Want to undo uncommitted local mess? → ask Claude to `git stash` (saves changes aside) — never delete without confirming.
