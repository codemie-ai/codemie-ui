# EPMCDME-15200 Exchange Test button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable Test for Microsoft Exchange and toast the backend success message.

**Architecture:** Flip the registry flag (gates all five `TestIntegration` render sites via `getTestableCredentialTypes()`), and make the success toast echo `response.message`.

**Tech Stack:** React, TypeScript, Vitest + RTL.

Commit per task using the repository's existing convention.

## Global Constraints

- No new form fields, Exchange tool UI, SDK enum bump, route, store method or `testSetting` response type.
- Failure toast, `OAuthTestAction` and `src/utils/toaster.ts` stay unchanged.
- Run `npm ci` before trusting test results; quote the `Test Files` line.

---

### Task 1: Make msexchange testable

**Files:**
- Modify: `src/utils/settingsUIConfig.ts:535` (`testable: false` -> `true`)
- Modify: `src/utils/__tests__/settingsUIConfig.test.ts:168-173`

Test-first: yes — `expect(entry.testable).toBe(true)` and `getTestableCredentialTypes()` containing `'msexchange'` fail while the flag is false.

- [ ] Rename the `it` title (drop "is not testable", say "is testable"), assert `testable` is `true`, add an assertion that `getTestableCredentialTypes()` (`src/utils/settings.ts:125`) includes `'msexchange'`. Run it (fails), flip the flag, run again (passes).

### Task 2: Echo backend message in success toast

**Files:**
- Modify: `src/pages/integrations/components/TestIntegration.tsx:88` -> `toaster.info(response.message || 'Integration test successful')`
- Create: `src/pages/integrations/components/__tests__/EditIntegrationActions.msexchange.test.tsx`

Test-first: yes — with `{success:true, message:'Connection and Inbox access verified.'}` the info toast must show that message (fails on the hardcoded text).

- [ ] Write the test, modelled on `EditIntegrationActions.test.tsx` but WITHOUT mocking `@/utils/settings` or `TestIntegration`. Mock only `@/store/userSettings` (`testSetting`), `OAuthTestAction` and `@/utils/toaster`. Use `it.each` over `auth_type` `oauth_azure` and `ntlm` with `credentialType="MSExchange"`:
  - the "Test" button renders;
  - clicking calls `testSetting('MSExchange', settingId, <entered values as key/value list>)`;
  - response with `message` toasts that message; response without `message` toasts 'Integration test successful'.
- [ ] Run the file (message case fails), apply the one-line change, run again (passes).
