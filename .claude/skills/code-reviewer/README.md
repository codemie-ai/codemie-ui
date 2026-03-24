# Code Reviewer Skill

AI-assisted code review for the CodeMie UI codebase. Reviews React/TypeScript for quality, security, and compliance with project standards. Saves findings locally, discusses fixes with the developer, and creates a verifiable commit marker.

---

## How to launch

```
@code-reviewer
/code-reviewer
```

Or just say: **"do code review"**, **"review my changes"**, **"check code quality"**

---

## Modes

| Mode | How to trigger | Behavior |
|------|---------------|----------|
| **Default** | `@code-reviewer` / `/code-reviewer` | Fully automated — no questions, auto-fixes all issues, commits, pushes, approves MR |
| **Interactive** | `/code-reviewer --interactive` | Asks depth, ticket, goal, base branch — developer controls all decisions |

---

## What happens step by step

```
1. Gather context      — ticket from branch name, goal from Jira via brianna, base = main
2. Check existing spec — if found: Case A (no new changes) or Case B (new changes since last review)
3. Find changed files  — committed + staged + unstaged vs base branch
4. Review              — scan for CRITICAL and MAJOR issues (Haiku)
5. Save spec           — .codemie/reviews/<TICKET>/review.md  (never committed)
6. Present findings    — brief summary with file:line locations and fixes
7. Apply fixes         — auto-applies all CRITICAL and MAJOR fixes (default) / discuss first (--interactive)
8. Commit              — review marker commit with AI-Code-Review fields
9. Push + MR           — push branch, approve existing MR or create new one
```

**Progress is tracked** in `.codemie/reviews/<TICKET>/progress.md` — if the conversation is lost, resume automatically from the last completed step.

---

## What gets reviewed

**CRITICAL (always flagged):**
- Custom CSS / inline styles instead of Tailwind
- Raw color tokens (`neutral-*`) instead of semantic tokens (`surface-*`, `text-*`)
- `Dialog` instead of `Popup` component
- `.data` Axios pattern instead of `.json()` with fetch wrapper
- Direct API calls in components (should be in Valtio stores)
- `any` types without justification
- Security issues (XSS, exposed secrets)
- Components over 300 lines

**MAJOR (flagged if obvious):**
- Missing React Hook Form + Yup for forms
- Missing `useEffect` cleanup functions
- Magic strings/numbers not in constants
- `||` instead of `??` for defaults
- Missing TypeScript prop types

---

## Output

| File | Location | Committed? |
|------|----------|------------|
| Review spec | `.codemie/reviews/<TICKET>/review.md` | Never |
| Progress state | `.codemie/reviews/<TICKET>/progress.md` | Never |
| Review marker | Git commit on feature branch | Yes |

### Commit marker format
```
EPMCDME-XXXXX: Fix issues from code review

Generated-By: AI
AI-Code-Review: completed
Reviewed-At: 2026-03-23T14:00:00Z
Review-Duration: 120
Files-Reviewed: 3
Issues-Found: 2
Issues-Fixed: 2
```

---

## Re-running review after MR is approved

If you push new changes to a branch that already has an approved MR:
1. Reviewer detects new changes → Case B → reviews only new files
2. Creates a new review marker commit
3. Checks current approval state — if already approved, **unapproves first**
4. Pushes the commit
5. **Re-approves the MR**

No manual steps needed.

---

## Spec issue states

```
- [ ] open
- [x] fixed
- [~] rejected (with justification)
```

**Valid justifications for rejection:** legacy code risk, temporary (with ticket), team lead decision, breaking change requiring coordination.
