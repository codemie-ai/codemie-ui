# Technical Research

**Task**: vitest setupTests locale intl
**Generated**: 2026-10-28
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16196 — fix locale-dependent unit tests. On Windows Node takes default locale from the OS, so number/currency formatting in tests differs from CI/Linux (e.g. "12 500" vs "12,500"). Planned solution (author's comment, drafted in C:/Epam/codemie-dev/setupTests.tsx, lines 64-94): add a "Locale" block to src/setupTests.tsx that patches Intl.NumberFormat and Number.prototype.toLocaleString to default to 'en-US' when no locale passed. Research: where the block belongs in src/setupTests.tsx, other locale-dependent APIs used in src (Date toLocaleString/toLocaleDateString, Intl.DateTimeFormat, localeCompare, toLocaleString on numbers) and tests asserting on them, risks of patching (vitest projects unit/integration setupFiles, ESLint no-extend-native).

---

## 2. Codebase Findings

### Existing Implementations
- `src/setupTests.tsx` (389 lines) — shared setup. Sections in order: console filtering (l.24-53), jsdom virtualConsole re-route (l.55-62), "Browser globals" (l.64, starts with localStorage mock), shared vi.mock calls, URL helpers, global fetch mock, router mock, lifecycle hooks. It has NO locale code today.
- `C:/Epam/codemie-dev/setupTests.tsx` (420 lines, outside the repo) — the author's draft. It is identical to the repo file plus one inserted block at l.64-94 (`// ─── Locale ───` header, before `// ─── Browser globals ───`). The block:
  - `TEST_LOCALE = 'en-US'`.
  - `Intl.NumberFormat` replaced by a plain `function` wrapper that calls `new OriginalNumberFormat(locales ?? TEST_LOCALE, options)`. It sets `prototype` via `Object.defineProperty` and copies `supportedLocalesOf`.
  - `Number.prototype.toLocaleString` replaced by a wrapper that calls the original with `locales ?? TEST_LOCALE`. It carries `// eslint-disable-next-line no-extend-native`.
- Placement: the draft's position, directly after the jsdom virtualConsole block and before "Browser globals", is a clean insertion point. Nothing above it formats numbers. Plain top-level statements execute at setup-file time like the existing console patches.
- Patched surface: only Number formatting. `Date.prototype.toLocale*String`, `Intl.DateTimeFormat`, `Intl.Collator` and `String#localeCompare` are NOT touched by the draft.

### Architecture and Layers Affected
Test infrastructure only (vitest setup layer). No production code in the draft.

### Integration Points
- `vite.config.ts` l.115-144: `test.projects`.
  - `unit`: jsdom env, setupFiles `['./src/setupTests', './src/setupTests.unit']`.
  - `integration`: custom env `./vitest-env-integration.ts`, setupFiles `['./src/setupTests', './src/setupTests.integration']`.
  - Both load `src/setupTests.tsx` first, so one block covers both projects.
- `src/setupTests.unit.ts` and `src/setupTests.integration.ts` contain no Intl, toLocale or TZ handling (grep empty).
- `vite.config.ts` fakeTimers fakes `Date` (and timers) only, so it does not interact with Intl.

### Patterns and Conventions
- `setupTests.tsx` already patches globals directly (console, localStorage, ResizeObserver) under `// ───` section headers.
- File header has `/* eslint-disable import/no-extraneous-dependencies */`.

### Locale-dependent APIs in production code (src, excluding tests and `assets/vendor/speechSdk.js`)
Totals: 128 occurrences in 59 files (about 122 outside the vendor file).

1. Number `toLocaleString()` with NO locale. These are the host-dependent ones the draft fixes:
   - `src/utils/currency.ts:36`
   - `src/utils/analyticsFormatters.ts:36` (passes `undefined` explicitly, so `locales ?? TEST_LOCALE` handles it) and `:59`
   - `src/pages/workflows/details/WorkflowExecutionInfoPopup.tsx:112,115`
   - `src/pages/schedulers/SchedulerRunDetailsPage.tsx:151,155`
   - `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx:104`
   - `src/pages/analytics/components/cli-analytics/views/`: `CostView`, `UsersView`, `SessionsView`, `SessionBody`, `RepositoriesTable`
   - `src/pages/analytics/components/widgets/BarChartWidget.tsx` and `StackedBarChartWidget.tsx` (`value.toLocaleString()`)
2. Number formatting with explicit `'en-US'`, already host-independent:
   - `src/utils/helpers.ts:368,377,385`
   - `src/utils/currency.ts:18`
   - `usage-attribution/utils.ts`
   - `usage-attribution/settings/settingsModel.ts:54`
3. Date formatting with NO locale and host-dependent, which the draft does NOT cover:
   - `src/components/Table/TableCell.tsx:69,71` and `src/pages/schedulers/SchedulersPage.tsx:68,70`. These are Luxon `DateTime#toLocaleString`, not native Date; Luxon uses the system locale through its own `Settings.defaultLocale`/Intl, and its internal `Intl.DateTimeFormat` is not patched.
   - `src/pages/integrations/components/SettingsForm/CronInputField.tsx:56`
   - `src/utils/helpers.ts:87`: Luxon `dt.toLocaleString(DateTime.DATE_FULL)`
4. Date formatting with explicit `'en-US'`: `CronInputField.tsx:46` (`Intl.DateTimeFormat('en-US')`), `BarChartWidget`, `StackedBarChartWidget`, `usage-attribution/utils.ts:84,92`.
5. `Intl.DateTimeFormat().resolvedOptions().timeZone`: `src/utils/helpers.ts:45`, `src/utils/timezone.ts:52`. This depends on the host timezone, not the locale.
6. `localeCompare` with no locale, about 30 call sites, all used for sorting: `src/store/user.ts` (8), `dataSources.ts`, `a2ui/*`, `MultiSelect.tsx:303`, chat sidebar helpers, `skillBundleUtils.ts`, `UaTable.tsx`, and others. Ordering for ASCII names is the same across locales; mixed case or accents may differ by host ICU/locale. The draft does not touch this.

### Tests touching locale APIs
- Only 16 occurrences in 6 test files. All are sort or lowercasing helpers, or explicit `'en-US'` mocks:
  - `useAllIntegrationTypeOptions.test.ts:42`
  - `AssistantCard.test.tsx:28-37` (explicit en-US `Intl.NumberFormat` in a mock)
  - `UserMapping.test.tsx:314,410`
  - `ReasonChip.test.tsx:67-85`
  - `AnalyticsUserFilter.test.tsx:399` and `ContextSelector.announcement.test.tsx:196,200` (`toLocaleLowerCase`)
- Tests asserting formatted comma-grouped numbers (regex `\d{1,3}(,\d{3})+`) number about 34 matches in 14 files. These are the likely failures on a Windows host with a non-en locale:
  - `utils/__tests__/{analyticsFormatters,currency,helpers,chartColors}.test.ts`
  - `WorkflowExecutionInfoPopup.test.tsx`
  - `SkillInstructions.test.tsx`
  - `EfficiencyView.test.tsx`
  - `RatioWidget/__tests__/utils.test.ts`
  - `usage-attribution/__tests__/{PeopleGroups,OverviewView,PeopleTable}.test.tsx`
  - `StatusLabel.test.tsx`
  - `CostCenterBudgetRollupCard.test.tsx`
  - `budgetNumber.test.ts`
- Source/test pairing: `currency.ts`↔`currency.test.ts`, `analyticsFormatters.ts`↔`analyticsFormatters.test.ts`, `WorkflowExecutionInfoPopup.tsx`↔`WorkflowExecutionInfoPopup.test.tsx`. The unlocalised `.toLocaleString()` call sites in CLI-analytics views and `SchedulerRunDetailsPage` may be covered by other tests in the list.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/testing/{testing-patterns,qa-strategy,local-verification}.md` exist. They were not read in depth for locale content; no locale convention was identified from code. AGENTS.md says to load testing-patterns.md first for test work.

### Architectural Decisions
None found about locale in setup files.

### Derived Conventions
Production code already pins `'en-US'` in many places, so en-US is the de facto expected format. Setup-file patches sit under section-header comments.

---

## 4. Testing Landscape

### Existing Coverage
See section 2. Vitest with React Testing Library; projects `unit` and `integration`.

### Testing Framework and Patterns
- Vitest 5 (comment in setupTests: "Vitest 5 requires a `function` (not an arrow)"), `globals: true`, `retry: 1`, `maxWorkers: 3`.
- Scripts: `test`, `test:unit`, `test:integration`, `test:coverage` (unit with coverage, then integration).
- Per AGENTS.md, run `npm ci` before trusting results and quote the `Test Files` line.

### Coverage Gaps
No test asserts the setup patch itself.

---

## 5. Configuration and Environment

### Environment Variables
None locale-related are set in the vitest config or setup files (grep for locale/TZ in `vite.config.ts` and `package.json` found nothing). The draft comment says the Windows ICU default ignores env vars.

### Configuration Files
- `vite.config.ts` `test.projects` (see section 2).
- `.eslintrc.cjs` extends `airbnb-base`. `no-extend-native` is not overridden anywhere in repo config or src, so it is active at error level from airbnb-base. The draft's `// eslint-disable-next-line no-extend-native` on the `Number.prototype.toLocaleString =` line is the only extend-native disable and is the correct form. Tests have an override only for `sonarjs/no-duplicate-string` and `import/no-extraneous-dependencies`. `setupTests.tsx` is not in `ignorePatterns`, so it is linted.
- Lint rules that could touch the draft: `func-names` is off, `prefer-arrow-callback` is off, `@typescript-eslint/no-explicit-any` is off. `@stylistic/semi` is `never` and quotes are single, and the draft follows both. A `Intl.NumberFormat = PatchedNumberFormat` assignment is a property assignment, not `no-global-assign`.

### Feature Flags and Deployment Concerns
CI runs on Linux. Behaviour there is unchanged for en-US hosts.

---

## 6. Risk Indicators

- Draft covers only Number formatting. Luxon `toLocaleString` in `TableCell.tsx` and `SchedulersPage.tsx`, plus `helpers.ts:87` and `CronInputField.tsx:56`, remain host-locale dependent; the draft leaves them unfixed.
- `localeCompare` (about 30 sites) is not patched. It is unlikely to differ for plain ASCII data, but is locale-sensitive.
- Wrapper fidelity of the draft's `Intl.NumberFormat` replacement:
  - `Intl.NumberFormat.prototype.constructor` still points to the original, so `x.constructor === Intl.NumberFormat` is false.
  - `instanceof Intl.NumberFormat` works because `prototype` is shared.
  - Calling without `new` returns an instance, which matches native behaviour.
  - The `prototype` redefinition via `defineProperty` on a plain function may throw if the property is non-configurable on a normal function. A plain function's `prototype` is writable but non-configurable. `defineProperty` with a `value` only is allowed because it is writable, but verify at runtime.
  - `Symbol.toStringTag` and `length` differ.
- The Number.prototype patch is global to the worker. Libraries that rely on `toLocaleString` (PrimeReact, chart libs, Luxon internals) now format as en-US with no locale. This is the intent, but it can change output in snapshots on a non-en host.
- `Intl.NumberFormat` is replaced after `jsdom` was created. Code that captured `Intl.NumberFormat` before the setup file ran (for example Node internals, or modules evaluated before setup) keeps the original.
- Arguments `locales: []` (empty array) are not nullish, so they pass through unchanged; `undefined` and `null` get the default.
- `AssistantCard.test.tsx` already mocks formatting with explicit en-US. No conflict expected.
- Shared by both projects through `./src/setupTests`; no per-project duplication needed. A failure in the block breaks every suite.
- Speculative: tests that currently pass with locale-specific expectations on a developer's Windows host (non-grouping separators) would start failing after the patch. This is the intended fix, but any such test would be a pre-existing defect.
- Speculative: Date and Luxon tests may still fail on Windows; this may need a follow-up or a `Settings.defaultLocale` approach, which is a design decision for the spec.
- The draft lives outside the repo at `C:/Epam/codemie-dev/setupTests.tsx`; it must be transcribed. It differs from the repo file only by the inserted block.

---

## 7. Summary for Complexity Assessment

The change touches a single file layer: the shared vitest setup `src/setupTests.tsx`, loaded first by both the `unit` and `integration` projects. The author's draft is a self-contained ~30-line block (draft lines 64-94) that goes between the jsdom virtualConsole block and the "Browser globals" section. The repo file is otherwise identical to the draft.

Technical novelty is low to moderate. Patching `Intl.NumberFormat` and `Number.prototype.toLocaleString` is a known pattern, and the ESLint `no-extend-native` (airbnb-base) concern is already handled by the draft's disable comment. Wrapper fidelity of the `Intl.NumberFormat` replacement is the main correctness question.

Coverage: about 14 test files assert comma-grouped numbers and are the expected beneficiaries. The draft does not cover Luxon or native date formatting (host-dependent in `TableCell.tsx`, `SchedulersPage.tsx`, `CronInputField.tsx`, `helpers.ts:87`) or `localeCompare` (about 30 sites). Verification needs a Windows run of both projects after `npm ci`. Whether those remaining APIs are in scope is a spec decision.

---

## 8. External References

`C:/Epam/codemie-dev/setupTests.tsx` — resolved. It is a full copy of `src/setupTests.tsx` with this block inserted at lines 64-94, between the jsdom virtualConsole re-route and `// ─── Browser globals ───`:

```ts
// ─── Locale ───
// Node takes its default locale from the OS on Windows (env vars are ignored), so number
// formatting differs from CI/Linux (e.g. "12 500" vs "12,500"). Default to en-US so that
// assertions on formatted numbers and currency are host-independent.
const TEST_LOCALE = 'en-US'

const OriginalNumberFormat = Intl.NumberFormat
const PatchedNumberFormat = function (this: unknown, locales?: string | string[], options?: Intl.NumberFormatOptions) {
  return new OriginalNumberFormat(locales ?? TEST_LOCALE, options)
} as unknown as typeof Intl.NumberFormat
Object.defineProperty(PatchedNumberFormat, 'prototype', { value: OriginalNumberFormat.prototype })
PatchedNumberFormat.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf
Intl.NumberFormat = PatchedNumberFormat

// Number#toLocaleString does not go through the Intl.NumberFormat global, so it is patched too.
// Intentional: test-only, and the only way to change its default locale.
const originalNumberToLocaleString = Number.prototype.toLocaleString
// eslint-disable-next-line no-extend-native
Number.prototype.toLocaleString = function (this: number, locales?: string | string[], options?: Intl.NumberFormatOptions) {
  return originalNumberToLocaleString.call(this, locales ?? TEST_LOCALE, options)
}
```

(Line wrapping above is condensed; the draft file has the multi-line prettier form.)
