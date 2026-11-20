# EPMCDME-17253 Hosted application categories: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `spec.md` (same folder). Hosted apps get 0–3 shared categories in the form, 1–3 in a new publish dialog, category names on cards and details, and a `category` filter on every catalog tab.

**Architecture:** The data and protocol live in the hosted store. One hosted loader (`useHostedCategories`) owns the shared list for the filter bar, the dialog and the form. The filter is a new key in the hosted registry, which now writes the URL as well as reading it. Publishing gets its own dialog, modelled on `HostedSecurityDialog`.

**Tech Stack:** React, TypeScript, Valtio, react-hook-form + yup, Vitest + RTL (`.ai-run/guides/testing/testing-patterns.md`).

Commit per task using the repository's existing convention (ticket key EPMCDME-17253, `.ai-run/guides/standards/git-workflow.md`). Run only the suites a task touches, with `npx vitest run <test file>`. The flow runs the whole gate suite itself.

**Decisions this plan takes beyond the spec:**
- `getAssistantCategories` gets an optional `{ skipErrorHandling }` argument. This is how the hosted loader avoids raising a toast.
- `MarketplaceCategories` gets optional `required` and `loadOnMount` props. Their defaults (`false` and `true`) keep today's behaviour.

Without these two, AC14 (no toast, one shared request) cannot hold. Both are additive, so assistant and workflow screens do not change (NG3).

---

### Task 1: Category field, id helper and field error messages

**Files:** Modify `src/types/entity/hostedApplication.ts:67-98`, `src/store/hostedApplications.ts:93-104`. Test: `src/store/__tests__/hostedApplications.integration.test.ts`, plus a new `src/types/entity/__tests__/hostedApplication.test.ts`.

Test-first: yes — `hostedCategoryIds` returns `[]` for a missing field and ids in saved order. `hostedErrorMessage` returns the non-empty string `details.fields[].message` entries joined with `'; '`, ignores entries that are not strings, falls back to `message` and then to the generic text when the joined text is empty or over 500 characters.

- [ ] Write the failing tests and run them (they fail).
- [ ] Add `categories?: HostedCategory[]` (`{ id: string; name: string }`) to `HostedApplication`, and export:
```ts
/** Category ids of `app` in saved order; a missing field counts as none. */
export const hostedCategoryIds = (app?: Pick<HostedApplication, 'categories'> | null): string[] =>
  (app?.categories ?? []).map(({ id }) => id)
```
- [ ] In `hostedErrorMessage`, read `parsedError.details.fields`. Keep only entries whose `message` is a non-empty string and join them. Apply the existing 500-character and `'Unknown error'` rule to the joined text. When nothing is left, keep today's path. Run the tests (they pass).

### Task 2: Store protocol: bodies, publish, filter, cursor reset

**Files:** Modify `src/store/hostedApplications.ts:136-148` (CatalogFilters), `:183-191` and the publish declaration below them, `:309-321` (setFilters), `:472-479` (publish). Test: `src/store/__tests__/hostedApplications.integration.test.ts`.

Test-first: yes — the tests cover these cases:
- `publish(app, ['c1'], 'k')` posts `{categories:['c1']}` with `Idempotency-Key: k`.
- `category: ['a','b']` is sent as a repeated `category` param.
- After a non-scope filter change `nextCursor` is `null` at once.
- **Failed first page (plan note):** load page 1, change a non-scope filter, make page 1 fail, then call `loadApplications(true)`. No request carries the old cursor.

- [ ] Write the failing tests and run them (they fail).
- [ ] Add `category?: string[]` to `CatalogFilters`, documented as a repeated parameter, and add `categories?: string[]` to the create and update body types.
- [ ] Change `publish(app, categories: string[], key?)` so it posts `{ categories }`.
- [ ] In `setFilters`, set `this.nextCursor = null` before the `contextChanged` early return, and keep `items`. Run the tests (they pass).

### Task 3: `useHostedCategories` loader

**Files:** Create `src/pages/applications/hosted/useHostedCategories.tsx`. Modify `src/store/assistants.ts:604-611`, adding the optional `options?: { skipErrorHandling?: boolean }` argument passed through to `api.get`. Test: create `src/pages/applications/hosted/__tests__/useHostedCategories.test.tsx`.

