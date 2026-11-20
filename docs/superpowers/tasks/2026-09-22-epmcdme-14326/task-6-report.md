DONE

Commit: 0f36505bbefd28153573b7ff6086e2f83a8430d2

Changed files:
- src/pages/settings/administration/ActivityEventsPage.tsx
- src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx

Test command used to prove GREEN (also confirms pre-existing tests still pass):
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx > docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log 2>&1; echo "EXIT=$?"; tail -60 docs/superpowers/tasks/2026-09-22-epmcdme-14326/test.local.log

Result: EXIT=0, "Test Files 1 passed (1)", "Tests 8 passed (8)" — the 7 pre-existing
computeFilteredOptions/revalidateSelections tests plus the 1 new migration test all pass.

TDD sequence observed:
1. RED: added the new describe block + required mocks (valtio useSnapshot passthrough,
   react-router useNavigate, SettingsLayout, @/store/user, @/store/activityEvents) to the
   existing test file, ran the command above, observed EXIT=1 with
   "Tests 1 failed | 7 passed (8)" — failure was `findByRole('button', { name: /expand/i })`
   timing out because no expand affordance existed yet (old Popup/AttributesCell path was
   still in place). Correct failure reason confirmed before touching production code.
2. GREEN: migrated ActivityEventsPage.tsx — removed Popup import, AttributesCell,
   makeAttributesRenderer, DetailRow, the `selectedEvent` state and its Popup JSX block, and
   the `attributes`/"Details" column from columnDefinitions; added `expandedRowIds` state and
   `toggleExpand` handler; wired `expandedRowIds`/`onToggleExpand`/`renderExpandedRow` into the
   existing <Table>; replaced renderEntity/renderActor bodies with
   getEventTargetLabel/getEventActorLabel from @/utils/activityEventPresentation via a small
   `toPresentable` adapter (ActivityEvent's `entity_type`/`entity_id`/`actor_name`/`actor_email`
   are `string | null`, while PresentableActivityEvent expects `string | undefined`, so a
   structural adapter was needed to satisfy strict TypeScript — this was the one discrepancy
   from the task's literal prompt, which suggested passing `item` directly).
   Re-ran the same test command: EXIT=0, 8/8 passing.
3. Verified `npx tsc --noEmit -p tsconfig.json` has no errors for either file, and
   `npx eslint` on both files reports no errors/warnings from the rule set itself.

Notes / discrepancies from the task prompt:
- The prompt's test snippet used the shorthand `render(<ActivityEventsPage />)` with static
  imports; I kept the static import of ActivityEventsPage (import is hoisted after vi.mock
  calls per Vitest semantics, so mocks still apply).
- getEventTargetLabel/getEventActorLabel/getEventAttributeRows require the
  `PresentableActivityEvent` shape (optional string fields), but `ActivityEvent`'s corresponding
  fields are typed `string | null`. Added a local `toPresentable()` mapping function in
  ActivityEventsPage.tsx (nulls -> undefined) rather than modifying
  activityEventPresentation.tsx or activityEvent.ts types, since both are out of scope for this
  task.
- Removed the `attributes`/"Details" column from `columnDefinitions` as instructed, since
  attribute details now render only in the expanded row, not a table cell.
- Did not touch activityEventsStore.ts, activityEventsFilters.ts, or activityEventPresentation.tsx.

git show --stat HEAD confirms exactly these two files changed (2 files changed, 128
insertions(+), 136 deletions(-)); pre-commit hooks (prettier, eslint --fix, license headers,
gitleaks secrets scan, tsc --noEmit) all passed during commit.
