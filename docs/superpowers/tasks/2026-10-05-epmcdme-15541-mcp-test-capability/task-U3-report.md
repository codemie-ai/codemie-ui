DONE

Commit: e2a8acd18

Changed paths (src/pages/settings/administration/components/):
- MCPLastTestInfo.tsx (new)
- __tests__/MCPLastTestInfo.test.tsx (new)
- MCPServerModal/index.tsx (Test button + info under Configuration JSON)
- MCPServerModal/__tests__/MCPServerModal.test.tsx (new)

Test command:
npx vitest run --project unit src/pages/settings/administration/components/MCPServerModal/__tests__ src/pages/settings/administration/components/__tests__/MCPLastTestInfo.test.tsx
RED seen first for both (button missing / module missing). GREEN: all 35 files / 282 tests in src/pages/settings/administration pass; `npx tsc --noEmit` clean.

Exports of MCPLastTestInfo.tsx (for U4/U5):
- default `MCPLastTestInfo: React.FC<{ config: Partial<MCPLastTestFields> | null | undefined; className?: string }>`
  (pass the MCPConfig itself; shows badge + relative time with full timestamp as `title` + "N tools" + message + "Category: x"; "Never tested" with "Not tested" badge when last_test_status null)
- `MCPLastTestBadge: React.FC<{ status?: 'success'|'failure'|'warning'|null }>` (StatusBadge: Success / Failed / Warning / Not tested)
- `formatLastTestTime(iso?: string|null): string` (relative, '' if missing)
- `formatLastTestFullTime(iso?: string|null): string` (full date-time, '' if missing)
- types `MCPLastTestStatus`, `MCPLastTestFields`

Modal: inner MCPTestSection (only rendered when server.id) uses useMCPConfigTest, reads config via useSnapshot(mcpStore).configs by id, span wrapper with data-tooltip-id="react-tooltip" and data-tooltip-content when dirty; Button isLoading={isTesting}; renders {authPopups}.

Concerns:
- Modal reads config from mcpStore.configs (not catalogCache); if the edited config is absent from the list, info shows "Never tested".
- Dirty state = react-hook-form formState.isDirty.
- Integration project run for "MCPManagement" matched no files (EXIT=1, not a failure of code); no integration test was added.
