# EPMCDME-17053 User Type "service_account" (UI only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The User Details popup offers, selects, saves and displays the `service_account` user type.

**Architecture:** Widen the `UserType` union and `USER_TYPES` constant, add one shared label map, and use it for the admin dropdown options, the non-admin read-only view and the Users list column. The `Select` empty-value symptom disappears because the value now matches an option. No store change: `updateUser` and `getUserById` pass the value through.

**Tech Stack:** React, TypeScript, Valtio, PrimeReact `Dropdown` via `src/components/form/Select/Select.tsx`.

**Spec:** none (inline requirements, Jira EPMCDME-17053, AC 1-3, frontend only). Analysis: `technical-analysis.md` in this folder.

Commit per task using the repository's existing convention (ticket key EPMCDME-17053 in the message).

## Acceptance criteria

- [ ] The User Type dropdown for a user whose `user_type` is `service_account` shows "Service Account", not an empty control.
- [ ] "Service Account" is offered next to Regular and External User, and selecting it calls `userStore.updateUser(userId, { user_type: 'service_account' })`.
- [ ] After reload the popup reads `user_type` through `getUserById` and shows the saved value (the UI sends and reads the value unchanged; backend persistence is out of scope).

## Assumptions

- (a) The option label is "Service Account" and the value is `service_account`.
- (b) The backend already returns and accepts `service_account`. This is unverified from this repo, and AC3 depends on it.
- (c) `UserType`, `USER_TYPES` and `USER_TYPE_OPTIONS` are widened together. Widening `UserType` also widens the `getUsers` filter type (`src/store/user.ts:84`). That is harmless: no filter UI uses `user_type` (`usersManagement/constants.ts:18-24`), so it needs no code change.
- Unknown future `user_type` values still render an empty dropdown (`Select.tsx:193`, no `allowCustom`). Not changed here.

## Negative-constraint pass

- Out of scope: AC 4-6, backend work, project auto-creation. No task touches them.
- No new test tasks, because the repo rule is to write tests only on explicit request. Each task carries `Test-first: no`.
- No `allowCustom`, store or `Select` changes (minimal and surgical per AGENTS.md).

---

### Task 1: Widen the user type contract

**Files:**
- Modify: `src/constants/user.ts:23-26`
- Modify: `src/types/entity/user.ts:51`

Test-first: no - the repo rule is to write tests only on explicit request. The change is a type and constant widening, checked by the type-check gate.

- [ ] Add `service_account: 'service_account'` to `USER_TYPES`. Below it, add `export const USER_TYPE_LABELS: Record<string, string>` mapping `regular` to "Regular", `external` to "External User" and `service_account` to "Service Account". Use `USER_TYPES.*` as the keys. Change `UserType` to `'regular' | 'external' | 'service_account'`. Do not touch `USER_TYPE_EXTERNAL` in `src/constants/index.ts:31`.

### Task 2: Popup dropdown and read-only view

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx:28,38-41,283`

**Interfaces:**
- Consumes: `USER_TYPES` and `USER_TYPE_LABELS` from Task 1 (`@/constants/user`).

Test-first: no - the repo rule is to write tests only on explicit request. A later opt-in test would assert that the options include `service_account` and that `updateUser` receives `{ user_type: 'service_account' }`.

- [ ] In `USER_TYPE_OPTIONS`, add a third entry `{ label: USER_TYPE_LABELS[USER_TYPES.service_account], value: USER_TYPES.service_account }`. Take the existing two labels from `USER_TYPE_LABELS` too, so the strings live in one place. Import `USER_TYPE_LABELS`.
- [ ] At `:283`, render `USER_TYPE_LABELS[user.user_type] ?? user.user_type` inside the existing span. Keep `capitalize`, so unknown values behave as before.

### Task 3: Users list column label

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx:344-346`

**Interfaces:**
- Consumes: `USER_TYPE_LABELS` from Task 1.

Test-first: no - the repo rule is to write tests only on explicit request. Fixtures using `'INTERNAL'` or `'regular'` fall back to the raw value, so existing page tests are unaffected.

- [ ] In the `user_type` column renderer, show `USER_TYPE_LABELS[item.user_type] ?? item.user_type` with the existing classes. Add the import.
