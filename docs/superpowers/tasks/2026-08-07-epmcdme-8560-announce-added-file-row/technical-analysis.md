# Technical Research

**Task**: datasource file upload "+Add file" dynamic rows; integrations MCP environment variables rows; accessibility aria-live status messages
**Generated**: 2026-08-07
**Research path**: filesystem (no `.codegraph/` index present in codemie-ui)

---

## 1. Original Context

task_context (verbatim from Jira EPMCDME-8560, Bug, Minor, labels: Data, Frontend, Sources, accessibility_issue, codemie_contribute):

Summary: [4.1.3] Added file row is not announced

Precondition:
Screen reader is turned on.

Steps to Reproduce:
1. Open https://codemie.lab.epam.com/#/data-sources as an authorised user.
2. Select "Create Datasourse" button
3. In the "Choose Datasource Type:" combobox select "File" option
4. Select "+Add file" button
5. Listen to the screen reader announcement

Actual result: After new row with "Select file" added, screen reader announces nothing
Expected result: Screen reader should announce that new row was added
Notes/Reproduce: Reproducible for Integrations flow > Credential Type: MCP > add/delete Environment Variables

(WCAG 4.1.3 Status Messages — dynamically added rows need an aria-live / role=status announcement.)

---

## 2. Codebase Findings

### ⚠ Ticket repro steps are stale — read this first

The ticket describes a "+Add file" button producing a "Select file" row. That UI **no longer exists**. The single-row file input `src/components/form/File/File.tsx` is now **dead code** (self-referenced only by its own `index.ts`; no page imports it). It was replaced by a multi-file dropzone in commit `d3a0f57bc EPMCDME-11151: Add dropzone for uploading multiple files` (later amended by `bbbf2d43f EPMCDME-11745`).

The current datasource File flow is: pick/drop files → rows appear in a file list. The underlying WCAG 4.1.3 defect is unchanged (rows appear/disappear with no status announcement), but the fix must target the **dropzone file list**, not a "+Add file" button.

### Existing Implementations

Datasource File type:
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeFile.tsx` — File index-type form section; binds RHF `Controller name="files"` + `useController('uploadedFiles')` into `FilesDropzone`. **No test file.**
- `src/components/form/FilesDropzone/FilesDropzone.tsx` — container composing drop area + list + `InfoBox` + errors. Uses `useId()` at `:46` for `errorId`.
- `src/components/form/FilesDropzone/components/FileDropArea.tsx` — hidden `<input type=file multiple>` + `DropzoneArea`; `aria-label="Select files to upload"` at `:98`; `N / MAX files selected` counter at `:112-114` is a plain `<span>` with **no live region** (this counter is the most natural announcement carrier).
- `src/components/form/FilesDropzone/components/FileList.tsx` — renders the dynamic rows via `FileListItem`. **No test file.**
- `src/components/form/FilesDropzone/components/FileListItem.tsx` — row; delete control is a bare `<XMarkSvg onClick>`, not a `<button>`, with no accessible name (**a second, adjacent a11y defect**).
- `src/components/form/FilesDropzone/components/FileDropzoneErrors.tsx` — already emits `role="alert"` per error.

Integrations MCP Environment Variables:
- `src/components/form/RecordInput/RecordInput.tsx` — the key/value repeater with the Add button and per-row delete. Shared component.
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx:506-520` — renders `RecordInput` when the credential type declares `fieldsManualConfiguration` (only MCP does).
- `src/utils/settingsUIConfig.ts:730-741` — `MCP_SETTINGS_TYPE.fieldsManualConfiguration = { label: 'Environment Variables', sensitive: true, addText: 'Add Environment Variable' }`.

Adjacent repeaters (same defect class, not named by the ticket — scope decision needed):
- `src/components/form/InputArray/InputArray.tsx` — generic string-array repeater; has `aria-label` on add and per-item labels, **no live region**. Consumers: `DynamicFieldsForm`, `ConversationStartersField`, `KataFormFields`.
- `src/pages/settings/administration/components/MCPServerModal/` — a *different* admin-side MCP env-var repeater ("Add Variable"), driven by `useMCPServerModal.ts`.
- `src/pages/assistants/.../MCPToolkit/MCPServerEnvVars.tsx` — assistant-side MCP env vars; schema-driven fixed list, no add/remove → **out of scope**.

