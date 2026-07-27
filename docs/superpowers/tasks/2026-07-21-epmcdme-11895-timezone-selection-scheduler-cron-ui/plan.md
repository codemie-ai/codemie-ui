# Timezone Selection for Datasource Scheduler — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional timezone selection to the datasource scheduler UI, sending the IANA timezone value to the backend alongside the cron expression.

**Architecture:** New `timezone.ts` utility provides a lazily-initialized IANA timezone list and a browser-default helper. `CronScheduleInput` gains optional `timezone`/`onTimezoneChange` props and renders a searchable `Autocomplete` when a schedule is active. The form schema, API payload builder, TypeScript types, and detail view are updated end-to-end. The scheduler integration credential type also gains a free-text timezone field.

**Tech Stack:** React, TypeScript, React Hook Form, Yup, PrimeReact Autocomplete (via `@/components/form/Autocomplete`), Vitest, React Testing Library

## Global Constraints

- No new npm packages — use `Intl.supportedValuesOf('timeZone')` for the IANA list.
- Default timezone: browser's local timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- On edit: `defaults.timezone ?? getBrowserTimezone()`.
- Commit messages: `EPMCDME-11895: <Capital sentence>`.
- Tests: Vitest + React Testing Library, follow patterns from `src/utils/__tests__/` and `src/components/__tests__/`.
- `allowNew={false}` on the Autocomplete — only IANA names accepted by the picker (server validates anyway).

---

### Task 1: Timezone utility module

**Files:**
- Create: `src/utils/timezone.ts`
- Create: `src/utils/__tests__/timezone.test.ts`

**Interfaces:**
- Produces:
  - `getIANATimezoneOptions(): FilterOption[]` — lazily-initialized array of `{ label: tz, value: tz }` for every IANA timezone
  - `getBrowserTimezone(): string` — `Intl.DateTimeFormat().resolvedOptions().timeZone`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/timezone.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

import { getIANATimezoneOptions, getBrowserTimezone } from '../timezone'

describe('getIANATimezoneOptions', () => {
  it('returns a non-empty array', () => {
    const options = getIANATimezoneOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it('each option has matching label and value strings', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(typeof opt.label).toBe('string')
      expect(opt.label).toBe(opt.value)
    })
  })

  it('includes well-known IANA timezones', () => {
    const values = getIANATimezoneOptions().map((o) => o.value)
    expect(values).toContain('UTC')
    expect(values).toContain('America/New_York')
    expect(values).toContain('Europe/London')
  })

  it('returns the same reference on repeated calls (cached)', () => {
    expect(getIANATimezoneOptions()).toBe(getIANATimezoneOptions())
  })
})

