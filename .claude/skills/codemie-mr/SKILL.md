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

Always start by checking git status:

```bash
# Current branch
git branch --show-current

# Uncommitted changes
git status --short

# Existing MR for current branch
glab mr list --source-branch=$(git branch --show-current) 2>/dev/null || echo "No MR"
```

### 2. Validate Jira Ticket (Required for Commits)

**Before any commit**, verify Jira ticket exists in context:

- Look for `EPMCDME-xxx` pattern in conversation history
- Check if user provided ticket number
- **If no ticket found**: Ask user: "What is the Jira ticket number (EPMCDME-xxx)?"

**Do NOT proceed with commit without Jira ticket.**

### 3. Handle Based on User Request

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
# Inform: "Changes pushed to existing MR: <url>"
```

#### If no MR exists:
```bash
# Push changes
git push --set-upstream origin $(git branch --show-current)

# Create MR - use template structure
glab mr create \
  --title "EPMCDME-xxx: Brief description" \
  --description "## Summary
[2-4 sentence overview]

## Changes
- [Key highlights only]

## Impact
[Optional: before/after for user-facing changes]

## Checklist
- [ ] Self-reviewed
- [ ] Manual testing performed
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)"
```

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
