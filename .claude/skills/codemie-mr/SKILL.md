---
name: codemie-mr
description: >-
  Manages git commits with Jira tickets (EPMCDME-xxx format), pushes, and GitLab MR creation.
  Use when user says "commit changes", "push changes", "create MR", "make merge request",
  or similar GitLab workflow requests. Enforces Jira ticket format in commits.
---

# GitLab Merge Request Workflow

## Instructions

### 1. Check Current State

Always start by checking git status and ensuring the screenshot drop folder exists:

```bash
# Current branch
git branch --show-current

# Uncommitted changes
git status --short

# Existing MR for current branch
glab mr list --source-branch=$(git branch --show-current) 2>/dev/null || echo "No MR"

# Ensure screenshot drop folder exists (gitignored, never committed)
mkdir -p .mr-screenshots
```

### 1b. Check for Code Review Spec

After checking git state, look for a code review spec for this branch/ticket.

Extract ticket from current branch name (pattern `EPMCDME-XXXXX`).

Try to read the spec:
```
Read: .codemie/reviews/<TICKET>/review.md
# Fallback (if no ticket found):
Read: .codemie/reviews/<branch-name>/review.md
```

If spec is found → extract for MR description:
- **Issues found**: count of `- [ ]` + `- [x]` + `- [~]` under CRITICAL and MAJOR
- **Issues fixed**: count of `- [x]` items
- **Issues rejected**: count of `- [~]` items with justifications
- **Clean**: if no issues were found at all

Keep this data — it will be injected into the MR description in Step 4.

### 1c. Check for MR/PR Description Template

Look for a description template in this order (stop at first match):

1. `.github/PULL_REQUEST_TEMPLATE.md`
2. `.gitlab/merge_request_templates/Default.md`
3. `PULL_REQUEST_TEMPLATE.md` (repo root)

```
Read: .github/PULL_REQUEST_TEMPLATE.md
# if not found:
Read: .gitlab/merge_request_templates/Default.md
# if not found:
Read: PULL_REQUEST_TEMPLATE.md
```

- **Template found** → store its content. In Step 4, fill in every section of the template with real content based on the actual changes. Do not leave any placeholder text (e.g. `[2-4 sentences: ...]`) in the final MR description.
- **No template found** → proceed with the existing custom description format in Step 4.

### 2. Validate Jira Ticket (Required for Commits)

**Before any commit**, verify Jira ticket exists in context:

- Look for `EPMCDME-xxx` pattern in conversation history
- Check if user provided ticket number
- **If no ticket found**: Ask user: "What is the Jira ticket number (EPMCDME-xxx)?"

**Do NOT proceed with commit without Jira ticket.**

### 3. Handle Based on User Request

> **Uncommitted changes check** (run before executing any of the three paths below):
> ```bash
> DIRTY=$(git status --short | grep -v '^\?\?')
> ```
> If `DIRTY` is non-empty → ask user via `AskUserQuestion`:
> - prompt: `"There are uncommitted changes:\n<list files>\nCommit them before proceeding?"` | header: `Uncommitted files` | options: `["Yes — commit them", "No — push/create MR without them"]`
>
> If "Yes" → stage and commit the listed files using the Jira ticket from Step 2:
> ```bash
> TICKET=$(git branch --show-current | grep -oE 'EPMCDME-[0-9]+')
> git add <files from DIRTY>
> git commit -m "${TICKET}: Update <short description of changes>"
> ```
> Then continue with the requested action.

**"commit changes"** → Commit only (requires Jira ticket):
```bash
git add .
git commit -m "EPMCDME-xxx: Action and message"
```

**"push changes"** → Push only:
```bash
git push --set-upstream origin $(git branch --show-current)
```

**"create MR"** → Full workflow below.

### 4. Create MR Workflow

#### If on `main` branch:
1. Create feature branch first: `git checkout -b <type>/<description>`
2. Then proceed with commit/push/MR

#### If MR already exists:
```bash
git push --set-upstream origin $(git branch --show-current)
```

After push:

Capture the MR IID for the update steps:
```bash
MR_IID=$(glab mr list --source-branch="$(git branch --show-current)" --output json | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['iid'])")
```

1. If a review spec was found in Step 1b → update the `## Code Review` section in the existing MR description:
   - Read current MR description via `glab mr view $MR_IID --output json`
   - If description already contains `## Code Review` → replace that section with fresh data from the spec
   - If description does not contain `## Code Review` → append it at the end
   - Update via `glab mr update $MR_IID --description "..."`

