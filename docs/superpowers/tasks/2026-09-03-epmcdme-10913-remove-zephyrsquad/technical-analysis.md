# Technical Research

**Task**: zephyrsquad settingsUIConfig integrations deprecation assistant-tools
**Generated**: 2026-09-03
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

Fully remove the ZephyrSquad integration from the CodeMie UI (repo: codemie-ui, currently checked out at /Users/oleg_sotnichenko/codemie-dev/codemie-ui, branch EPMCDME-10913_remove-zephyrsquad). Product owner explicitly wants total removal — no deprecation banner, no redirect, no backward compatibility (no prod usage exists). This supersedes a previously-merged "deprecate" approach (MR codemie-ui!1626) that added:
- `deprecated?: boolean` to `CredentialTypeConfig` in `src/types/settingsUI.ts`
- `zephyrsquad` entry marked `deprecated: true` with a warn-type `message` in `src/utils/settingsUIConfig.ts`
- `isDeprecatedCredentialType` helper, exclusion from `getAvailableCredentialsTypes` / `getTestableCredentialTypes` (kept IN `getCredentialUIMapping` deliberately, for edit-page field rendering)
- `useDeprecationRedirect` hook used by `NewUserIntegrationPage` / `NewProjectIntegrationPage` to block direct URL nav
- `EditIntegrationActions` component (extracted from `EditUserIntegrationPage`/`EditProjectIntegrationPage`) that hides Save/Test buttons for deprecated types, and also now houses the OAuth `OAuthTestAction` button (added later by main, unrelated to ZephyrSquad)

Find and document EVERY place ZephyrSquad appears in the frontend, specifically also the two the product owner explicitly complained still show it:
1. "tools on assistant edit page" — find wherever the assistant-edit form lists available tools (likely reads from a backend tool-catalog endpoint or a static list) and confirm what filters/excludes tools there today, and whether ZephyrSquad shows up because there is NO deprecated-tool filtering on that surface at all (as opposed to the credential-type picker, which does filter)
2. "filters dropdown on integrations page" — find the Integrations list page's filter/type dropdown (separate from the "new integration" credential-type picker) and confirm it is not using `getAvailableCredentialsTypes`/`isDeprecatedCredentialType` — that's presumably the gap

Also find:
- `settingsUIConfig.ts` full ZephyrSquad entry
- Every usage of `isDeprecatedCredentialType`, `useDeprecationRedirect`, `deprecated` field on `CredentialTypeConfig` — enumerate whether ANY other credential type besides zephyrsquad currently sets `deprecated: true` (if none, this entire mechanism becomes dead code after removal and should be deleted, not just left unused)
- `EditIntegrationActions` component — confirm whether the deprecated-check is the only reason it exists, or whether OAuthTestAction/other logic must be preserved when the deprecated branch is removed
- All ZephyrSquad-specific tests: `settings.test.ts` (registry flag test), `useDeprecationRedirect.test.tsx`, `EditIntegrationActions.test.tsx`, and anything else matching zephyr (case-insensitive) in test files
- Any ZephyrSquad-specific icon/asset files, i18n strings, type unions (e.g. a `CredentialTypes`/`ToolNames` TS enum or union type mirroring the backend enum)
- Any mock/fixture data used by tests or Storybook mentioning ZephyrSquad

Report exact file paths and line ranges grouped by concern (integrations picker & config / assistant-edit tool list / integrations-page filter dropdown / deprecation mechanism dead-code / tests / types & assets). Call out anything risky to remove blind (e.g. `EditIntegrationActions` shared with non-deprecated OAuth logic).

---

## 2. Codebase Findings

### Existing Implementations

**Integrations picker & config (root of the data-driven mapping):**
- `src/utils/settingsUIConfig.ts:615-635` — the full `zephyrsquad` entry inside `CREDENTIAL_UI_MAPPING`: `defaultUrl`, `testable: true`, `displayName`, `serverEnum: 'ZephyrSquad'`, `deprecated: true`, deprecation `message` (warn type), `fields` (`account_id`, `access_key`, `secret_key`). **Delete this entry entirely.**
- `src/utils/settingsUIConfig.ts:597-614` — sibling `zephyrscale` entry. **NOT part of removal** — distinct, active integration (the migration target). High collateral-damage risk due to similar naming; do not touch.
- `src/store/appInfo.ts:41` — `zephyrconfig: { credentialType: 'zephyrscale', ... }` in `TOOL_CONFIG_FIELD_MAP`. Maps to `zephyrscale`, not `zephyrsquad` — leave as is.

