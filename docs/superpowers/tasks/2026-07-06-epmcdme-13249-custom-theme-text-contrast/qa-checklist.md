# QA Checklist — EPMCDME-13249

**Feature**: Fix in-progress color contrast under custom theme presets
**Run dir**: `docs/superpowers/tasks/2026-07-06-epmcdme-13249-custom-theme-text-contrast`
**Merge base**: `origin/main`

---

## Automated — this run

### Scenario 1: Engine generates distinct RGB values for all three in-progress tiers

- **Blocking**: yes
- **Risk**: high — regression here means badge text is invisible
- **Affected file**: `src/utils/customAppearance/__tests__/rules.test.ts`
- **Suggested test-first description**: `runRules({ accentColor: '#52519A' })` — assert `--colors-in-progress-primary`, `--colors-in-progress-secondary`, and `--colors-in-progress-tertiary` are all different from each other
- **Status**: covered — `derive.inProgressGroup > generates distinct values for primary, secondary, and tertiary`

### Scenario 2: tertiary differs from primary for all built-in preset accent colors

- **Blocking**: yes
- **Risk**: high — regression guard across all 12 presets
- **Affected file**: `src/utils/customAppearance/__tests__/rules.test.ts`
- **Suggested test-first description**: `runRules({ accentColor: hex })` for each of 9 preset accent colors — assert `--colors-in-progress-tertiary` is not equal to `--colors-in-progress-primary`
- **Status**: covered — `derive.inProgressGroup > tertiary differs from primary for accent <hex>` (9 parameterised cases)

---

## Automated — harness backlog

### Scenario H1: Intermediate badge on AI Katas card is visually readable under each custom theme preset

- **Module**: `src/pages/katas/`
- **Existing coverage**: unknown — external harness (`../codemie-sdk/test-harness`) has no identified tests for custom-appearance or badge rendering
- **Where to add**: `../codemie-sdk/test-harness/codemie_test_harness/tests/ui/` — new Playwright test that applies each preset via the Settings UI and screenshots the Intermediate badge on an AI Katas card

### Scenario H2: MCPs management Categories column is visually readable under each custom theme preset

- **Module**: `src/pages/settings/administration/`
- **Existing coverage**: unknown — no harness tests found for MCPs column rendering
- **Where to add**: `../codemie-sdk/test-harness/codemie_test_harness/tests/ui/` — new Playwright test that applies each preset and asserts the Categories column contains visible text
