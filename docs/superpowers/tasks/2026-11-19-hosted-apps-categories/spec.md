# EPMCDME-17253 — Categories for hosted applications (UI)

## Goal

Hosted apps get categories from the shared platform list (`GET v1/assistants/categories`, loaded by
`assistantsStore.getAssistantCategories`, `src/store/assistants.ts:604-611`). Users pick them when they
create, edit or publish an app, see them on cards and details, and filter every catalog tab by them, the
same way they already do for assistants and workflows. Requirements and API contract:
`requirements.local.md`. Ticket AC ids are given in brackets.

## Behaviour

**Data.** `HostedApplication` gains optional `categories: {id, name}[]`, kept in saved order. A missing
field counts as `[]`. Create, update and publish send category **ids**.

**Category list.** One hosted loader, `useHostedCategories`, is used by the filter bar, the publish
dialog and the form. It loads the shared list through `getAssistantCategories` only when the store has
none, shares one in-flight request between callers, and exposes `loading | ready | failed`. Its failure
raises no toast (`skipErrorHandling`, as all hosted calls do); each caller shows "Categories could not be
loaded" inline with a Retry that starts a new load.

**Create and edit form** (`HostedApplicationForm.tsx`, `formSchema.ts:17-35`). Adds a Categories field
built on `MarketplaceCategories` (it fetches the list itself and refuses a 4th pick, `:52`). Users can
pick 0–3 categories. An edit form starts with the app's current ids. Create sends `categories` every
time, including `[]`. Edit sends `categories` only when the ordered id list differs from the loaded one;
otherwise PATCH leaves the field out, which keeps the categories. When the app is published
(`is_global`), including a legacy app with `[]`, the field is marked required. Saving with none is
blocked by a yup context rule (same idiom as `creating`, `formSchema.ts:24-28`) with the message "A
published application needs at least one category". When the list failed to load, the form shows the
loader's inline error and Retry next to the field, so a published app with `[]` can still be fixed. [AC3,
AC4, AC5, AC6]

**Publish dialog** (`useHostedCardActions.tsx:166-177`). The plain confirmation becomes
`HostedPublishDialog`, modelled on `HostedSecurityDialog` (`HostedSecurityDialog.tsx:46-117`). Props:
`app` (the fresh revision from `prepare`, `:86-89`), `onClose`, `onDone(updated)`. It keeps today's header
and warning text and adds a required `CategorySelector`, which starts with the app's current categories
and takes its options from `useHostedCategories`. The dialog owns the selection, `busy`, `error`, an alive
guard and a per-dialog Idempotency-Key, replaced on every selection change, and calls
`store.publish(app, ids, key)`, which posts `{categories}`. Publishing with none picked shows "At least
one category is required" and sends nothing. On success `useHostedCardActions` closes it and refreshes,
as `done()` does today. On error it stays open, keeps the selection and shows the reason inline
(`role="alert"`). On a revision refusal (stale `If-Match`) it re-fetches the app with
`store.getApplication`, keeps the selection, and takes the new etag and a new key for the next press.
When a request settles after the visit ended (`isCurrent()` is false), the dialog closes and shows
nothing. `run()` (`:93-105`) stays as it is for unpublish and delete. The catalog, details and viewer
share this one dialog. [AC1, AC2, AC3, AC7]

**Display.** A card lists its category names when it has any (`HostedApplicationCard.tsx`). The
details overview adds a `CATEGORIES` `DetailsSidebarSection` with `SidebarTags`, hidden when there are no
categories, as assistant details do (`AssistantDetailsSidebarSections.tsx:257-266`). Apps without
categories look as they do today. [AC8, AC10]

**Catalog filter** (`hostedCollections.ts`, `HostedCatalogFilters.tsx`). Adds a new registry key,
`category`, to `COMMON_FILTERS`, so all four tabs get it. It is a repeated URL key, read like `project`
(`:55`), and is sent as a repeated `category` API param (`api.ts:413-429`). The control is a
multi-select over the shared list from `useHostedCategories`, labelled "Categories". When it is empty no
param is sent, so the marketplace lists uncategorised apps as before. Category ids are read from the URL
as they are: deduplicated, with only a string and length check, and never checked against the loaded
list, so the reader stays a pure function of the URL (`:143-150`). A stale id reaches the API; its 422
`INVALID_FILTER` is shown inline with the filter still visible, so the user can clear it. [AC9, AC10]

**Paging.** Any filter change, not only a scope change, clears `nextCursor` at once
(`hostedApplications.ts:309-321`). A load-more can then never send a cursor issued for another filter,
and the new filter starts from page 1. [AC9]

**Errors.** `hostedErrorMessage` (`hostedApplications.ts:93-104`) shows `details.fields[].message` when
the reply carries field messages, joined. Only non-empty string entries count, the joined text keeps the
existing 500-character cap, and when nothing is left it keeps today's rule. The form and the publish
dialog keep the user's input on every refusal. [AC7]

