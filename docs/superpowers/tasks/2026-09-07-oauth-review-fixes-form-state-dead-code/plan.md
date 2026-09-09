# Remove unused OAuth feature-flag helpers — Implementation Plan

> Implemented inline under sdlc-factory:sdlc-light Stage 4.

**Goal:** Remove the six unused per-provider OAuth feature-flag helpers flagged as dead code in MR !1798
(review note #2378931).

**Scope:** Issue #2 only. Issue #1 (the OAuth form-state / `isOAuth` refactor) is deferred to the user's
explicit command and is intentionally out of scope here.

**Architecture:** Pure deletion of verified-unreachable exports. `SettingsForm` reads flags via
`useFeatureFlag(OAUTH_VARIANT_FEATURE_FLAG[...])` directly; the named helpers have zero callers.

## Global Constraints

- FE commit subject: `EPMCDME-14587: Capital sentence` (single ticket + colon).
- Do not touch `vite.config.ts` (unrelated local change, left dirty by prior user consent).
- Leave `FEATURE_FLAGS.*_OAUTH`, `OAUTH_VARIANT_FEATURE_FLAG`, and the generic `useFeatureFlag` /
  `isFeatureEnabled` intact — only the six named convenience wrappers are dead.

---

## Task 1: Delete the six unused helpers

**Files:**
- Modify: `src/hooks/useFeatureFlags.ts` — remove `useGitlabOauthEnabled` (`:116`), `useJiraOauthEnabled` (`:120`), `useConfluenceOauthEnabled` (`:124`)
- Modify: `src/utils/featureFlags.ts` — remove `isGitlabOauthEnabled` (`:93`), `isJiraOauthEnabled` (`:97`), `isConfluenceOauthEnabled` (`:101`)

**Test-first: no** — this is deletion of code with zero callers and zero test references (both verified by
grep across `src`). There is no behaviour to drive with a failing test; the safeguards are (a) a
zero-remaining-references grep, (b) `tsc --noEmit` clean, and (c) the existing `featureFlags` / hooks unit
suites staying green. Writing a test that asserts "function does not exist" would be noise.

- [ ] **Step 1: Remove the three hook wrappers** from `src/hooks/useFeatureFlags.ts` (the three
  `export const use*OauthEnabled = (): FeatureFlagResult => { return useFeatureFlag(FEATURE_FLAGS.*_OAUTH) }`
  blocks). Leave the surrounding helpers and the `FEATURE_FLAGS` import untouched.

- [ ] **Step 2: Remove the three util wrappers** from `src/utils/featureFlags.ts` (the three
  `export const is*OauthEnabled = (): boolean => { return isFeatureEnabled(FEATURE_FLAGS.*_OAUTH) }` blocks).

- [ ] **Step 3: Verify no references remain**

Run: `grep -rn "OauthEnabled" src` → expect only unrelated matches, none of the six removed names.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` → clean (proves nothing imported them).

- [ ] **Step 5: Run the affected unit suites**

Run: `npx vitest run src/utils/__tests__/featureFlags.test.ts` and any `useFeatureFlags` hook test → green.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useFeatureFlags.ts src/utils/featureFlags.ts
git commit -m "EPMCDME-14587: Remove unused OAuth feature-flag helpers"
```

## Self-review
- Coverage: removes exactly the six helpers named in review note #2378931.
- No placeholders. No behaviour change (dead code). Issue #1 explicitly deferred.
