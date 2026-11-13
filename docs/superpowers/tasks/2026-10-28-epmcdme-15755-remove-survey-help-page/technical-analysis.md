# Technical Research

**Task**: help page share-experience survey
**Generated**: 2026-10-28T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15755: Remove the Survey subsection and its link from the Share experience section on the CodeMie platform Help page. Acceptance criteria: (1) Survey subsection not displayed under Share experience, (2) its link not displayed/accessible, (3) Share experience section itself remains (only the Survey item is removed).

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/help/HelpPage.tsx` — the Help page. Builds a `sections` array of `HelpSectionType`
  objects in a `useEffect`, including the `Share experience` section (line 213-218), which is only
  pushed `if (shareItems.length)`. `shareItems` is populated by:
  - `addAssistantItem(shareItems, FEEDBACK_ASSISTANT_SLUG)` when
    `isCustomerConfigItemEnabled(CONFIG_FEEDBACK_ASST_KEY)` is true (line 106-108) — this is the
    Feedback Assistant item, unrelated to Survey, and must remain.
  - The Survey item block (lines 109-120):
    ```ts
    const surveyUrl = getConfigItemSettings(configs, CONFIG_USER_SURVEY_KEY)?.url
    if (surveyUrl) {
      shareItems.push({
        name: 'Survey',
        description: 'Fill out a survey to share your experience using CodeMie.',
        type: 'link',
        icon: SheetSvg,
        link: surveyUrl,
        isExternal: true,
        buttonText: 'Open Survey',
      })
    }
    ```
    This is the entire Survey subsection/link to remove.
- `src/constants/common.ts:44` — `export const CONFIG_USER_SURVEY_KEY = 'userSurvey'`. Only
  consumer is `HelpPage.tsx`. No other file references this constant.
- `src/pages/help/components/HelpItem.tsx` — generic renderer for any `HelpItemType` (name,
  description, link, icon, button). Renders Survey today purely because it's in `shareItems`;
  no Survey-specific code exists here.
- `src/pages/help/components/HelpSection.tsx` — renders a `HelpSectionType` (title, description,
  items list) as a group of `HelpItem`s. No Survey-specific code.

### Architecture and Layers Affected

- **Page/component layer only**: `src/pages/help/HelpPage.tsx`. No router, store, service, or API
  layer involvement — the Survey URL and enablement come from runtime config
  (`appInfoStore.configs`, read via `getConfigItemSettings`), not from a dedicated API call made by
  this feature.
- `SheetSvg` (`@/assets/icons/sheet.svg?react`) is imported once and used for **both** the Survey
  item (line 115) and the `userGuide` Learning Resources item (line 124 config map), so the import
  must stay even after the Survey block is deleted.

### Integration Points

- `CONFIG_USER_SURVEY_KEY` ('userSurvey') is read from `appInfoStore.configs`, a runtime/customer
  configuration array (`ConfigItem[]`), via `getConfigItemSettings` (`src/utils/settings.ts:196`).
  Whatever backend/admin mechanism populates this `userSurvey` config entry is out of scope for a
  UI-only removal — no other UI surface references `CONFIG_USER_SURVEY_KEY` or a `userSurvey`
  config id.
- No router entry, no dedicated component, no feature flag gate beyond `surveyUrl` presence.

### Patterns and Conventions

- Each Help section's items are built conditionally and pushed to `finalSections` only when
  non-empty (see the `Share experience` push guarded by `if (shareItems.length)`, and similarly
  `Platform Policies` is always pushed even when `policyItems` is empty — inconsistent across
  sections, but `Share experience` specifically follows the guard pattern). Removing the Survey
  block leaves the existing `if (shareItems.length)` guard intact and correct: if Feedback
  Assistant is also disabled, the whole section still correctly disappears, matching current
  behavior.
- `HelpItemType` items are plain objects pushed into arrays, not components — removal is a matter
  of deleting the `if (surveyUrl) { shareItems.push(...) }` block and its now-unused imports.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` entry specific to the Help page; general guidance applies from
`.ai-run/guides/components/component-patterns.md` and
`.ai-run/guides/patterns/state-management.md` (useEffect-built derived state via Valtio
`useSnapshot`), but neither mentions Survey/Share experience specifically.

### Architectural Decisions

- `src/configs/releaseNotes.json:5845` records the historical addition: `"Update Help Center: Add
  'Share experience' section"` (ticket EPMCDME-9629). This confirms Share experience and Survey
  were added together but the section itself is intended to persist for Feedback Assistant and any
  future items, consistent with the current ticket's AC #3.

### Derived Conventions

