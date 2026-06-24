# AgentCore `thoughts_path` Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `thoughts_path` field to `AgentCoreEndpointConfigurationJsonReasoning` that points to an array of thought objects in the non-streaming response body, allowing `text_path`, `name_path`, and `args_path` to resolve per-item against that array.

**Architecture:** The field is purely a configuration value stored in `configuration_json` — there is no client-side path resolution. Changes touch the TypeScript type, the form value interface, the UI component that renders the reasoning sub-section, and the parse/serialize helpers in the import popup.

**Tech Stack:** TypeScript, React, react-hook-form (via `Controller`), yup, vitest + @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `src/types/entity/vendor.ts` | Add `thoughts_path?: string` to `AgentCoreEndpointConfigurationJsonReasoning` |
| `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx` | Add `thoughts_path: string` to `ReasoningFormValues`; add `<Input>` for it in `ReasoningSection` (non-streaming only) |
| `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx` | Add `thoughts_path` to `emptyReasoning`, `parseConfigurationJson`, `buildReasoning`, and `reasoningSchema` |
| `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx` | Add tests for render, serialization, and pre-fill |

---

## Task 1: Add `thoughts_path` to the TypeScript type

**Files:**
- Modify: `src/types/entity/vendor.ts:66-71`

- [ ] **Step 1: Write the failing type check (compile guard)**

  This project has no dedicated type-test files — the TypeScript compiler is the test. We'll verify by importing the type in step 3. For now, note the current interface shape:

  ```ts
  // vendor.ts lines 66–71 — current
  export interface AgentCoreEndpointConfigurationJsonReasoning {
    text_path: string
    active_path?: string
    name_path?: string
    args_path?: string
  }
  ```

