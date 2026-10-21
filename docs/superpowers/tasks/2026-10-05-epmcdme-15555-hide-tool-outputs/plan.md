# Assistant-level "Hide Tool Outputs" — UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an assistant creator turn on "Hide tool outputs from end users" in the assistant form, and hide the chat-level "Hide tool outputs" toggle for flagged assistants.

**Architecture:** A new `ToolOutputVisibilitySection` (shared `Switch` + `InfoBox`) is rendered from `AssistantForm` and wired through the yup schema, defaults and `prepareFormData`. The flag reaches the chat via the backend `assistant_data` (`hide_tool_outputs`), is mapped into `AssistantData.hideToolOutputs`, and `ChatConfiguration` drops `ChatConfigHideToolOutputs` when any active assistant is flagged. Enforcement is backend-only; the UI only explains and hides.

**Tech Stack:** React, TypeScript, react-hook-form + yup, valtio, Vitest/RTL.

**Spec:** `docs/superpowers/tasks/2026-10-05-epmcdme-15555-hide-tool-outputs/spec.md` (same folder)

## Global Constraints

- Field name `hide_tool_outputs` (boolean, default `false`) on the assistant create/update payload and `Assistant` type.
- Section title: "Tool Output Visibility". Toggle label: "Hide tool outputs from end users".
- Always-visible helper text: "When enabled, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads, and execution traces stay hidden, and conversation settings can't turn them back on."
- `InfoBox`, shown only when ON: "This applies to everyone chatting with this assistant, including you. Turn it off to inspect tool execution while testing."
- For flagged assistants the chat toggle is hidden completely (not disabled).
- `VirtualAssistantForm` is untouched.
- Repo rules: tests and git operations only when the user explicitly asks (test steps below are for when they do); PRs are draft; MR description asks a reviewer to post `/sanity`. Commit prefix `EPMCDME-15555:`; a staged `vite.config.ts` change in this repo must NOT be included in any commit.

## Review Focus

1. **New chat / assistant switch** — `currentChat.assistantData` may be empty for a brand-new chat before the first message; expectation: toggle hidden as soon as a flagged assistant is active. Verify how `assistantData` is populated for new chats (`store/chatGeneration.ts:727`, `store/chats.ts:663`) and set `hideToolOutputs` there too. Pinned in Task 2.
2. **Group chats** — if any assistant in the chat is flagged, the toggle is hidden. Pinned in Task 2.
3. **Edit-form dirty tracking** — toggling only this switch must mark the form changed and be sent; `compareFormData` must not drop it. Pinned in Task 1.
4. **Existing assistants / missing field** — `undefined`/`null` from an old backend response means OFF. Pinned in Task 1.
5. **Read-only / non-editable views** — the section renders disabled state consistently with sibling sections (same `Controller` pattern). Pinned in Task 1.

---

### Task 1: Form section, schema and payload

**Files:**
- Create: `src/pages/assistants/components/AssistantForm/components/ToolOutputVisibilitySection.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (yup `formSchema` ~181, `defaultValues` ~304, render ~647)
- Modify: `src/types/entity/assistant.ts` (`Assistant` ~137, create/update DTO ~479)
- Modify: `src/store/utils/assistants.ts` (`prepareFormData` ~99)
- Modify (if dirty-tracking drops it): `src/pages/assistants/utils/compareFormData.ts`
- Test: `src/pages/assistants/__tests__/ToolOutputVisibilitySection.test.tsx`, `src/store/utils/__tests__/assistants.test.ts`

**Interfaces:**
- Produces: `ToolOutputVisibilitySection` props `{ value: boolean | null | undefined; onChange: (v: boolean) => void; onBlur: () => void }`; `hide_tool_outputs?: boolean` on `Assistant` and the create/update DTO; `prepareFormData` output includes `hide_tool_outputs: boolean`.

- [ ] **Step 1: Write failing tests**

```tsx
// src/pages/assistants/__tests__/ToolOutputVisibilitySection.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ToolOutputVisibilitySection from '../components/AssistantForm/components/ToolOutputVisibilitySection'

const HELPER =
  "When enabled, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads, and execution traces stay hidden, and conversation settings can't turn them back on."
const WARNING =
  'This applies to everyone chatting with this assistant, including you. Turn it off to inspect tool execution while testing.'

