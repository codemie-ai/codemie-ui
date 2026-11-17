DONE

## Commit
`fec594b4dd9ede682e83b295bf76b5980ee492f7` — "EPMCDME-15114: Wire deselected_default_tools through AssistantForm"

## Files changed/created
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (modified)
- `src/pages/assistants/__tests__/AssistantForm.defaultTools.integration.test.tsx` (created)

## Changes made to AssistantForm.tsx
1. Added `const [deselectedDefaultTools, setDeselectedDefaultTools] = useState<string[]>(assistant?.deselected_default_tools ?? [])` next to the `toolkits` state.
2. Added `handleDeselectedDefaultToolsChange` callback next to `handleToolkitsChange`.
3. Added `deselected_default_tools: deselectedDefaultTools` to the `preparedValues` object literal in `prepareFormData()`.
4. Added `context={watch('context') as AssistantContext[]}`, `deselectedDefaultTools={deselectedDefaultTools}`, `onDeselectedDefaultToolsChange={handleDeselectedDefaultToolsChange}` to the `<ToolsConfiguration>` element.

## Test command and result
`npx vitest run --project integration src/pages/assistants/__tests__/AssistantForm.defaultTools.integration.test.tsx`
EXIT=0
`Test Files  1 passed (1)` / `Tests  2 passed (2)`

Confirmed TDD red state first: before the AssistantForm.tsx edits, the same command failed with `EXIT=1`, timing out on `expect(checkbox).toBeChecked()` (the default-tool checkbox rendered unchecked because `context`/`deselectedDefaultTools` weren't passed through yet).

Also ran `npx tsc --noEmit` — EXIT=0, no type errors.

## What each test asserts
1. `renders the default tool checked, unchecks it, and saves deselected_default_tools in the PUT payload` — mocks a GET assistant with a CODE context and a catalog (`v1/assistants/tools`) containing toolkit `codebase` with tool `get_repository_file_tree` (label "Get Repo Tree"); asserts the checkbox renders checked on load (context present, nothing deselected), unchecks it via user click, clicks Save, and asserts `global.fetch` was called for the PUT to `v1/assistants/asst-123` with a body containing `"deselected_default_tools":["get_repository_file_tree"]`. This is the save-payload-inclusion behavior.
2. `keeps the unchecked default tool unchecked after a failed save and surfaces the backend error` — same setup, but the PUT mock returns a 400 with `{ error: { message: 'Unknown deselected default tools detected: bogus_tool' } }` (the `ErrorBody` shape `api.ts`'s `formatErrorMessage`/`handleError` actually consumes — traced via `src/utils/api.ts`'s `makeRequest`, which calls `toaster.error(formatErrorMessage(errorData))` on a non-ok response before `assistantsStore.updateAssistant`'s own catch block runs). Asserts the exact error text was passed to the mocked `toaster.error` (from `vi.mock('@/utils/toaster', ...)` in `setupTests.tsx`), and that the checkbox the author unchecked is still unchecked afterward — i.e. the failed save did not reset local `deselectedDefaultTools` state. This is the error-path state-retention behavior.

## Notes
- Used the real integration harness (`renderPage`/`mockAPI` from `src/test-utils/integration.tsx`, global `fetch` mock from `src/setupTests.tsx`), following `EditAssistantPage.integration.test.tsx`'s pattern exactly (same fixture shape, same router-param beforeEach/afterEach boilerplate).
- Traced the save-error path through `src/store/assistants.ts` (`updateAssistant`) and `src/utils/api.ts` (`makeRequest`/`formatErrorMessage`) to pick a mocked error-body shape (`{ error: { message } }`) that the app's actual toast mechanism formats correctly — the plan's literal example shape `{ error: 'string' }` would have produced `toaster.error(undefined)` given `formatErrorMessage`'s destructuring of `body.error`, so the test error body was adapted to the `ErrorBody` interface already used throughout `api.ts` while keeping the same message text.
- No changes were made to `ToolsConfiguration.tsx`, `Toolkit.tsx`, `VirtualAssistantForm.tsx`, or any store file — confirmed only the two intended files are in the commit (`git show --stat HEAD`).
