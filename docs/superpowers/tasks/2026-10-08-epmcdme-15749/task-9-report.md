DONE

Path taken: Path 1 (preferred). A bare render of the real `AssistantForm` succeeded on the first
attempt once mocks were pathed correctly relative to the test file's own directory (test lives in
`AssistantForm/__tests__/`, so sibling-module mocks needed `../components/...`, not `./components/...`).
No fallback to Path 2 was needed — all heavy child sections (`AssistantSetupSection`,
`InteractiveFeaturesAccordion`, `ToolsConfiguration`, `ContextSelector`, `AssistantSelector`,
`GuardrailAssignmentPanel`, `SkillSelector`, `HedgingConfigField`, `RefineWithAIPromptPopup`,
`RefineAssistantModal`, `MissingIntegrationsModal`) were stubbed to `() => null`, and `@/store`,
`@/store/providers`, `@/utils/toaster`, and `useMissingIntegrationsModal` were mocked. The real
`handleFormSubmit` closure (via `handleSubmit` from react-hook-form) is exercised unmocked.

One wrinkle: react-hook-form's `yupResolver` blocks the submit callback entirely when required
fields (`project`, `name`, `description`, `system_prompt`) are empty — and since the field-rendering
sections are mocked out, there's no input to type into. Fixed by passing a minimal `assistant` prop
with those four fields populated, which seeds `defaultValues` (already how the component wires them)
without touching any mocked UI. This satisfies validation so the real submit path executes.

The task's suggested per-input "value not cleared" assertion was dropped since no form inputs are
reachable with everything but the chrome mocked — not needed per the task's own fallback bar
("sufficient" is just verifying the inline error appears and the toast still fires).

Commit: 22832a268 — "EPMCDME-15749: Surface backend rejection message inline in AssistantForm"

Changed files (exactly these two, confirmed via `git show --stat HEAD`):
- src/pages/assistants/components/AssistantForm/AssistantForm.tsx (+5 lines: new `formSubmitError`
  state, reset + set in `handleFormSubmit`, new inline `<p>` as first child of `<form>`)
- src/pages/assistants/components/AssistantForm/__tests__/AssistantForm.test.tsx (new file, 154
  lines)

Test command:
`npx vitest run --project unit src/pages/assistants/components/AssistantForm/__tests__/AssistantForm.test.tsx`

EXIT=0, 3/3 tests passed:
- "renders the form" (bare render sanity check)
- "shows the backend rejection message inline and still toasts it on submit failure" — asserts
  the exact backend error text renders inline AND `toaster.error` was called with it
- "does not show an inline error before any submit attempt"

RED was proven first: ran the same test file against the pre-fix code (`git diff` showed no
production change yet) — the inline-error test failed with
`TestingLibraryElementError: Unable to find an element with the text: Personal integrations cannot
be used in a shared assistant.` while the other two tests passed, confirming the test fails for the
expected reason (no `formSubmitError` state existed) and not a setup error.

Also verified: `npm run typecheck` EXIT=0; `npx eslint <both files> --max-warnings 0` EXIT=0. The
project's pre-commit hook (lint, typecheck, license headers, secrets scan) ran clean during commit.

Toast behavior preserved exactly as instructed: `toaster.error(result.error)` was not removed; the
new `setFormSubmitError(result.error)` call sits alongside it.
