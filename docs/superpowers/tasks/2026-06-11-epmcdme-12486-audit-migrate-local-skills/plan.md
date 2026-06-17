# Plan: EPMCDME-12486

## Task 1 — Write generic `code-reviewer` skill (codemie-public-skills) ✅

**Test-first: no** — skill files are content, not code with unit tests

Path: `codemie-public-skills/skills/development/code-reviewer/`

Files created:
- `SKILL.md` — generic code-reviewer: Step 0 (context discovery: read CLAUDE.md → .ai-run/guides/ → README), Steps 1-9 same flow as local version but project-agnostic; PR template detection in Step 9
- `README.md` — human-readable usage docs
- `evals/evals.json` — 3 evals: standalone invocation, PR template detection, project-convention discovery

---

## Task 2 — Update `mr-creator` skill: PR template detection ✅

**Test-first: no**

Edit `codemie-public-skills/ai-packages/sdlc-factory/skills/mr-creator/SKILL.md`:
- In Step 4, replace the **Body** description with: check `.github/PULL_REQUEST_TEMPLATE.md` → `.gitlab/merge_request_templates/Default.md` → `PULL_REQUEST_TEMPLATE.md` first; if found fill it in; otherwise use project.md Body Template; otherwise use built-in template.
- Minimal targeted edit — no other changes.

---

## Task 3 — Run eval check (codemie-public-skills) ✅

**Test-first: yes — run `npm run eval:check` before committing; must pass**

Passed. New `code-reviewer` skill validated by eval harness.

> **Scope note:** `refactor-cleaner`, `unit-tester`, `integration-tester` were initially planned as new sdlc-factory skills but removed — sdlc-factory already includes equivalent skills invoked automatically by every entry point (`sdlc-task`, `sdlc-start`, `sdlc-autonomous`). No separate contribution needed.

---

## Task 4 — Commit + push codemie-public-skills MR ✅

Branch: `feat/epmcdme-12486-migrate-ui-local-skills-to-public`
MR: https://gitbud.epam.com/epm-cdme/codemie-public-skills/-/merge_requests/30

---

## Task 5 — Delete local skills/agents in codemie-ui ✅

Deleted:
1. `.claude/skills/babysit-mr/`
2. `.claude/skills/codemie-mr/`
3. `.claude/skills/code-reviewer/`
4. `.claude/skills/dark-factory/`
5. `.claude/skills/tech-lead/`
6. `.claude/skills/playwright-cli/`
7. `.claude/agents/refactor-cleaner.md`
8. `.claude/agents/unit-tester.md`
9. `.claude/agents/solution-architect.md`
10. `.claude/agents/ui-tester.md`

Preserved (project-specific):
- `.claude/skills/integration-tester/` — contains React/Valtio/renderPage/mockAPI patterns specific to this frontend; not equivalent to the generic sdlc-factory version

---

## Task 6 — Update AGENTS.md with install instructions ✅

`AGENTS.md` updated: `--skill code-reviewer` (standalone) + `--package sdlc-factory` (includes refactor-cleaner, unit-tester, integration-tester via pipeline).

---

## Task 7 — Commit + push codemie-ui MR ✅

Branch: `EPMCDME-12486_delete-local-skills-agents`
MR: https://gitbud.epam.com/epm-cdme/codemie-ui/-/merge_requests/1382

---

## State file

`docs/superpowers/tasks/2026-06-11-epmcdme-12486-audit-migrate-local-skills/.state.json`