### Architecture and Layers Affected

- **Shared form components** (primary): `src/components/form/FilesDropzone/*`, `src/components/form/RecordInput/RecordInput.tsx`.
- **Page/feature layer** (secondary, likely untouched): `IndexTypeFile.tsx`, `SettingsForm.tsx`.
- **Hooks/utils layer** (optional new file): `src/hooks/` or `src/components/LiveRegion` if a shared announcer is introduced.
- No API, store, routing, or persistence layer involved. This is presentation-only.

### Integration Points

State ownership differs between the two flows — this is the main implementation subtlety:

| Flow | State mechanism | Add | Remove |
|---|---|---|---|
| Datasource files | react-hook-form `Controller`/`useController` (`files: File[]`), **no `useFieldArray`** | `addFiles` — `FileDropArea.tsx:42`, via `handleInputChange` `:76` | `removeFile` — `FileList.tsx:32`; uploaded-file variant inline at `IndexTypeFile.tsx:67-73` |
| MCP env vars | plain `useState` in the parent: `manualCredentialValues` / `setManualCredentialValues` — `SettingsForm.tsx:140`, passed at `:507-520`; merged into payload at `:371`. **Not** part of react-hook-form | `addEmptyItem` — `RecordInput.tsx:67` | `removeItem` — `RecordInput.tsx:72` |

Footguns found:
- `RecordInput.tsx:61-65` — a `useEffect` auto-inserts a first empty row when the value is empty. It fires on mount, so an announcer must **not** announce this initial seed.
- `RecordInput.tsx:74` — when the list empties, one empty row is re-seeded. Delete announcements must account for this.
- `RecordInput.removeItem` filters by `key`, so it removes **all** rows sharing a key — a latent bug adjacent to this work (not in scope, but worth noting if row counts are announced).
- `RecordInput` is also consumed by `src/pages/assistants/.../HedgingConfig.tsx` ("Add mapping") — a fix there lands in two features at once.
- `FileDropArea.tsx:48,62` already fires toastify toasts on oversize/over-limit; those *are* announced today via the toast container live region. Only plain add/remove is silent.

### Patterns and Conventions

- **No reusable announcer exists.** No `useAnnounce`, no `LiveRegion` component, no `src/utils/a11y*`, nothing in `src/hooks/` for announcements.
- Existing `aria-live` regions are both toast mount points, `polite`, no `aria-atomic`: `src/components/appLevel/ToastContainer.tsx:46` and `src/components/Layouts/StandaloneLayout/StandaloneLayout.tsx:65` (`role="region" aria-live="polite"`).
- Closest reusable pattern to copy: `src/components/TooltipButton/TooltipButton.tsx:64` — `<div id={descriptionId} role="status" className="sr-only" aria-hidden={isExpanded}>`.
- Static `role="status"` (labels, not announcements): `StatusBadge.tsx:69`, `src/components/StatusBadge.tsx:74`, `StatusLabel.tsx:82`, `SkillStatusLabel.tsx:60,73`.
- `role="alert"`: `Textarea.tsx:136`, `FileDropzoneErrors.tsx:29`, `HealthCheckMessage.tsx:33`, `ValidationError.tsx:26`, `Banner.tsx`.
- `sr-only` (Tailwind default utility, confirmed available — no `corePlugins`/`prefix`/`safelist` overrides in `tailwind.config.ts`): `Switch.tsx:81`, `NavigationAssistants.tsx:142`, `StartNewChatModal.tsx:135`, `ChatListItem.tsx:216`, `TooltipButton.tsx:64`.
- `useId()` is the established id idiom (`FilesDropzone.tsx:46`, `Checkbox.tsx:62-63`).
- Barrel `index.ts` per component folder; `@/` alias cross-module, relative within a folder; `cn()` for classes; Apache-2.0 EPAM 2026 license header mandatory on every new file (`license-headers:check` in pre-commit).
- Dependency direction is strictly pages → components → hooks/utils/constants; `src/components/form/*` never imports from `src/pages/*`.
- There is **no generic repeater abstraction** — `FilesDropzone`, `RecordInput`, and `InputArray` are three independent implementations. A shared `useAnnounce` hook or `LiveRegion` component would be the single natural insertion point for all three.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and is authoritative. Relevant files:
- `patterns/accessibility-patterns.md` — target "WCAG 2.1 Level AA". Live Regions section is prescriptive but minimal, and mandates **inline JSX** live regions, not a shared component:
  - `<div aria-live='polite' aria-atomic='true'>{statusMessage}</div>` — "Status — non-urgent update"
  - `<div role='alert' aria-live='assertive'>{errorMessage}</div>` — "Error — interrupts immediately"
  - "Use Tailwind `sr-only` for text visible only to screen readers"
  - Pre-Delivery Checklist covers **errors only** ("Errors announced: `role='alert'` or `aria-live='assertive'`") — there is **no checklist item for dynamic non-error content**. That omission is exactly the gap this ticket falls into.
  - The guide contains a `jest-axe` snippet, but see Derived Conventions — it is aspirational, not practice.
