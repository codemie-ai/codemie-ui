---
name: dark-factory
description: This skill should be used when the user asks to "delegate a Jira ticket to dark factory", "start working on EPMCDME ticket as a factory", "implement EPMCDME ticket",
  "begin implementation", "implement task autonomously", or wants structured technical leadership for implementing a Jira ticket.
  A valid EPMCDME-XXXXX ticket ID is REQUIRED to start. If no ticket is provided, the skill will block and ask the user to create one first.
version: 0.4.0
---

# Dark Factory: Autonomous Implementation Workflow

## Purpose

This skill is a fully autonomous AI implementation factory. Given a **Jira ticket ID (EPMCDME-XXXXX)**,
it drives the complete cycle from requirements through to a merged MR — without asking for approvals at
each step. It makes technical decisions, follows project patterns, self-reviews, validates in the browser,
and creates the MR.

**A Jira ticket is mandatory.** Dark Factory does not accept free-form task descriptions as a starting
point. If no ticket is provided, stop immediately and ask the user to provide one.

**Core principle**: Work autonomously. Resolve ambiguity through analysis, not questions. Only ask
the user when requirements are genuinely unclear and cannot be inferred.

---

## Autonomous Workflow

```
Phase 1 → Requirements & Jira
Phase 2 → Complexity Assessment
Phase 3 → Specification (Medium/Complex only)
Phase 4 → Branch + Implementation
Phase 5 → Integration Tests (coverage-driven, changed files only)
Phase 6 → Code Review (auto-fix critical/major)
Phase 7 → UI Validation (browser testing, no Jira publish)
Phase 8 → Quality Gates + MR
```

---

## Phase 1: Requirement Gathering

### Step 1a: Gate — Jira Ticket Required

**Check for a valid ticket ID (`EPMCDME-XXXXX`) in the user's request.**

- ✅ **Ticket provided** → continue to Step 1b
- ❌ **No ticket provided** → STOP. Respond with:

  > Dark Factory requires a Jira ticket to start. Please provide an `EPMCDME-XXXXX` ticket ID.
  >
  > If you don't have a ticket yet, you can:
  > - Create one using the **brianna** skill: ask brianna to create a ticket for your task
  > - Create it directly in the **CodeMie platform** at the EPMCDME project board
  >
  > Once you have a ticket, come back with the ID and I'll start implementation.

  Do **not** proceed without a ticket. Do **not** accept a task description as a substitute.

### Step 1b: Fetch Ticket Details

Fetch the ticket via brianna skill (NOT a sub-agent — call the skill directly):
```
Skill(skill="brianna", args="get ticket EPMCDME-XXXXX fields: description, summary")
```

- If the ticket **doesn't exist**: inform the user and stop
- If the ticket **exists**: continue

### Step 1c: Check for Duplicates

Ask brianna to search for similar open tickets:
```
Skill(skill="brianna", args="search for tickets similar to [summary] in EPMCDME project, status: open")
```
- If duplicates found: note them and proceed (the provided ticket is the source of truth)

### Step 1d: Clarifying Questions

Ask only if acceptance criteria are vague or ambiguous in a way that blocks implementation.
Skip if requirements are clear.

### Branch Naming

Always use the exact ticket ID as the branch name — no prefix, no suffix.

| Format | Example |
|--------|---------|
| `EPMCDME-XXXXX` | `EPMCDME-10500` |

---

## Phase 2: Complexity Assessment

Assess using the [Complexity Assessment Guide](references/complexity-assessment-guide.md).

Score each dimension (1=Simple, 2=Medium, 3=Complex):
- Component Scope (how many files/layers)
- Requirements Clarity
- Technical Risk
- File Change Estimate
- Dependencies

| Total Score | Complexity | Path |
|-------------|------------|------|
| 5-7 | **Simple** / Bug fix | → Direct to Phase 4 (Implementation) |
| 8-11 | **Medium** | → Phase 3 (Specification), then Phase 4 |
| 12-15 | **Complex** | → Phase 3 (Specification), then Phase 4 |

**Special rule**: Bug fixes and small isolated changes always go directly to Phase 4, regardless
of score, unless they involve architectural risk.

