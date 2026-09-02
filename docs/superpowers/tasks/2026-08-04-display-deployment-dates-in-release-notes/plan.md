# Plan: EPMCDME-10701 — Display deployment date of each version in release notes

## Requirements

Modify the frontend release notes loading logic to fetch deployment dates from the
`GET /v1/deployment-versions` endpoint and merge them into the release notes data.
For each version: if the endpoint returns a `deployedAt` date, use it; otherwise keep
the existing `date` from `releaseNotes.json`. All other behaviour is unchanged.
Frontend-only change.

---

## Tasks

### T1 — Modify `loadReleaseNotes()` to merge deployment dates

**File**: `src/store/appInfo.ts`

**What to do**:
1. Keep the existing synchronous setup at the top of the method (sets `this.appReleases`
   and `this.viewedAppReleaseVersion` from `releaseNotes.json` and localStorage).
   This preserves backward compatibility with `AutoPopupManager`, which calls the method
   without `await` and immediately reads `isAppReleaseNew()`.
2. After the synchronous setup, add a `try/catch` block that:
   - Calls `api.get('v1/deployment-versions')`
   - Parses `data.deployments` as `Array<{ version: string; deployedAt: string }>`
   - Builds a `Map<string, string>` from `version → deployedAt`
   - Re-maps `this.appReleases` to replace `date` with `deployedAt` where the Map has
     a matching entry; leaves `date` unchanged for versions not in the Map
3. On any error, logs to console and leaves `this.appReleases` as set by the
   synchronous step (JSON dates — graceful degradation, consistent with store pattern).

**Test-first: yes** — Write a failing test that calls `loadReleaseNotes()` and asserts
`appInfoStore.appReleases[0].date` equals the mocked `deployedAt` value before
implementing the merge logic.

---

### T2 — Add store-level tests for `loadReleaseNotes()`

**File**: `src/store/__tests__/appInfo.test.ts`

**What to do**:
Add a new `describe('appInfoStore.loadReleaseNotes', ...)` block with four test cases,
following the existing `mockGet` / `okResponse` pattern:

1. **Deployment date present** — `mockGet` returns `{ deployments: [{ version: '<first JSON version>', deployedAt: '2026-07-20T12:34:56Z' }] }`. Assert `appInfoStore.appReleases[0].date === '2026-07-20T12:34:56Z'`.
2. **Deployment date absent (fallback)** — `mockGet` returns `{ deployments: [] }`. Assert `appInfoStore.appReleases[0].date` equals the original JSON date value from `releaseNotes.json`.
3. **Partial override** — `mockGet` returns deployments for only some versions. Assert first version gets `deployedAt`, second version keeps its JSON date.
4. **Network error** — `mockGet` throws. Assert `appInfoStore.appReleases[0].date` equals the JSON date (graceful degradation).

**Test-first: yes** — The tests are written first; they all fail (RED) before T1 is
implemented.

---

## Non-changes (confirmed)

- `src/pages/releaseNotes/ReleaseNotesPage.tsx` — no change; `{release.date && formatDateTime(release.date, 'day')}` already handles both `YYYY-MM-DD` and full ISO 8601 strings via Luxon.
- `src/components/appLevel/AutoPopupManager.tsx` — no change; `isAppReleaseNew()` compares version strings only, not dates; the synchronous-first pattern in T1 keeps it correct.
- `src/configs/releaseNotes.json` — no change; remains the canonical version list and fallback dates.
- `src/utils/helpers.ts` — no change; `formatDateTime` already handles full ISO timestamps.

---

## Execution order

T2 (tests, RED) → T1 (implementation, GREEN) → verify tests pass → commit.
