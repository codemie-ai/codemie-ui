DONE
commit: 2a204f612
paths:
src/utils/workflowWarnings.ts
src/utils/__tests__/workflowWarnings.test.ts
test_command: npx vitest run --project unit src/utils/__tests__/workflowWarnings.test.ts
Outcome: RED seen (4 new tests failed for expected reasons), then GREEN 13/13. Wider run `npx vitest run --project unit src/utils src/pages/workflows src/store`: 264 files, 3413 tests passed, EXIT=0. `npm run typecheck` EXIT=0. Pre-commit hook passed.

Changes:
- notifyAboutWarnings filters contract_validation entries (isContractWarning) right after normalizeWarnings, so they reach neither the per-kind toasts nor the unknown toast.
- Integration toast matches both script_step_owner_integration and tool_access_owner_integration (shared OWNER_INTEGRATION_KINDS list), same message; both kinds group into one toast. The unknown filter excludes both.
- normalizeWarnings unchanged (contract entries carry a kind, so they pass through untouched; covered by a test). consumer_slot toast and formatWarning unchanged.

Concerns: none. Note: the earlier vitest run showed a "Timeout terminating forks worker" message for useContractCheck.test.ts (worker teardown only; the test passed).
