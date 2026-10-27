# API URL Slash Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `makeRequest()` never produces a duplicated slash when joining `BASE_URL` and the `url` argument (EPMCDME-16242).

**Architecture:** Add a small private join helper on the `API` class in `src/utils/api.ts` and use it in `makeRequest` only. Minimal rule: BASE_URL is never trimmed and multiple slashes are not collapsed. Scheduler stores and sibling methods (`fetchMultipart`, `stream`, `downloadFileStream`) are untouched.

**Tech Stack:** TypeScript, Vitest.

**Spec:** Jira EPMCDME-16242 requirements; research in `technical-analysis.md` (same directory).

Commit per task using the repository's existing convention (ticket key prefix EPMCDME-16242). Never stage `.codemie/codemie-cli.config.json`, `src/setupTests.tsx`, `.gitattributes`.

## Acceptance criteria

- `api.get('/v1/schedulers/filter-options')` fetches `${BASE_URL}/v1/schedulers/filter-options` (no `//`).
- A url without a leading slash on a base without a trailing slash yields exactly the old `${BASE_URL}/${url}`.
- Query params still append correctly after the joined URL.

## Task 1: Slash-safe join in makeRequest

**Files:**
- Modify: `src/utils/api.ts:319` (inside `makeRequest`) plus a new private method next to it
- Test: `src/utils/__tests__/api.test.ts` (new `describe('makeRequest URL building')`)

**Interfaces:**
- Produces: `private joinUrl(url: string): string` on `API`; `makeRequest` uses it for `fullUrl`.

- [ ] **Step 1: Write failing tests.** Follow the `downloadFileStream` pattern (api.test.ts:208+): `global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), json: async () => ({}) })`; set `api.BASE_URL` per case, restore the original in `afterEach`; call `api.get(...)`; assert `fetch` first arg. Cases:
  - base `/api`, `'v1/x'` -> `/api/v1/x` (unchanged)
  - base `/api`, `'/v1/x'` -> `/api/v1/x` (fails today)
  - base `/api/`, `'v1/x'` -> `/api/v1/x` (fails today)
  - base `/api/`, `'/v1/x'` -> `/api/v1/x` (fails today)
- [ ] **Step 2: Run** `npx vitest run --project unit src/utils/__tests__/api.test.ts`; expect the three marked cases to FAIL.
- [ ] **Step 3: Implement** `joinUrl(url)`: let `baseSlash = BASE_URL.endsWith('/')`, `urlSlash = url.startsWith('/')`. Both -> `BASE_URL + url.slice(1)`; neither -> `${BASE_URL}/${url}`; exactly one -> `BASE_URL + url`. Replace line 319 with `let fullUrl = this.joinUrl(url)`. Leave the `handleSessionExpired(url)` call receiving the raw url.
- [ ] **Step 4: Re-run** the same command; expect all PASS and no regressions in the file.

Test-first: yes — `api.get('/v1/x')` currently fetches `/api//v1/x`; test expects `/api/v1/x`.

## Task 2: Params and verb coverage

**Files:**
- Test: `src/utils/__tests__/api.test.ts` (same `describe`)

- [ ] **Step 1: Add tests** (pass against Task 1 code; run the file to confirm):
  - leading slash plus `params: { a: 1, b: ['x','y'] }` -> `/api/v1/x?a=1&b=x&b=y`
  - no leading slash plus the same params -> same URL
  - one `post('/v1/x', body)` case showing the join is shared by all verbs.

Test-first: no — characterization tests of behaviour implemented in Task 1; they pass on first run.

## Negative-constraint pass

- Do not fix scheduler store URLs: no task edits `src/store/schedulers.ts` or `schedulerRuns.ts`. Honored.
- Production URLs unchanged for the normal case (no trailing slash on base, no leading slash on url): Task 1 case 1 and the "neither" branch. Honored.
- Do not trim BASE_URL or collapse multiple slashes: the helper removes at most one slash. Honored.
- Sibling methods untouched: no task modifies lines 181/229/268. Honored.
- Do not touch git-dirty files: stated in header. Honored.
