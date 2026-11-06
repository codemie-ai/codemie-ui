# Technical Research

**Task**: user management, user details, identity section
**Generated**: 2026-10-30
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16611: Show the user ID on the User Details page.

Summary: Display the user ID in the User Details view in User Management, alongside the user's name and email.

Description: Administrators reviewing a user's details need to see the user ID as well as the user's name and email. Show the ID in the identity section of the User Details view so it is available without leaving the page.

Preconditions:
- The viewer can access User Management and open a user's details.
- The selected user has a user ID available to the application.

Scenarios of Use:
1. An administrator opens User Management.
2. The administrator opens a user's details.
3. The User Details view shows the user's name, email, and ID.

Affected Areas: User Management; User Details view and identity section.

Acceptance Criteria:
- The User Details view displays the selected user's ID alongside their name and email.
- The displayed ID belongs to the user whose details are open.
- Adding the ID does not remove or alter the existing name and email information.
- The existing User Details content and interactions remain available.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx` —
  the User Details view. It is a `Popup` opened from User Management (header `"User Details"`,
  `w-[1000px]`). It fetches the selected user via `userStore.getUserById(userId)` and renders the
  identity section at lines 246–257:
  - `UserAvatar` (picture)
  - `<h3>{user.name}</h3>` — the name
  - `<DetailsCopyField readOnlyText value={user.email} notification="Email copied to clipboard" />`
    — the email, rendered as inline text with a copy button (not an input box, because
    `readOnlyText` is set).

  The component already has `user.id` available on the `UserListItem` returned from
  `getUserById` (see Data model below), and **does not currently render it anywhere in this
  popup**.

- `src/store/user.ts` (`userStore.getUserById`, line ~459) — calls `GET v1/admin/users/${userId}`
  and resolves the raw JSON as `UserListItem`. No field mapping/renaming occurs; whatever `id` the
  backend returns under the `id` key is what reaches the component.

- `src/types/entity/user.ts` — `UserListItem` (line 53) already declares `id: string` as its
  first field. This is the same `id` used elsewhere in the popup (e.g. `current.id === userId`
  checks, `SpendingCard userId={userId}`), so the identifier is already wired through the
  component's data flow — only the render is missing.

### Architecture and Layers Affected

- **View/component layer only.** This is a presentational addition inside an existing popup
  component. No store, API client, or type change is implied by what currently exists — `id` is
  already on `UserListItem` and already fetched.
- Layers involved: `src/pages/settings/administration/usersManagement/components/popups/` (the
  view), `src/components/details/` (the two presentational field components already imported into
  this view).

### Integration Points

- `UserDetailsPopup` is opened from the User Management page/table
  (`src/pages/settings/administration/UsersManagementPage.tsx` is the page that hosts User
  Management; the popup receives `userId` as a prop).
- Data comes from `userStore.getUserById`, already called in `fetchUserDetails` (lines 79–118);
  no new network call is implied.

### Patterns and Conventions

Two existing, already-imported components render labeled/unlabeled read-only fields in this exact
file and are the established pattern for this kind of addition:

- `DetailsProperty` (`src/components/details/DetailsProperty/DetailsProperty.tsx`) — renders
  `label: value` inline text, used in this same popup today for the non-admin "User Type" row
  (line 272) and used elsewhere for an entity's own id, e.g.
  `src/pages/assistants/components/RemoteAssistantDetails/components/DetailsAccordion.tsx:60` —
  `<DetailsProperty label="ID" value={skill.id} />`. This is the closest precedent for showing an
  "ID" value.
- `DetailsCopyField` (`src/components/details/DetailsCopyField/DetailsCopyField.tsx`) — used for
  the email in this same identity block (`readOnlyText` variant: text + copy button, no input
  box). It also supports a labeled, boxed variant (no `readOnlyText`) used elsewhere for
  identifier-like values, e.g.
  `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreEndpointDetailsPopup.tsx:115` —
  `<DetailsCopyField label="Agent Runtime ARN" value={details.agentRuntimeArn} />`.

Both components already guard against falsy values (`if (!value) return null` /
`if (!value && !children) return null`), consistent with how `user.email` is currently handled.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` governs component construction generally; not
  read in full detail here since the change reuses two components already imported in the target
  file rather than introducing a new one.
- No guide specifically documents the "identity section" of User Details or an ID-display
  convention; the convention is derived from code (see below).

