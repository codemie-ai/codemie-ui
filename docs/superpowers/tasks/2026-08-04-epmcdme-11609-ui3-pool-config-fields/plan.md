# Sub-workflow Pool Config Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pool_config` and `max_nesting_level` editable fields to `AdvancedConfigTab.tsx`, gated behind `useSubWorkflowEnabled()`.

**Architecture:** Single-file change to `AdvancedConfigTab.tsx`. A new "Sub-workflow Pool" `ConfigAccordion` is rendered only when `isSubWorkflowEnabled && isSubWorkflowLoaded`. The accordion hosts an "Enable Pool" `Switch` and (when toggled on) three numeric inputs for pool sizing, plus a `max_nesting_level` input always visible when the flag is on. All Yup schema, `getDefaultValues`, and `cleanFormValues` helpers live inline in the same file following the established `retry_policy` pattern.

**Tech Stack:** React 18, react-hook-form, Yup, Vitest + @testing-library/react, Tailwind CSS

## Global Constraints

- Only `AdvancedConfigTab.tsx` and its new test file are changed. `WorkflowFormFields.tsx` and `workflowSchema.ts` are **not touched**.
- Use `FieldController` (never bare `Controller`) for all new form inputs.
- Feature-flag gate: `isSubWorkflowEnabled && isSubWorkflowLoaded`. Both booleans must be true before rendering the section.
- Commit message format: `EPMCDME-11609: Capital sentence` (enforced by CI).
- Run `npm run lint && npm run typecheck` before every commit.

---

### Task 1: Write failing tests for the new Sub-workflow Pool section

**Test-first: yes — "renders pool config section when flag enabled" (fails because the section does not exist yet)**

**Files:**
- Create: `src/pages/workflows/editor/configPanels/__tests__/AdvancedConfigTab.test.tsx`

**Interfaces:**
- Consumes: `AdvancedConfigTab` (default export), `AdvancedConfigTabRef` from `../AdvancedConfigTab`
- Consumes: `WorkflowConfiguration`, `WorkflowPoolConfig` from `@/types/workflowEditor/configuration`

- [ ] **Step 1: Create the test file with boilerplate and mocks**

```tsx
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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import AdvancedConfigTab, { AdvancedConfigTabRef } from '../AdvancedConfigTab'

// --- Mocks ---

const mockUseSubWorkflowEnabled = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useFeatureFlags', () => ({
  useSubWorkflowEnabled: mockUseSubWorkflowEnabled,
}))

vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({ activeIssue: null }),
}))

vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid={`accordion-${title}`}>{children}</div>
  ),
}))

// --- Fixtures ---

const emptyConfig: WorkflowConfiguration = { states: [] }

const defaultProps = {
  config: emptyConfig,
  workflow: undefined,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
}
```

- [ ] **Step 2: Write the "flag off → section hidden" test**

Append to the test file:

```tsx
describe('AdvancedConfigTab — Sub-workflow Pool section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render pool section when sub-workflow flag is off', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([false, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByTestId('accordion-Sub-workflow Pool')).toBeNull()
  })

  it('does not render pool section while flag is still loading', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, false])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByTestId('accordion-Sub-workflow Pool')).toBeNull()
  })

  it('renders pool section when sub-workflow flag is on and loaded', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByTestId('accordion-Sub-workflow Pool')).toBeDefined()
  })

  it('renders max_nesting_level input when flag is on', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByLabelText(/max nesting level/i)).toBeDefined()
  })

  it('hides numeric pool fields when enabled toggle is off (default)', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByLabelText(/min size/i)).toBeNull()
    expect(screen.queryByLabelText(/max size/i)).toBeNull()
    expect(screen.queryByLabelText(/refill interval/i)).toBeNull()
  })

  it('shows numeric pool fields after enabling the pool toggle', async () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    const user = userEvent.setup()
    render(<AdvancedConfigTab {...defaultProps} />)
    await user.click(screen.getByRole('checkbox', { name: /enable pool/i }))
    expect(screen.getByLabelText(/min size/i)).toBeDefined()
    expect(screen.getByLabelText(/max size/i)).toBeDefined()
    expect(screen.getByLabelText(/refill interval/i)).toBeDefined()
  })

  it('form is not dirty on initial render when no pool_config is set', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    const ref = createRef<AdvancedConfigTabRef>()
    render(<AdvancedConfigTab {...defaultProps} ref={ref} />)
    expect(ref.current?.isDirty()).toBe(false)
  })

  it('shows max >= min validation error when max_size < min_size', async () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    const user = userEvent.setup()
    render(<AdvancedConfigTab {...defaultProps} />)
    await user.click(screen.getByRole('checkbox', { name: /enable pool/i }))
    await user.type(screen.getByLabelText(/min size/i), '10')
    await user.type(screen.getByLabelText(/max size/i), '5')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/max size must be >= min size/i)).toBeDefined()
    })
  })
})
```

