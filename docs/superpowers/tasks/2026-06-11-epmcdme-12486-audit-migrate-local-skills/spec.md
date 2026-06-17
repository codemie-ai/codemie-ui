# Spec: EPMCDME-12486 — Audit and Migrate Local Claude Code Skills

## Goal

1. Write a **generic, standalone `code-reviewer` skill** in `codemie-public-skills/skills/development/` that:
   - Is callable without the SDLC factory
   - Reads `CLAUDE.md` and/or `README.md` to discover project-specific review conventions
   - After commit, hands off to `mr-creator` for push and MR/PR creation (does not push itself)
   - Works for any project stack (not hardcoded to React/Valtio/Tailwind)

2. Delete **all** remaining local `.claude/skills/` and `.claude/agents/` from `codemie-ui` (both Tier 2 and Tier 3 items).

3. Update `codemie-ui` documentation to indicate that `code-reviewer` is installable from `codemie-public-skills`, and that `refactor-cleaner`, `unit-tester`, `integration-tester` are included in `--package sdlc-factory`.

> **Note (scope reduction):** `refactor-cleaner`, `unit-tester`, and `integration-tester` were initially planned as standalone contributions to `sdlc-factory/skills/`. This was dropped — sdlc-factory already includes equivalent skills that are invoked automatically by every entry point (`sdlc-task`, `sdlc-start`, `sdlc-autonomous`). Adding them again would be ballast.

## Acceptance Criteria

### A. Generic `code-reviewer` skill (codemie-public-skills)

- Lives at `skills/development/code-reviewer/` with `SKILL.md`, `README.md`, `evals/evals.json`
- **Context discovery** (Step 0 in skill): reads `CLAUDE.md` and `README.md` (or `.ai-run/guides/`) to build project-specific review rules; if none found, falls back to universal rules
- **PR template support**: checks for `.github/PULL_REQUEST_TEMPLATE.md`, then `.gitlab/merge_request_templates/Default.md`, then `PULL_REQUEST_TEMPLATE.md`; if found, fills it when creating/updating the MR
- Works with both GitLab (`glab`) and GitHub (`gh`) — inferred from `git remote get-url origin`
- Default mode: fully automated (review → auto-fix CRITICAL/MAJOR → commit → handoff to `mr-creator`)
- Interactive mode (`--interactive`): asks depth, base branch, ticket, goal before starting
- Progress tracked in `.codemie/reviews/<TICKET>/progress.md` (never committed)
- Review spec stored in `.codemie/reviews/<TICKET>/review.md` (never committed)
- Evals cover: standalone invocation without factory, PR template detection, project-convention discovery

### B. codemie-ui cleanup

- All directories under `.claude/skills/` deleted: `babysit-mr`, `codemie-mr`, `code-reviewer`, `dark-factory`, `tech-lead`, `playwright-cli`
- `.claude/skills/integration-tester/` **preserved** — project-specific frontend patterns (React, Valtio, renderPage, mockAPI); not replaced by the generic sdlc-factory version
- All files under `.claude/agents/` deleted: `refactor-cleaner.md`, `unit-tester.md`, `solution-architect.md`, `ui-tester.md`
- `.claude/settings.json` and `.claude/settings.local.json` preserved (not skills/agents)
- `CLAUDE.md` (currently `@AGENTS.md`) unchanged — already clean
- `AGENTS.md` updated: `--skill code-reviewer` (standalone install) + note that `refactor-cleaner`, `unit-tester`, `integration-tester` come with `--package sdlc-factory`

### C. `mr-creator` skill update (codemie-public-skills)

- File: `ai-packages/sdlc-factory/skills/mr-creator/SKILL.md`
- Change: in Step 4 **Body** resolution, add PR template detection **before** `project.md` body template:
  1. Check `.github/PULL_REQUEST_TEMPLATE.md`
  2. Check `.gitlab/merge_request_templates/Default.md`
  3. Check `PULL_REQUEST_TEMPLATE.md` at repo root
  4. If found → fill it in (Summary, Changes, etc.)
  5. If not found → use `project.md` Body Template if present
  6. If neither → fall back to built-in template
- This is a minimal targeted edit; no other behaviour changes.

## Validation

- `npm run eval:check` must pass in codemie-public-skills after adding new skills (Jira AC)
- The eval harness validates the new `code-reviewer` skill

## Out of Scope

- Updating `mr-code-review` skill in codemie-public-skills (it is a separate, complementary skill)
- Backend repo and CLI cleanup (mentioned as follow-up in the ticket)
- Adding PR templates to backend repo and CLI (follow-up)
