# Timezone UTC Offset Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `(UTC+N)` / `(UTC-N)` / `(UTC+N:MM)` offset suffix to every timezone name displayed in the UI — both picker dropdowns and the read-only DataSourceDetails display.

**Architecture:** Introduce a single `formatTimezoneLabel(tz)` helper in `src/utils/timezone.ts` that computes the current UTC offset from the IANA name via luxon and formats the full label. `getIANATimezoneOptions()` switches to calling it, which automatically propagates the change to both dropdown consumers. `DataSourceDetails.tsx` imports the same helper to annotate its read-only display.

**Tech Stack:** TypeScript, luxon (`DateTime.now().setZone(tz).offset`), Vitest

## Global Constraints

- No new npm dependencies — luxon is already in `package.json`
- `value` field in every `FilterOption` stays as the raw IANA string (e.g. `"Europe/Warsaw"`) — only `label` changes
- Sub-hour offsets must be formatted as `H:MM` (e.g. `UTC+5:30`), not just `H`
- UTC offset is computed at app-boot time (module cache); DST changes mid-session are an accepted limitation
- Commit messages must follow pattern: `EPMCDME-13800: Capital sentence`

---

### Task 1: Add `formatTimezoneLabel` and update `getIANATimezoneOptions`

**Test-first: yes — label matches `/^.+ \(UTC[+-]\d+(:\d{2})?\)$/` for every option; UTC entry matches `"UTC (UTC+0)"`**

**Files:**
- Modify: `src/utils/timezone.ts`
- Modify: `src/utils/__tests__/timezone.test.ts`

**Interfaces:**
- Produces: `formatTimezoneLabel(tz: string): string` — exported, used by Task 2
  - Input: raw IANA timezone string, e.g. `"Europe/Warsaw"`, `"Asia/Kolkata"`, `"UTC"`
  - Output: display label, e.g. `"Europe/Warsaw (UTC+2)"`, `"Asia/Kolkata (UTC+5:30)"`, `"UTC (UTC+0)"`

- [ ] **Step 1: Write the failing tests**

Replace the content of `src/utils/__tests__/timezone.test.ts` with:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { describe, it, expect } from 'vitest'

import { getIANATimezoneOptions, getBrowserTimezone, formatTimezoneLabel } from '../timezone'

describe('formatTimezoneLabel', () => {
  it('appends UTC+0 for UTC', () => {
    expect(formatTimezoneLabel('UTC')).toBe('UTC (UTC+0)')
  })

  it('replaces underscores with spaces in the name part', () => {
    const label = formatTimezoneLabel('America/New_York')
    expect(label).toMatch(/^America\/New York /)
  })

  it('label matches UTC offset pattern', () => {
    const label = formatTimezoneLabel('Europe/Warsaw')
    expect(label).toMatch(/^Europe\/Warsaw \(UTC[+-]\d+(:\d{2})?\)$/)
  })

  it('formats sub-hour offset with minutes (Asia/Kolkata = UTC+5:30)', () => {
    const label = formatTimezoneLabel('Asia/Kolkata')
    expect(label).toMatch(/^Asia\/Kolkata \(UTC\+5:30\)$/)
  })

  it('formats sub-hour offset with minutes (Asia/Kathmandu = UTC+5:45)', () => {
    const label = formatTimezoneLabel('Asia/Kathmandu')
    expect(label).toMatch(/^Asia\/Kathmandu \(UTC\+5:45\)$/)
  })
})

describe('getIANATimezoneOptions', () => {
  it('returns a non-empty array', () => {
    const options = getIANATimezoneOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it('each option label has UTC offset suffix', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(opt.label).toMatch(/\(UTC[+-]\d+(:\d{2})?\)$/)
    })
  })

  it('each option label has no underscores in the name part', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      const namePart = opt.label.replace(/ \(UTC[+-]\d+(:\d{2})?\)$/, '')
      expect(namePart).not.toContain('_')
    })
  })

  it('value is still the raw IANA string (not modified)', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(typeof opt.value).toBe('string')
      expect(opt.label).not.toBe(opt.value)
    })
  })

  it('UTC entry label is "UTC (UTC+0)"', () => {
    const options = getIANATimezoneOptions()
    const utcOption = options.find((o) => o.value === 'UTC')
    expect(utcOption).toBeDefined()
    expect(utcOption!.label).toBe('UTC (UTC+0)')
  })

  it('always includes UTC value', () => {
    const values = getIANATimezoneOptions().map((o) => o.value)
    expect(values).toContain('UTC')
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

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/__tests__/timezone.test.ts
```

Expected: FAIL — `formatTimezoneLabel is not exported` and label assertions fail on existing `getIANATimezoneOptions` output.

- [ ] **Step 3: Implement `formatTimezoneLabel` and update `getIANATimezoneOptions`**

Replace `src/utils/timezone.ts` with:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { DateTime } from 'luxon'

import { FilterOption } from '@/types/filters'

const intlWithTimezones = Intl as unknown as { supportedValuesOf(type: string): string[] }

let cachedOptions: FilterOption[] | null = null

function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return minutes === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

export const formatTimezoneLabel = (tz: string): string => {
  const name = tz.replace(/_/g, ' ')
  const offsetMinutes = DateTime.now().setZone(tz).offset
  return `${name} (${formatUtcOffset(offsetMinutes)})`
}

export const getIANATimezoneOptions = (): FilterOption[] => {
  if (!cachedOptions) {
    const supported = intlWithTimezones.supportedValuesOf('timeZone')
    const timezones = supported.includes('UTC') ? supported : ['UTC', ...supported]
    cachedOptions = timezones.map((tz) => ({
      label: formatTimezoneLabel(tz),
      value: tz,
    }))
  }
  return cachedOptions
}

export const getBrowserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/__tests__/timezone.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/timezone.ts src/utils/__tests__/timezone.test.ts
git commit -m "EPMCDME-13800: Add UTC offset suffix to timezone option labels"
```

---

### Task 2: Show UTC offset in DataSourceDetails read-only display

**Test-first: no — this is a JSX render change in an integration-tested component; the unit test coverage lives in Task 1's `formatTimezoneLabel` tests.**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceDetails.tsx:773`

**Interfaces:**
- Consumes: `formatTimezoneLabel(tz: string): string` from `src/utils/timezone` (exported in Task 1)

- [ ] **Step 1: Import `formatTimezoneLabel` in `DataSourceDetails.tsx`**

Find the existing import block at the top of `src/pages/dataSources/components/DataSourceDetails.tsx`. Add the import alongside other utility imports:

```typescript
import { formatTimezoneLabel } from '@/utils/timezone'
```

- [ ] **Step 2: Replace the raw timezone render at line 773**

Find this block (around line 770):

```tsx
{dataSource.timezone && (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-text-quaternary">Timezone</p>
    <p className="text-xs">{dataSource.timezone}</p>
  </div>
)}
```

Replace with:

```tsx
{dataSource.timezone && (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-text-quaternary">Timezone</p>
    <p className="text-xs">{formatTimezoneLabel(dataSource.timezone)}</p>
  </div>
)}
```

- [ ] **Step 3: Run the full test suite to catch regressions**

```bash
npx vitest run
```

Expected: all tests PASS (no regressions from the import or render change).

- [ ] **Step 4: Commit**

```bash
git add src/pages/dataSources/components/DataSourceDetails.tsx
git commit -m "EPMCDME-13800: Show UTC offset in DataSource timezone detail display"
```