- [ ] **Step 3: Run the tests and confirm they all fail (RED)**

```bash
npm run test:unit -- --run --reporter=verbose src/pages/workflows/editor/configPanels/__tests__/AdvancedConfigTab.test.tsx
```

Expected: all 8 tests fail — the pool section JSX does not exist yet. Verify the failures are expected before proceeding.

- [ ] **Step 4: Commit the failing test file**

```bash
git add src/pages/workflows/editor/configPanels/__tests__/AdvancedConfigTab.test.tsx
git commit -m "EPMCDME-11609: Add failing tests for Sub-workflow Pool section in AdvancedConfigTab"
```

---

### Task 2: Implement Sub-workflow Pool section in AdvancedConfigTab

**Test-first: yes — (tests from Task 1 are the failing tests; implementation makes them green)**

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx`

**Interfaces:**
- Produces: `AdvancedConfigTab` still exports `AdvancedConfigTabRef` with `{ isDirty(): boolean; save(): Promise<boolean> }` — interface unchanged.

- [ ] **Step 1: Add the `useSubWorkflowEnabled` import and `watch` to the useForm destructure**

In `AdvancedConfigTab.tsx`, add to the existing absolute imports group (after `@/utils/toaster`):

```tsx
import { useSubWorkflowEnabled } from '@/hooks/useFeatureFlags'
```

Change the existing `useForm` destructure from:
```tsx
const { control, reset, trigger, getValues } = useForm<Partial<WorkflowConfiguration>>({
```
to:
```tsx
const { control, reset, trigger, getValues, watch } = useForm<Partial<WorkflowConfiguration>>({
```

- [ ] **Step 2: Extend the module-level Yup schema**

After the closing brace of the `retry_policy` shape (line ~121 before this change), append before the outer `schema` closing paren:

```tsx
  max_nesting_level: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive('Must be a positive number')
    .integer('Must be an integer')
    .max(10, 'Must be at most 10'),
  pool_config: yup
    .object()
    .shape({
      enabled: yup.boolean().optional(),
      min_size: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToInteger)
        .min(1, 'Must be at least 1')
        .max(20, 'Must be at most 20')
        .integer('Must be an integer'),
      max_size: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToInteger)
        .min(1, 'Must be at least 1')
        .max(50, 'Must be at most 50')
        .integer('Must be an integer')
        .when('min_size', (min_size, schema) =>
          min_size[0]
            ? schema.min(min_size[0], 'Max size must be >= min size')
            : schema
        ),
      refill_interval_seconds: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToInteger)
        .min(5, 'Must be at least 5')
        .integer('Must be an integer'),
    })
    .optional(),
```

- [ ] **Step 3: Extend `getDefaultValues` with `max_nesting_level` and `pool_config`**

Inside `getDefaultValues`, after the `recursion_limit` line in `defaults`:

```tsx
max_nesting_level: config?.max_nesting_level ?? workflow?.max_nesting_level ?? undefined,
```

After the closing `}` of the `retry_policy` block and before `return defaults`:

```tsx
const poolConfig = config?.pool_config ?? workflow?.pool_config
if (poolConfig) {
  const hasAnyValue =
    poolConfig.enabled === true ||
    poolConfig.min_size != null ||
    poolConfig.max_size != null ||
    poolConfig.refill_interval_seconds != null

  if (hasAnyValue) {
    defaults.pool_config = {
      enabled: poolConfig.enabled ?? false,
      min_size: poolConfig.min_size ?? undefined,
      max_size: poolConfig.max_size ?? undefined,
      refill_interval_seconds: poolConfig.refill_interval_seconds ?? undefined,
    }
  }
}
```

- [ ] **Step 4: Extend `cleanFormValues` with a `pool_config` guard**

In `cleanFormValues`, after the existing `retry_policy` guard block:

```tsx
if (
  cleaned.pool_config &&
  Object.values(cleaned.pool_config).every((v) => v == null || v === '' || v === false)
) {
  delete cleaned.pool_config
}
```

- [ ] **Step 5: Add state, feature-flag hook, `watch`, and extend accordion tracking**

Inside the component body, after the existing three `useState` calls:

```tsx
const [poolConfigExpanded, setPoolConfigExpanded] = useState(false)
const [isSubWorkflowEnabled, isSubWorkflowLoaded] = useSubWorkflowEnabled()
const watchPoolEnabled = watch('pool_config.enabled')
```

Extend the `activeIssueAccordion` memo — after the `retry_policy` branch and before `return null`:

```tsx
if (
  path.startsWith('pool_config.') ||
  path === 'pool_config' ||
  path === 'max_nesting_level'
) {
  return 'poolConfig'
}
```

Extend the auto-expand `useEffect` — after the `retryPolicy` branch:

```tsx
else if (activeIssueAccordion === 'poolConfig' && !poolConfigExpanded) {
  setPoolConfigExpanded(true)
}
```

Add `poolConfigExpanded` to the `useEffect` dependency array.

- [ ] **Step 6: Add the Sub-workflow Pool JSX accordion**

After the closing `</ConfigAccordion>` of the "Retry Policy" section and before the closing `</form>` tag:

```tsx
{isSubWorkflowEnabled && isSubWorkflowLoaded && (
  <ConfigAccordion
    title="Sub-workflow Pool"
    expanded={poolConfigExpanded}
    onExpandedChange={setPoolConfigExpanded}
  >
    <div className="flex flex-col gap-4">
      <FieldController
        name="pool_config.enabled"
        control={control}
        render={({ field, fieldState }) => (
          <Switch
            id="pool_config_enabled"
            label="Enable Pool"
            value={field.value || false}
            onChange={(e) => field.onChange(e.target.checked)}
            error={fieldState.error?.message}
            ref={field.ref}
          />
        )}
      />

      {watchPoolEnabled && (
        <>
          <FieldController
            name="pool_config.min_size"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                id="pool_config_min_size"
                type="number"
                label="Min Size"
                orientation="horizontal"
                hint="Minimum pre-instantiated sub-workflow instances. Range: 1–20."
                placeholder="2"
                inputClass="w-12"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <FieldController
            name="pool_config.max_size"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                id="pool_config_max_size"
                type="number"
                label="Max Size"
                orientation="horizontal"
                hint="Maximum pool size. Must be >= min size. Range: 1–50."
                placeholder="5"
                inputClass="w-12"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />

          <FieldController
            name="pool_config.refill_interval_seconds"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                id="pool_config_refill_interval_seconds"
                type="number"
                label="Refill Interval (s)"
                orientation="horizontal"
                hint="How often (seconds) the pool refills to min size. Minimum: 5."
                placeholder="30"
                inputClass="w-12"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </>
      )}

      <FieldController
        name="max_nesting_level"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            id="max_nesting_level"
            type="number"
            label="Max Nesting Level"
            orientation="horizontal"
            hint="Maximum sub-workflow nesting depth. Empty = server default. Range: 1–10."
            placeholder=""
            inputClass="w-12"
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
    </div>
  </ConfigAccordion>
)}
```

- [ ] **Step 7: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: no errors. Fix any lint or type issues before proceeding.

- [ ] **Step 8: Run the tests and confirm GREEN**

```bash
npm run test:unit -- --run --reporter=verbose src/pages/workflows/editor/configPanels/__tests__/AdvancedConfigTab.test.tsx
```

Expected: all 8 tests pass.

- [ ] **Step 9: Run the full unit test suite to confirm no regressions**

```bash
npm run test:unit -- --run
```

Expected: no regressions.

- [ ] **Step 10: Commit the implementation**

```bash
git add src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx
git commit -m "EPMCDME-11609: Add pool_config and max_nesting_level fields to AdvancedConfigTab"
```
