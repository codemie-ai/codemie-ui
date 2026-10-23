DONE

Commit: 0bab40dce

Changed paths:
- src/types/entity/mcp.ts
- src/store/mcp.ts
- src/store/__tests__/mcp.test.ts

Test command:
npx vitest run --project unit src/store/__tests__/mcp.test.ts
(RED seen first: "mcpStore.testConfig is not a function"; GREEN 5/5.) `npx tsc --noEmit` clean.

Interface for later tasks:
- MCPConfig gains optional nullable: last_test_at?: string|null, last_test_status?: 'success'|'failure'|'warning'|null, last_test_message?: string|null, last_test_error_category?: string|null, last_test_tools_count?: number|null.
- `mcpStore.testConfig(id: string): Promise<MCPConfig>` - POST `v1/mcp-configs/${id}/test` (no body), merges result into `mcpStore.configs[]` (by id) and catalogCache. A second call for an id in flight returns the same promise (one request).
- In-flight state: `mcpStore.testingConfigIds: string[]` (valtio). In components: `const { testingConfigIds } = useSnapshot(mcpStore); testingConfigIds.includes(id)`.
- Errors: rethrown untouched (the api layer throws a `Response`). Auth-required detection as in MCPToolkitTest: pass the error to `useMCPAuthPrompt().handleAuthRequiredError(error)`, else `error instanceof Response` and header `x-user-mcp-auth-location`. testConfig does NOT set `mcpStore.error`/`loading`; callers toast.

Concerns: none. First commit attempt failed on eslint in the test (no-return-assign); fixed, single commit resulted.