- `patterns/form-patterns.md` — `Controller` not `register`; schema in a separate `formSchema.ts`; leaf components take explicit `value`/`onChange`/`error` props, never `control`; `??` not `||`; files under 300 lines. **Nothing about `useFieldArray` or dynamic row lists.**
- `components/component-patterns.md` §10 — "Use `role` and `aria-*` attributes only when a native element cannot convey semantics." 300-line file cap; `React.FC<Props>` + explicit interface; single quotes, no semicolons; 8-step ESLint-enforced import order.
- `components/reusable-components.md` — "All shared components live in `src/components/`. Import via `@/components/<Name>`." Form-specific shared inputs go under `src/components/form/`. Catalog already lists `InputArray` as "Dynamic list input".
- `testing/testing-patterns.md`, `testing/qa-strategy.md`, `quality-gates.md`, `standards/git-workflow.md` — see sections 4 and 5.

### Architectural Decisions

No ADR directory exists. The binding precedent is a prior task run:

- **`docs/superpowers/tasks/2026-07-22-epmcdme-8527-fix-screenreader-workflow-status/`** — the most important precedent. It **deleted** a custom imperative announcer singleton (`executionStatusAnnouncer.ts`: off-screen `aria-live="assertive"` node appended to `document.body`, timers, `blur()` hacks) and replaced it with a declarative `role="status"` + `aria-label={text}` on the component's own `<div>`. Verbatim rationale: *"This complexity exists solely to work around a VoiceOver quirk. NVDA and JAWS — the primary enterprise screen readers — announce live region changes reliably without any such machinery."* VoiceOver support was declared out of scope.
  → **Do not build an imperative announcer singleton for 8560.** A declarative in-JSX live region is the house answer. (A thin declarative `LiveRegion`/`useAnnounce` is still defensible for DRY across three repeaters, but must not resurrect the timer/blur machinery.)
- **`docs/superpowers/tasks/2026-07-22-fix-textarea-error-a11y/`** (EPMCDME-8550) — closest structural sibling; touched `FilesDropzone` itself (`FileDropArea.tsx`, `FileDropzoneErrors.tsx`, `FileList.tsx`). Constraints worth carrying over verbatim: use the `useId()` fallback idiom from `src/components/form/Checkbox.tsx:62-63`; **"Do NOT introduce `jest-axe` (no existing precedent in this repo's suite) — use plain attribute/RTL assertions"**; model tests on `RecordInput.test.tsx`; labelling-only, no visual/behavioural change.
- Other same-shape a11y precedents: `2026-07-20-pinned-chat-accessible-label/` (sr-only span + `aria-hidden` decorative SVG; `qa-report.md` is the QA table template), `2026-07-16-epmcdme-8417-sidebar-btn-a11y/`, `2026-07-22-epmcdme-8460-sidebar-toggle-accessible-name/`, `2026-07-14-fix-aria-tabs-roles/`, `2026-07-22-epmcdme-8502-fix-semantic-headings-assistant-details/`, `2026-07-24-epmcdme-8477-fix-semantic-headings/`, `2026-07-16-fix-nav-assistants-semantic-list/`, `2026-07-10-epmcdme-8521-workflows-templates-semantic-list/`.
- A run dir for this ticket already exists with `.state.json` only (`flow: sdlc-light`, `branch: EPMCDME-8560_announce-added-file-row`, `phase: main`).

