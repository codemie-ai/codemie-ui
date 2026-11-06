DONE

## Commit
- Short SHA: `1d97f4f08`
- Subject: EPMCDME-15749: Skip duplicate error toast on share/remove failure

## Changed Files
- `src/store/assistants.ts` — added `{ skipErrorHandling: true }` to `shareWith` and `removeShare` API calls
- `src/store/__tests__/assistants.test.ts` — updated and extended tests to verify the flag is passed

## Test Command
```bash
npx vitest run --project unit src/store/__tests__/assistants.test.ts
```

## Test Result
EXIT=0
- Test Files: 1 passed
- Tests: 32 passed (including 2 new tests verifying `skipErrorHandling: true`)

## Test File Selection
Chose `src/store/__tests__/assistants.test.ts` because:
1. It already contains test cases for `shareWith` and `removeShare`
2. It establishes the mocking pattern: `vi.mock('@/utils/api')` with `mockPost` and `mockDelete` functions
3. The test file already follows the convention of asserting call arguments match the expected API signature
4. Adding tests here keeps the store unit logic centralized and isolated from the popup's catch behavior

The new tests directly verify that `api.post` and `api.delete` are called with `{ skipErrorHandling: true }` as the third argument, ensuring the duplicate error toast bug is fixed at the API layer, not just masked in one UI component.