- [ ] **Step 2: Add the field**

  In `src/types/entity/vendor.ts`, update lines 66–71:

  ```ts
  export interface AgentCoreEndpointConfigurationJsonReasoning {
    text_path: string
    active_path?: string
    name_path?: string
    args_path?: string
    thoughts_path?: string
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 4: Commit**

  ```bash
  git add src/types/entity/vendor.ts
  git commit -m "EPMCDME-12240: Add thoughts_path to AgentCoreEndpointConfigurationJsonReasoning type"
  ```

---

## Task 2: Add `thoughts_path` to the form value interface and UI component

**Files:**
- Modify: `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx:24-29` (interface)
- Modify: `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx:62-161` (component)

`thoughts_path` only applies to non-streaming mode (spec: "only applies to non-streaming (`response.body`)"). The `ReasoningSection` already receives `showActivePath` — we follow the same pattern: `thoughts_path` is shown when `showActivePath` is false (non-streaming).

- [ ] **Step 1: Write the failing test**

  Open `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx`.

  After line 150 (after the `'shows reasoning fields after expanding the section in non-streaming mode'` test), add:

  ```ts
  it('shows Thought Array Path field in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await waitFor(() => {
      expect(screen.getByText('Thought Array Path')).toBeInTheDocument()
    })
  })

  it('does not show Thought Array Path field in streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await waitFor(() => {
      expect(screen.queryByText('Thought Array Path')).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run to verify they fail**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×|thoughts_path|Array Path"
  ```
  Expected: both new tests FAIL with "Unable to find an element with the text: Thought Array Path".

- [ ] **Step 3: Update `ReasoningFormValues` interface**

  In `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx`, update lines 24–29:

  ```ts
  export interface ReasoningFormValues {
    text_path: string
    active_path: string
    name_path: string
    args_path: string
    thoughts_path: string
  }
  ```

- [ ] **Step 4: Update `ReasoningSectionProps` to accept `showThoughtsPath`**

  Update the `ReasoningSectionProps` interface (lines 62–68):

  ```ts
  interface ReasoningSectionProps {
    prefix: 'reasoning'
    control: Control<ConfigurationFormValues>
    errors: FieldErrors<ConfigurationFormValues>
    textPathHint: string
    showActivePath?: boolean
    showThoughtsPath?: boolean
  }
  ```

- [ ] **Step 5: Destructure `showThoughtsPath` in `ReasoningSection` and add the field**

  Update the `ReasoningSection` function signature (line 70) to:

  ```ts
  const ReasoningSection: FC<ReasoningSectionProps> = ({
    prefix,
    control,
    errors,
    textPathHint,
    showActivePath = true,
    showThoughtsPath = false,
  }) => {
  ```

  Then, inside the expanded section (`{showReasoning && (...)}`) add the `thoughts_path` input **before** `text_path` (it describes the array that `text_path` etc. will resolve into). Insert this block immediately after the opening `<div className="flex flex-col gap-3 pl-4 border-l border-border-structural">` at line 98 — so it becomes the first field:

  ```tsx
  {showThoughtsPath && (
    <Controller
      name={`${prefix}.thoughts_path`}
      control={control}
      render={({ field }) => (
        <Input
          {...field}
          id={`${prefix}.thoughts_path`}
          label="Thought Array Path"
          hint="Dot-notation path to the array of thought objects in the response body"
          placeholder="thoughts"
          error={(reasoningErrors as FieldErrors<ReasoningFormValues>)?.thoughts_path?.message}
        />
      )}
    />
  )}
  ```

- [ ] **Step 6: Pass `showThoughtsPath` from `ConfigurationJsonForm`**

  In the same file, find the `<ReasoningSection>` usage inside `ConfigurationJsonForm` (around line 424–434). Update the props:

  ```tsx
  <ReasoningSection
    prefix="reasoning"
    control={control}
    errors={errors}
    textPathHint="Dot-notation path to the thought text in the response body"
    showActivePath={streaming}
    showThoughtsPath={!streaming}
  />
  ```

- [ ] **Step 7: Run the new tests**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×|Array Path"
  ```
  Expected: both new tests PASS.

- [ ] **Step 8: Run full test file to check for regressions**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose
  ```
  Expected: all tests PASS.

- [ ] **Step 9: Commit**

  ```bash
  git add src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx \
          src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx
  git commit -m "EPMCDME-12240: Add Thought Array Path field to ReasoningSection (non-streaming only)"
  ```

---

## Task 3: Wire `thoughts_path` through parse/serialize/schema in the import popup

**Files:**
- Modify: `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx:39-185`

- [ ] **Step 1: Write the failing validation and serialization tests**

  In `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx`, after the `'includes reasoning in JSON when text_path is filled'` test (after line 300), add:

  ```ts
  it('shows error when thoughts_path is empty but text_path is filled in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(screen.getByText('Thought array path is required')).toBeInTheDocument()
    })
    expect(awsVendorStore.importAgentCoreEndpoint).not.toHaveBeenCalled()
  })

  it('does not require thoughts_path when text_path is filled in streaming mode', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))

    const chunkPathInput = screen.getByPlaceholderText('delta')
    await userEvent.clear(chunkPathInput)
    await userEvent.type(chunkPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(screen.queryByText('Thought array path is required')).not.toBeInTheDocument()
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalled()
    })
  })
  ```

  ```ts
  it('includes thoughts_path in reasoning when filled in non-streaming mode', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.clear(bodyPathInput)
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.type(screen.getByPlaceholderText('thoughts'), 'items')
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message' },
          response: {
            streaming: false,
            body: {
              text_path: 'output',
              reasoning: { thoughts_path: 'items', text_path: 'text' },
            },
          },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })
  ```

  And a pre-fill (parse) test — add after the above:

  ```ts
  it('pre-fills thoughts_path when parsing existing configuration JSON', async () => {
    const existingConfig = JSON.stringify({
      request: { message_path: 'input' },
      response: {
        streaming: false,
        body: {
          text_path: 'output',
          reasoning: { thoughts_path: 'items', text_path: 'text' },
        },
      },
    })
    render(
      <AwsAgentCoreImportPopup
        {...defaultProps}
        configurationJson={existingConfig}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('thoughts')).toHaveValue('items')
    })
  })
  ```

  > Note: `AwsAgentCoreImportPopup` must accept `configurationJson` as a prop for the pre-fill test. Check its current props in the file — if it already does, skip the note. If not, that may need a minor prop addition (see Task 3 Step 4 note).

- [ ] **Step 2: Run to verify the new tests fail**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×|thoughts_path|items"
  ```
  Expected: both new tests FAIL.

- [ ] **Step 3: Update `emptyReasoning` and `defaultFormValues`**

  In `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx`, update lines 39–44:

  ```ts
  const emptyReasoning: ReasoningFormValues = {
    text_path: '',
    active_path: '',
    name_path: '',
    args_path: '',
    thoughts_path: '',
  }
  ```

  `defaultFormValues` at line 54 already spreads `emptyReasoning` via `reasoning: { ...emptyReasoning }`, so no change needed there.

- [ ] **Step 4: Update `parseConfigurationJson` to read `thoughts_path`**

  Update lines 94–99 inside `parseConfigurationJson`:

  ```ts
  reasoning: {
    text_path:    reasoningSource?.text_path    ?? '',
    active_path:  reasoningSource?.active_path  ?? '',
    name_path:    reasoningSource?.name_path    ?? '',
    args_path:    reasoningSource?.args_path    ?? '',
    thoughts_path: reasoningSource?.thoughts_path ?? '',
  },
  ```