Test-first: yes — the tests cover these cases:
- Two hooks mounted together make one request.
- No request is made when `assistantsStore.assistantCategories` is already filled.
- A failure gives `failed` with no `toaster` call. The notice shows "Categories could not be loaded", and Retry starts a new request that ends `ready`.

- [ ] Write the failing tests and run them (they fail).
- [ ] Implement the module. It holds a module-level `request: Promise<void> | null`, cleared on failure. `useHostedCategories()` returns `{ categories, status: 'loading'|'ready'|'failed', retry }`, reading `useSnapshot(assistantsStore).assistantCategories`. The same file exports `HostedCategoriesNotice({ status, retry })`. It renders `role="alert"` text plus a Retry `Button` when `status === 'failed'`, and nothing otherwise. Run the tests (they pass).

### Task 4: Catalog `category` filter; the registry writes the URL

**Files:** Modify `src/pages/applications/hosted/hostedCollections.ts:31-96,143-150` and `src/pages/applications/hosted/HostedCatalogFilters.tsx:57,109-183`. Test: `__tests__/hostedCollections.test.ts`, `__tests__/hosted-filter-defaults.integration.test.tsx`.

Test-first: yes — the tests cover these cases:
- On every tab, `?category=a&category=a&category=b` reads as `['a','b']` and sends `category: ['a','b']`, even before the list loads.
- No category gives no `category` param.
- Picking categories in the bar writes repeated `category` URL keys and keeps `project`.
- A store `error` ("INVALID_FILTER" message) is shown while the filter bar stays rendered.
- A failed list shows the notice in the bar.

- [ ] Write the failing tests and run them (they fail).
- [ ] Add `category: string[]` to `HostedCatalogSearch`, defaulting to `[]` in `readHostedCatalogSearch`. Add `'category'` to `HostedFilterKey` and `COMMON_FILTERS`.
- [ ] Add `write(next: URLSearchParams, value: unknown)` to `HostedFilter`. `project` and `category` append the deduplicated, trimmed, non-empty strings. The other keys set or delete.
- [ ] The `category` read is the deduplicated `getAll('category')`, keeping strings of at most `MAX_FILTER_LENGTH`. Never check ids against the loaded list.
- [ ] Export `HOSTED_FILTER_KEYS = Object.keys(HOSTED_FILTERS) as HostedFilterKey[]`.
- [ ] In `HostedCatalogFilters`:
  - Drop `FILTER_KEYS` and the `key === 'project'` branch. `apply` loops `HOSTED_FILTER_KEYS`: it deletes each key, then calls `HOSTED_FILTERS[key].write` for the accepted ones.
  - Add a `category` Multiselect definition labelled "Categories" with options `{label: name, value: id}` from `useHostedCategories` and `maxSelectedLabels: 3`.
  - Render `HostedCategoriesNotice` beside the filters.
- [ ] If the results view hides the error while the previous items are shown (`HostedCatalogResults.tsx`), show `store.error` inline above them. Run the tests (they pass).

### Task 5: Categories in the create and edit form

**Files:** Modify `src/pages/applications/hosted/formSchema.ts:17-35` and `src/pages/applications/hosted/HostedApplicationForm.tsx:47-72,127-145` (plus the field markup). Modify `src/pages/assistants/components/AssistantForm/components/MarketplaceCategories.tsx:28-72,109`, adding optional `required` (passed to `MultiSelect`) and `loadOnMount = true`. Test: `__tests__/HostedApplicationForm.integration.test.tsx`.

Test-first: yes — the tests cover these cases:
- Create sends `categories: []` with no pick and `['a','b']` with two picks.
- Edit of an unpublished app pre-fills its ids. Save sends no `categories` when the list is unchanged, and `[]` when it is cleared.
- Edit of an `is_global` app with `[]` shows the field as required. Saving is blocked with "A published application needs at least one category", and no PATCH is sent.
- A 4th pick is refused.
- A failed list shows the notice next to the field.
- A 422 with field messages shows them and keeps the values.

