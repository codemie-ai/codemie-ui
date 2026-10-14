status: DONE
task_id: task-5
commit: 4cb57f32a
changed_paths:
- src/pages/settings/administration/components/MCPServerActions.tsx
- src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
- src/pages/settings/administration/utils/columnRenderers.tsx
- src/pages/settings/administration/hooks/useMCPManagement.ts
- src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts
- src/pages/settings/administration/MCPManagementPage.tsx
test_command: npx vitest run --project unit src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts
notes: >
  This single commit (4cb57f32a) resolves BOTH task-4 and task-5 of the plan — ledger both
  task ids against it. Task 4's MCPServerActions.tsx/test changes (Clone menu entry gated by
  canClone/cloning props) were already staged but blocked by the whole-project tsc pre-commit
  hook because columnRenderers.tsx didn't pass the new props; this commit wires those props
  through, so both land together.

  TDD: wrote src/pages/settings/administration/hooks/__tests__/useMCPManagement.test.ts first
  (4 cases per spec), confirmed RED (`handleCloneServer is not a function`), implemented the
  hook changes, confirmed GREEN (4/4). Full `src/pages/settings/administration` unit suite:
  34 files / 263 tests passed. `npm run typecheck` exits 0.

  For Task 6: `strippedFields` (string[], reset to [] in `handleModalClose`) and `editingServer`/
  `showModal` are the three pieces of state that `runClone`'s success path sets after a clone
  (direct or via dialog) — `editingServer` becomes the MCPConfigCloneResponse so a consumer
  (e.g. MCPServerModal) can read `stripped_fields` off it directly, or use the hook's own
  `strippedFields` return value, whichever the modal/banner wiring prefers. `handleModalClose`
  is the single place both `showModal`/`editingServer`/`strippedFields` get cleared — extend
  there, not elsewhere, to avoid leaking clone state into the next modal open.

  Pre-commit note: first commit attempt failed lint-staged's `eslint --fix` on a `no-void`
  rule (`void runClone(...)`) in the direct-clone path; fixed by replacing it with
  `runClone(server, undefined).catch((error) => console.error(...))` — runClone already
  owns its own try/catch/finally for cloningId and toaster.error, so this outer catch is
  just a defensive no-op. Re-ran the gate; it passed (sonar-local skipped via
  `SONAR_TOKEN=`, as expected — no network in this sandbox).