describe('ToolOutputVisibilitySection', () => {
  it('always shows title-level helper text, and no warning when OFF', () => {
    render(<ToolOutputVisibilitySection value={false} onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(screen.getByText(HELPER)).toBeInTheDocument()
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it('shows the warning when ON', () => {
    render(<ToolOutputVisibilitySection value onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(screen.getByText(WARNING)).toBeInTheDocument()
  })

  it.each([undefined, null])('treats %s as OFF', (value) => {
    render(<ToolOutputVisibilitySection value={value} onChange={vi.fn()} onBlur={vi.fn()} />)
    expect(screen.getByLabelText('Hide tool outputs from end users')).not.toBeChecked()
  })

  it('calls onChange with the new boolean', () => {
    const onChange = vi.fn()
    render(<ToolOutputVisibilitySection value={false} onChange={onChange} onBlur={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Hide tool outputs from end users'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
```
In `src/store/utils/__tests__/assistants.test.ts` add (mirroring the existing `interactive_enabled` cases): `prepareFormData` returns `hide_tool_outputs: true` when the form has it, `false` when it is `undefined`.
Add an `AssistantForm` test (next to `InteractiveFeaturesSection.integration.test.tsx`): the section is rendered, toggling it then submitting sends `hide_tool_outputs: true`, and loading an assistant with `hide_tool_outputs: true` shows the switch checked.

- [ ] **Step 2: Run** `npx vitest run src/pages/assistants/__tests__/ToolOutputVisibilitySection.test.tsx src/store/utils/__tests__/assistants.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

`ToolOutputVisibilitySection.tsx` (same license header as sibling files):
```tsx
import { FC } from 'react'

import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'

interface ToolOutputVisibilitySectionProps {
  value: boolean | null | undefined
  onChange: (value: boolean) => void
  onBlur: () => void
}

const ToolOutputVisibilitySection: FC<ToolOutputVisibilitySectionProps> = ({
  value,
  onChange,
  onBlur,
}) => {
  const isHidden = Boolean(value)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold">Tool Output Visibility</h3>
      <Switch
        label="Hide tool outputs from end users"
        value={isHidden}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
      />
      <p className="text-sm text-text-quaternary">
        When enabled, end users see only the final assistant response. Tool calls, intermediate
        outputs, raw payloads, and execution traces stay hidden, and conversation settings
        can&apos;t turn them back on.
      </p>
      {isHidden && (
        <InfoBox>
          This applies to everyone chatting with this assistant, including you. Turn it off to
          inspect tool execution while testing.
        </InfoBox>
      )}
    </div>
  )
}

export default ToolOutputVisibilitySection
```
(If the helper `<p>` text wraps across JSX lines the test's exact-string match fails — keep the test's `getByText` tolerant by using the same JSX string, or use a `{'...'}` single string literal for the helper. Pick the literal.) Check the `Switch` label is associated to the input (`getByLabelText`); if not, query by role `switch`/`checkbox` instead and adjust the tests.

`AssistantForm.tsx`: yup `hide_tool_outputs: Yup.boolean().default(false),`; defaultValues `hide_tool_outputs: assistant?.hide_tool_outputs ?? false,`; render directly after `<InteractiveFeaturesAccordion control={control} />`:
```tsx
          <Controller
            name="hide_tool_outputs"
            control={control}
            render={({ field }) => (
              <ToolOutputVisibilitySection
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
```
(add the import; `Controller` is already imported in this file or add it from `react-hook-form`).

`types/entity/assistant.ts`: in both places add
```ts
  /** When true the backend serves only the final response to end users. */
  hide_tool_outputs?: boolean
```
`store/utils/assistants.ts` `prepareFormData`: `hide_tool_outputs: assistant.hide_tool_outputs ?? false,`.
`compareFormData.ts`: it spreads `...current`/`...initial`, so the field is already compared; only add a `normalizeBooleanField` line for it if an `undefined` vs `false` mismatch shows up in the dirty-check test.

- [ ] **Step 4: Run** the Step 2 command plus the AssistantForm tests — Expected: PASS.

- [ ] **Step 5: Commit** (only when asked; do not stage `vite.config.ts`)
```bash
git add src/pages/assistants src/types/entity/assistant.ts src/store/utils
git commit -m "EPMCDME-15555: add Tool Output Visibility section to assistant form"
```

---

### Task 2: Hide the chat-level toggle for flagged assistants

**Files:**
- Modify: `src/types/entity/conversation.ts` (`AssistantData` ~200, `AssistantDataBackend` ~274)
- Modify: `src/utils/chatHelpers.ts` (`assistantData` mapping ~46)
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` (~89)
- Modify (only if Review Focus 1 shows new chats skip `chatHelpers`): `src/store/chatGeneration.ts:727`, `src/store/chats.ts:663`
- Test: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx`, `src/utils/__tests__/chatHelpers.test.ts`

**Interfaces:**
- Consumes: backend `assistant_data[].hide_tool_outputs` (backend plan, Task 4).
- Produces: `AssistantData.hideToolOutputs?: boolean`; `AssistantDataBackend.hide_tool_outputs?: boolean`.

- [ ] **Step 1: Write failing tests**
  - `chatHelpers`: a backend chat with `assistant_data: [{..., hide_tool_outputs: true}]` maps to `assistantData[0].hideToolOutputs === true`; missing field maps to `false`.
  - `ChatConfiguration` (mirror the existing cases in that file): with `currentChat.assistantData = [{ id: 'a', name: 'A', hideToolOutputs: true }]` the "Hide tool outputs" control is absent; with `hideToolOutputs: false` (regression) it is present; with two assistants where only one is flagged it is absent; all other General controls (LLM selector, skills, image generation) remain.
- [ ] **Step 2: Run** `npx vitest run src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx src/utils/__tests__/chatHelpers.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement**

`conversation.ts`: `AssistantData` gets `hideToolOutputs?: boolean`; `AssistantDataBackend` gets `hide_tool_outputs?: boolean`.
`chatHelpers.ts` mapping: `hideToolOutputs: data.hide_tool_outputs ?? false,`.
`ChatConfiguration.tsx`:
```tsx
  const isToolOutputHidden = (currentChat?.assistantData ?? []).some(
    (assistant) => assistant.hideToolOutputs
  )
  ...
  {assistantFeatures.tools && !isToolOutputHidden && <ChatConfigHideToolOutputs />}
```
Do not change `useAssistantFeatures`: `tools` also gates other things.
- [ ] **Step 4: Run** the Step 2 command — Expected: PASS. Also run `npx vitest run src/pages/chat src/store` for regressions.
- [ ] **Step 5: Commit** (only when asked): `git commit -m "EPMCDME-15555: hide chat-level tool output toggle for flagged assistants"`

---

## Self-Review

- **Spec coverage:** form section + copy (T1), yup/defaults/payload/type (T1), chat toggle hidden completely (T2), virtual form untouched, backend enforcement in the backend plan.
- **Placeholders:** none; the only conditional steps (`compareFormData`, new-chat population) have explicit triggers and files.
- **Consistency:** `hide_tool_outputs` (snake_case, API/forms) vs `hideToolOutputs` (camelCase, chat state) used consistently.