### Derived Conventions

- **Repo instructions caveat**: `CLAUDE.md` is a one-line `@AGENTS.md` import, and `AGENTS.md` is **stale** — it is a copy of the *backend* Python/FastAPI entrypoint and its guide-import table points at non-existent paths. Only `project.md`, `quality-gates.md`, `standards/git-workflow.md`, `testing/testing-patterns.md` from that table actually exist. Still-applicable rules: "Check Guides First"; "only work on tests when the user asks"; "only perform git side effects when explicitly requested"; "a guide conflicts with source code → trust current source".
- **No i18n.** No i18next/react-intl, no `locales/`. The only i18n file is keycloakify's built-in login-theme `src/authentication/keycloak-theme/login/i18n.ts`, which does not apply to app routes. Write plain English strings.
- **String placement**: no central messages module. Inlined JSX literals are the dominant pattern for one-off a11y text (all 7 existing `sr-only` strings are inlined). Co-located `constants.ts` is the convention when a string is reused or long — e.g. `src/components/form/FilesDropzone/constants.ts` (already holds `MAX_FILES`). Do **not** add copy to `src/constants/` (that dir is domain/enum config). Watch `sonarjs/no-duplicate-string` (error, threshold 9) — under 9 repeats, inlining is fine.
- **ESLint a11y**: `eslint-plugin-jsx-a11y@6.10.0` is present but only transitively; it is registered under `plugins:` in `.eslintrc.cjs` yet `plugin:jsx-a11y/recommended` is **not** in `extends`. Exactly one rule is on: `jsx-a11y/no-redundant-roles`. Consequence: `role="status"` on a `<div>` will not trip a lint error, and lint will not catch a11y regressions for you.
- Project meta (`.ai-run/guides/project.md`): prefix `EPMCDME`, project `codemie-ui-next`, MR target `main`. Branch `EPMCDME-8560_short-description`, commit `EPMCDME-8560: Capital sentence` (regex-enforced by Tekton CI).

### External Documentation Findings

Not applicable — no third-party SDK, external HTTP API, or vendor auth flow is involved. The change is confined to in-repo React components using native ARIA and Tailwind utilities.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — **the closest precedent**: 4 tests, all a11y (aria-describedby wiring at `:37-53`, `aria-invalid="true"`, unique wrapper ids, `getAllByRole('alert')` at `:106`). Mocks `DropzoneArea` and `InfoBox`.
- `src/components/form/RecordInput/__tests__/RecordInput.test.tsx` — 9 tests over badge/label/error rendering. Mocks the svg, `Button`, `TooltipButton`, `Input`.
- `src/pages/assistants/.../MCPToolkit/__tests__/MCPServerEnvVars.test.tsx` — 4 tests; plain `render`, no mocks (covers the out-of-scope schema-driven list).
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — 2 tests using `renderPage('/data-sources/create')` + `mockAPI` + `selectAutocompleteOption`; covers Google Docs type only.
- `src/components/form/Textarea/__tests__/Textarea.test.tsx` — aria-invalid / aria-describedby precedent.
- `src/components/StatusBadge/__tests__/StatusBadge.test.tsx:22` — the only test asserting `role="status"`.
- `src/components/Sidebar/__tests__/SidebarToggle.test.tsx:77-146` — aria-label/aria-expanded state transitions; the best template for "announcement changes on interaction".

### Testing Framework and Patterns

