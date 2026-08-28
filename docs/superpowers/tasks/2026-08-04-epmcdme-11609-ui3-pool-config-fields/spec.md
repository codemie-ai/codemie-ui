# Spec: EPMCDME-11609-UI-3 — Sub-workflow Pool Config Fields

## Overview

Add `pool_config` and `max_nesting_level` as editable fields in `AdvancedConfigTab.tsx`, gated behind the `features:subWorkflow` feature flag. All required types exist from UI-1. The change is confined to a single file.

---

## Scope

**In scope:** `src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx`

**Explicitly out of scope:** `WorkflowFormFields.tsx` and `workflowSchema.ts` — deferred pending ticket-owner confirmation.

---

## Feature Flag Gate

```ts
const [isSubWorkflowEnabled, isSubWorkflowLoaded] = useSubWorkflowEnabled()
```

The new accordion section renders only when `isSubWorkflowEnabled && isSubWorkflowLoaded`. The `isSubWorkflowLoaded` guard prevents flash-of-hidden-content while the `v1/config` API response is in flight.

---

## Schema Extension

Add to the module-level `schema`:

```ts
max_nesting_level: yup
  .number().nullable().optional()
  .transform(transformToInteger)
  .positive('Must be a positive number')
  .integer('Must be an integer')
  .max(10, 'Must be at most 10'),

pool_config: yup.object().shape({
  enabled: yup.boolean().optional(),
  min_size: yup
    .number().nullable().optional()
    .transform(transformToInteger)
    .min(1, 'Must be at least 1')
    .max(20, 'Must be at most 20')
    .integer('Must be an integer'),
  max_size: yup
    .number().nullable().optional()
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
    .number().nullable().optional()
    .transform(transformToInteger)
    .min(5, 'Must be at least 5')
    .integer('Must be an integer'),
}).optional(),
```

---

## `getDefaultValues` Extension

Follow the `retry_policy` guard pattern — only include `pool_config` when at least one meaningful value is present:

```ts
max_nesting_level: config?.max_nesting_level ?? workflow?.max_nesting_level ?? undefined,

// pool_config: only include if enabled or any numeric field is set
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

This prevents the form from becoming dirty on open when `pool_config` is not yet configured.

---

## `cleanFormValues` Guard

After the existing `retry_policy` guard, add:

```ts
if (
  cleaned.pool_config &&
  Object.values(cleaned.pool_config).every((v) => v == null || v === '' || v === false)
) {
  delete cleaned.pool_config
}
```

`cleanObject` preserves `false`, so an explicit `enabled: false` alone would survive without this guard. The guard ensures an all-false/null `pool_config` object is pruned from the save payload.

---

## Accordion State and Issue Tracking

New state variable: `const [poolConfigExpanded, setPoolConfigExpanded] = useState(false)`

Extend `activeIssueAccordion` memo:
```ts
if (path.startsWith('pool_config.') || path === 'pool_config' || path === 'max_nesting_level') {
  return 'poolConfig'
}
```

Extend the auto-expand `useEffect`:
```ts
else if (activeIssueAccordion === 'poolConfig' && !poolConfigExpanded) {
  setPoolConfigExpanded(true)
}
```

---

## Form Watch

Add `watch` to the `useForm` destructure. Inside the component:
```ts
const watchPoolEnabled = watch('pool_config.enabled')
```
Used to conditionally render the numeric sub-fields.

---

## JSX — New Accordion Section

Append after the "Retry Policy" accordion, before the closing `</form>`:

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
                hint="Minimum number of pre-instantiated sub-workflow instances. Range: 1–20."
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
                hint="How often (seconds) the pool is topped back up to min size. Minimum: 5."
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
            hint="Maximum sub-workflow nesting depth. Leave empty to use server default. Range: 1–10."
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

---

## Acceptance Criteria

- "Sub-workflow Pool" accordion is absent when `features:subWorkflow` is off or not yet loaded.
- "Sub-workflow Pool" accordion is present when flag is on.
- "Enable Pool" toggle shows/hides min_size, max_size, refill_interval_seconds.
- `max_nesting_level` is always visible inside the section when flag is on.
- Entering `max_size < min_size` shows inline error and blocks save.
- Values round-trip: saved via `onConfigChange` and repopulated on re-open.
- Form does not become dirty on open when no pool config has been set.
- Workflow validation issue on a `pool_config.*` or `max_nesting_level` path auto-expands the accordion.
