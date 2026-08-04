# EPMCDME-10889 (frontend): Marketplace clone counter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a `clone_count` on Marketplace assistant cards and send `source_assistant_id` when a user submits a cloned assistant, against a contract already shipped by the backend.

**Architecture:** Additive, no new abstractions. Two independent slices sharing the same type additions: (1) inbound — type the already-passed-through `clone_count` field and render it on `AssistantCard`; (2) outbound — thread an optional `source_assistant_id` through the existing DTO-transform seam (`transformAssistantToCreateDTO`) into the clone submit path.

**Tech Stack:** React, TypeScript, valtio (proxy store), vitest + @testing-library/react.

## Global Constraints

- Never remove the `?? 0` defensive fallback when rendering `clone_count` — explicit follow-up, deferred (per spec).
- No new dependencies, no feature flag, no backend/ranking changes — out of scope for this plan.
- `source_assistant_id` must come from the route param `id` in `NewAssistantPage.tsx`, never from `AssistantFormSchema`/form values.

---

### Task 1: Add `clone_count` and `source_assistant_id` to the type layer

**Files:**
- Modify: `src/types/entity/assistant.ts:72-87` (`AssistantListResponse`)
- Modify: `src/types/entity/assistant.ts:89-158` (`Assistant`)
- Modify: `src/types/entity/assistant.ts:440-476` (`CreateAssistantDto`)

**Interfaces:**
- Produces: `Assistant.clone_count?: number`, `AssistantListResponse.clone_count?: number`, `CreateAssistantDto.source_assistant_id?: string` — consumed by Task 2 (DTO) and Task 4 (render).

**Test-first: no** — pure type declarations have no independently-runnable behavior. Verified by `tsc --noEmit` (step 2) and exercised end-to-end by Tasks 2–4's tests.

- [ ] **Step 1: Add the fields**

In `src/types/entity/assistant.ts`, add `clone_count?: number` to `AssistantListResponse` (next to `unique_dislikes_count`):

```ts
export interface AssistantListResponse {
  id: string
  name: string
  slug?: string
  type?: AssistantType
  description: string
  icon_url?: string
  created_by?: CreatedBy
  user_abilities?: string[]
  unique_users_count?: number
  unique_likes_count?: number
  unique_dislikes_count?: number
  clone_count?: number
  categories?: string[]
  is_global?: boolean
  shared?: boolean
}
```

Add `clone_count?: number` to `Assistant`, alongside `is_pinned`/`is_favorited`:

```ts
  // Skills
  skills?: Skill[]
  is_favorited?: boolean
  is_pinned?: boolean
  clone_count?: number

  // Built-in subagents
  enabled_builtin_subagents?: string[]
}
```

Add `source_assistant_id?: string` to `CreateAssistantDto`:

```ts
  skip_integration_validation?: boolean
  skill_ids?: string[]
  source_assistant_id?: string

  // Built-in subagents
  enabled_builtin_subagents?: string[]
}
```

- [ ] **Step 2: Verify the project still typechecks**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this change (pre-existing errors, if any, are unrelated and untouched).

- [ ] **Step 3: Commit**

```bash
git add src/types/entity/assistant.ts
git commit -m "EPMCDME-10889: add clone_count and source_assistant_id to Assistant types"
```

---

### Task 2: Thread `source_assistant_id` through `transformAssistantToCreateDTO`

**Files:**
- Modify: `src/store/utils/assistants.ts:19` (`transformAssistantToCreateDTO`)
- Test: `src/store/utils/__tests__/assistants.test.ts`

**Interfaces:**
- Consumes: `CreateAssistantDto.source_assistant_id?: string` (Task 1)
- Produces: `transformAssistantToCreateDTO(assistant: Assistant, sourceAssistantId?: string): CreateAssistantDto` — consumed by Task 3.

**Test-first: yes** — failing test: "transformAssistantToCreateDTO sets source_assistant_id when a source id is passed"

- [ ] **Step 1: Write the failing test**

Add to `src/store/utils/__tests__/assistants.test.ts`, as a new top-level `describe` block alongside the existing `hedging_config` block:

```ts
describe('source_assistant_id', () => {
  it('sets source_assistant_id when a source id is passed', () => {
    const dto = transformAssistantToCreateDTO(baseAssistant as Assistant, 'source-assistant-1')

    expect(dto.source_assistant_id).toBe('source-assistant-1')
  })

  it('omits source_assistant_id when no source id is passed', () => {
    const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

    expect(dto.source_assistant_id).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/utils/__tests__/assistants.test.ts -t "source_assistant_id"`
Expected: FAIL — `transformAssistantToCreateDTO` does not accept a second argument / `dto.source_assistant_id` is `undefined` in the first assertion (TS also errors on the extra argument until Step 3 lands).

- [ ] **Step 3: Write minimal implementation**