2. Run the screenshot gate (same logic as new MR path) — check UI_CHANGED, ask for a fresh screenshot if UI files were modified. Previous screenshot in `.mr-screenshots/` is stale — warn the user and delete it first:
   - Inform: `"⚠️ Re-push detected — clearing stale screenshot from .mr-screenshots/. A fresh one will be required."`
   ```bash
   [ -n "$(ls .mr-screenshots/ 2>/dev/null)" ] && rm -f .mr-screenshots/*
   ```
   Then run the gate normally so the new screenshot replaces the old one in the MR description.

Inform: `"Changes pushed to existing MR: <url>"`

#### If no MR exists:
```bash
# Push changes
git push --set-upstream origin $(git branch --show-current)
```

Build the MR title from the Jira ticket and a concise description of the work done (read commit history since main if needed to understand what was implemented):
```bash
git log main..HEAD --oneline
```

Title rules:
- Pattern: `EPMCDME-xxx: <Short description starting with capital letter>`
- Max ~70 characters
- Describe the feature/fix, not the process ("Add SharePoint datasource support", not "Implement EPMCDME-123")

Build the description using one of two paths:

**Path A — Template found in Step 1c:**

Fill in every section of the template with real content. Rules:
- Replace every placeholder (e.g. `[2-4 sentences: what problem was solved and how]`) with actual text.
- Tick the correct checkboxes in "Type of change" based on what was implemented.
- Fill the "Changes" table with real file paths and what changed.
- For "Spec" — link to spec doc if it exists (e.g. `docs/superpowers/specs/`), otherwise `N/A`.
- For "Screenshots" and "E2E Test Harness" — `N/A` if no UI changes.
- If a code review spec was found in Step 1b, append a `## Code Review` section after the last template section (see below).
- Leave no placeholder text in the final description.

**Path B — No template found:**

```bash
glab mr create \
  --title "EPMCDME-xxx: <Short feature description>" \
  --description "## Summary
[2-4 sentence overview of what was implemented and why]

## Changes
- [Key change 1]
- [Key change 2]

## Checklist
- [ ] Self-reviewed
- [ ] Manual testing performed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)"
```

**Code Review section (both paths — only if review spec found in Step 1b):**

```
## Code Review
AI code review completed (AI-Code-Review marker in commit history).
- Issues found: <N critical, N major> / No issues found (clean)
- Issues fixed: <N> / N/A
- Issues rejected: <N with justification> / N/A

:white_check_mark: Reviewed and approved by AI Code Reviewer
```

**If no review spec was found** → omit the `## Code Review` section entirely.

#### Screenshot gate (runs after `glab mr create`)

**REQUIRED — always run this bash command before deciding whether to show the gate. Never infer from file names or commit messages:**

```bash
UI_CHANGED=$(
  { git diff main...HEAD --name-only; git diff --cached --name-only; git diff --name-only; } \
  | grep -E '\.(tsx|jsx|js|css|scss)$' | head -1
)
echo "UI_CHANGED: ${UI_CHANGED:-<empty>}"
```

Only if the output is `UI_CHANGED: <empty>` → skip the screenshot gate and inform `MR created: <MR_URL>`. Otherwise proceed with the gate.

1. Extract the ticket number from the current branch name (pattern `EPMCDME-\d+`).

2. Tell the user:
```
MR created: <url>

Run `npm run test-harness`, then drop the screenshot into `.mr-screenshots/`.
The MR will not proceed until the screenshot is there.
```

3. Capture the MR IID for use in later steps:
```bash
MR_IID=$(glab mr view --source-branch=$(git branch --show-current) --output json | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['iid'])")
```

4. Poll for the screenshot — wait until at least one file appears in `.mr-screenshots/`:
```bash
until ls .mr-screenshots/* 2>/dev/null | head -1 | grep -q .; do sleep 3; done; echo "Screenshot detected: $(ls .mr-screenshots/* | head -1)"
```
Use the Monitor tool for this so the user can continue working while waiting.

5. When a file is detected:
   - Take the first file found: `SCREENSHOT=$(ls .mr-screenshots/* | head -1)`
   - Determine the extension from the original file (`.png`, `.jpg`, `.gif`, etc.)
   - Rename it to `<TICKET>-test-harness.<ext>` inside the same folder:
   ```bash
   EXT="${SCREENSHOT##*.}"
   TICKET=$(git branch --show-current | grep -oE 'EPMCDME-[0-9]+')
   NEW_NAME=".mr-screenshots/${TICKET}-test-harness.${EXT}"
   mv "$SCREENSHOT" "$NEW_NAME"
   ```