**Utility/business-logic layer (`src/utils/settings.ts`):**
- `getCredentialUIMapping()` (~lines 46-100) — deliberately does NOT filter deprecated entries (kept per prior MR for edit-page field rendering). Once the `zephyrsquad` key is deleted from `CREDENTIAL_UI_MAPPING`, this function needs no code change — it will simply no longer return it.
- `getAvailableCredentialsTypes()` (~lines 102-109) — filters out `config.deprecated` (line ~107). Becomes a no-op filter once no config entry sets `deprecated: true`; the filter clause itself becomes dead code and should be removed.
- `getTestableCredentialTypes()` (~lines 119-124) — filters out `config.deprecated` (line ~121). Same as above — dead code after removal.
- `isDeprecatedCredentialType()` (~lines 126-129) — sole purpose is checking a flag that only zephyrsquad ever set. **Confirmed: zephyrsquad is the ONLY credential type in `CREDENTIAL_UI_MAPPING` that sets `deprecated: true`.** This function becomes fully dead code and must be deleted, not just left unused.

**Hooks layer:**
- `src/pages/integrations/hooks/useDeprecationRedirect.ts` (full file, 1-31 lines) — calls `isDeprecatedCredentialType` and redirects back to the integrations list route if true. Entire file exists only to support zephyrsquad's deprecation UX. **Delete the whole file.**
- Used only by `src/pages/integrations/NewUserIntegrationPage.tsx` (import + call ~lines 26, 81) and `src/pages/integrations/NewProjectIntegrationPage.tsx` (import + call ~lines 26, 83). Both call sites must be removed together with the hook file to avoid stray unused imports breaking lint/type-check.
- `src/hooks/useIntegrationTypeOptions.ts` (full file, 1-57 lines) — builds the Integrations-page TYPE filter dropdown options. Uses `getCredentialUIMapping` (which currently still includes zephyrsquad because that function deliberately keeps deprecated entries visible). **This is the confirmed root cause of PO complaint #2** — the filter dropdown is not built from `getAvailableCredentialsTypes`/`isDeprecatedCredentialType` at all; it reads the unfiltered `getCredentialUIMapping()` map directly. Once the `zephyrsquad` key is deleted from `CREDENTIAL_UI_MAPPING`, this filter option disappears automatically — no code change needed in this file itself.

