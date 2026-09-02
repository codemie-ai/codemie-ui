# EPMCDME-7070 Disable Attach File Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Execute inline in the sdlc-light Stage 4 conversation (do not dispatch per-task subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins disable file attachments per assistant via Assistant settings, and when disabled hide/block all chat-bot upload initiation paths by consuming backend `file_attachment_enabled`.

**Architecture:** Add `file_attachment_enabled` through Assistant types/DTO/form (Switch, same pattern as `enable_image_generation`). Extend slim chat `AssistantData` with optional `fileAttachmentEnabled`, enrich it FE-only by fetching assistant detail (or copying when a full `Assistant` is already available), and AND it into `useAssistantFeatures.fileAttachment`. Gate toolbar, paste, drop, and edit-message attach on that flag. Treat `null`/`undefined`/`true` as allowed; only explicit `false` disables.

**Tech Stack:** React, valtio, react-hook-form + Yup, Vitest + Testing Library

## Global Constraints

- Ticket: EPMCDME-7070
- Repo: `codemie-ui` on branch `EPMCDME-7070_disable-attach-file`
- Commit format: `EPMCDME-7070: <Capital sentence>`
- Commit **only** ticket-related files (do not stage unrelated dirty `package.json` / `vite.config.ts` / untracked junk)
- Backend contract already shipped: `file_attachment_enabled: Optional[bool]`; chat 403 `"File attachment not allowed"` when `false`
- Do **not** add a `v1/config` / `FEATURE_FLAGS` customer flag
- Prefer **hide** attach UI (not disabled-but-visible), matching existing capability gates

## Requirements (inline)

Administrators can enable/disable Attach File on an assistant. When disabled (`file_attachment_enabled === false`), users cannot initiate uploads from the chat-bot (paperclip, paste, image drop/paste, edit-message Attach File). Multi-assistant chats use existing AND-reduction (any disabled → hide). Missing/`null`/`true` keeps attachments allowed.

### Clarification assumptions

- **Data plumbing (confirmed):** FE-only enrichment — fetch/reuse assistant detail and merge `fileAttachmentEnabled` into chat `assistantData`; no conversation-payload BE change.
- **Project-level admin UI:** out of scope — Projects HTTP API does not expose the field yet (chat-time project 403 still works server-side).
- **Workflow popups** (`ContinueWithInputPopup`, `WorkflowStartExecutionPopup`): out of scope for this ticket (chat-bot AC); known BE workflow bypass is a separate follow-up.
- **Form default:** Switch ON by default (`true`); OFF sends `false`. Older backends omitting the field still behave as allowed.

## File map

| File | Responsibility |
|---|---|
| `src/types/entity/assistant.ts` | `file_attachment_enabled` on `Assistant` + `CreateAssistantDto` |
| `src/types/entity/conversation.ts` | `fileAttachmentEnabled` on `AssistantData` |
| `src/store/utils/assistants.ts` | Map field in `transformAssistantToCreateDTO` |
| `src/pages/assistants/utils/compareFormData.ts` | Include field in dirty detection |
| `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` | Yup + defaultValues + Switch accordion |
| `src/pages/assistants/NewAssistantPage.tsx` | Default `file_attachment_enabled: true` if needed |
| `src/pages/chat/hooks/useAssistantFeatures.ts` | AND `fileAttachmentEnabled !== false` into `fileAttachment` |
| `src/pages/chat/hooks/useEnrichAssistantFileAttachment.ts` | Fetch/merge flag onto `currentChat.assistantData` |
| `src/store/chatGeneration.ts` | Copy flag in `updateCurrentChatAssistants` |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Enrich + gate paste/drop when attach off |
| `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx` | Hide edit Attach File + gate `onAddFiles` |
| Tests under matching `__tests__` folders | TDD coverage |

---

### Task 1: Types + DTO mapper + feature-gate unit tests

**Test-first: yes — failing tests that `file_attachment_enabled === false` disables `fileAttachment`, and that DTO includes the field.**

**Files:**
- Modify: `src/types/entity/assistant.ts`
- Modify: `src/types/entity/conversation.ts`
- Modify: `src/store/utils/assistants.ts`
- Modify: `src/pages/chat/hooks/useAssistantFeatures.ts`
- Modify: `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts`
- Modify: `src/store/utils/__tests__/assistants.test.ts`

**Interfaces:**
- Consumes: backend field `file_attachment_enabled: boolean | null | undefined`
- Produces: `Assistant.file_attachment_enabled`, `CreateAssistantDto.file_attachment_enabled`, `AssistantData.fileAttachmentEnabled`, updated `useAssistantFeatures`

- [ ] **Step 1: Write the failing tests**

Append to `useAssistantFeatures.test.ts`:

```ts
  it('disables fileAttachment when any assistant has fileAttachmentEnabled false', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([
        { id: 'a1', name: 'a1', type: AssistantType.CODEMIE, fileAttachmentEnabled: true },
        { id: 'a2', name: 'a2', type: AssistantType.CODEMIE, fileAttachmentEnabled: false },
      ])
    )
    expect(result.current.fileAttachment).toBe(false)
  })

  it('keeps fileAttachment enabled when fileAttachmentEnabled is null or undefined', () => {
    const { result } = renderHook(() =>
      useAssistantFeatures([
        { id: 'a1', name: 'a1', type: AssistantType.CODEMIE, fileAttachmentEnabled: null },
        { id: 'a2', name: 'a2', type: AssistantType.CODEMIE },
      ])
    )
    expect(result.current.fileAttachment).toBe(true)
  })
```

Add to `transformAssistantToCreateDTO` tests:

```ts
  it('includes file_attachment_enabled in the DTO', () => {
    const dto = transformAssistantToCreateDTO({
      ...baseAssistant,
      file_attachment_enabled: false,
    } as Assistant)
    expect(dto.file_attachment_enabled).toBe(false)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts src/store/utils/__tests__/assistants.test.ts`

Expected: FAIL — property / assertion not satisfied yet.

- [ ] **Step 3: Minimal implementation**

1. On `Assistant` and `CreateAssistantDto` add:
   `file_attachment_enabled?: boolean | null`
2. On `AssistantData` add:
   `fileAttachmentEnabled?: boolean | null`
3. In `transformAssistantToCreateDTO` add:
   `file_attachment_enabled: assistant.file_attachment_enabled ?? true,`
4. In `useAssistantFeatures` reduce, after type overrides:

```ts
fileAttachment:
  acc.fileAttachment &&
  (overrides.fileAttachment ?? true) &&
  assistant.fileAttachmentEnabled !== false,
```

(Update the reduce callback to destructure the full assistant, not only `{ type }`.)

- [ ] **Step 4: Run tests to verify they pass**

Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/assistant.ts src/types/entity/conversation.ts \
  src/store/utils/assistants.ts src/store/utils/__tests__/assistants.test.ts \
  src/pages/chat/hooks/useAssistantFeatures.ts \
  src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts
git commit -m "$(cat <<'EOF'
EPMCDME-7070: Add file attachment flag types and feature gate

EOF
)"
```

---

### Task 2: AssistantForm admin Switch + dirty compare

**Test-first: yes — failing test that transform/form persistence includes the field; unit-level assert on compareFormData if a dedicated test exists, else extend `assistants.test.ts` / form default via DTO path already covered and add a small `compareFormData` assertion if tests exist.**

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`
- Modify: `src/pages/assistants/utils/compareFormData.ts`
- Modify: `src/pages/assistants/NewAssistantPage.tsx` (default `true` if form seed object lists booleans explicitly)
- Test: extend existing assistants form/DTO tests; prefer a focused unit assert that `compareFormData` detects toggle flips

**Interfaces:**
- Consumes: `Assistant.file_attachment_enabled`
- Produces: Switch `"Enable file attachments"` → DTO field on save

- [ ] **Step 1: Write the failing test**

If `compareFormData` has tests, add:

```ts
it('detects file_attachment_enabled changes', () => {
  const initial = { ...base, file_attachment_enabled: true }
  const current = { ...base, file_attachment_enabled: false }
  expect(compareFormData(initial, current)).toBe(true)
})
```

Otherwise add an AssistantForm-level / integration assertion that the save payload contains `"file_attachment_enabled":false` when the switch is off (mirror `enable_image_generation` coverage in `NewAssistantPage.integration.test.tsx` if extending that file is low-cost).

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement**

In `AssistantForm.tsx`:
- Yup: `file_attachment_enabled: Yup.boolean().default(true)`
- defaultValues: `file_attachment_enabled: assistant?.file_attachment_enabled ?? true`
- `prepareFormData`: `preparedValues.file_attachment_enabled = values.file_attachment_enabled !== false`
- New Accordion (after Image generation is fine): title `"File attachments"`, Switch label `"Enable file attachments"`

In `compareFormData.ts` normalize both sides with `normalizeBooleanField(...file_attachment_enabled)`.

In `NewAssistantPage` seed: `file_attachment_enabled: true` if that page lists defaults explicitly.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-7070: Add assistant form toggle for file attachments

EOF
)"
```

---

### Task 3: Enrich chat assistantData with the flag (FE-only)

**Test-first: yes — failing unit tests for enrichment hook and for `updateCurrentChatAssistants` copying the field.**

**Files:**
- Create: `src/pages/chat/hooks/useEnrichAssistantFileAttachment.ts`
- Create: `src/pages/chat/hooks/__tests__/useEnrichAssistantFileAttachment.test.ts`
- Modify: `src/store/chatGeneration.ts` (`updateCurrentChatAssistants`)
- Modify: `src/store/__tests__/chatGeneration.test.ts` (or nearest existing test covering `updateCurrentChatAssistants`)
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` (call the hook)

