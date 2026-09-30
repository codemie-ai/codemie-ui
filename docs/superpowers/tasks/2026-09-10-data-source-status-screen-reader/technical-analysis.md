# Technical Analysis — EPMCDME-8557

## 1. Project structure
React 18 + TypeScript 5, Vite 5, Tailwind 3, Valtio state, react-router 7, react-hook-form,
PrimeReact. Vitest (unit + integration projects).

## 2. Code — locus of the bug
- `src/pages/dataSources/DataSourcesPage.tsx` — list page; renders `status` column via
  `customTableColumns.status = (item) => <DataSourceStatus item={item} />`; polls
  `getIndexesStatuses` every `REFRESH_TIMEOUT = 5000`ms (`getStatuses`, recursive `setTimeout`),
  mutating row status text (0%, Fetching, Completed, Error) live with no screen-reader
  announcement. **This is the actual bug locus.**
- `src/pages/dataSources/components/DataSourceStatus.tsx` — renders visual status badge/dot +
  `ProgressBar` per row; purely visual `title`/`classes`/`dotColor` derived from
  `item.is_queued/is_fetching/completed/error/current_state/complete_state`; no `aria-live`, no
  announcement hook; sole consumer is `DataSourcesPage.tsx`.
- `src/components/ProgressBar/ProgressBar.tsx` — renders `{percentage}%` visually; plain div, not
  wired to a live region.
- `src/pages/dataSources/DataSourceCreatePage.tsx` → `DataSourceForm.tsx` → `useCreateIndex.ts` —
  create flow always navigates back to `/data-sources` on success (`onClose?.()` →
  `navigateBack(DATASOURCES)`); status is only ever rendered in the `DataSourcesPage` table via the
  5s poll — no in-place status view during/after creation.
- `src/store/dataSources.ts` — `dataSourceStore.indexStatuses` (Valtio); `getIndexesStatuses` fetches
  `v1/index` and overwrites `indexStatuses` wholesale each poll.

## 3. Existing accessibility pattern to reuse (WCAG 4.1.3 — matches ticket title exactly)
- `src/components/Announcement/Announcement.tsx` — visually-hidden
  `<output aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</output>`.
- `src/hooks/useAnnouncementQueue.ts` — `useAnnouncementQueue({ gapMs, maxQueueSize })` returns
  `{ announcement, announce }`; serializes messages one at a time (clears via
  `requestAnimationFrame` so repeats re-announce); queue capped; default `gapMs` 1000ms.
- Used today in `FilesDropzone.tsx` (diffs previous vs current count in a `useEffect` + `useRef`,
  guards initial mount), `RecordInput.tsx`, and `ToasterAnnouncer.tsx` (portalled, cites WCAG 4.1.3
  in an inline comment as the rationale for the pattern — direct precedent for this ticket).
- Convention: mirror visible text exactly in the announcement (`DataSourceStatus`'s `title` values —
  "Queued"/"Fetching"/"Processing"/"Completed"/"Error" — plus `ProgressBar` percentage); never
  inline an ad hoc live region.

## 4. Tests
- No existing test covers `DataSourcesPage.tsx`'s status column or the 5s poll/refresh at all —
  coverage gap this fix must close.
- `src/components/Announcement/__tests__/Announcement.test.tsx` and
  `src/components/appLevel/ToasterAnnouncer/__tests__/ToasterAnnouncer.test.tsx` are templates for
  testing the announcer.
- `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx` is the
  naming/structure precedent for a new `DataSourcesPage`-scoped accessibility test.
- Test utils: `mockAPI('GET'|'POST', url, response)`, `renderPage(path)` (integration project).

## 5. Docs
- `.ai-run/guides/patterns/accessibility-patterns.md` — P0 guide; documents live-region patterns
  (`aria-live="polite"` for status, `assertive`+`role="alert"` for errors), `sr-only` convention.

## 6. Risk Indicators
- Low risk: single-page, additive change (announcement hook + effect), no API/schema change, no
  auth/migration/public-API surface.
- Existing reusable primitives (`Announcement`, `useAnnouncementQueue`) remove design risk — this is
  a wiring task, not new infrastructure.
- Care needed: diffing per-row status across a wholesale-overwritten poll array without
  over-announcing (only announce transitions, not every 5s tick) — same guard pattern as
  `FilesDropzone`'s `previousFilesCount` ref.

## 7. Codebase Findings (summary)
The status text shown in `DataSourceStatus.tsx` inside `DataSourcesPage.tsx`'s table (driven by a
5-second poll in `DataSourcesPage.tsx`) is purely visual with no screen-reader announcement. The
repo already has the exact mechanism needed for this class of problem —
`Announcement` + `useAnnouncementQueue`, explicitly cited elsewhere for WCAG 4.1.3 — and three
existing consumers demonstrate the diff-and-announce pattern. Fix: track previous status per
in-flight row in `DataSourcesPage.tsx`, diff on each poll tick, and call `announce()` with text
matching the visible status/percentage when it changes, rendering one `<Announcement>` in the page.