describe('getBrowserTimezone', () => {
  it('returns a non-empty string', () => {
    const tz = getBrowserTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/timezone.test.ts
```

Expected: FAIL with `Cannot find module '../timezone'`

- [ ] **Step 3: Implement `src/utils/timezone.ts`**

```typescript
import { FilterOption } from '@/types/filters'

let cachedOptions: FilterOption[] | null = null

export const getIANATimezoneOptions = (): FilterOption[] => {
  if (!cachedOptions) {
    cachedOptions = Intl.supportedValuesOf('timeZone').map((tz) => ({
      label: tz,
      value: tz,
    }))
  }
  return cachedOptions
}

export const getBrowserTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/timezone.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/timezone.ts src/utils/__tests__/timezone.test.ts
git commit -m "EPMCDME-11895: Add timezone utility with IANA options and browser default"
```

---

### Task 2: Extend CronScheduleInput with timezone selector

**Files:**
- Modify: `src/components/form/CronScheduleInput/CronScheduleInput.tsx`
- Create: `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx`

**Interfaces:**
- Consumes: `getIANATimezoneOptions(): FilterOption[]` from `src/utils/timezone.ts`
- Produces:
  - Extended `CronScheduleInputProps` with `timezone?: string` and `onTimezoneChange?: (tz: string) => void`
  - `<Autocomplete label="Timezone" ...>` visible when `preset !== SCHEDULE_PRESETS.NONE`

- [ ] **Step 1: Write the failing test**

Create `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock timezone utility so Intl.supportedValuesOf is never called in tests
vi.mock('@/utils/timezone', () => ({
  getIANATimezoneOptions: () => [
    { label: 'UTC', value: 'UTC' },
    { label: 'Europe/Warsaw', value: 'Europe/Warsaw' },
  ],
}))

// Stub PrimeReact-backed Autocomplete — renders just its label to keep tests fast
vi.mock('@/components/form/Autocomplete', () => ({
  default: ({ label }: { label?: string }) => (
    <div data-testid="autocomplete">{label && <span>{label}</span>}</div>
  ),
}))

// Stub PrimeReact-backed Select
vi.mock('@/components/form/Select', () => ({
  default: () => <div data-testid="select" />,
}))

import CronScheduleInput from '../CronScheduleInput'

describe('CronScheduleInput — timezone selector', () => {
  it('shows the Timezone selector when an active schedule preset is set (hourly)', () => {
    render(
      <CronScheduleInput
        value="0 * * * *"
        onChange={vi.fn()}
        timezone="UTC"
        onTimezoneChange={vi.fn()}
      />
    )
    expect(screen.getByText('Timezone')).toBeInTheDocument()
  })

  it('hides the Timezone selector when preset is NONE (empty value)', () => {
    render(
      <CronScheduleInput
        value=""
        onChange={vi.fn()}
        timezone="UTC"
        onTimezoneChange={vi.fn()}
      />
    )
    expect(screen.queryByText('Timezone')).not.toBeInTheDocument()
  })

  it('shows the Timezone selector for daily preset', () => {
    render(
      <CronScheduleInput
        value="0 0 * * *"
        onChange={vi.fn()}
        timezone="Europe/Warsaw"
        onTimezoneChange={vi.fn()}
      />
    )
    expect(screen.getByText('Timezone')).toBeInTheDocument()
  })

  it('renders without timezone props (backward compat — no crash)', () => {
    expect(() =>
      render(<CronScheduleInput value="" onChange={vi.fn()} />)
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx
```

Expected: FAIL — component does not have `timezone`/`onTimezoneChange` props and renders no "Timezone" text

- [ ] **Step 3: Update `CronScheduleInput.tsx`**

**3a.** Add two imports after the existing import block (after `import { cn } from '@/utils/utils'`):

```tsx
import Autocomplete from '@/components/form/Autocomplete'
import { getIANATimezoneOptions } from '@/utils/timezone'
```

**3b.** Replace the `interface CronScheduleInputProps` block (lines 36–46) with:

```tsx
interface CronScheduleInputProps {
  value?: string
  onChange: (cronExpression: string) => void
  reindexType?: ReindexType
  onReindexTypeChange?: (type: ReindexType) => void
  error?: string
  disabled?: boolean
  hint?: string
  className?: string
  required?: boolean
  timezone?: string
  onTimezoneChange?: (tz: string) => void
}
```

**3c.** In the destructured props (lines 50–61), add the two new props:

```tsx
    {
      value = '',
      onChange,
      reindexType = REINDEX_TYPES.SCHEDULER,
      onReindexTypeChange,
      error,
      disabled = false,
      hint,
      className,
      required = false,
      timezone,
      onTimezoneChange,
    },
```

**3d.** In the JSX return, after `{hint && <InfoBox text={hint} />}` (line 133) and before `{isCustom && (`, add the timezone Autocomplete:

```tsx
        {preset !== SCHEDULE_PRESETS.NONE && (
          <Autocomplete
            label="Timezone"
            value={timezone ?? ''}
            onChange={onTimezoneChange}
            options={getIANATimezoneOptions()}
            localFilter={true}
            allowNew={false}
            placeholder="e.g. Europe/Warsaw"
            disabled={disabled}
          />
        )}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/form/CronScheduleInput/CronScheduleInput.tsx \
        src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx
git commit -m "EPMCDME-11895: Add timezone selector to CronScheduleInput"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `src/types/entity/dataSource.ts`

**Interfaces:**
- Produces: `DataSource.timezone?: string | null` and `DataSourceDetailsResponse.timezone?: string | null`

No new tests — these are additive type changes; existing tests continue to compile.

- [ ] **Step 1: Add `timezone` to `DataSource` interface**

In `src/types/entity/dataSource.ts`, in the `DataSource` interface, after the line `cron_expression?: string | null` (line 136), add:

```ts
  timezone?: string | null
```

- [ ] **Step 2: Add `timezone` to `DataSourceDetailsResponse` interface**

In `src/types/entity/dataSource.ts`, in the `DataSourceDetailsResponse` interface, after the line `cron_expression?: string | null` (line 196), add:

```ts
  timezone?: string | null
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 4: Commit**

```bash
git add src/types/entity/dataSource.ts
git commit -m "EPMCDME-11895: Add timezone field to DataSource TypeScript types"
```

---

### Task 4: Update form schema and defaults in useEditPopupForm

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts`

**Interfaces:**
- Consumes: `getBrowserTimezone()` from `src/utils/timezone.ts`
- Produces: `FormValues.timezone: string | undefined`, defaulting to browser timezone on create and `defaults.timezone ?? getBrowserTimezone()` on edit

- [ ] **Step 1: Add import for `getBrowserTimezone`**

At the top of `useEditPopupForm.ts`, after the existing import block, add:

```ts
import { getBrowserTimezone } from '@/utils/timezone'
```

- [ ] **Step 2: Add `timezone` to the Yup schema**

In `baseValidationSchema`, find the end of the schema definition before `.shape(guardrailAssignmentsSchema)`. Currently it ends with the `cronExpression` field:

```ts
  cronExpression: Yup.string()
    .notRequired()
    .test('valid-cron', function (value) {
      if (!value || value.trim() === '') return true
      const error = validateCronExpression(value)
      if (error) {
        return this.createError({ message: error })
      }
      return true
    }),
}).shape(guardrailAssignmentsSchema)
```

Replace with:

```ts
  cronExpression: Yup.string()
    .notRequired()
    .test('valid-cron', function (value) {
      if (!value || value.trim() === '') return true
      const error = validateCronExpression(value)
      if (error) {
        return this.createError({ message: error })
      }
      return true
    }),
  timezone: Yup.string().optional(),
}).shape(guardrailAssignmentsSchema)
```

- [ ] **Step 3: Add `timezone` to `defaultValues` in `useForm`**

In the `defaultValues` object inside `useForm` (the object starting around line 331), after `cronExpression: '',` add:

```ts
      timezone: getBrowserTimezone(),
```

- [ ] **Step 4: Add `timezone` to `resetInitFormValues`**

In the `mergedValues` object inside `resetInitFormValues` (around line 382), after `cronExpression: defaults?.cron_expression ?? '',` add:

```ts
      timezone: defaults?.timezone ?? getBrowserTimezone(),
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts
git commit -m "EPMCDME-11895: Add timezone to form schema with browser default"
```

---

### Task 5: Include timezone in the API payload

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts`

**Interfaces:**
- Consumes: `FormValues.timezone: string | undefined`
- Produces: `timezone: string | undefined` in `getBaseRequestFields` return value (`undefined` → key omitted from JSON → server falls back to UTC)

- [ ] **Step 1: Update `getBaseRequestFields` and type-specific store functions**

In `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts`, in `getBaseRequestFields` (lines 57–70), after `cron_expression: values.cronExpression,` add:

```ts
  timezone: values.timezone || undefined,
```

Also add `timezone?: string` as a trailing optional parameter + request body field to the following functions in `src/store/dataSources.ts`: `createKBIndexJIRA`, `createKBIndexXray`, `createKBIndexAzureDevOpsWiki`, `createKBIndexAzureDevOpsWorkItem`, `createKBIndexGoogleDoc`. Pass `request.timezone` at each corresponding call site in `useCreateIndex.ts` and `timezone: request.timezone` in the SharePoint object literal call.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts
git commit -m "EPMCDME-11895: Include timezone in datasource API request payload"
```

---

### Task 6: Wire timezone Controller in DataSourceForm

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`

**Interfaces:**
- Consumes: `timezone` and `onTimezoneChange` props on `CronScheduleInput` (from Task 2)
- Produces: nested `Controller` for `name="timezone"` inside the existing `cronExpression` Controller, passing both fields to a single `CronScheduleInput`

- [ ] **Step 1: Subscribe timezone at component level and pass to CronScheduleInput**

Call `useController` at the top of the `DataSourceForm` component body (not inside a render prop) to avoid re-registration overhead:

```ts
import { Controller, SubmitHandler, useController } from 'react-hook-form'

// Inside DataSourceForm component body (alongside other hooks):
const { field: timezoneField } = useController({ name: 'timezone', control })
```

Then pass `timezoneField` bindings directly to `CronScheduleInput` inside the existing `cronExpression` Controller render prop:

```tsx
<Controller
  name="cronExpression"
  control={control}
  render={({ field: cronField, fieldState }) => (
    <CronScheduleInput
      value={cronField.value ?? undefined}
      onChange={cronField.onChange}
      error={fieldState.error?.message}
      hint="Set up automatic reindexing schedule for this datasource. Manual reindexing will always be available."
      timezone={timezoneField.value}
      onTimezoneChange={timezoneField.onChange}
    />
  )}
/>
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx
git commit -m "EPMCDME-11895: Bind timezone Controller to CronScheduleInput in DataSourceForm"
```

---

### Task 7: Show timezone in DataSourceDetails

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceDetails.tsx`

**Interfaces:**
- Consumes: `DataSourceDetailsResponse.timezone?: string | null` (from Task 3)

- [ ] **Step 1: Add the timezone row in the SCHEDULER section**

In `DataSourceDetails.tsx`, inside the `cron_expression` truthy branch, find the closing `</>` that wraps the "Next scheduled run", "Schedule", and "Cron expression" rows (approximately after line 769). Just before that `</>`, add:

```tsx
                  {dataSource.timezone && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-text-quaternary">Timezone</p>
                      <p className="text-xs">{dataSource.timezone}</p>
                    </div>
                  )}
```

The full updated `cron_expression` truthy branch should look like:

```tsx
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-text-quaternary">Next scheduled run</p>
                    <p className="text-xs">{formatScheduleDate(nextRun)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-text-quaternary">Schedule</p>
                    <p className="text-xs">{cronDescription}</p>
                  </div>
                  {isCustomSchedule && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-text-quaternary">Cron expression</p>
                      <code className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5 font-mono text-text-primary">
                        {dataSource.cron_expression}
                      </code>
                    </div>
                  )}
                  {dataSource.timezone && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-text-quaternary">Timezone</p>
                      <p className="text-xs">{dataSource.timezone}</p>
                    </div>
                  )}
                </>
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/components/DataSourceDetails.tsx
git commit -m "EPMCDME-11895: Show timezone in DataSourceDetails scheduler section"
```

---

### Task 8: Add timezone field to scheduler integration settings

**Files:**
- Modify: `src/utils/settingsUIConfig.ts`

**Interfaces:**
- Produces: `scheduler.fields.timezone` — a plain text input for IANA name entry

- [ ] **Step 1: Add `timezone` field to the `scheduler.fields` object**

In `src/utils/settingsUIConfig.ts`, find the `prompt` field inside `scheduler.fields` (around line 708). After the closing brace of `prompt`, add a `timezone` field before the closing `}` of `fields`:

Current end of `scheduler.fields`:

```ts
      prompt: {
        placeholder: 'Initial prompt to send to the resource',
        type: CredentialComponentType.textarea,
        rows: 5,
        shouldShow: isWorkflowOrAsstResource,
      },
    },
  },
```

Replace with:

```ts
      prompt: {
        placeholder: 'Initial prompt to send to the resource',
        type: CredentialComponentType.textarea,
        rows: 5,
        shouldShow: isWorkflowOrAsstResource,
      },
      timezone: {
        placeholder: 'e.g. Europe/Warsaw',
        type: CredentialComponentType.input,
      },
    },
  },
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero new errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/settingsUIConfig.ts
git commit -m "EPMCDME-11895: Add timezone field to scheduler integration settings"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| New `src/utils/timezone.ts` with `getIANATimezoneOptions` + `getBrowserTimezone` | Task 1 |
| `CronScheduleInput` gets `timezone` + `onTimezoneChange` props | Task 2 |
| Timezone selector hidden when preset = NONE | Task 2 |
| Timezone selector visible for all other presets | Task 2 |
| `Autocomplete` with `localFilter`, `allowNew=false`, placeholder | Task 2 |
| `DataSource.timezone?: string \| null` type | Task 3 |
| `DataSourceDetailsResponse.timezone?: string \| null` type | Task 3 |
| `timezone: Yup.string().optional()` in schema | Task 4 |
| `timezone: getBrowserTimezone()` in create defaultValues | Task 4 |
| `timezone: defaults?.timezone ?? getBrowserTimezone()` in edit reset | Task 4 |
| `timezone: values.timezone \|\| undefined` in payload | Task 5 |
| Controller binding in DataSourceForm | Task 6 |
| Timezone row in DataSourceDetails SCHEDULER section | Task 7 |
| `scheduler.fields.timezone` in settingsUIConfig | Task 8 |

All spec requirements are covered. No gaps.

### Placeholder scan

No TBD, TODO, or vague requirements. All code blocks are complete.

### Type consistency

- `FilterOption` used in Task 1 matches the definition in `src/types/filters.ts` (`{ label: string; value: string | number | boolean | null }`).
- `timezone?: string` in `CronScheduleInputProps` (Task 2) matches `timezoneField.value` binding (Task 6) and `Yup.string().optional()` schema (Task 4).
- `values.timezone` in `getBaseRequestFields` (Task 5) is typed via `FormValues` (the Yup inferred type) — `string | undefined` which `|| undefined` normalises correctly.
