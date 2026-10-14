status: DONE
task_id: task-3
commit: 029a6dafc
changed_paths:
- src/pages/settings/administration/components/MCPCopyValuesDialog/index.tsx
- src/pages/settings/administration/components/MCPCopyValuesDialog/useMCPCopyValuesDialog.ts
- src/pages/settings/administration/components/MCPCopyValuesDialog/__tests__/MCPCopyValuesDialog.test.tsx
test_command: npx vitest run --project unit src/pages/settings/administration/components/MCPCopyValuesDialog/__tests__/MCPCopyValuesDialog.test.tsx
notes: |
  Exported from useMCPCopyValuesDialog.ts: `collectCopyValuePaths(server: MCPConfig | null)`,
  `isSensitiveKey(path: string)`, and `useMCPCopyValuesDialog(server: MCPConfig | null)` returning
  `{ sections, checked, toggleKey, toggleSection, reset }` (`checked` is a `Set<string>`).
  Default export from index.tsx is `MCPCopyValuesDialog` with props
  `{ visible, server, onHide, onConfirm }` where `onConfirm: (copyValues: string[]) => void`.
  Task 5 should render `<MCPCopyValuesDialog visible={Boolean(cloneDialogServer)} server={cloneDialogServer} onHide={...} onConfirm={(copyValues) => mcpStore.cloneConfig(server.id, copyValues)} />`
  (confirm exact cloneConfig signature against src/store/mcp.ts, which this task did not touch).
  The dialog tolerates `server === null` — `collectCopyValuePaths` returns `[]`, so the body renders
  no sections; `Popup`'s own `visible` prop still gates showing it.
  Test suite: 3 tests pass (collectCopyValuePaths: full sections in order, empty-section omission,
  null/empty-config -> []). `npm run typecheck` exits 0. Pre-commit hook ran lint-staged,
  license-headers:check, secrets:check, and sonar-local (skipped via `SONAR_TOKEN=` since
  SONAR_TOKEN was unset) — no full test-suite step is wired into this repo's pre-commit hook.
