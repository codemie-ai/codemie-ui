# Technical Analysis: EPMCDME-12486

## Codebase Findings

### Local skills and agents in codemie-ui

**`.claude/agents/` (4 files):**
- `refactor-cleaner.md` — hardcoded CodeMie UI–specific (Valtio, PrimeReact paths, `src/components/Popup`, `src/store/*`). Candidate for generic rewrite.
- `unit-tester.md` — hardcoded CodeMie UI–specific (Vitest + Testing Library, Valtio store patterns). Candidate for generic rewrite.
- `solution-architect.md` — general-purpose; superseded by `sdlc-factory:tech-analyst`.
- `ui-tester.md` — superseded by `playwright-cli` in codemie-public-skills.

**`.claude/skills/` (7 directories):**
- `babysit-mr/` — single SKILL.md; superseded by `sdlc-factory:babysit-mr`.
- `codemie-mr/` — single SKILL.md; superseded by `sdlc-factory:mr-creator`.
- `code-reviewer/` — SKILL.md + README.md; full review workflow, hardcoded to CodeMie UI conventions (Tailwind, Popup not Dialog, Valtio, `.json()` pattern). Candidate for generic rewrite — the key ask from the ticket.
- `dark-factory/` — listed as DONE in ticket Tier 1 but directory still present.
- `tech-lead/` — listed as DONE in ticket Tier 1 but directory still present.
- `integration-tester/` — SKILL.md + README.md + 5 references; hardcoded CodeMie UI infra (`renderPage`, `mockAPI`, Vitest). Candidate for generic rewrite.
- `playwright-cli/` — superseded by `playwright-cli` in codemie-public-skills; not mentioned in ticket but present.

### Existing skills in codemie-public-skills

**`skills/development/`:**
- `mr-code-review/` — posts inline comments to MR/PR via adapter. Different purpose from local code-reviewer (which auto-fixes and commits). Reads `.claude/agents/code-reviewer.md` for guidelines. Currently depends on a project-local agent file.
- `claude-setup-audit/` — audits Claude Code setup.
- `sonar/` — runs SonarQube analysis.

**`skills/testing/`:**
- `playwright-cli/` — browser automation skill.

**`ai-packages/sdlc-factory/skills/`:**
- babysit-mr, complexity-scoring, decision-router, feature-verification, knowledge-auditor, knowledge-foundation, memory, mr-creator, product-owner, qa-foundation, qa-gates, qa-planner, requirements-intake, sdlc-autonomous, sdlc-doctor, sdlc-pipeline, sdlc-start, sdlc-status, sdlc-task.
- No `refactor-cleaner`, `unit-tester`, or `integration-tester` yet.

### PR Template

`codemie-ui/.github/PULL_REQUEST_TEMPLATE.md` exists with: Summary, Type of change, Changes table, Spec, QA Guide, Screenshots, E2E Test Harness, Checklist sections.

### CLAUDE.md state

`codemie-ui/CLAUDE.md` contains only `@AGENTS.md`. Clean — no references to tech-lead or dark-factory.

## Risk Indicators

- **Low**: deleting superseded local skills — no imports, no build-time dependencies.
- **Medium**: writing generic `code-reviewer` skill — must be project-agnostic while remaining useful; needs to read CLAUDE.md or README for project-specific conventions.
- **Low**: `mr-code-review` currently reads `.claude/agents/code-reviewer.md` which will be deleted — but `mr-code-review` delegates to a local agent file which is the old skill, not the new generic one. The new generic code-reviewer replaces this pattern.
- **Medium**: `integration-tester` generic rewrite loses CodeMie UI–specific helpers (`renderPage`, `mockAPI`) — the generic version must describe how to discover the project's test infrastructure.

## Skill Structure Pattern (from `mr-code-review`)

Each skill in codemie-public-skills has:
```
skills/<category>/<skill-name>/
├── SKILL.md      ← frontmatter (name, description, metadata) + skill content
├── README.md     ← human-readable usage docs
└── evals/
    └── evals.json  ← trigger prompts + assertions for eval harness
```

SDLC factory skills have the same structure under `ai-packages/sdlc-factory/skills/<skill-name>/`.

## Evals format

```json
{
  "skill_name": "<name>",
  "evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "files": [],
      "assertions": [
        { "name": "...", "description": "..." }
      ]
    }
  ]
}
```
