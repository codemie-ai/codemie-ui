---
name: babysit-mr
description: >-
  Watches an open GitLab MR (or GitHub PR) and autonomously handles anything
  blocking it from merging: CI/CD failures, reviewer comments requesting changes,
  and merge conflicts. Loops on a ~180s interval, fixing issues and pushing commits,
  until the MR merges, closes, or the user stops it. Use this skill whenever an
  MR/PR needs monitoring after creation — trigger on "watch the MR", "babysit
  this PR", "monitor MR !123", "keep an eye on the merge request", or when another
  skill (codemie-mr, tech-lead, etc.) creates an MR and should hand off to monitoring.
  Always invoke this skill when the user wants automated, hands-off MR management.
version: 1.0.0
---

# Babysit MR

Monitor an open MR/PR in a loop — fix CI failures, address reviewer comments, resolve merge
conflicts — until it merges or closes.

## Input

Accept any of:
- GitLab MR URL: `https://gitbud.epam.com/org/repo/-/merge_requests/123`
- GitLab short form: `!123`
- GitHub PR URL: `https://github.com/org/repo/pull/123`
- Bare number when context makes the repo clear: `123`

Parse the project path and MR/PR ID. Detect platform from URL. When ambiguous,
check `git remote get-url origin` — a `gitbud.epam.com` remote means GitLab.

## Prerequisites

Verify `glab auth status` (and `gh auth status` if GitHub). If required CLI is missing, tell
the user and exit.

**Never run `glab mr approve`** — self-approval bypasses the code review process. The MR must be approved by a human reviewer, not by the author.

## Main Loop

Run until a terminal condition is met. Between iterations: `sleep 180`.

Safety limit: after **10 iterations** without resolution, pause and ask the user whether to
continue — a stuck MR may need manual intervention.

### Step 1 — Check MR State

Fetch MR state via `glab api` or `gh pr view`. Terminal conditions:

| State | Action |
|-------|--------|
| `merged` | Print success summary, exit |
| `closed` | Print closure notice, exit |
| User says "stop" / "cancel" | Exit immediately |

### Step 2 — Check CI/CD Pipeline

- `running` / `pending` — continue to Step 3 (do not skip — rebase must still run)
- `failed` → go to **CI Failure Handling**
- `success` or no pipeline → continue to Step 3

### Step 3 — Check Unresolved Discussions

Track `last_seen_discussion_ids` across iterations to avoid re-processing old threads.

Fetch unresolved, non-system discussions via `glab api .../discussions` or `gh api .../comments`.

For each new unresolved comment:
- **Code change requested** → implement it (see **Comment Handling**)
- **Question** → post a reply answering it
- **Informational / bot** → skip

### Step 4 — Check Rebase / Merge Conflicts

**Always run this step**, even when the pipeline is running or pending.

- Branch behind target (`diverged_commits_count > 0`, `detailed_merge_status == "need_rebase"`, `merge_error` contains "rebased"/"fast-forward", or GitHub `mergeable_state == "behind"`) → **Rebase Handling**
- `has_conflicts: true` (GitLab) or `mergeable: CONFLICTING` (GitHub) → **Conflict Handling**

### Step 5 — Wait

`sleep 180`, then back to Step 1.

---

## CI Failure Handling

### 1. Fetch failure details

First check MR comments — CI bots (usernames containing `bot`, `ci`, `pipeline`) typically post
failure summaries there. If not enough detail, fall back to the job trace API:
`glab api .../jobs/<JOB_ID>/trace` or `gh run view <RUN_ID> --log-failed`.

### 2. Classify and fix

| Type | Action |
|------|--------|
| Lint / style / type errors | Fix the offending lines |
| Failing unit tests | Fix the code (not the test, unless the test is clearly wrong) |
| Build / compile errors | Fix missing imports, compilation errors |
| Transient / flaky (no code change needed) | Post `/recheck` comment to retrigger |
| Unknown | Report to user, pause loop |

For code fixes: make the minimal change, don't refactor surrounding code.

Determine the ticket ID from the branch name first (`git branch --show-current` → `EPMCDME-XXXXX`), falling back to `git log --oneline -5`. Commit messages must follow the project pattern: `EPMCDME-NNNNN: Capital sentence` (first word after colon must be capitalized). Then:
```bash
git add <changed_files>
git commit -m "<TICKET_ID>: Fix <lint|test|build> failure in CI"
git push
```

After retriggering, wait ~20s for the pipeline to start, then resume from Step 1.

If the **same job fails twice in a row** despite a fix attempt, stop and report to the user.

---

## Comment Handling

For each unresolved reviewer comment requesting a code change:

1. Read the full thread for context
2. Implement the requested change
3. Reply to the thread: `"Done — addressed in the latest commit."`
   - GitLab: POST to `.../discussions/<DISCUSSION_ID>/notes`
   - GitHub: POST to `.../pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies`
4. Batch all comment fixes from the current iteration into one commit:

```bash
git add <changed_files>
git commit -m "<TICKET_ID>: Address reviewer feedback"
git push
```

---

## Rebase Handling

Fetch and rebase onto the target branch, then `git push --force-with-lease`. If rebase surfaces conflicts, fall through to **Conflict Handling**. After a successful push, wait ~10s and resume from Step 1.

---

## Conflict Handling

```bash
TARGET=$(glab api ".../merge_requests/<MR_ID>" | jq -r '.target_branch')
git fetch origin "$TARGET"
git rebase "origin/$TARGET"
```

Resolve conflicts using context. Stage resolved files and `git rebase --continue`.

Push with `git push --force-with-lease` (never plain `--force`).

If conflicts are too complex to resolve automatically (overlapping logic changes in the same
function from both sides), stop and list the conflicting files for the user.

---

## Loop State

Maintain across iterations:
- `last_pipeline_id` — skip re-diagnosing the same failed pipeline
- `last_seen_discussion_ids` — skip already-processed comments
- `iteration_count` — enforce the 10-iteration safety limit
- `consecutive_same_failure_count` — detect stuck CI loops

---

## Summary Report

When the loop ends, always output:

```
MR !<ID> — <merged | closed | stopped by user>

Iterations: <N>
Actions taken:
  - CI failures fixed: <count> (<types>)
  - Reviewer comments addressed: <count>
  - Rebases performed: <count>
  - Merge conflicts resolved: <yes | no>

Final URL: <MR URL>
```