- [ ] Write the failing tests and run them (they fail).
- [ ] Add `categories: array(string()).max(3)` to the schema, with `.when('$published', …min(1, 'A published application needs at least one category'))` (the `creating` idiom).
- [ ] Pass `context: { creating: !application, published: !!application?.is_global }`, and add `categories: hostedCategoryIds(application)` to the defaults.
- [ ] Render a `Controller name="categories"` with `<MarketplaceCategories loadOnMount={false} required={published} error={…} />` and `HostedCategoriesNotice` from `useHostedCategories()`.
- [ ] Create already includes `categories` in its payload (and so in its key body). In `changedMetadata`, add `categories` when `values.categories.join() !== hostedCategoryIds(current).join()`. Run the tests (they pass).

### Task 6: `HostedPublishDialog`

**Files:** Create `src/pages/applications/hosted/HostedPublishDialog.tsx`. Modify `src/pages/applications/hosted/useHostedCardActions.tsx:152-177`. Test: create `__tests__/HostedPublishDialog.test.tsx`, and update the publish cases in `HostedApplicationCard.test.tsx` (:246, :274, :344) and `card-actions-settle.integration.test.tsx`.

Test-first: yes — the tests cover these cases:
- The dialog pre-fills the app's categories and posts `{categories}`.
- Publishing with none picked shows "At least one category is required" and sends nothing.
- A 422 keeps the dialog open with the selection and shows the reason (`role="alert"`).
- A retry with the same selection sends the same key. A changed selection sends a new key.
- A 412 re-fetches the app. The next press sends the new etag and a new key, with the selection kept.
- When `isCurrent()` is false at settle, the dialog closes and shows no error.
- A success calls `onDone`, and the catalog refreshes.

- [ ] Write the failing tests and run them (they fail).
- [ ] Implement the dialog, following `HostedSecurityDialog.tsx:46-117`: `Popup`, `busy`, `error`, an `alive` ref, and `key = useRef(crypto.randomUUID())` rotated in the selection change handler.
  - Props: `app`, `isCurrent()`, `onClose`, `onDone(updated)`.
  - Keep the header "Publish to Marketplace?" and today's message, and show `CategorySelector` with options from `useHostedCategories` plus its notice. Keep a local `revision` state that starts as `app`.
  - Submit: with an empty selection, set the required message and return. Otherwise `await store.publish(revision, ids, key.current)`.
  - Settle: when `!isCurrent()`, call `onClose()` and return. On success, call `onDone(updated)`. On error, set `hostedErrorMessage(cause)`.
  - When `cause instanceof Response && cause.status === 412`, set `revision` to `await store.getApplication(app.id)` and rotate the key.
- [ ] In `useHostedCardActions`, replace the publish `ConfirmationModal` with `<HostedPublishDialog app={pending.app} isCurrent={isCurrent} onClose={() => setPending(null)} onDone={done} />`. Leave `run()` and the unpublish and delete dialogs unchanged. Run the tests (they pass).

### Task 7: Category names on cards and details

**Files:** Modify `src/pages/applications/hosted/HostedApplicationCard.tsx:84` and `src/pages/applications/hosted/HostedApplicationOverview.tsx:76`. Test: `__tests__/HostedApplicationCard.test.tsx`, `__tests__/HostedApplicationDetails.integration.test.tsx`.

Test-first: yes — a card and the overview of an app with two categories show both names. An app with `[]` or no field shows no categories text and no `CATEGORIES` section.

- [ ] Write the failing tests and run them (they fail).
- [ ] On the card, render the names (for example joined with `, `, in a muted line) only when there are any.
- [ ] In the overview, add `DetailsSidebarSection headline="CATEGORIES"` with `SidebarTags` of the names, hidden when there are none, as in `AssistantDetailsSidebarSections.tsx:257-266`. Run the tests (they pass).

---

**Negative constraints:**
- NG1 (no backend changes): no task touches the backend.
- NG2 (categories admin page): untouched.
- NG3 (assistant and workflow screens unchanged): T3 and T5 add only optional arguments and props whose defaults equal today's behaviour, and the InfoBox text stays.
- The key schemes of create, update and moderation stay as they are (T5 keeps the per-payload create key, T6 does not touch the security dialog).
- No hosted category endpoint: T3 uses `v1/assistants/categories`.
- URL ids are not checked against the list (T4).
- No category param is sent when none is picked (T4).
- No toast on a list failure (T3).
- `run()` is unchanged for unpublish and delete (T6).
