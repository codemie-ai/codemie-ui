# Plan: Remove Survey from Share Experience (EPMCDME-15755)

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] The Survey subsection is not displayed under Share experience.
- [ ] The Survey link is not displayed or accessible from that section.
- [ ] The Share experience section remains available when at least one of its other items
      (Feedback Assistant) is enabled — only the Survey item is removed, not the whole section.

## Negative constraints

- "only the Survey item is removed, not the whole section" — Task 1 deletes solely the
  `surveyUrl`/Survey `shareItems.push` block; the `if (shareItems.length)` guard and the Feedback
  Assistant push (`addAssistantItem(shareItems, FEEDBACK_ASSISTANT_SLUG)`) are left byte-identical.
  No task touches `CONFIG_FEEDBACK_ASST_KEY` or the Feedback Assistant item.
- Implicit "don't touch the backend `userSurvey` config entry" — no task edits
  `src/constants/common.ts` or any backend/config schema; `CONFIG_USER_SURVEY_KEY` stays defined
  but unused, per the confirmed assumption.
- Implicit "don't break the shared `SheetSvg` icon" — Task 1 removes only the Survey push block,
  not the `SheetSvg` import, since it is also used by the Learning Resources `userGuide` item.

## Task 1 — Remove the Survey item from HelpPage

**Test-first: no — removing dead code that no current test exercises; the new coverage below is
added in the same commit to lock in both the removal and the untouched guard behavior, but no
test fails against the pre-change code (today's mocked configs already omit `userSurvey`), so
there is no genuine red step to run first.**

1. In `src/pages/help/HelpPage.tsx:30-34`, remove `CONFIG_USER_SURVEY_KEY` from the
   `@/constants/common` import, keeping `CONFIG_FEEDBACK_ASST_KEY` and
   `ADDITIONAL_USER_MATERIALS`.
2. In `src/pages/help/HelpPage.tsx` (the Survey block immediately following the Feedback
   Assistant push, originally lines ~109-120), delete the entire
   `const surveyUrl = getConfigItemSettings(configs, CONFIG_USER_SURVEY_KEY)?.url` statement and
   its `if (surveyUrl) { shareItems.push({...}) }` block. Leave everything else in that `useEffect`
   — the Feedback Assistant push above it and the `if (shareItems.length)`-guarded
   `Share experience` section push below it (~lines 213-218) — untouched.
3. Leave the `SheetSvg` import and the `userGuide` Learning Resources item as-is; do not touch
   `src/constants/common.ts`.
4. In `src/pages/help/__tests__/HelpPage.test.tsx`, add a `describe('Share experience section', ...)`
   block with two tests:
   - renders "Share experience" with "Feedback Assistant" present and "Survey" /
     "Open Survey" absent, using the existing default mocked configs (no changes needed — they
     already have `feedbackAssistant: { enabled: true }` and no `userSurvey` entry).
   - sets `feedbackAssistant.settings.enabled` to `false` via a `mockAppInfoStore.configs` override
     (same pattern as the existing "does not display feedback assistant when disabled" test) and
     asserts `screen.queryByText('Share experience')` is not in the document.
