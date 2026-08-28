# Fix: Invalid Connection Unknown Node Type — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register `NodeTypes.SUB_WORKFLOW` in the connection validator so sub-workflow nodes can be connected to and from other nodes without triggering "Invalid connection: unknown node type".

**Architecture:** Single-file change to `connectionValidator.ts`. Add `NodeTypes.SUB_WORKFLOW` to (1) the `EXECUTION_NODES` array so that `START`, `CONDITIONAL`, and `SWITCH` nodes accept it as a valid target, and (2) `NODE_VALIDATION_RULES` so `checkConnectionRules` no longer returns `UNKNOWN_NODE_TYPE` for sub-workflow connections. No other files need changes — the `CONDITIONAL` and `SWITCH` `validTargets` spreads capture `EXECUTION_NODES` by reference at declaration time.

**Tech Stack:** TypeScript, Vitest

## Global Constraints

- Commit message format: `EPMCDME-11609: Capital sentence` (enforced by CI).
- Run `npm run lint && npm run typecheck` before every commit.
- Test-first: yes — write failing tests before touching the implementation.

---

### Task 1: Register sub-workflow node type in the connection validator

**Test-first: yes — "sub_workflow → assistant connection is valid" (fails because SUB_WORKFLOW has no rule entry)**

**Files:**
- Modify: `src/utils/workflowEditor/helpers/connections/__tests__/connectionValidator.test.ts`
- Modify: `src/utils/workflowEditor/helpers/connections/connectionValidator.ts:70-75,85-129`

**Interfaces:**
- Consumes: `NodeTypes.SUB_WORKFLOW` from `@/types/workflowEditor/base` (already exported by Story 1)
- Produces: `isValidConnection` accepts any connection involving a `sub_workflow` node and applies the same rules as `ASSISTANT`/`TOOL`/`CUSTOM`/`TRANSFORM`

---

- [ ] **Step 1: Add `sub_workflow` fixtures to the test `beforeEach`**

In `connectionValidator.test.ts`, add to the `nodes` array inside `beforeEach`:
```ts
{ id: 'subworkflow1', type: NodeTypes.SUB_WORKFLOW, position: { x: 0, y: 0 }, data: {} },
```
And to the `config.states` array:
```ts
{ id: 'subworkflow1', _meta: { type: NodeTypes.SUB_WORKFLOW }, next: {} },
```

- [ ] **Step 2: Write failing tests for sub-workflow connections**

Add a new `describe` block inside `describe('node type validation')` in the test file:

```ts
describe('sub-workflow node', () => {
  it('should allow sub-workflow as source to assistant', () => {
    const connection: Connection = {
      source: 'subworkflow1',
      target: 'assistant1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should allow assistant as source to sub-workflow', () => {
    const connection: Connection = {
      source: 'assistant1',
      target: 'subworkflow1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should allow start to sub-workflow connection', () => {
    const connection: Connection = {
      source: 'start',
      target: 'subworkflow1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should allow sub-workflow to end connection', () => {
    const connection: Connection = {
      source: 'subworkflow1',
      target: 'end',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should allow conditional to sub-workflow connection', () => {
    const connection: Connection = {
      source: 'conditional1',
      target: 'subworkflow1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should allow switch to sub-workflow connection', () => {
    const connection: Connection = {
      source: 'switch1',
      target: 'subworkflow1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(true)
  })

  it('should reject sub-workflow as target of end node', () => {
    const connection: Connection = {
      source: 'end',
      target: 'subworkflow1',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(false)
  })

  it('should reject start node as target of sub-workflow', () => {
    const connection: Connection = {
      source: 'subworkflow1',
      target: 'start',
      sourceHandle: null,
      targetHandle: null,
    }
    expect(isValidConnection(connection, nodes, config)).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests and confirm RED**

```bash
npm run test:unit -- --run --reporter=verbose src/utils/workflowEditor/helpers/connections/__tests__/connectionValidator.test.ts
```

Expected: the 6 "should allow" tests fail with the validator returning `false` (UNKNOWN_NODE_TYPE path). The 2 "should reject" tests may already pass — that is fine. Confirm failures before proceeding.

- [ ] **Step 4: Add `NodeTypes.SUB_WORKFLOW` to `EXECUTION_NODES`**

In `connectionValidator.ts`, change lines 70–75 from:
```ts
const EXECUTION_NODES: readonly string[] = [
  NodeTypes.ASSISTANT,
  NodeTypes.CUSTOM,
  NodeTypes.TOOL,
  NodeTypes.TRANSFORM,
]
```
to:
```ts
const EXECUTION_NODES: readonly string[] = [
  NodeTypes.ASSISTANT,
  NodeTypes.CUSTOM,
  NodeTypes.TOOL,
  NodeTypes.TRANSFORM,
  NodeTypes.SUB_WORKFLOW,
]
```

- [ ] **Step 5: Add `NodeTypes.SUB_WORKFLOW` to `NODE_VALIDATION_RULES`**

In `connectionValidator.ts`, after the `[NodeTypes.TRANSFORM]` entry (line 124–128) and before the closing `}` of `NODE_VALIDATION_RULES`, add:
```ts
  [NodeTypes.SUB_WORKFLOW]: {
    displayName: 'Sub-Workflow',
    canBeSource: true,
    canBeTarget: true,
  },
```

- [ ] **Step 6: Run tests and confirm GREEN**

```bash
npm run test:unit -- --run --reporter=verbose src/utils/workflowEditor/helpers/connections/__tests__/connectionValidator.test.ts
```

Expected: all tests pass, including the 8 new sub-workflow cases.

- [ ] **Step 7: Run the full suite to confirm no regressions**

```bash
npm run test:unit -- --run
```

Expected: all tests pass.

- [ ] **Step 8: Lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/utils/workflowEditor/helpers/connections/connectionValidator.ts \
        src/utils/workflowEditor/helpers/connections/__tests__/connectionValidator.test.ts
git commit -m "EPMCDME-11609: Register SUB_WORKFLOW in connection validator"
```