6. Upload to GitLab and get the markdown link:
```bash
PROJECT_PATH=$(git remote get-url origin | sed 's|.*gitbud.epam.com[:/]||;s|\.git$||' | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))")
TOKEN=$(cat "$HOME/Library/Application Support/glab-cli/config.yml" 2>/dev/null | grep -A5 'gitbud' | grep 'token:' | awk '{print $2}')
if [ -z "$TOKEN" ]; then echo "ERROR: GitLab token not found in glab config — upload aborted"; exit 1; fi
UPLOAD_RESPONSE=$(curl -s --request POST "https://gitbud.epam.com/api/v4/projects/${PROJECT_PATH}/uploads" \
  --header "PRIVATE-TOKEN: ${TOKEN}" \
  --form "file=@${NEW_NAME}")
MARKDOWN_LINK=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['markdown'])")
```

7. Update the MR description — replace the `E2E Test Harness` section placeholder with the actual image:
```bash
# Read current description, replace the E2E Test Harness placeholder line
CURRENT_DESC=$(glab mr view $MR_IID --output json | python3 -c "import sys,json; print(json.load(sys.stdin)['description'])")
NEW_DESC=$(echo "$CURRENT_DESC" | sed "s|^\\[Screenshots of running.*\\]$|${MARKDOWN_LINK}|")
glab mr update $MR_IID --description "$NEW_DESC"
```

8. Confirm to user: `Screenshot uploaded and added to MR. ✓ MR: <MR_URL>`

## Commit Format

**Enforced by Tekton CI** — invalid messages will block the pipeline.

**Regex**: `^((EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*|Generate release notes for version \d+\.\d+\.\d+|Revert "(EPMCDME|AMNAAIRN)-(?!0+)\d+:\s[A-Z][a-z]*.*")$`

**Required Pattern**: `EPMCDME-xxx: Capital sentence` (description must start with uppercase letter)

**Valid examples**:
```bash
git commit -m "EPMCDME-123: Add new documentation"
git commit -m "EPMCDME-456: Fix authentication bug"
git commit -m "Generate release notes for version 1.2.3"
git commit -m "Revert \"EPMCDME-123: Fix authentication bug\""
```

**Invalid** (will be rejected by Tekton):
```bash
git commit -m "Add new feature"       # Missing ticket
git commit -m "feat: add feature"     # Wrong format
git commit -m "EPMCDME-123 add feature"  # Missing colon
git commit -m "EPMCDME-123: fix bug"  # Lowercase first letter
git commit -m "EPMCDME-0: Fix bug"    # Zero ticket ID not allowed
```

## Branch Format

**Pattern**: `<type>/<description>` (Jira ticket optional)

**Examples**:
- `feat/add-user-profile`
- `fix/auth-timeout`
- `docs/api-guide`
- `feat/EPMCDME-123-user-settings` (ticket optional but allowed)

## MR Title Format

**Pattern**: `EPMCDME-xxx: Brief description`

Always start with Jira ticket number.

## Troubleshooting

### Error: "glab: command not found"
**Solution**: Install GitLab CLI:
```bash
# macOS
brew install glab

# Linux
snap install glab

# Or download from: https://gitlab.com/gitlab-org/cli
```

### Error: No Jira ticket in context
**Action**: Ask user: "What is the Jira ticket number (EPMCDME-xxx) for this commit?"
- Wait for user response
- Validate format matches `EPMCDME-\d+`
- Then proceed with commit

### Error: Already on main branch
**Solution**: Create feature branch first:
```bash
git checkout -b <type>/<short-description>
```

### Error: No changes to commit
**Solution**: Check `git status` - nothing to commit or changes already staged.

### MR already exists
**Action**: Just push updates to existing MR, don't create new one.

## Examples

### Example 1: User provides ticket upfront
**User**: "commit these auth changes for EPMCDME-456"
```bash
git add .
git commit -m "EPMCDME-456: Fix OAuth2 token refresh"
```

### Example 2: No ticket in context
**User**: "commit the changes"
**Claude**: "What is the Jira ticket number (EPMCDME-xxx) for this commit?"
**User**: "EPMCDME-789"
```bash
git add .
git commit -m "EPMCDME-789: Update user profile API"
```

### Example 3: Full MR creation
**User**: "push and create MR for EPMCDME-321"
1. Check for existing MR
2. Commit with ticket: `EPMCDME-321: Add payment gateway`
3. Push changes
4. Create MR with title: `EPMCDME-321: Add payment gateway`

### Example 4: Push to existing MR
**User**: "push my changes"
1. Check MR status
2. If exists: push to existing
3. If not: push only (no MR creation unless requested)
