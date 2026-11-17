DONE

Commit: 1d911c0f5
Files changed: src/pages/assistants/components/AssistantForm/AssistantForm.tsx, src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx
Test command: npx vitest run --project integration src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx
Test result: EXIT=1. Test Files 1 failed (1); Tests 1 failed | 62 passed (63). The single red test is the new
`it('includes effort in POST body for an effort-capable model', ...)` case — it fails at
`screen.getByTestId('assistant-effort-select')` with "Unable to find an element by: [data-testid="assistant-effort-select"]",
i.e. the Effort input element genuinely does not exist yet. This is expected and correct: it is reserved for
Task 6 (AssistantSetupSection.tsx), which has not landed. Confirmed this is the SAME failure reason both before
and after my three implementation edits (schema/defaults/coercion) — the edits do not change why it fails,
only make the plumbing ready for the eventual UI. All 61 pre-existing tests in the file still pass (including
every temperature-related test), plus the new regression-guard test
`it('omits effort from POST body for a model without effort levels', ...)` passes (62 passed total = 61 pre-existing + 1 new passing).
`npm run typecheck` also passes clean (tsc --noEmit, exit 0).

Effort test-id used: assistant-effort-select (data-testid="assistant-effort-select"); the interaction pattern
in the test clicks the element to open it, then clicks `screen.getByRole('option', { name: 'high' })` — mirrors
a PrimeReact-Dropdown-style control. Task 6 should wire this exact testid to its Effort `<Dropdown>` (or
equivalent) so this test closes without further changes to the test file.

Notes: Pre-commit hook ran lint, typecheck, license-header check, secrets scan (gitleaks) and sonar-local —
none of these execute vitest, so the known-red integration test did not block the commit; no hook friction
encountered. Did not touch ModelOption, effortConstraints.ts, or any assistant entity/DTO types per instructions
(those belong to Tasks 1-3, already committed). The new "omits effort" test is a true regression guard — it
would also have passed before my implementation edits (nothing could set effort either way), so it was not
required to be red, consistent with the task spec.