Output a brief complexity summary before proceeding:
```markdown
## Complexity: [Simple | Medium | Complex] (Score: X/15)
- Scope: [summary]
- Risk: [summary]
- Files affected: [estimate]
→ Path: [Direct implementation | Specification first]
```

---

## Phase 3: Specification (Medium and Complex Only)

### Step 3a: Invoke Solution Architect

Delegate to the solution-architect sub-agent with full context:
```
Task(subagent_type="solution-architect", prompt="
  Generate implementation plan for [ticket/task].
  Requirements: [requirements text]
  Complexity: [Medium/Complex]
  Affected areas: [list from complexity assessment]
  Constraints: [any technical decisions already made]
  Coding standards: Follow CLAUDE.md and .codemie/guides/
")
```

### Step 3b: Review the Specification

Review the generated `.md` spec against the requirements:

**Auto-proceed if:**
- All acceptance criteria are covered
- The implementation path is clear
- No architectural ambiguity remains

**Delegate back to architect if:**
- A requirement is not addressed
- The approach contradicts project patterns
- A critical decision is left as TBD

```
Task(subagent_type="solution-architect", prompt="
  Revise the spec. Issues found:
  1. [Issue 1 - what's missing or wrong]
  2. [Issue 2]
  The spec must address all acceptance criteria before implementation.
")
```

Repeat until the spec is implementation-ready.

---

## Phase 4: Branch Creation and Implementation

### Step 4a: Create Feature Branch

**CRITICAL: Always create the branch before touching any code.**

```bash
# Ensure clean state on main
git checkout main
git pull origin main

# Create and push feature branch
git checkout -b EPMCDME-XXXXX   # or feature/branch-name
git push -u origin EPMCDME-XXXXX
```

If branch already exists locally: switch to it and pull latest (`git checkout EPMCDME-XXXXX && git pull`).

### Step 4b: Implement

**Before coding**, load the relevant guides from `.codemie/guides/` (see CLAUDE.md Task Classifier).

**Implementation order** (respect layer dependencies):
1. Types (`src/types/`)
2. Constants (`src/constants/`)
3. Store (`src/store/`)
4. Hooks (`src/hooks/`)
5. Components (`src/components/`)
6. Pages (`src/pages/`)
7. Router (`src/router.tsx`)

**Coding standards** (non-negotiable):
- Tailwind only — no custom CSS
- Use Popup, not Dialog
- API via custom fetch wrapper, parse with `.json()`
- Valtio stores for global state
- React Hook Form + Yup for forms
- `cn()` from `@/utils/utils`
- `??` not `||` for defaults
- Single quotes for strings
- Components under 300 lines