## Acceptance criteria

1. The publish dialog lists the shared categories, starts with the app's current ones, and publishes with body `{categories: [ids]}`. [AC1]
2. Publishing with no category is blocked in the dialog with "At least one category is required", and no request is sent. [AC2]
3. In the form and the publish dialog, a 4th category cannot be picked. [AC3]
4. The create form sends 0–3 picked ids as `categories`. [AC4]
5. The edit form of an unpublished app shows its categories, and saving sends `categories` only when they changed, `[]` when cleared. [AC5]
6. The edit form of a published app, including a legacy app with `[]`, marks Categories required and blocks saving with none, with "A published application needs at least one category". [AC6]
7. A 422 or 409 refusal shows its `details.fields[].message`, or else its `message`. The form and the publish dialog stay open with the input unchanged. [AC7]
8. Cards and the details overview show category names. Nothing is shown when an app has none. [AC8]
9. On mine, project, marketplace and shared, picked categories become repeated `category` params alongside the other filters and are kept in the URL. A filter change clears the cursor before any further page request. [AC9]
10. With no category picked, no `category` param is sent. [AC10]
11. A retry in the publish dialog with an unchanged selection reuses the dialog's Idempotency-Key; a changed selection or a re-fetched revision uses a new one. After a revision refusal the next press sends the new etag.
12. A publish request that settles after the route or signed-in user changed closes the dialog and shows nothing.
13. A category id in the URL is sent as read, even before the list loads; a 422 `INVALID_FILTER` is shown inline with the filter still visible.
14. When the category list fails to load, the filter bar, the publish dialog and the form show "Categories could not be loaded" with a Retry, and no toast; the filter bar, dialog and form share one request.

## Non-goals

- Backend changes (NG1).
- The categories admin page and its 409 on delete (NG2).
- Assistant and workflow screens, and the behaviour of the shared selectors there (NG3).
- Changing the Idempotency-Key scheme of create, update or moderation.
- A hosted-specific category endpoint or list.

## Decisions

- `MarketplaceCategories` in the form over `CategorySelector`: answers which shared picker the form uses. It fetches the list and refuses a 4th pick, as the workflow form does.
- `CategorySelector` in the publish dialog over `MarketplaceCategories`: answers which picker the dialog uses. It follows `PublishWorkflowToMarketplaceModal`.
- The InfoBox text of `MarketplaceCategories` stays as it is over a hosted-specific wording: answers whether the hosted form may say "your assistant's use case". Changing the text would touch the shared component (NG3), so the issue is listed as a risk.
- A separate `HostedPublishDialog` modelled on `HostedSecurityDialog` over a publish-only branch in `run()`: answers where the stay-open-on-error dialog (AC7) owns its request, key and revision. `run()` stays close-always for unpublish and delete.
- A per-dialog Idempotency-Key replaced on every selection change over a fresh key per call: answers how a retry after a lost reply replays the success without `IDEMPOTENCY_CONFLICT`. It follows the handoff (`requirements.local.md:24`) and `HostedSecurityDialog.tsx:52,103-106`.
- Re-fetching the app after a revision refusal over closing the dialog: answers how an in-dialog retry keeps the fresh-revision rule (`useHostedCardActions.tsx:66`).
- The URL key `category` from the hosted registry over the workflow `utils/filters` key `categories`: answers which filter pattern hosted follows. Hosted URL keys mirror API keys.
- URL category ids are sent as read and a stale one surfaces as the API's `INVALID_FILTER` over dropping ids missing from the loaded list: answers how a stale link behaves. The pure URL reader cannot tell a loading list from a failed one, and dropping would send a deep link unfiltered.
- One hosted loader `useHostedCategories` with a load state over each component loading the list on its own: answers who loads the shared list on the hosted side and how a failure is shown.
- Clearing `nextCursor` on any filter change over clearing items too: answers how the cursor reset happens. The current list stays visible until page 1 arrives.
- `hostedErrorMessage` prefers `details.fields[].message` over a separate helper for category calls: answers where field messages are surfaced. It only changes replies that carry fields.
- Edit sends `categories` only when the ordered id list changed over always sending it: answers how edit fits `changedMetadata`. PATCH without the field keeps the current categories.

## Risks

- Backend behaviour (codes, `categories` in replies) cannot be verified from this repo. Ship only after the backend rollout.
- Whether the backend answers a stale `If-Match` on publish with 412 and replays a same-key success is unverified; it decides whether a lost-reply retry reports success.
- The shared `MarketplaceCategories` hint says "assistant's use case" on a hosted form.
- Making `hostedErrorMessage` show field messages reaches all 26 of its callers, but only for replies that carry `details.fields`.