**Interfaces:**
- Consumes: `assistantsStore.getAssistant(id)`, `currentChat.assistantData`
- Produces: mutated `assistantData[].fileAttachmentEnabled` (`true`/`false`/`null`)

- [ ] **Step 1: Write failing tests**

Enrichment hook test (mock `assistantsStore.getAssistant`):

```ts
it('sets fileAttachmentEnabled from assistant detail when missing', async () => {
  getAssistant.mockResolvedValue({ id: 'a1', file_attachment_enabled: false })
  // renderHook with a valtio chat stub whose assistantData lacks the field
  await waitFor(() => {
    expect(chat.assistantData[0].fileAttachmentEnabled).toBe(false)
  })
})

it('does not refetch when fileAttachmentEnabled is already set', async () => {
  // assistantData already has fileAttachmentEnabled: true
  expect(getAssistant).not.toHaveBeenCalled()
})
```

`updateCurrentChatAssistants` assertion: when pushing a full `Assistant` with `file_attachment_enabled: false`, resulting `assistantData` entry has `fileAttachmentEnabled: false`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// useEnrichAssistantFileAttachment.ts
export function useEnrichAssistantFileAttachment(assistantData: AssistantData[] | undefined) {
  // For each id where fileAttachmentEnabled === undefined:
  //   const detail = await assistantsStore.getAssistant(id, true)
  //   mutate matching assistantData entry:
  //     fileAttachmentEnabled = detail.file_attachment_enabled ?? null
  // Deduplicate in-flight fetches; ignore abort/unmount races.
}
```

In `updateCurrentChatAssistants` push:

```ts
fileAttachmentEnabled: assistant.file_attachment_enabled ?? null,
```

Call `useEnrichAssistantFileAttachment(currentChat?.assistantData)` from `ChatPrompt` (and any other primary chat surface that computes features before Prompt mounts — prefer Prompt + ChatUserMessage both call or lift to a parent already rendering both).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-7070: Enrich chat assistants with file attachment flag

EOF
)"
```

---

### Task 4: Gate all chat upload initiation paths

**Test-first: yes — failing tests that Attach is hidden and paste/drop/edit attach do not call addFiles when `fileAttachment` is false.**

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`
- Modify: `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx`
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` (stop mocking away upload when asserting visibility, or add a focused describe with lighter mocks)
- Create or modify: `ChatUserMessage` tests for edit Attach File visibility

**Interfaces:**
- Consumes: `assistantFeatures.fileAttachment`
- Produces: no paperclip, no paste handler registration for files, no Editor `onAddFiles`, no edit Attach File when disabled

- [ ] **Step 1: Write failing tests**

ChatPrompt:
- When features `fileAttachment: true` → `getByLabelText('Attach files')` present
- When `false` → query returns null; Editor must not receive a live `onAddFiles` that uploads (assert mock `addFiles` not wired / not called on simulated paste if practical)

ChatUserMessage (edit mode):
- With attach allowed → "Attach File" button visible
- With attach disabled → button absent; `onAddFiles` not passed / no-op

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

In `ChatPrompt.tsx`:

```tsx
const canAttachFiles = assistantFeatures.fileAttachment

useFilePaste({ onFilePaste: canAttachFiles ? fileUpload.addFiles : () => {} })
// Editor:
onAddFiles={canAttachFiles ? fileUpload.addFiles : undefined}
// Toolbar already gated:
{canAttachFiles && <ChatPromptFileUpload ... />}
```

In `ChatUserMessage.tsx`: compute `useAssistantFeatures(currentChat?.assistantData ?? [])` (after enrichment available) and:

```tsx
{isEditing && canAttachFiles && (
  <button ...>Attach File</button>
)}
// Editor onAddFiles only when canAttachFiles
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-7070: Gate chat upload paths when attachments disabled

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Admin config → Task 2; hide/inactive button → Tasks 1+4; no uploads initiated → Task 4 (toolbar/paste/drop/edit); FE data plumbing option A → Task 3.
2. **Placeholders:** none intentional.
3. **Out of scope logged:** project admin UI; workflow popups.
4. **Type consistency:** snake_case API `file_attachment_enabled` ↔ camelCase chat `fileAttachmentEnabled`.

---

## Execution notes (sdlc-light)

After Stage 3, proceed to **Stage 4 inline TDD** in this conversation. Ignore any finishing-branch menu from TDD/subagent skills — SDLC continues to code review (Stage 5) → qa-gates (Stage 6) → handoff (Stage 7).
