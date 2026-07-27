# Timezone Selection for Datasource Scheduler — Frontend Spec

**Ticket:** EPMCDME-11895
**Date:** 2026-07-21
**Scope:** Frontend (`codemie-ui`). Backend implementation is already complete on `EPMCDME-11895_timezone-selection-for-scheduler-cron` in the `codemie` repo.

---

## Goal

Surface the new optional `timezone` field (IANA name, e.g. `"Europe/Warsaw"`) in the datasource scheduling UI. When set, the value is sent to the backend which applies it to the APScheduler `CronTrigger`. When absent the server falls back to UTC.

---

## Backend API Contract

All datasource create/update endpoints (`POST/PUT v1/index/knowledge_base/*`, `POST/PUT v1/application/:project/index`, etc.) now accept:

```json
{
  "cron_expression": "0 9 * * *",
  "timezone": "Europe/Warsaw"
}
```

- `timezone` is optional. When absent the server treats it as UTC.
- Only IANA names are valid (e.g. `"Europe/Warsaw"`, `"America/New_York"`, `"UTC"`). UTC offsets like `"UTC+2"` are rejected with HTTP 422.

Datasource detail responses (`GET v1/index/:id`) now include:

```json
{
  "cron_expression": "0 9 * * *",
  "timezone": "Europe/Warsaw"
}
```

Scheduler integration settings responses (`GET v1/settings/user`, `GET v1/settings/project`) now include a `timezone` credential value alongside `schedule`.

---

## Architecture

Two independent change paths share the same new timezone utility:

```
Path 1 (per-datasource cron):
  timezone.ts → CronScheduleInput → DataSourceForm
    → useEditPopupForm (schema) → useCreateIndex (payload) → API

Path 2 (scheduler integration):
  settingsUIConfig.ts → SettingsForm → settings API
```

---

## New Module: `src/utils/timezone.ts`

Provides two pure, side-effect-free exports:

- **`getIANATimezoneOptions(): FilterOption[]`** — calls `Intl.supportedValuesOf('timeZone')` lazily (on first call) and returns the list as `{label: tz.replace(/_/g, ' '), value: tz}` objects. Labels use spaces (`"America/New York"`) for readability and search-friendliness; values are the canonical IANA names (`"America/New_York"`) sent to the server. `"UTC"` is always present in the list (added explicitly if the runtime omits it) so that legacy integrations stored with `timezone: "UTC"` display correctly in the Autocomplete. Memoized — the same array reference is returned on repeated calls.
- **`getBrowserTimezone(): string`** — returns `Intl.DateTimeFormat().resolvedOptions().timeZone`.

No new npm packages.

---

## Modified: `CronScheduleInput`

**New optional props** (backward-compatible; existing consumers work unchanged):

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `timezone` | `string \| undefined` | `undefined` | Controlled timezone value |
| `onTimezoneChange` | `(tz: string) => void` | `undefined` | Called when timezone changes |

**Behaviour:**
- When `preset === SCHEDULE_PRESETS.NONE`, the timezone selector is not rendered.
- When any other preset is active, an `<Autocomplete>` field labelled **"Timezone"** appears after the Expression select row, using:
  - `options={getIANATimezoneOptions()}`
  - `localFilter={true}`
  - `allowNew={false}` (only valid IANA names accepted)
  - `placeholder="e.g. Europe/Warsaw"`
- When timezone changes, `onTimezoneChange` is called with the new string value.

---

## Modified: `useEditPopupForm.ts`

Schema addition:

```ts
timezone: Yup.string().optional()
```

Default value on create: `getBrowserTimezone()`.
Default value on edit: `defaults?.timezone ?? getBrowserTimezone()`.

---

## Modified: `DataSourceForm.tsx`

The `timezone` field is subscribed at component level using `useController` to avoid re-registration overhead from nesting inside the `cronExpression` Controller's render prop:

```tsx
// At component level:
const { field: timezoneField } = useController({ name: 'timezone', control })

// Inside the existing cronExpression Controller render prop:
<CronScheduleInput
  value={cronField.value ?? undefined}
  onChange={cronField.onChange}
  error={fieldState.error?.message}
  hint="Set up automatic reindexing schedule for this datasource. Manual reindexing will always be available."
  timezone={timezoneField.value}
  onTimezoneChange={timezoneField.onChange}
/>
```

---

## Modified: `useCreateIndex.ts`

`getBaseRequestFields()` adds:

```ts
timezone: values.timezone || undefined
```

`undefined` causes the key to be omitted from the JSON payload (the server then uses UTC). This applies to all create and update calls that spread `getBaseRequestFields()`.

In addition, all datasource-type-specific store functions in `src/store/dataSources.ts` (`createKBIndexJIRA`, `createKBIndexXray`, `createKBIndexAzureDevOpsWiki`, `createKBIndexAzureDevOpsWorkItem`, `createKBIndexGoogleDoc`) accept `timezone?: string` and forward it in their API request bodies. `useCreateIndex.ts` passes `request.timezone` at each of these call sites.

---

## Modified: `src/utils/helpers.ts`

`parseDate` uses `Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'` so that empty-string returns from non-standard environments fall back to `'UTC'` rather than passing an invalid zone string to Luxon.

---

## Modified: TypeScript types (`src/types/entity/dataSource.ts`)

```ts
// in DataSource
timezone?: string | null

// in DataSourceDetailsResponse
timezone?: string | null
```

---

## Modified: `DataSourceDetails.tsx`

In the SCHEDULER section, after the schedule description row, following the existing `<div className="flex flex-col gap-1">` pattern:

```tsx
{dataSource.timezone && (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-text-quaternary">Timezone</p>
    <p className="text-xs">{dataSource.timezone}</p>
  </div>
)}
```

When `timezone` is absent the row is omitted (server uses UTC, no need to call it out).

---

## Modified: `settingsUIConfig.ts`

In the `scheduler` credential type definition, add a `timezone` field as a searchable autocomplete, **required**:

```ts
timezone: {
  placeholder: 'Timezone (e.g. Europe/Warsaw)',
  type: CredentialComponentType.select,     // renders Autocomplete with local filtering
  options: getIANATimezoneOptions(),        // ~590 IANA names with space-separated labels
  validation: Yup.string().required('Timezone is required'),
}
```

This renders the same searchable `Autocomplete` as other `select`-type credential fields. The user must select a timezone before submitting (validated client-side); invalid free-text is rejected by `allowNew={false}`.

This covers the user/project scheduler integration path (e.g. "Run assistant on schedule").

---

## Testing

All tests use Vitest + React Testing Library, following existing patterns in the codebase.

| Test file | What it covers |
|---|---|
| `src/utils/__tests__/timezone.test.ts` | `getIANATimezoneOptions` returns a non-empty array; each option has `label = value.replace(/_/g, ' ')` (no underscores in labels); values always include `"UTC"` (legacy compat) and well-known IANA identifiers (`"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`); same reference returned on repeated calls; `getBrowserTimezone` returns a non-empty string |
| `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx` | Timezone select renders when preset ≠ NONE; hidden when preset === NONE; `onTimezoneChange` called on select |
| `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.test.ts` | `timezone` defaults to browser timezone on create; defaults to `defaults.timezone` on edit |

---

## Non-Goals

- No new npm packages for timezone data.
- No grouping or sorting of the IANA list beyond browser-native order.
- No "clear timezone" button — user can type/select a new value; clearing to empty omits timezone from payload.
- No custom frontend IANA validation logic — `allowNew={false}` on the Autocomplete restricts input to the browser-provided IANA list; the server is the authoritative validator.