### Architectural Decisions

- None found specific to displaying entity IDs in detail views beyond the repeated
  `DetailsProperty label="ID"` / `DetailsCopyField label="..."` pattern observed across unrelated
  detail popups (assistants, AWS AgentCore endpoints).

### Derived Conventions

- Short, non-sensitive identifiers that benefit from copy-to-clipboard use `DetailsCopyField`;
  plain inline label/value pairs use `DetailsProperty`. Given the email in this same section
  already uses `DetailsCopyField` with `readOnlyText`, a user ID (also typically copied for
  support/debugging purposes) fits the same component and visual treatment.

---

## 4. Testing Landscape

### Existing Coverage

Tests covering `UserDetailsPopup.tsx` live in
`src/pages/settings/administration/usersManagement/components/popups/__tests__/`:
`UserDetailsPopup.auditor.test.tsx`, `UserDetailsPopup.projectsGate.test.tsx`,
`UserDetailsPopup.refreshFailure.test.tsx`, `UserDetailsPopup.refreshInPlace.test.tsx`,
`UserDetailsPopup.saveDuringRefresh.test.tsx`. These exercise role-flag editing, project-table
refresh/gating, and save-during-refresh races — not the identity header.

### Testing Framework and Patterns

- Vitest + React Testing Library (`render`, `screen`, `fireEvent`, `waitFor`).
- `userStore` is mocked via `vi.hoisted` with a `mockUserStore` object; `getUserById` is a `vi.fn()`
  resolving a `makeUser(...)` fixture that already includes `id: 'target-1'` (see
  `UserDetailsPopup.refreshInPlace.test.tsx:69-80`).
- **All existing tests mock `DetailsCopyField` and `DetailsProperty` as `() => null`**
  (`vi.mock('@/components/details/DetailsCopyField', ...)`, same for `DetailsProperty`), so none
  of them assert on rendered name/email/ID content in the identity header at all.

### Coverage Gaps

- No existing test asserts that the identity header renders the name or email, let alone an ID —
  the mocks stub both candidate components to `null`. A test for a newly-displayed ID would need
  either to stop stubbing these components to `null` for this assertion, or to assert on props
  passed to the mocked component instead.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature; `UserDetailsPopup` reads no env vars or feature flags for the
identity section itself (the budget section is gated by `useBudgetManagementEnabled`, unrelated).

### Configuration Files

None relevant — this is a pure UI rendering change using data already fetched.

### Feature Flags and Deployment Concerns

None found that touch the identity header specifically.

---

## 6. Risk Indicators

- Speculative: none of the existing `UserDetailsPopup` tests assert on the identity header's
  rendered content (`DetailsCopyField`/`DetailsProperty` are stubbed to `null` in all five test
  files), so adding the ID without also adding/adjusting a test leaves the new UI unverified by
  the existing suite.
- Low integration risk: `user.id` is already present on the fetched `UserListItem` and already
  used internally in this component (e.g. `current.id === userId`), so no store, type, or API
  change is evident from the filesystem — this looks like a display-only change confined to one
  file.
- Naming choice open: the codebase uses both `DetailsProperty label="ID"` and
  `DetailsCopyField label="..."` for identifier display elsewhere; which one (and what label text,
  e.g. "ID" vs "User ID") to use for consistency with the existing email row is a decision for the
  spec, not something the filesystem dictates.

---

## 7. Summary for Complexity Assessment

This task touches a single view-layer file, `UserDetailsPopup.tsx`, in the User Management
product area. The user ID (`UserListItem.id`) is already fetched by the existing
`userStore.getUserById` call and already used internally in the component's logic — only its
display in the identity header (alongside the existing name `<h3>` and email `DetailsCopyField`)
is missing. Two presentational components already imported in this file (`DetailsProperty`,
`DetailsCopyField`) are established, reusable patterns elsewhere in the codebase for rendering an
entity's ID, so no new component, store method, type field, or API call appears necessary.

The main risk is not technical complexity but test coverage: all five existing test files for this
popup stub out the two candidate rendering components as `() => null`, so none currently assert on
identity-header content, and a new assertion for the ID will need to either unstub one of those
components for this test or assert against props passed into the mock. Overall this reads as a
small, low-novelty, single-file UI change.

---

## 8. External References

None named by the task.
