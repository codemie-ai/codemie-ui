# Technical Research

**Task**: timezone utc-offset dropdown IANA
**Generated**: 2026-08-05T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Enhancement request EPMCDME-13800: In EPMCDME-11895 we added timezone selectors (e.g. Europe/Warsaw, Europe/Kiev). The new requirement is to mark each timezone name with its UTC offset (e.g. 'Europe/Warsaw (UTC+2)', 'Europe/Kiev (UTC+3)', 'UTC (UTC+0)'). The user asked if this can be done on the backend side — but current implementation is entirely client-side using Intl.supportedValuesOf('timeZone') and luxon. Research whether this change should live on the frontend or backend, and what exactly needs to change.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/timezone.ts` — sole source of timezone option generation. Exports:
  - `getIANATimezoneOptions(): FilterOption[]` — builds options list from `Intl.supportedValuesOf('timeZone')`, guarantees UTC is included, caches result in module-level `cachedOptions`. Current label formula: `tz.replace(/_/g, ' ')` — underscore-to-space only, no UTC offset.
  - `getBrowserTimezone(): string` — returns `Intl.DateTimeFormat().resolvedOptions().timeZone`, used as form default.
- `src/utils/helpers.ts` — imports `DateTime` from luxon (already a project dependency). No timezone offset utility exists here yet.
- `src/types/filters.ts` — defines `FilterOption` as `{ label: string; value: string | number | boolean | null; id?: string; badge?: string }`. The `value` field carries the IANA identifier; `label` is the display string.

### Architecture and Layers Affected

**Frontend display layer only.** The change touches:

1. **Utility layer** (`src/utils/timezone.ts`) — label generation must append UTC offset.
2. **Component layer** (`src/components/form/CronScheduleInput/CronScheduleInput.tsx`) — consumes `getIANATimezoneOptions()` directly for the `Autocomplete` timezone picker; will inherit the fix automatically once the utility is updated.
3. **Settings config layer** (`src/utils/settingsUIConfig.ts`) — consumes `getIANATimezoneOptions()` for the scheduler integration's `CredentialComponentType.select` timezone field (lines 794–798). Will inherit the fix automatically.
4. **Details read-only display** (`src/pages/dataSources/components/DataSourceDetails.tsx`, line 771) — renders `{dataSource.timezone}` directly from the API response, NOT from `getIANATimezoneOptions()`. This is a separate render path that requires its own change if the UTC offset label is also needed in read-only view.

**Backend is not involved.** The backend stores and returns the timezone as a plain IANA identifier string. It never constructs display labels. No backend changes are needed.

### Integration Points

- **Backend API** (`src/store/dataSources.ts`, `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts`): `timezone` is passed as `values.timezone || undefined` in create/update payloads and received as `timezone?: string | null` in `DataSourceDetailsResponse`. The IANA string is the contract — the label is irrelevant to the API.
- **Luxon** (`luxon` package, already imported in `helpers.ts`): `DateTime.now().setZone(ianaName).offset` returns the current UTC offset in minutes. No additional package is needed.
- **`Intl.supportedValuesOf('timeZone')`**: already used in `timezone.ts`; also available as a fallback for offset via `Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())`, but luxon is simpler and already present.

### Patterns and Conventions

- `FilterOption.value` always remains the raw IANA identifier (e.g. `"Europe/Warsaw"`). Only `label` changes. This ensures form submission and API payloads are unaffected.
- The module-level `cachedOptions` cache in `timezone.ts` will freeze UTC offsets at app-boot time. This is acceptable — DST changes during a browser session are a negligible edge case, consistent with how most timezone pickers work.
- The UTC offset string format in the requirement examples is `UTC+2`, `UTC+3`, `UTC+0` — not zero-padded hours, no minutes unless non-zero (e.g. `UTC+5:30` for Asia/Kolkata). The implementation should handle half-hour and quarter-hour offsets.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide files in `.ai-run/guides/` cover timezone formatting specifically. The relevant guides for this change are:
- `.ai-run/guides/architecture/layered-architecture.md` — confirms utility-layer pattern
- `.ai-run/guides/standards/code-quality.md` — TypeScript and formatting conventions

### Architectural Decisions

No recorded ADR for timezone handling. The EPMCDME-11895 implementation (the prior work that introduced the selectors) is the de-facto precedent — it established `Intl.supportedValuesOf` as the source-of-truth for the timezone list, deliberately keeping it client-side.

### Derived Conventions

- Timezone labels are display-only; the IANA identifier is always the value stored and transmitted.
- `FilterOption` is the standard type for Autocomplete and Select option arrays across the codebase.
- Utility functions with a caching pattern (like `cachedOptions`) are acceptable for data that does not change per render.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/timezone.test.ts` — covers `getIANATimezoneOptions()` and `getBrowserTimezone()` with vitest. Key test at line 32 asserts: `expect(opt.label).toBe((opt.value as string).replace(/_/g, ' '))`. This assertion will fail after the label format changes.
- `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx` — tests CronScheduleInput rendering; likely checks the Autocomplete receives options but does not assert specific label text.
- `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.test.ts` and `useEditPopupForm.validation.test.ts` — test form defaults and validation; `timezone` default (`getBrowserTimezone()`) is tested.

