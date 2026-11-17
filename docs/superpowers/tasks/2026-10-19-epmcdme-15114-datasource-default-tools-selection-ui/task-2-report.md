DONE

## Summary

Implemented Task 2 of the "Datasource Default Tools Selection (UI)" plan: the pure utility
module that derives default-tool checked state and finds standard/"with filtering" exclusive
pairs.

## Files created

- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/utils/defaultDatasourceTools.ts`
- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/utils/__tests__/defaultDatasourceTools.test.ts`

No other files were modified.

## Exported API

- `DEFAULT_TOOL_NAME` — `{ CODE_TREE: 'get_repository_file_tree', SEARCH_CODE: 'search_code_repo', SEARCH_KB: 'search_kb' } as const`
- `isDefaultToolName(name: string): boolean`
- `getContextTypeForDefaultTool(name: string): ContextType | undefined`
- `hasContextOfType(context: AssistantContext[] | undefined, type: ContextType): boolean`
- `isDefaultToolActive(name, context, deselectedDefaultTools): boolean`
- `findExclusivePairTool(toolkit: AssistantToolkit, tool: Tool): Tool | undefined`

Types (`ContextType`, `AssistantContext`, `AssistantToolkit`, `Tool`) were confirmed in
`src/types/entity/assistant.ts` (lines 226-263) and imported from `@/types/entity/assistant`,
matching the repo's path-alias convention.

## TDD flow followed

1. Wrote the test file exactly as specified in the task (types already matched the real
   shapes, no adjustment needed).
2. Ran the test — it failed with `Error: Failed to resolve import "../defaultDatasourceTools"`
   (module did not exist yet), confirming RED for the right reason.
3. Implemented `defaultDatasourceTools.ts`.
4. Re-ran — all 8 tests passed (GREEN).
5. `git commit` triggered the pre-commit hook (prettier, eslint --fix, license-header check,
   tsc --noEmit, secrets scan). `eslint --fix` initially failed on two `consistent-return`
   violations (functions mixing `return undefined` with value-returning branches in
   `getContextTypeForDefaultTool` and `findExclusivePairTool`); refactored both to a
   single-return-statement style, eslint then passed cleanly, and the hook additionally
   auto-prepended the repo's standard Apache license header to the new source file (not the
   test file, per the hook's own glob config).
6. Re-ran the test command once more after the hook's edits to confirm behavior was unchanged.

## Test command and result

```
npx vitest run --project unit src/utils/__tests__/defaultDatasourceTools.test.ts
```

Final run: `EXIT=0`

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Commit

- SHA: `cacb0cd123f5f1ad1dd4779090bd4c32d532dcfa`
- Message: `EPMCDME-15114: Add default-tool derivation/pairing utility module`
- `git show --stat HEAD` confirms exactly two files changed:
  - `src/utils/__tests__/defaultDatasourceTools.test.ts` (96 insertions)
  - `src/utils/defaultDatasourceTools.ts` (83 insertions, includes the auto-added license header)

No push, no PR/MR opened, no branch switch — work stayed on
`EPMCDME-15114-show-deselect-default-datasource-tools`.