- vitest 1.6.1, two projects defined in `vitest.workspace.ts`, both extending `vite.config.ts`:
  - **unit**: `**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)` excluding `*.integration.test.*`; setup `['./src/setupTests', './src/setupTests.unit']`; env `jsdom`.
  - **integration**: `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)`; setup `['./src/setupTests', './src/setupTests.integration']`; `testTimeout: 15000`.
  - Tests **must** live in a `__tests__/` directory; the `.integration.test.tsx` suffix selects the project.
- `vite.config.ts` test block: `globals: true`, `retry: 1`, `sequence.shuffle.files: true`, istanbul coverage. **No coverage thresholds anywhere** (not in vite.config.ts, not in sonar-project.properties) — no numeric gate to satisfy.
- `src/setupTests.tsx` (both projects): jest-dom; console suppression; localStorage/ResizeObserver/IntersectionObserver/matchMedia/HTMLDialogElement/createObjectURL polyfills; global `fetch` driven by `requestRegistry`; `vi.mock('react-router')` with a shared `navigate` spy; global mocks for `SettingsLayout`, `useVueRouter`, `NavigationPinnedSection`, `@/utils/toaster`, `file-saver`; `afterEach` cleanup.
- `src/setupTests.unit.ts`: mocks `@/utils/api`, `@/utils/storage`, and **valtio** (`useSnapshot` returns the store directly, `subscribe` is a no-op) → no real reactivity in unit tests.
- `src/setupTests.integration.ts`: `asyncUtilTimeout: 15000`; patches `globalThis.Request` to strip `signal` (jsdom/undici cross-realm bug). Real valtio + stores, only fetch mocked.
- `src/test-utils/integration.tsx`: `renderPage(path)`, `mockAPI(method, url, data, statusOrParams)`, `navigate` spy. `src/test-utils/component-interactions/` provides PrimeReact-aware helpers (`selectAutocompleteOption`, `selectDropdownOption`, `clickMenuOption`, …). **No unit-test render wrapper** — unit tests use bare `render()` plus `vi.mock` of children.
- House style: Apache license header on every test file; explicit named vitest imports despite `globals: true`; `describe('<ComponentName>')` with nested behaviour describes; present-tense `it('renders X')`; `const user = userEvent.setup()` inside each `it` (never module scope); query priority `getByRole > findByRole > getByPlaceholderText > getByLabelText > getByText > getByTestId`; `vi.mock()` at module level only, never inside `describe`/`it`; `afterEach(cleanup)` required in unit tests; AAA, one behaviour per `it`.
- `@testing-library/jest-dom` 6.6.3 is globally registered → `toHaveAccessibleName` / `toHaveAccessibleDescription` available.
- **No jest-axe / axe-core** anywhere (zero matches) and no a11y CI gate. E2E lives in the sibling repo `../codemie-sdk/test-harness` (pytest + Playwright).

### Coverage Gaps

- **No `aria-live` assertion exists anywhere in the suite.** This fix establishes the first one.
- `RecordInput` has **no test for add/remove rows** — `addEmptyItem`, `removeItem`, `updateKey`, `updateValue` are all untested; the file has zero `userEvent` usage.
- `FileList.tsx` and `FileListItem.tsx` have **no test files at all**.
- `FileDropArea.tsx` has no direct test (only exercised indirectly via `FilesDropzone.test.tsx`, which mocks away `DropzoneArea`).
- `IndexTypeFile.tsx` (datasource File type) has **no test**; the datasource integration test never exercises the File type.
- `SettingsForm.tsx`'s `RecordInput` branch (`fieldsManualConfiguration`, i.e. the MCP env-var path) is untested.

---

## 5. Configuration and Environment

### Environment Variables

None relevant. `import.meta.env` is used only for `VITE_API_URL`, `VITE_ENV`, `VITE_SUFFIX`, `BASE_URL`, `MODE/DEV`, and 4 assistant slugs (`src/constants/assistants.ts:16-19`). No env var affects datasource file rows or MCP env-var UI.

### Configuration Files