Commit incrementally with descriptive messages:
```
EPMCDME-XXXXX: [imperative description]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Phase 5: Integration Tests

Run the integration-tester skill in coverage-driven mode (no explicit target):

```
Skill(skill="integration-tester")
```

The skill will:
1. Run `vitest run --coverage --changed main` — **only changed files relative to `main`**
2. Find pages/components where Branch coverage < 70%
3. Present a test plan and write tests incrementally (one at a time, run after each)

**Key constraints:**
- Tests target only files changed in this branch — no risk of writing tests for the entire project
- If all changed files already have Branch ≥ 70% → skill reports this and exits — proceed to Phase 6
- If changed files are types / constants / pure utilities with no UI → skill may find nothing to test — proceed to Phase 6
- Anti-loop rule: max 2 fix attempts per failing test, then `it.skip` and move on

**Do NOT block on integration tests.** If the skill cannot reach 70% branch coverage after one round of tests, accept the partial result and proceed. Coverage is a goal, not a gate.

---

## Phase 6: Code Review

Invoke the code-reviewer skill in auto-fix mode:
```
Skill(skill="code-reviewer", args="
  auto-fix: true
  ticket: [EPMCDME-XXXXX]
  branch: [branch-name]
  base-branch: main
  goal: [task description from ticket]
")
```

The skill will:
1. Check for existing spec at `.codemie/reviews/<ticket>/review.md`
2. Review all changed files (including new integration test files) for CRITICAL and MAJOR issues
3. Save findings to spec (or update existing spec)
4. Auto-fix all issues without asking for confirmation
5. Create commit marker

After the skill completes, re-run lint to confirm:
```bash
npm run lint:fix
```

---

## Phase 7: UI Validation

Invoke the ui-tester sub-agent to verify the implemented functionality in the browser:
```
Task(subagent_type="ui-tester", prompt="
  Verify the following functionality works correctly in the browser:
  [List of acceptance criteria / user flows]
  Base URL: http://localhost:5173
  Do NOT post to Jira. Only verify and report pass/fail.
")
```

**On failures**: Fix the issue and re-run ui-tester until all scenarios pass.

**Do NOT** publish screenshots or test results to Jira automatically.

---

## Phase 8: Quality Gates and MR

### Step 8a: Run Quality Checks

```bash
# All tests (unit + integration)
npm test

# Lint
npm run lint

# Build check (optional for large changes)
npm run build
```

All checks must pass before creating the MR. Fix any failures.

### Step 8b: Commit Final Changes

Stage and commit all remaining changes:
```bash
git add <specific files>
git commit -m "EPMCDME-XXXXX: Final cleanup and fixes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

### Step 8c: Create Merge Request

Use the codemie-mr skill or create directly:
```
Skill(skill="codemie-mr", args="create MR for branch EPMCDME-XXXXX")
```

Or via gh CLI:
```bash
gh pr create --title "EPMCDME-XXXXX: [summary]" --body "$(cat <<'EOF'
## Summary
- [Change 1]
- [Change 2]

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass (coverage-driven, changed files only)
- [ ] Lint passes
- [ ] UI validation passed (ui-tester)

## Related
- Jira: EPMCDME-XXXXX

🤖 Generated with Claude Code
EOF
)"
```

---

## Error Handling

### Ticket Not Found
```
Unable to fetch EPMCDME-XXXXX. Verify the ticket ID and Jira access.
Stopping — cannot proceed without requirements.
```

### Branch Already Exists
Automatically switch to it and continue:
```bash
git checkout EPMCDME-XXXXX
git pull origin EPMCDME-XXXXX
```

### Tests Failing
Do not create MR. Fix failing tests first, then re-run quality gates.

### UI Validation Failures
Fix the reported issues and re-run ui-tester before proceeding to Phase 8.

---

## Key Principles

### Do's
✅ **Require a Jira ticket** — block and redirect if none is provided
✅ Work autonomously — don't ask for approvals at each phase
✅ Fetch only required Jira fields (description, summary)
✅ Always check for duplicate/related tickets via brianna
✅ Create feature branch before any code changes
✅ Use complexity score to route: simple → direct, medium/complex → spec first
✅ Write integration tests only for changed files — never for the whole project
✅ Auto-fix critical and major code review issues
✅ Run UI validation before MR — fix failures before continuing
✅ Run tests and lint before MR

### Don'ts
❌ **Don't accept free-form task descriptions** — always require EPMCDME-XXXXX first
❌ Don't ask "shall I proceed?" between phases — proceed autonomously
❌ Don't skip the Jira duplicate check
❌ Don't start coding before branch creation
❌ Don't publish UI test results to Jira automatically
❌ Don't create MR with failing tests or lint errors
❌ Don't use solution architect for simple/bug-fix tasks
❌ Don't guess at complexity — use the scoring matrix
❌ Don't block on integration test coverage — partial coverage is acceptable

---

## Reference Files

- **`references/complexity-assessment-guide.md`** — Scoring criteria and examples
- **`references/branch-workflow.md`** — Git branching best practices
- **`examples/simple-feature-example.md`** — Full walkthrough: simple task
- **`examples/complex-feature-example.md`** — Full walkthrough: complex task
- **`examples/non-jira-task-example.md`** — Full walkthrough: no Jira ticket

---

## Integration Points

| Skill / Agent | When | How |
|---------------|------|-----|
| **brianna** | Phase 1 — ticket fetch + duplicate search | `Skill(skill="brianna", ...)` |
| **solution-architect** | Phase 3 — Medium/Complex spec | `Task(subagent_type="solution-architect", ...)` |
| **integration-tester** | Phase 5 — integration tests for changed files | `Skill(skill="integration-tester")` |
| **code-reviewer** | Phase 6 — code quality | `Skill(skill="code-reviewer", ...)` |
| **ui-tester** | Phase 7 — browser validation | `Task(subagent_type="ui-tester", ...)` |
| **codemie-mr** | Phase 8 — MR creation | `Skill(skill="codemie-mr", ...)` |