In `src/store/utils/assistants.ts`, change the signature and add the field to the returned object:

```ts
export function transformAssistantToCreateDTO(
  assistant: Assistant,
  sourceAssistantId?: string
): CreateAssistantDto {
  // Handle skill_ids: prefer explicit skill_ids from form, fallback to extracting from skills array
  const skillIds = (assistant as any).skill_ids ?? assistant.skills?.map((s) => s.id) ?? []

  return {
    name: assistant.name,
    description: assistant.description,
    system_prompt: assistant.system_prompt,
    project: assistant.project,
    context: assistant.context, // Type casting as the structure should match
    icon_url: assistant.icon_url,
    llm_model_type: assistant.llm_model_type,
    enable_image_generation: assistant.enable_image_generation ?? false,
    image_generation_model: assistant.enable_image_generation
      ? assistant.image_generation_model || null
      : null,
    // Filter out MCP toolkit as it's handled separately
    toolkits: assistant.toolkits
      ?.filter((tk) => tk.toolkit !== 'MCP')
      .map((toolkit) => ({
        toolkit: toolkit.toolkit,
        tools: toolkit.tools?.map((tool) => ({
          name: tool.name,
          label: tool.label,
          settings_config: tool.settings_config,
          settings: tool.settings,
          description: tool.description,
          user_description: tool.user_description,
        })),
        label: toolkit.label,
        settings_config: toolkit.settings_config,
        settings: toolkit.settings,
        is_external: toolkit.is_external,
      })),
    conversation_starters: assistant.conversation_starters,
    shared: assistant.shared,
    is_react: true,
    is_global: assistant.is_global,
    slug: assistant.slug,
    temperature: assistant.temperature,
    top_p: assistant.top_p || undefined,
    tools_tokens_size_limit: assistant.tools_tokens_size_limit,
    // Handle MCP servers if MCP toolkit exists
    mcp_servers: assistant.mcp_servers,
    assistant_ids:
      assistant.nested_assistants?.map((a) => a.id) || assistant.nestedAssistants?.map((a) => a.id),
    type: assistant.type as AssistantType, // Type casting as the value should match the enum
    categories: assistant.categories,
    prompt_variables: assistant.prompt_variables,
    smart_tool_selection_enabled: assistant.smart_tool_selection_enabled,
    hedging_config: assistant.hedging_config ?? null,
    interactive_features: assistant.interactive_features ?? null,
    guardrail_assignments: assistant.guardrail_assignments,
    skill_ids: skillIds,
    ...(sourceAssistantId ? { source_assistant_id: sourceAssistantId } : {}),

    // Built-in subagents
    enabled_builtin_subagents: assistant.enabled_builtin_subagents ?? [],
  }
}
```

(Only the function signature and the one added `...(sourceAssistantId ? ... )` spread line change — every other field is untouched, reproduced above verbatim so the diff is unambiguous.)

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/store/utils/__tests__/assistants.test.ts`
Expected: PASS — all tests in the file, including the two new ones and the pre-existing `hedging_config` suite.

- [ ] **Step 5: Commit**

```bash
git add src/store/utils/assistants.ts src/store/utils/__tests__/assistants.test.ts
git commit -m "EPMCDME-10889: thread source_assistant_id through transformAssistantToCreateDTO"
```

---

### Task 3: Send `source_assistant_id` from the clone submit flow

**Files:**
- Modify: `src/store/assistants.ts:697-716` (`createAssistant`)
- Modify: `src/pages/assistants/NewAssistantPage.tsx:121-123` (`handleSubmit`)
- Test: `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`

**Interfaces:**
- Consumes: `transformAssistantToCreateDTO(assistant, sourceAssistantId?)` (Task 2)
- Produces: `assistantsStore.createAssistant(values: Assistant, skipIntegrationValidation?: boolean, sourceAssistantId?: string): Promise<AssistantCreateResponse>` — consumed by `NewAssistantPage.tsx`.

**Test-first: yes** — failing test: "sends source_assistant_id in the POST body when submitting a cloned assistant"

- [ ] **Step 1: Write the failing test**

Add to the `describe('Form Validation', ...)` block in `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`, after the existing `'successfully creates assistant and navigates to assistants list'` test:

```ts
    it('sends source_assistant_id in the POST body when submitting a cloned assistant', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/assistants/id/assistant-1', createAssistantFixture())
      mockAPI('POST', 'v1/assistants', { id: 'cloned-id', assistantId: 'cloned-id' })

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByDisplayValue('A helpful assistant')).toBeInTheDocument()
      })

      // Clone mode blanks the name field (see buildTemplate in NewAssistantPage.tsx) — fill it in.
      await user.type(screen.getByPlaceholderText('Name*'), 'Cloned Assistant')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"source_assistant_id":"assistant-1"'),
          })
        )
      })
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx -t "sends source_assistant_id"`
Expected: FAIL — the POST body does not contain `source_assistant_id` (the field is never sent yet).

- [ ] **Step 3: Write minimal implementation**

In `src/store/assistants.ts`, change `createAssistant`'s signature and pass the source id through:

```ts
  async createAssistant(
    values: Assistant,
    skipIntegrationValidation = false,
    sourceAssistantId?: string
  ): Promise<AssistantCreateResponse> {
    const assistantData: CreateAssistantDto = {
      ...transformAssistantToCreateDTO(values, sourceAssistantId),
      skip_integration_validation: skipIntegrationValidation,
    }

    try {
      const response = await api.post('v1/assistants', assistantData)
      return await response.json()
    } catch (error: any) {
      return {
        error: error.message ?? 'Failed to create assistant',
        message: error.message ?? 'Failed to create assistant',
        assistantId: null,
      }
    }
  },
