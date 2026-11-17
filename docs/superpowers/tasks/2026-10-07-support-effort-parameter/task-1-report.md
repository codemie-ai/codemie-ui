DONE

Commit: 4a0f1a80a
Files changed: src/types/entity/configuration.ts, src/store/appInfo.ts, src/store/__tests__/appInfo.test.ts
Test command: npx vitest run --project unit src/store/__tests__/appInfo.test.ts
Test result: EXIT=0, Test Files 1 passed (39 tests passed)
Notes: Added a new `it(...)` case inside the existing `describe('appInfoStore.getLLMModels', ...)` block
asserting effortLevels/temperatureSupported are mapped from `features.effort` / `features.temperature`,
and are undefined when `features` is absent. Confirmed RED (assertion failure on missing fields, not a
pre-existing failure) before implementing. Added `effortLevels?: string[]` and
`temperatureSupported?: boolean` to `ModelOption` next to the other optional capability fields, and two
lines in `mapLlmModel` next to `supportsTools:`. Did not touch the pre-existing
'maps is_premium, cost and capability fields from the API response' test, per instructions (toEqual
treats undefined keys as absent, so it still passes).

One process note: my first commit attempt accidentally swept in 5 pre-existing staged docs files
(complexity-assessment.json, decisions.jsonl, events.jsonl, spec.md, technical-analysis.md under
docs/superpowers/tasks/2026-10-07-support-effort-parameter/) that were already staged in the index
before this task began (visible in the initial git status) — `git commit` without a pathspec commits
everything in the index, not just what was freshly `git add`-ed. I caught this via `git show --stat
HEAD`, used `git reset --soft HEAD~1` (non-destructive, kept all staged content) to undo the commit,
unstaged those 5 docs files with `git restore --staged <paths>` to return them to their original
pre-task state, and re-committed. Final commit `4a0f1a80a` contains exactly the 3 owned files, verified
with `git show --stat HEAD`. The docs directory is back to untracked status matching the conversation's
starting git status. No other files were touched.
