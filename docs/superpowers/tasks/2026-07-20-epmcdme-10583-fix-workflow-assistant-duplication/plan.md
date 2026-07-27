# EPMCDME-10583: Fix workflow assistant duplication on step edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate assistants from being created when a workflow state that shares a virtual assistant with other states is edited via the UI.

**Architecture:** A single predicate function `shouldReuseActorId` in `idGenerators.ts` controls whether an existing actor ID is preserved or a new one is generated on save. The fix adds an `ActorTypes.Assistant` branch that returns `true` whenever the current state is among the states referencing the actor — regardless of how many states share it. The downstream upsert logic in `updateState.ts` already handles shared actors correctly by ID. No tab component changes are needed.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- TypeScript strict mode; no `any` introductions beyond what already exists in the file.
- Test file uses Vitest (`describe`/`it`/`expect`) — do not introduce Jest globals.
- Commit messages must follow `EPMCDME-10583: Capital sentence` format (enforced by CI).

---

### Task 1: Fix `shouldReuseActorId` for shared assistant actors

**Files:**
- Modify: `src/utils/workflowEditor/helpers/states/idGenerators.ts:114-132`
- Test: `src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts`

**Interfaces:**
- Produces: `shouldReuseActorId(config, ActorTypes.Assistant, actorId, currentStateId)` returns `true` when `actorId` is defined and `currentStateId` is among the states referencing it (even if multiple states share it). Behavior for `ActorTypes.Tool` and `ActorTypes.CustomNode` is unchanged.

**Test-first: yes — failing assertion: multi-reference assistant case currently returns `false`, must return `true`**

- [ ] **Step 1: Update the existing multi-reference assistant test to assert `true`**

In `src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts`, find the test at line ~196:

```ts
it('returns false when actor is referenced by multiple nodes', () => {
  const config: WorkflowConfiguration = {
    states: [
      { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
      { id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
    ],
    assistants: [],
  }

  const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
  expect(result).toBe(false)
})
```

Change the description and assertion to:

```ts
it('returns true when assistant is referenced by multiple nodes and current node is one of them', () => {
  const config: WorkflowConfiguration = {
    states: [
      { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
      { id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
    ],
    assistants: [],
  }

  const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
  expect(result).toBe(true)
})
```

- [ ] **Step 2: Add a new test — shared assistant where the editing state is the second referencing state**

After the test updated in Step 1, add:

```ts
it('returns true when assistant is shared and the current node is the second referencing state', () => {
  const config: WorkflowConfiguration = {
    states: [
      { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
      { id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
      { id: 'state3', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
    ],
    assistants: [],
  }

  const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state2')
  expect(result).toBe(true)
})
```

- [ ] **Step 3: Add a test — shared assistant where the current node is NOT among the referencing states (edge case)**

```ts
it('returns false when assistant is shared but current node does not reference it', () => {
  const config: WorkflowConfiguration = {
    states: [
      { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
      { id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
    ],
    assistants: [],
  }

  const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state3')
  expect(result).toBe(false)
})
```

- [ ] **Step 4: Run tests to confirm they fail (RED)**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts
```

Expected: the updated multi-reference test and the two new tests FAIL. All other tests PASS.

- [ ] **Step 5: Implement the fix in `idGenerators.ts`**

In `src/utils/workflowEditor/helpers/states/idGenerators.ts`, replace the final `return` statement of `shouldReuseActorId` (line 131):

Before:
```ts
  return referencingStates.length === 1 && referencingStates[0].id === currentStateId
```

After:
```ts
  if (actorType === ActorTypes.Assistant) {
    return referencingStates.some((state) => state.id === currentStateId)
  }

  return referencingStates.length === 1 && referencingStates[0].id === currentStateId
```

The full updated function body should look like:

```ts
export const shouldReuseActorId = (
  config: WorkflowConfiguration,
  actorType: ActorTypes,
  actorId: string | undefined,
  currentStateId: string
): boolean => {
  if (!actorId) {
    return false
  }

  const actorField = ACTOR_FIELD_MAP[actorType]

  const referencingStates =
    config.states?.filter((state) => {
      return (state as any)[actorField] === actorId
    }) ?? []

  if (actorType === ActorTypes.Assistant) {
    return referencingStates.some((state) => state.id === currentStateId)
  }

  return referencingStates.length === 1 && referencingStates[0].id === currentStateId
}
```

- [ ] **Step 6: Run tests to confirm they pass (GREEN)**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts
```

Expected: all tests in the file PASS.

- [ ] **Step 7: Run the full unit suite to check for regressions**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/workflowEditor/helpers/states/idGenerators.ts
git add src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts
git commit -m "EPMCDME-10583: Allow shared assistant actors to be updated in-place on step edit"
```