### Testing Framework and Patterns

- Vitest with `describe`/`it`/`expect`.
- Tests for `timezone.ts` use `Object.fromEntries` to look up options by IANA value key — this lookup pattern will still work after the label change.

### Coverage Gaps

- No test currently asserts that UTC offset is present in any label — new test(s) are needed to verify offset format (e.g. `UTC+0`, `UTC+2`, `UTC+5:30`).
- No test asserts the `DataSourceDetails` read-only timezone display. If that display is also updated to show the offset, a new test or snapshot update is needed.
- The caching behavior test (`getIANATimezoneOptions() === getIANATimezoneOptions()`) will still pass since we are not changing the cache mechanics.

---

## 5. Configuration and Environment

### Environment Variables

None. The timezone list and offset computation are pure runtime client-side logic using browser APIs and luxon.

### Configuration Files

None relevant. No feature flags govern timezone display.

### Feature Flags and Deployment Concerns

None. This is a pure UI label change with no backend deployment surface.

---

## 6. Risk Indicators

- **Breaking test**: `src/utils/__tests__/timezone.test.ts` line 32 asserts the exact label format `tz.replace(/_/g, ' ')`. This test MUST be updated as part of the change or it will fail CI.
- **Two consumers of `getIANATimezoneOptions()`**: `CronScheduleInput.tsx` (Autocomplete) and `settingsUIConfig.ts` (Select for scheduler integration). Both are automatically affected by the utility change — verify that the scheduler select renders correctly with longer label strings (layout regression risk).
- **Third render path not covered by utility**: `DataSourceDetails.tsx` line 771 renders `{dataSource.timezone}` directly. This will continue to show the raw IANA name (e.g. `Europe/Warsaw`) without the UTC offset unless explicitly updated.
- **Non-integer offset timezones**: `Asia/Kolkata` is UTC+5:30, `Asia/Kathmandu` is UTC+5:45, `Australia/Lord_Howe` is UTC+10:30. The offset formatting logic must handle minutes != 0. Format should be `UTC+5:30` not `UTC+5`.
- **DST ambiguity**: `DateTime.now().setZone(tz).offset` returns the CURRENT offset, which changes with DST. The cached result freezes at app load. The displayed offset may be stale across a DST boundary — this is a known limitation acceptable for a picker but should be documented.
- **`cachedOptions` must be reset if offsets are to stay accurate**: if the cache is populated at module load before `Intl` is fully ready (e.g. in SSR or test environments), offset could be 0. In the current vitest test environment, `DateTime.now().setZone(tz).offset` should work correctly since luxon uses the V8 timezone database.

---

## 7. Summary for Complexity Assessment

This change is a **pure frontend label-enhancement task** confined to a single utility file (`src/utils/timezone.ts`) and its tests. The core change is a one-function modification: `getIANATimezoneOptions()` must compute `DateTime.now().setZone(tz).offset` (luxon, already a project dependency) for each IANA name and append a formatted UTC offset string to the label. No new dependencies are required. The value field of each option remains unchanged, so API payloads, form validation, and store logic are completely unaffected.

The total file change surface is small: `timezone.ts` (label logic), `timezone.test.ts` (update one broken assertion, add new offset-format assertions), and optionally `DataSourceDetails.tsx` (one line: render offset alongside raw timezone string in the read-only details sidebar). The scheduler settings config and the CronScheduleInput component inherit the fix automatically with no code changes of their own.

The main risk factor is the non-trivial offset-formatting edge case for sub-hour timezones (India, Nepal, Chatham Islands), and the existing test that hard-asserts the old label format which will break if not updated in the same PR. Test coverage posture for this area is adequate but thin — the existing tests are functional checks, not label-contract checks, so new assertions are needed.