- [ ] **Step 5: Update `buildReasoning` to include `thoughts_path`**

  Update lines 125–136:

  ```ts
  function buildReasoning(
    r: ReasoningFormValues
  ): AgentCoreEndpointConfigurationJsonReasoning | undefined {
    return r.text_path
      ? {
          text_path: r.text_path,
          ...(r.thoughts_path ? { thoughts_path: r.thoughts_path } : {}),
          ...(r.active_path   ? { active_path:   r.active_path }   : {}),
          ...(r.name_path     ? { name_path:     r.name_path }     : {}),
          ...(r.args_path     ? { args_path:     r.args_path }     : {}),
        }
      : undefined
  }
  ```

  > `thoughts_path` is placed first after `text_path` to match the spec example JSON key order.

- [ ] **Step 6: Update `reasoningSchema` and add cross-field validation to `schema`**

  Update `reasoningSchema` (lines 180–185) to add `thoughts_path`:

  ```ts
  const reasoningSchema = yup.object({
    text_path:     yup.string().default(''),
    active_path:   yup.string().default(''),
    name_path:     yup.string().default(''),
    args_path:     yup.string().default(''),
    thoughts_path: yup.string().default(''),
  })
  ```

  Then update `schema` (lines 195–219) to add a top-level cross-field test. `reasoningSchema` can't reference the parent `streaming` field, so the required check lives here:

  ```ts
  const schema = yup
    .object({
      assistantName: yup.string().required('Assistant name is required').default(''),
      assistantDescription: yup.string().required('Assistant description is required').default(''),
      messagePath: yup.string().required('Message path is required').default('message'),
      extraPayload: yup
        .string()
        .default('')
        .test('is-json-object', 'Must be a valid JSON object', (value) => {
          if (!value?.trim()) return true
          return tryParseJsonObject(value) !== null
        }),
      streaming: yup.boolean().required().default(false),
      bodyTextPath: yup.string().when('streaming', {
        is: false,
        then: (s) => s.required('Response text path is required').default('response'),
        otherwise: (s) => s.default('response'),
      }),
      chunkTextPath: yup.string().when('streaming', {
        is: true,
        then: (s) => s.required('Chunk text path is required').default('response'),
        otherwise: (s) => s.default('response'),
      }),
      reasoning: reasoningSchema,
      history: historySchema,
    })
    .test(
      'thoughts-path-required',
      'Thought array path is required',
      function (values) {
        if (!values?.streaming && values?.reasoning?.text_path && !values?.reasoning?.thoughts_path) {
          return this.createError({
            path: 'reasoning.thoughts_path',
            message: 'Thought array path is required',
          })
        }
        return true
      }
    )
  ```

- [ ] **Step 7: Run the new tests**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|✗|×|thoughts_path|items"
  ```
  Expected: both new tests PASS.

- [ ] **Step 8: Run full test file to check for regressions**

  ```bash
  npx vitest run src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx --reporter=verbose
  ```
  Expected: all tests PASS.

- [ ] **Step 9: TypeScript compile check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no new errors.

- [ ] **Step 10: Commit**

  ```bash
  git add src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx \
          src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx
  git commit -m "EPMCDME-12240: Wire thoughts_path through parse, serialize, and schema in AgentCore import popup"
  ```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| New optional field `thoughts_path?: string \| null` on the reasoning object | Task 1 (type), Task 3 (schema/parse/serialize) |
| Non-streaming only — streaming unaffected | Task 2 (`showThoughtsPath={!streaming}`) |
| Field shown in UI | Task 2 (`ReasoningSection`) |
| Serialized to `configuration_json` when filled | Task 3 (`buildReasoning`) |
| Parsed from existing `configuration_json` | Task 3 (`parseConfigurationJson`) |
| `thoughts_path` not serialized when empty | Task 3 (`buildReasoning` spread conditional) |
| `thoughts_path` required when `text_path` filled in non-streaming mode | Task 3 (top-level schema `.test`) |
| `thoughts_path` NOT required in streaming mode | Task 3 (top-level schema `.test` guards on `!streaming`) |

> The spec says `string | null` default `null`. The UI uses empty-string as the "not set" sentinel (consistent with all other fields). `buildReasoning` omits the field when empty, so the serialized JSON will never contain `thoughts_path: ""`. The TypeScript type uses `?` (optional) rather than `| null` because the form layer never needs to express `null` explicitly. The required validation lives in a top-level schema `.test` because yup nested schemas cannot reference sibling fields from the parent level.

### Placeholder Scan

No TBD, TODO, or placeholder steps found.

### Type Consistency

- `thoughts_path` is `string` in `AgentCoreEndpointConfigurationJsonReasoning` (optional `?`), `string` in `ReasoningFormValues`, `yup.string()` in schema — consistent throughout.
- `buildReasoning` receives `ReasoningFormValues` and outputs `AgentCoreEndpointConfigurationJsonReasoning` — both updated in sync.