- `tailwind.config.ts` — Tailwind 3 defaults, no `corePlugins`/`prefix`/`safelist` overrides; `content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}']`; `@tailwind utilities` at `src/assets/stylesheets/main.scss:10`. **`sr-only` is available and already in use in 7 places.** `src/styles/` holds only primereact "lara" presets — no custom a11y utilities.
- `.eslintrc.cjs` — jsx-a11y registered but only `no-redundant-roles` enabled; `sonarjs/no-duplicate-string` error at threshold 9; import order enforced.
- `src/constants/` (25 files) — domain enums and config, plus some copy (`INDEX_ERROR_MSGS`, `dataSources.ts` `INDEX_TYPES`/`FILE_SIZE_ERR`, `common.ts` `SUPPORTED_FILE_FORMATS_MESSAGE_*`, `pageTitles.ts`). Not the home for new announcement copy.
- `src/components/form/FilesDropzone/constants.ts` — co-located constants (`MAX_FILES`); the idiomatic home for a file-row announcement string if it needs extracting.

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS` in `src/constants/featureFlags.ts` are backend-config-driven. `MCP_CONNECT: 'mcpConnect'` gates MCP connect, not env vars; nothing gates datasource file rows. **No flag needed for this fix.**
- CI: no `.github/workflows` (only issue/PR templates). `.gitlab-ci.yml` is a thin `pre-ci-guard` include awaiting external `ci-pipeline` and `compliance-report` contexts; the real pipeline lives in `epm-cdme/codemie-gitlab-templates`. No a11y gate anywhere.
- Local gates that will actually run: `.husky/pre-commit` → `lint-staged` (prettier + `eslint --fix`), `license-headers:check`, `secrets:check`, `sonar-local`. `npm run check:pre-commit` = `tsc --noEmit` + `eslint .`.
- Mandatory pre-MR gates from `.ai-run/guides/quality-gates.md` — "All four must exit 0 before pushing and opening an MR": `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`. Per user standing preference, `npm run test-harness` (`uvx codemie-test-harness --sanity-ui`) must be green **before** invoking mr-creator.
- New files must carry the Apache-2.0 EPAM 2026 license header.

---

## 6. Risk Indicators

- **Ticket repro steps are stale — highest-impact finding.** The "+Add file" / "Select file" row UI is gone; `src/components/form/File/File.tsx` is dead code. Implementation must target `FilesDropzone`'s file list. The plan should record this deviation explicitly so QA does not test the wrong control, and the MR description should note it for the reporter.
- **Scope ambiguity: two named flows, three affected repeaters.** The ticket names datasource files + integrations MCP env vars. Those map to `FilesDropzone` and `RecordInput`. But `InputArray` has the identical defect, and `RecordInput` is also consumed by `HedgingConfig.tsx` ("Add mapping") and `MCPServerModal` has a separate implementation. Scope must be decided deliberately — fixing all three risks scope creep; fixing two leaves a known-identical defect.
- **No reusable announcer exists** — the fix either duplicates an inline live region in two/three places or introduces the repo's first shared announcement primitive. `.ai-run/guides/patterns/accessibility-patterns.md` mandates **inline JSX** live regions, and precedent `2026-07-22-epmcdme-8527` explicitly deleted a shared imperative announcer. Introducing a shared abstraction cuts against both; a plan doing so needs a written justification.
- **`RecordInput.tsx:61-65` mount-time auto-seed** inserts an empty row on mount — a naive "announce on rows change" implementation will fire a spurious announcement on every form open. Same for the `:74` re-seed after emptying the list.
- **`RecordInput.removeItem` (`:72`) filters by key**, removing all rows sharing a key. Announcing "row removed" (singular) can be factually wrong. Pre-existing bug, adjacent to this change.
- **Divergent state mechanisms** between the two flows (RHF `Controller` for files vs. parent `useState` for env vars) means no single hook placement is obviously right; the announcement trigger must be derived per flow.
- **Near-zero test coverage on every file that will change**: `FileList.tsx`, `FileListItem.tsx`, `IndexTypeFile.tsx`, `MCPEnvVarsSection.tsx` have no tests; `RecordInput`'s add/remove handlers are entirely untested. New tests will be written against untested code — regressions in adjacent behaviour will not be caught by the existing suite.
- **No `aria-live` assertion exists in the suite and no axe tooling** — there is no established test idiom for this; the fix defines it. Precedent `2026-07-22-fix-textarea-error-a11y` forbids introducing `jest-axe`, so assertions must be plain RTL (`getByRole('status')`, `[aria-live="polite"]`, `toHaveTextContent`).
- **Lint will not protect this change**: `plugin:jsx-a11y/recommended` is not in `extends`; only `no-redundant-roles` is active. No CI a11y gate exists either.
- **`AGENTS.md` is stale** (backend Python content, dead guide paths) — an agent following it will load nonexistent guides. Use the actual `.ai-run/guides/` set listed in section 3.
- **Adjacent unfixed defects in the same files** (`FileListItem.tsx` delete SVG is not a `<button>` and has no accessible name; `RecordInput` delete `Button` contains only an SVG with no accessible name). Tempting to fix in passing; doing so expands the diff beyond the ticket and complicates review. Decide explicitly.
- **`accessibility-patterns.md` has no checklist item for dynamic non-error content** — the guide's Pre-Delivery Checklist covers errors only. Consider a guide update as part of the change so the next ticket of this class is caught.

---

## 7. Summary for Complexity Assessment

**Layers and file surface.** This is a presentation-only change confined to the shared form-component layer, with no API, store, routing, or persistence involvement. The realistic minimum diff is two production files — `src/components/form/FilesDropzone/components/FileList.tsx` (or `FileDropArea.tsx`, where the existing `N / MAX files selected` counter sits and is the most natural announcement carrier) and `src/components/form/RecordInput/RecordInput.tsx` — plus two test files. If a shared `useAnnounce` hook or `LiveRegion` component is introduced, add one new source file, one new test file, and a third consumer edit in `InputArray.tsx`. Expect **4–7 files** for the narrow scope, up to **9–10** if the shared-primitive path plus `InputArray` is taken. Individual edits are small: a `role="status"` / `aria-live="polite"` `sr-only` element plus a derived message string.

**Technical novelty.** The ARIA mechanism itself is trivial and the repo has a close copy-target in `TooltipButton.tsx:64` (`role="status" className="sr-only"`). What raises difficulty above pure boilerplate is three things. First, the **ticket's repro steps are stale** — the "+Add file"/"Select file" control it describes no longer exists (`src/components/form/File/File.tsx` is dead code, replaced by a dropzone), so the implementer must retarget the fix and document the deviation rather than follow the ticket literally. Second, the two flows use **different state mechanisms** (react-hook-form `Controller` for files; parent-owned `useState` for MCP env vars), so there is no single clean hook insertion point. Third, `RecordInput` has **two mount/reset-time auto-seed effects** (`:61-65`, `:74`) that will produce spurious announcements unless the trigger is written carefully — this is the single most likely source of a subtly wrong first implementation. There is also a real **architectural decision** to make: the accessibility guide mandates inline JSX live regions, and precedent EPMCDME-8527 explicitly deleted a shared imperative announcer as over-engineering, yet three independent repeaters share this defect. Choosing between duplication and a first shared primitive needs an explicit, justified call in the plan.

**Test coverage posture and risk.** Coverage on the affected surface is **effectively zero**: `FileList.tsx`, `FileListItem.tsx`, and `IndexTypeFile.tsx` have no test files; `RecordInput`'s `addEmptyItem`/`removeItem` are entirely untested and its test file contains no `userEvent` usage at all; the datasource integration test never exercises the File type. The suite has **no `aria-live` assertion anywhere** and no axe tooling, and precedent forbids introducing `jest-axe` — so this change establishes the repo's first live-region test idiom using plain RTL role assertions. Lint offers no safety net (`plugin:jsx-a11y/recommended` is not extended; only `no-redundant-roles` is active) and there is no CI a11y gate. Net: **low-to-moderate complexity — small, well-understood diff, but elevated by the stale-ticket retarget, the scope decision across three repeaters, the auto-seed announcement trap, and the absence of any existing test or lint coverage on the touched files.** Scoring should sit above a pure labelling fix like EPMCDME-8433 and roughly at or slightly above the EPMCDME-8550 textarea/dropzone a11y task.