- Conditional item-array + guarded section push is the established convention for Help page
  sections (see `shareItems`, `policyItems`, `learningResourcesItems` all following the same
  shape).

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/help/__tests__/HelpPage.test.tsx` — comprehensive page-level test suite covering AI
  Help, Learning Resources, Product Updates, Platform Policies sections, and overall section
  ordering. **No test currently exercises `Share experience`, `Survey`, `Feedback Assistant`
  presence, or `CONFIG_USER_SURVEY_KEY`/`CONFIG_FEEDBACK_ASST_KEY`** — the mocked `configs` array in
  this file only includes `feedbackAssistant`, `userGuide`, `videoPortal`, `youtubeChannel`; it
  does not include a `userSurvey` config entry, and no assertion checks for a "Survey" or "Share
  experience" string. The `vi.mock('@/utils/settings', ...)` override replicates
  `getConfigItemSettings`/`isConfigItemEnabled` generically, so adding a `userSurvey` config entry
  to the mock would exercise the real code path.
- No other test file references "Survey" or "Share experience".

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`/`integration`, see `vite.config.ts`). This
file uses `vi.hoisted`, `vi.mock('valtio', ...)` to stub `useSnapshot`, module-level mocks for
`@/store`, `@/store/appInfo`, `@/utils/settings`, `@/constants/assistants`, `@/constants/common`.
Assertions use `screen.getByText` / `screen.queryByText` / `screen.getByRole`.

### Coverage Gaps

- No existing test asserts the Share experience section or Survey item renders/does not render —
  this is a pre-existing gap, not one introduced by this change. Any new/updated test for this
  ticket needs to add a `userSurvey` config entry to the test's mocked `configs` (or assert its
  absence) to cover the removal meaningfully.

---

## 5. Configuration and Environment

### Environment Variables

None. `CONFIG_USER_SURVEY_KEY` is a runtime customer-config id (`appInfoStore.configs`), not an
env var (`import.meta.env.VITE_*` / `window._env_`).

### Configuration Files

- Runtime config comes from the `appInfoStore` (`src/store/appInfo.ts`), populated from
  backend-provided `configs` (`ConfigItem[]`), not from a static JSON/YAML file in this repo.
  No `.env.example` or `config.js` reference to "survey" found.

### Feature Flags and Deployment Concerns

- The Survey item's visibility is effectively a soft "feature flag" via config:
  `isConfigItemEnabled`/`getConfigItemSettings(configs, 'userSurvey')?.url` truthiness. Removing
  the UI code does not remove the backend `userSurvey` config entry — it simply stops the frontend
  from rendering it, satisfying all three stated acceptance criteria without any backend change.

---

## 6. Risk Indicators

- Low risk, narrow change: deletion is confined to `src/pages/help/HelpPage.tsx` (lines 109-120)
  plus the now-unused `CONFIG_USER_SURVEY_KEY` import (line 33). `SheetSvg` import must be kept —
  it is shared with the `userGuide` Learning Resources item.
- No existing test covers "Share experience" or "Survey" today, so the PR should add test coverage
  confirming: Feedback Assistant alone still renders "Share experience" with the Survey item
  absent, and the section disappears entirely when Feedback Assistant is also disabled (exercising
  the existing `if (shareItems.length)` guard) — this is implementation detail for spec/plan, not
  a Section 2/5 fact.
- Speculative: `CONFIG_USER_SURVEY_KEY` in `src/constants/common.ts` could be deleted as dead code
  since `HelpPage.tsx` is its only consumer, but this is a design decision for the implementer, not
  confirmed by research — leaving it in place (unused) would also satisfy the acceptance criteria
  and is lower-risk if any other undiscovered reference exists.

---

## 7. Summary for Complexity Assessment

This is a small, single-file, presentation-layer-only change confined to
`src/pages/help/HelpPage.tsx`: delete the `surveyUrl`/Survey `shareItems.push` block (lines
109-120) and its now-dangling `CONFIG_USER_SURVEY_KEY` import, while leaving the `Share experience`
section's existing conditional push (`if (shareItems.length)`) and the Feedback Assistant item
untouched. No router, store, API, or backend config schema changes are implicated — the `userSurvey`
config id itself can remain defined and simply becomes unused by the frontend.

Technical novelty is minimal: this follows the exact same "conditionally push a `HelpItemType` into
an items array" pattern used throughout the file for other sections, so no new pattern needs to be
introduced. The main risk is test coverage: no existing test in
`src/pages/help/__tests__/HelpPage.test.tsx` currently asserts anything about `Share experience` or
`Survey`, so verifying the acceptance criteria will require adding net-new test cases (mocking a
`userSurvey` config entry) rather than updating existing assertions. Overall this should score as a
very small / low-complexity change.

---

## 8. External References

None named by the task.