**Page/component layer:**
- `src/pages/integrations/components/EditIntegrationActions.tsx` (full file, 1-52 lines) — line ~18 imports `isDeprecatedCredentialType`; line ~31 `if (isDeprecatedCredentialType(credentialType)) return null` is the ONLY zephyr-specific logic in this component. Lines ~35-46 (testable check, `OAuthTestAction`, Save button) are unrelated, generic, shared logic added later by main and **MUST be preserved**. Confirmed: this component is not solely a deprecation artifact — only remove the import and the guard clause, keep the component and its non-deprecation logic intact.
- `src/pages/integrations/EditUserIntegrationPage.tsx` and `src/pages/integrations/EditProjectIntegrationPage.tsx` — both import/use `EditIntegrationActions`; confirms the extraction is still needed post-removal (for the OAuth button), only the deprecated-guard usage inside it changes.
- `src/pages/integrations/components/UserSettings/UserSettings.tsx:166-208` — consumes `useIntegrationTypeOptions` for the `type` filter definition (project/type/is_global filters). No zephyr-specific code; downstream of the mapping only.
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx:46,90` — uses `getTestableCredentialTypes`. No zephyr-specific code.

### Architecture and Layers Affected

- **Config/data layer** — `src/utils/settingsUIConfig.ts` (`CREDENTIAL_UI_MAPPING`), the single source of truth.
- **Type layer** — `src/types/settingsUI.ts` (`CredentialTypeConfig.deprecated?: boolean`).
- **Utility/business-logic layer** — `src/utils/settings.ts` (four functions: `getCredentialUIMapping`, `getAvailableCredentialsTypes`, `getTestableCredentialTypes`, `isDeprecatedCredentialType`).
- **Hooks layer** — `src/hooks/useIntegrationTypeOptions.ts` (integrations-page filter dropdown), `src/pages/integrations/hooks/useDeprecationRedirect.ts` (deprecation-only, to be deleted).
- **Page/component layer** — `NewUserIntegrationPage`, `NewProjectIntegrationPage`, `EditUserIntegrationPage`, `EditProjectIntegrationPage`, `EditIntegrationActions`, `UserSettings`, `ProjectSettings`.
- **Test layer** — `src/utils/__tests__/settings.test.ts`, `src/pages/integrations/hooks/__tests__/useDeprecationRedirect.test.tsx`, `src/pages/integrations/components/__tests__/EditIntegrationActions.test.tsx`.
- **Mock/fixture data** — `mock-server/db.json`.
- **Assistant tool catalog layer** — investigated per PO complaint #1; see Integration Points below. **No code in this layer references zephyrsquad** — it is a separate, fully backend/runtime-driven surface with no static tool list to edit.

### Integration Points

**PO complaint #1 — "tools on assistant edit page":** The AssistantForm tool catalog (`AvailableToolsSection.tsx`, `ExternalToolsSection.tsx`, `Toolkit.tsx`, and related components under the assistant-edit form) is fully data-driven from a runtime `AssistantToolkit[]` / backend tool-catalog response, with **no static tool-name list and no zephyr-specific filtering logic anywhere in the frontend**. This confirms the task's own hypothesis: ZephyrSquad shows up here (if it does) purely because there is **no deprecated/removed-tool filtering mechanism on this surface at all** — unlike the credential-type picker, which does filter via `getAvailableCredentialsTypes`. There is nothing to "fix" in frontend filtering logic for this surface; if ZephyrSquad still appears as a selectable tool, the removal must happen upstream (backend tool catalog) or, if a ZephyrSquad *credential type* was gating tool availability, removing the credential type entry should cascade to hide it (needs backend-side confirmation — flag as a coordination point, not purely a frontend fix).

**PO complaint #2 — "filters dropdown on integrations page":** Confirmed root cause. `src/hooks/useIntegrationTypeOptions.ts` builds filter options from `getCredentialUIMapping()`, which deliberately does **not** exclude deprecated entries (that exclusion only happens in `getAvailableCredentialsTypes`/`getTestableCredentialTypes`, used by the "new integration" picker, not the filter dropdown). This is exactly the gap the task description anticipated. Deleting the `zephyrsquad` key from `CREDENTIAL_UI_MAPPING` fixes this dropdown automatically with no separate code change to `useIntegrationTypeOptions.ts`.

**Dependency chain (single source of truth cascades cleanly):**
`settingsUIConfig.ts` (config) → `settings.ts` (logic: `getCredentialUIMapping`, `getAvailableCredentialsTypes`, `getTestableCredentialTypes`) → hooks (`useIntegrationTypeOptions`, `useDeprecationRedirect`) → pages/components (`NewUserIntegrationPage`, `NewProjectIntegrationPage`, `EditUserIntegrationPage`, `EditProjectIntegrationPage`, `EditIntegrationActions`, `UserSettings`, `ProjectSettings`).

Deleting the `zephyrsquad` config key is the root change; everything downstream that merely *lists available types* cascades automatically. Only the deprecation-specific plumbing (`deprecated` field, `isDeprecatedCredentialType`, `useDeprecationRedirect`, the guard clause in `EditIntegrationActions`) requires explicit deletion since it does not disappear just by removing the config entry (it would sit as dead code otherwise).

### Patterns and Conventions

- Single static config object (`CREDENTIAL_UI_MAPPING`) is the source of truth; all derived lists (available types, testable types, filter-dropdown options) are computed functions over it.
- `getCredentialUIMapping` intentionally does NOT filter deprecated entries — a deliberate prior-MR decision (see code-review-final.json CR-001 below) to keep the edit-page field rendering working for existing deprecated integrations. This nuance becomes irrelevant once zephyrsquad is deleted outright (no deprecated entries remain), but the *pattern itself* — computed derived lists over one config map — should be preserved as-is; do not refactor beyond removing the zephyrsquad key and the now-dead deprecation filter clauses.
- Deprecation guard pattern (to be fully deleted): boolean flag on config + a pure predicate (`isDeprecatedCredentialType`) + a hook (`useDeprecationRedirect`) wired into the two "new integration" pages, plus a guard clause inside a shared button-actions component.
- Extracted shared JSX pattern: `EditIntegrationActions` centralizes save/test/OAuth button rendering to avoid duplicating logic between `EditUserIntegrationPage`/`EditProjectIntegrationPage`. This pattern is unrelated to deprecation and must survive removal.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide in `.ai-run/guides/` documents the `CREDENTIAL_UI_MAPPING` registry pattern, the `deprecated` flag, or integration-removal steps. Checked `.ai-run/guides/architecture/architecture.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/testing/testing-patterns.md` — all are generic, no zephyr/deprecation/credential-type-registry content. This domain knowledge lives only in the prior task folder (see below).

### Architectural Decisions

- `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/decisions.jsonl` — recorded gate decisions for the original deprecation MR (spec.approved, plan.approved, code-review.final: request-changes, code-review.check: approve). No formal ADR file exists.
- `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/code-review-final.json` — **CR-001 (critical, load-bearing constraint if any removal logic is reused before full deletion)**: filtering `deprecated` out of `getCredentialUIMapping` (used for edit-page form rendering) broke the Edit view — the reviewer required filtering only in `getAvailableCredentialsTypes` (the picker). This constraint becomes moot once zephyrsquad is deleted outright (there's no more deprecated entry to special-case), but is important context for why `getCredentialUIMapping` currently does NOT filter deprecated entries — do not "fix" that asymmetry as a side effect; just remove the zephyrsquad key and the dead filter clauses.
- `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/code-review-final.json` — CR-002/CR-003 (redirect-flash and asymmetric guard issues) — now moot under full-removal scope.
- `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/qa-report.md` — documents an explicit scope trim in the original MR (AC4 field-disable was never implemented; only Save/Test buttons were hidden) — explains the current partial state of the code being removed.

### Derived Conventions

- Computed-list-over-single-config-map convention (see Patterns above) — no separate documentation exists; derived from code.

### Prior Task Context

- `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/` — the full prior MR's task folder (spec.md, plan.md, technical-analysis.md, decisions.jsonl, code-review-final.json, code-review-check.json, qa-report.md, complexity JSONs, diffs). This is the "deprecate" implementation being superseded. Its `technical-analysis.md` enumerates every file touched by the original deprecation work — effectively a reverse-checklist for this removal task: `src/utils/settingsUIConfig.ts`, `src/types/settingsUI.ts`, `src/utils/settings.ts`, `NewUserIntegrationPage.tsx`, `NewProjectIntegrationPage.tsx`, `EditUserIntegrationPage.tsx`, `EditProjectIntegrationPage.tsx`, `SettingsForm.tsx`, `CredentialFields.tsx`.
- `docs/superpowers/tasks/2026-09-03-epmcdme-10913-remove-zephyrsquad/.state.json` — a task-state file for this exact ticket already exists (branch `EPMCDME-10913_remove-zephyrsquad`, flow `sdlc-light`, phase `main`), currently otherwise empty. This confirms the current run is operating in the correct, already-provisioned task folder — not a duplicate.

No TODO/HACK/NOTE/ADR/DECISION markers were found near any zephyr or deprecated code in `src/`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/settings.test.ts:524-573` — `describe('deprecated credential type filtering')` block, 7 assertions, entirely zephyrsquad-specific:
  - `:527-530` — `deprecated` flag + warn-type `message` on `CREDENTIAL_UI_MAPPING.zephyrsquad`
  - `:532-536` — negative check that `jira`/`confluence`/`xray`/`zephyrscale` are NOT deprecated (must be preserved conceptually even after removal, or simply deleted along with the whole zephyr-specific describe block since there's no more `deprecated` flag to test against)
  - `:538-546` — `getAvailableCredentialsTypes` excludes `zephyrsquad`, includes `zephyrscale`
  - `:558-561` — `getTestableCredentialTypes` excludes `zephyrsquad`
  - `:563-571` — `isDeprecatedCredentialType('ZephyrSquad'/'zephyrsquad')` → true; other types → false
  - This entire describe block (`:524-573`) is self-contained and safe to delete as a whole once `isDeprecatedCredentialType`, the `deprecated` field, and the zephyrsquad entry are all removed.
  - **Caution**: `:74` — `zephyrscale` (not zephyrsquad) appears separately in the unrelated `URL_DEFAULTS_CASES` fixture array used by 4 other describe blocks (`:87-227`). Do not touch — different, active, non-deprecated credential type.

- `src/pages/integrations/hooks/__tests__/useDeprecationRedirect.test.tsx` (57 lines, full file) — entirely dedicated to the `useDeprecationRedirect` hook: deprecated→redirect (`:37-42`, uses `'ZephyrSquad'` as example value), non-deprecated→no redirect (`:44-49`), undefined type→no redirect (`:51-56`). **Delete the whole file** along with the hook.

- `src/pages/integrations/components/__tests__/EditIntegrationActions.test.tsx` (87 lines) — mixed coverage, requires **partial edit, not wholesale deletion**:
  - `:48-55` — "renders nothing when the credential type is deprecated" — the ONLY deprecation-branch test; delete this single test case.
  - `:57-63`, `:65-71`, `:73-79`, `:81-86` — testable/non-testable Test+Save button rendering and onSave handler — generic, unrelated to zephyr, **must be preserved**.
  - No test currently mocks or asserts `OAuthTestAction` — it renders un-stubbed/live in every test case in this file. Post-removal, this file remains the only place `OAuthTestAction` gets exercised under test at all (with no assertions on it specifically) — pre-existing gap, not introduced by this removal.

### Testing Framework and Patterns

- vitest `1.6.1`; `@testing-library/react` `16.3.0`, `@testing-library/jest-dom` `6.6.3`, `@testing-library/user-event` `14.6.1`.
- `vi.mock('@/utils/settings', () => ({...}))` module-level mocking of named exports, reassigned per test via `vi.fn().mockReturnValue(...)`.
- Child-component stubbing via `vi.mock('../TestIntegration', ...)` returning a `data-testid` div to isolate the component under test.
- `it.each([...])` table-driven tests keyed by fixture arrays in `settings.test.ts`.
- `renderHook` from `@testing-library/react` for hook-only tests.

### Coverage Gaps

- No dedicated `OAuthTestAction.test.tsx` and no assertions on `OAuthTestAction` inside `EditIntegrationActions.test.tsx` — pre-existing gap unrelated to zephyr, worth flagging but out of scope for this removal.
- No Storybook stories or MSW/mock handler files reference `zephyrsquad` anywhere in `src/` — nothing to clean up there.
- `src/utils/settingsUIConfig.ts` and `src/store/appInfo.ts` have no dedicated unit test file beyond the shared `settings.test.ts`.

---

## 5. Configuration and Environment

### Environment Variables

None found. No `.env`, `.env.example`, or `config.js` at repo root reference zephyr.

### Configuration Files

- `src/utils/settingsUIConfig.ts:615-635` — the `zephyrsquad` entry in `CREDENTIAL_UI_MAPPING` (the only functional config to remove).
- `mock-server/db.json` (~lines 12003-12013) — a mock project-integration fixture record with `"alias": "my-zephyr"`, `"credential_type": "ZephyrSquad"`. Local dev mock data; decide whether to delete or leave (mock server likely doesn't validate credential_type strictly, but leaving it would reference a now-nonexistent credential type).
- `mock-server/db.json` (~line 16678) — unrelated `zephyrconfig`/ZephyrScale default config — do not touch.
- `src/configs/releaseNotes.json` (lines ~3935, 4184, 6202, 7565, 8109) — historical changelog entries mentioning "Zephyr Squad" features. Immutable historical record, not live code — leave untouched (removing would falsify release history).

### Feature Flags and Deployment Concerns

- `deprecated: true` on the `zephyrsquad` config object was the sole feature-flag-like mechanism gating deprecated behavior; confirmed to be the only entry using it. No route path segments, API endpoint constants, or env vars are involved in ZephyrSquad-specific logic — removal is fully contained to the frontend config/logic/component files listed above, with one open coordination question for the backend tool catalog (see PO complaint #1 above).

---

## 6. Risk Indicators

- `EditIntegrationActions.tsx` is shared with unrelated, actively-used OAuth logic (`OAuthTestAction`) added later by main — do NOT delete the whole component; only remove the `isDeprecatedCredentialType` import and the guard clause (import line and the `if (isDeprecatedCredentialType(...)) return null` line).
- `useDeprecationRedirect` is used in exactly two pages (`NewUserIntegrationPage`, `NewProjectIntegrationPage`) — the hook file, both call sites, and its dedicated test file must all be removed together, or stray unused imports will break lint/type-check.
- `settings.test.ts:524-573` mixes zephyrsquad-specific assertions with references to other credential types (`jira`, `confluence`, `xray`, `zephyrscale`) inside the same describe block — the whole block can be deleted since it exists solely to test the deprecation mechanism, but confirm no assertion inside it is the *only* test coverage for `zephyrscale` inclusion logic elsewhere in the file (spot-checked: `zephyrscale` positive-inclusion is also implicitly covered by other, non-deprecation-specific test blocks via `URL_DEFAULTS_CASES` at line 74).
- `EditIntegrationActions.test.tsx` requires a surgical single-test-case deletion (`:48-55`), not file deletion — the remaining four test cases are the only coverage for Test/Save button rendering and the onSave callback, unrelated to zephyr.
- `src/utils/settingsUIConfig.ts` has a near-identically-named sibling entry, `zephyrscale` (lines 597-614), immediately adjacent to the `zephyrsquad` entry (615-635) being deleted — high risk of accidental collateral edit due to naming similarity and proximity; verify line ranges carefully before deleting.
- PO complaint #1 ("tools on assistant edit page") has no frontend code to fix — the assistant tool catalog is fully backend/runtime-driven with zero static tool lists or filtering logic. If ZephyrSquad still appears there, this is either (a) a backend tool-catalog issue outside this repo's scope, or (b) contingent on the credential-type removal cascading through a runtime integration check — needs backend coordination/verification, cannot be resolved by a frontend-only change.
- `mock-server/db.json` retains a `ZephyrSquad` fixture record that will reference a deleted credential type after this change — low risk (local dev only) but should be cleaned up for consistency.
- `releaseNotes.json` historical mentions of "Zephyr Squad" must NOT be touched — removing them would falsify the historical changelog record.
- No documentation/guide exists for the `CREDENTIAL_UI_MAPPING` registry pattern or integration-removal steps — all process knowledge lives in the prior (superseded) task folder `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/`, which should be treated as the primary technical reference/reverse-checklist for this removal.
- Once `isDeprecatedCredentialType`, `getAvailableCredentialsTypes`'s deprecated-filter clause, and `getTestableCredentialTypes`'s deprecated-filter clause are all dead (zephyrsquad was the only consumer), these should be deleted outright rather than left as unused dead code, per the task's explicit instruction.
- Requirements clarity: task_context is detailed and specific (concrete file names, line-level hints, explicit PO complaints) — no ambiguity risk here.

---

## 7. Summary for Complexity Assessment

This is a well-scoped, low-to-medium complexity removal task confined almost entirely to the frontend `src/utils` (config + logic), `src/hooks`, and `src/pages/integrations` layers, cascading cleanly through five layers via a single source-of-truth config object (`CREDENTIAL_UI_MAPPING`). The estimated file change surface is approximately 10-12 files: one config entry deletion (`settingsUIConfig.ts`), one type field removal (`settingsUI.ts`), one dead-code function deletion plus two filter-clause simplifications (`settings.ts`), one full hook file deletion plus two call-site edits (`useDeprecationRedirect.ts` + 2 pages), one surgical guard-clause removal in a shared component (`EditIntegrationActions.tsx`, requiring care not to touch adjacent unrelated OAuth logic), one full test file deletion (`useDeprecationRedirect.test.tsx`), one test block deletion (`settings.test.ts`), one surgical test-case deletion (`EditIntegrationActions.test.tsx`), and one optional mock-data cleanup (`mock-server/db.json`).

Technical novelty is very low — this is a pure removal of previously-added, well-isolated code following an existing, well-documented pattern (the prior deprecation MR's own task folder serves as a near-complete reverse checklist). The one non-trivial judgment call is `EditIntegrationActions.tsx`, which now houses unrelated OAuth logic added by main after the original deprecation MR — the removal must be surgical (single import + single guard clause) rather than wholesale, to avoid regressing OAuth functionality that has essentially no dedicated test coverage of its own. Test coverage posture is good for the code being removed (dedicated, well-isolated test blocks exist for all deprecation-specific logic) but mixed for the code that must be preserved alongside it (no OAuthTestAction-specific assertions exist at all — pre-existing gap, not introduced by this change).

Key risk factors for complexity scoring: (1) naming collision risk between `zephyrsquad` and the actively-used, similarly-named `zephyrscale` entry sitting immediately adjacent in the same config file; (2) one architecturally shared component (`EditIntegrationActions`) requires precise surgical editing rather than deletion; (3) PO complaint #1 (assistant-edit tool list) has no resolvable frontend code path — it is either a backend-side concern or resolves automatically via credential-type removal, and should be flagged back to the PO/backend team rather than treated as an in-scope frontend fix; (4) no architecture guide documents this pattern, so the prior task's `technical-analysis.md` should be treated as the authoritative reference during implementation planning.