```

In `src/pages/assistants/NewAssistantPage.tsx`, change `handleSubmit` to pass the source id when cloning:

```ts
  const handleSubmit = async (values, skipValidation = false) => {
    return assistantsStore.createAssistant(values, skipValidation, isCloning ? (id as string) : undefined)
  }
```

Also update the `AssistantsStoreType` interface's `createAssistant` signature at `src/store/assistants.ts:144-147`:

```ts
  createAssistant: (
    values: Assistant,
    skipIntegrationValidation?: boolean,
    sourceAssistantId?: string
  ) => Promise<AssistantCreateResponse>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`
Expected: PASS — all tests in the file, including the new one and every pre-existing clone/create test.

- [ ] **Step 5: Commit**

```bash
git add src/store/assistants.ts src/pages/assistants/NewAssistantPage.tsx src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx
git commit -m "EPMCDME-10889: send source_assistant_id when submitting a cloned assistant"
```

---

### Task 4: Render `clone_count` on `AssistantCard`

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx:178-227` (`renderActions`)
- Test: `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`

**Interfaces:**
- Consumes: `Assistant.clone_count?: number` (Task 1)

**Test-first: yes** — failing test: "renders clone count next to like/dislike counters when assistant is global"

- [ ] **Step 1: Write the failing test**

Add to `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`, after the existing tests inside the `describe('AssistantCard', ...)` block:

```tsx
  it('renders clone count next to like/dislike counters when assistant is global', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 3,
      unique_dislikes_count: 1,
      clone_count: 7,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByLabelText(`Clone ${globalAssistant.name}, 7`)).toBeInTheDocument()
  })

  it('defaults clone count to 0 when clone_count is absent', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 0,
      unique_dislikes_count: 0,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByLabelText(`Clone ${globalAssistant.name}, 0`)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx -t "clone count"`
Expected: FAIL — no element with an accessible label matching `Clone ... , ...` exists yet.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx`, add the import (alphabetically with the other icon imports):

```ts
import CopySvg from '@/assets/icons/copy.svg?react'
```

In `renderActions()`, add a third stat block inside the `isGlobal &&` block, after the dislike `Button` and before the closing `</div>` of that block (i.e. right after line 225's `</Button>`, still inside the `isGlobal && (<div ...>...)` wrapper):

```tsx
            <div className="h-[12px] w-px bg-border-structural mx-1" aria-hidden="true"></div>

            <Button
              type="tertiary"
              className={tooltipClass}
              data-pr-tooltip="Clone count"
              aria-label={`Clone ${assistant.name}, ${assistant.clone_count ?? 0}`}
            >
              <CopySvg className="w-3 h-3" aria-hidden="true" />
              <span className="text-sm-1" aria-hidden="true">
                {assistant.clone_count ?? 0}
              </span>
            </Button>
```

(This sits after the existing dislike `Button` closes, still inside the `isGlobal && (<div className="flex h-full pl-4 gap-1 items-center justify-center">...</div>)` wrapper — so it inherits the same gating and layout as the like/dislike pair.)

- [ ] **Step 4: Run test to verify it passes**

Run: `LC_ALL=en_US.UTF-8 npx vitest run src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`
Expected: PASS — all tests in the file, including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx
git commit -m "EPMCDME-10889: render clone count on AssistantCard"
```

---

## Post-plan notes (not separate tasks)

- Store list-mapping (`indexAssistants`/`normalizeAssistant` in `src/store/assistants.ts`) needs **no code change**: both already spread `...assistant`/raw response objects, and `clone_count` is a passthrough field with no derivation logic (unlike `is_pinned`/`is_favorited`). Task 1's type addition is sufficient; this is confirmed structurally, not via a dedicated task, because there is no behavior change to test.
- `mock-server/db.json` fixture update (dev-experience only) and removing the `?? 0` fallback are explicitly out of scope per the approved spec — do not do them as part of this plan.
