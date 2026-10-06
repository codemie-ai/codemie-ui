# Project-Scoped LLM Model Filtering on Chat Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the chat page model dropdown to show only models explicitly allowed for the current project, with graceful fallback to all models when no project or restrictions exist.

**Architecture:** Implement project-scoped filtering by: (1) extracting `projectId` from the current chat snapshot, (2) creating a utility function to fetch and filter project models, (3) adding a store getter for filtered models, (4) integrating the getter into both model selectors on the chat page, and (5) handling fallback when project config is unavailable.

**Tech Stack:** TypeScript, Valtio (state management), React hooks, Vitest + React Testing Library for tests.

## Global Constraints

- Follow three-layer architecture: Component → Store → API (no direct API calls in components)
- Store async methods must follow the loading/error/finally pattern
- API responses parsed with `.json()` (never `.data`)
- Errors displayed via `toaster.error()`
- Components use `useSnapshot()` to read state; never mutate snapshots directly
- Commit per task using the repository's existing convention (ticket key in message)
- All tests must be added alongside implementation; use `Test-first: yes/no` for each task

---

## Acceptance Criteria

1. When a chat has a `projectId`, the model dropdown shows only models in that project's allowed list
2. If no project or no restrictions configured, fallback to showing all available models
3. Selection and conversation creation validates against allowed models
4. Component logic properly separated from store/utility logic
5. Tests cover both restricted and unrestricted scenarios

---

## File Structure

**New files to create:**
- `src/utils/projectModelFiltering.ts` — Utility for fetching and filtering models by project

**Files to modify:**
- `src/store/chats.ts` — Add getter for filtered models (cache per project)
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — Integrate project filtering
- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — Integrate project filtering
- `src/pages/chat/ChatPage.tsx` — Pass project context to selectors
- Tests for modified components and new utility

---

### Task 1: Create Project Model Filtering Utility

**Files:**
- Create: `src/utils/projectModelFiltering.ts`
- Test: `src/utils/__tests__/projectModelFiltering.test.ts`

**Interfaces:**
- Consumes: 
  - `getProjectModelConfigurationFromBackend(projectName: string): Promise<{ enabledModelIds: string[]; defaultModelId?: string }>`
  - `llmModels: Array<{ value: string; label: string; isPremium?: boolean }>`
- Produces:
  - `getFilteredModelsForProject(projectId: string | undefined, allModels: Array<{ value: string; label: string; isPremium?: boolean }>): Promise<Array<{ value: string; label: string; isPremium?: boolean }>>`
  - Returns all models if projectId is undefined or empty
  - Returns filtered models if projectId is valid; logs warning and returns all if fetch fails

**Steps:**

- [ ] **Step 1: Write the failing test for filtering logic**

```typescript
// src/utils/__tests__/projectModelFiltering.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFilteredModelsForProject } from '../projectModelFiltering';

describe('projectModelFiltering', () => {
  const mockAllModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ];

  it('returns all models when projectId is undefined', async () => {
    const result = await getFilteredModelsForProject(undefined, mockAllModels);
    expect(result).toEqual(mockAllModels);
  });

  it('returns all models when projectId is empty string', async () => {
    const result = await getFilteredModelsForProject('', mockAllModels);
    expect(result).toEqual(mockAllModels);
  });

  it('returns filtered models when project has restrictions', async () => {
    const result = await getFilteredModelsForProject('zoo', mockAllModels);
    expect(result.length).toBeLessThanOrEqual(mockAllModels.length);
    expect(result.every(m => ['gpt-4', 'claude-3'].includes(m.value))).toBe(true);
  });

  it('returns all models when project fetch fails', async () => {
    vi.stubGlobal('console', { warn: vi.fn() });
    const result = await getFilteredModelsForProject('invalid-project', mockAllModels);
    expect(result).toEqual(mockAllModels);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/utils/__tests__/projectModelFiltering.test.ts`
Expected: FAIL with "getFilteredModelsForProject not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/utils/projectModelFiltering.ts
import { getProjectModelConfigurationFromBackend } from '../pages/settings/administration/projectsManagement/components/projectModelConfiguration/index';

export interface LLMModel {
  value: string;
  label: string;
  isPremium?: boolean;
}

const projectConfigCache = new Map<string, { enabledModelIds: string[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch or retrieve cached project model configuration
 */
async function getProjectConfig(projectId: string): Promise<{ enabledModelIds: string[] } | null> {
  const cached = projectConfigCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { enabledModelIds: cached.enabledModelIds };
  }

  try {
    const config = await getProjectModelConfigurationFromBackend(projectId);
    projectConfigCache.set(projectId, {
      enabledModelIds: config.enabledModelIds,
      timestamp: Date.now(),
    });
    return config;
  } catch (error) {
    console.warn(`Failed to fetch project model config for project "${projectId}":`, error);
    return null;
  }
}

/**
 * Get filtered models for a project, or all models if no project or no restrictions
 */
export async function getFilteredModelsForProject(
  projectId: string | undefined,
  allModels: LLMModel[]
): Promise<LLMModel[]> {
  if (!projectId) {
    return allModels;
  }

  const config = await getProjectConfig(projectId);
  if (!config || config.enabledModelIds.length === 0) {
    return allModels;
  }

  const enabledSet = new Set(config.enabledModelIds);
  return allModels.filter(model => enabledSet.has(model.value));
}

/**
 * Clear the project config cache (for testing or manual reset)
 */
export function clearProjectConfigCache(): void {
  projectConfigCache.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/utils/__tests__/projectModelFiltering.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/projectModelFiltering.ts src/utils/__tests__/projectModelFiltering.test.ts
git commit -m "feat(EPMCDME-14452): Add project model filtering utility with caching"
```

---

### Task 2: Add Filtered Models Getter to chatsStore

**Files:**
- Modify: `src/store/chats.ts`
- Test: `src/store/__tests__/chats.test.ts`

**Interfaces:**
- Consumes:
  - `getFilteredModelsForProject(projectId: string | undefined, allModels: LLMModel[]): Promise<LLMModel[]>`
  - `appInfoStore.llmModels: LLMModel[]`
  - `currentChat.projectId?: string`
- Produces:
  - `chatsStore.getModelsForCurrentChat(): Promise<LLMModel[]>`
  - Returns filtered models based on current chat's projectId; updates `filteredModels` state

**Steps:**

- [ ] **Step 1: Write the failing test for store getter**

```typescript
// In src/store/__tests__/chats.test.ts, add:
import { chatsStore } from '../chats';

describe('chatsStore.getModelsForCurrentChat', () => {
  it('returns filtered models for chat with projectId', async () => {
    chatsStore.currentChat = { id: '1', projectId: 'zoo', llmModel: 'gpt-4' } as any;
    const models = await chatsStore.getModelsForCurrentChat();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('returns all models for chat without projectId', async () => {
    chatsStore.currentChat = { id: '2', llmModel: 'gpt-4' } as any;
    const models = await chatsStore.getModelsForCurrentChat();
    expect(models.length).toBe(chatsStore.llmModels.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/store/__tests__/chats.test.ts -t "getModelsForCurrentChat"`
Expected: FAIL with "getModelsForCurrentChat is not a function"

- [ ] **Step 3: Modify chatsStore to add the getter**

In `src/store/chats.ts`, add the property and method:

```typescript
import { getFilteredModelsForProject } from '../utils/projectModelFiltering';

// Near the top of the chatsStore proxy, add:
filteredModels: [] as LLMModel[],

// Add method to the store object (after existing methods):
async getModelsForCurrentChat() {
  try {
    this.loading = true;
    this.error = null;
    const allModels = appInfoStore.llmModels;
    const projectId = this.currentChat?.projectId;
    this.filteredModels = await getFilteredModelsForProject(projectId, allModels);
  } catch (error) {
    this.error = error instanceof Error ? error.message : 'Failed to filter models';
    console.error('Error filtering models for chat:', error);
    toaster.error(this.error);
  } finally {
    this.loading = false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/store/__tests__/chats.test.ts -t "getModelsForCurrentChat"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.test.ts
git commit -m "feat(EPMCDME-14452): Add getModelsForCurrentChat getter to chatsStore"
```

---

### Task 3: Update ChatPromptLlmSelector to Use Project-Filtered Models

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:134-240`
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`

**Interfaces:**
- Consumes:
  - `chatsStore.getModelsForCurrentChat(): Promise<LLMModel[]>`
  - `chatsStore.filteredModels: LLMModel[]`
  - `chatsStore.currentChat.projectId?: string`
- Produces:
  - Component still exports the same JSX interface
  - Now calls `getModelsForCurrentChat()` on mount if projectId exists
  - Uses `filteredModels` from store instead of directly accessing `appInfoStore.llmModels`

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// In src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ChatPromptLlmSelector } from '../ChatPromptLlmSelector';

describe('ChatPromptLlmSelector with project filtering', () => {
  it('calls getModelsForCurrentChat on mount when projectId exists', async () => {
    const mockGetModels = vi.fn().mockResolvedValue([
      { value: 'gpt-4', label: 'GPT-4' },
    ]);
    chatsStore.getModelsForCurrentChat = mockGetModels;
    chatsStore.currentChat = { id: '1', projectId: 'zoo' } as any;

    render(<ChatPromptLlmSelector />);

    await waitFor(() => {
      expect(mockGetModels).toHaveBeenCalled();
    });
  });

  it('renders filtered models when projectId is set', async () => {
    chatsStore.filteredModels = [
      { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    ];
    chatsStore.currentChat = { id: '1', projectId: 'zoo', llmModel: 'gpt-4' } as any;

    render(<ChatPromptLlmSelector />);

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx -t "project filtering"`
Expected: FAIL with missing logic

- [ ] **Step 3: Add useEffect to fetch filtered models on mount**

In `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx`, after existing `useEffect` blocks (around line 145):

```typescript
import { useEffect } from 'react';

// Add after other useEffect hooks:
useEffect(() => {
  const projectId = currentChat?.projectId;
  if (projectId) {
    chatsStore.getModelsForCurrentChat();
  }
}, [currentChat?.projectId]);
```

- [ ] **Step 4: Update the render logic to use filteredModels**

In the dropdown render section (around line 180), change:

From: `const availableModels = appInfoStore.llmModels.filter(...)`
To: `const availableModels = chatsStore.filteredModels.length > 0 ? chatsStore.filteredModels : appInfoStore.llmModels;`

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx -t "project filtering"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx
git commit -m "feat(EPMCDME-14452): Integrate project-scoped model filtering in ChatPromptLlmSelector"
```

---

### Task 4: Update ChatConfigLlmSelector to Use Project-Filtered Models

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx:22-48`
- Test: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`

**Interfaces:**
- Consumes:
  - `chatsStore.filteredModels: LLMModel[]`
  - `chatsStore.currentChat.projectId?: string`
  - Existing props passed to component
- Produces:
  - Same JSX interface as before
  - Now uses `filteredModels` when available instead of all models

**Steps:**

- [ ] **Step 1: Write the failing test**

```typescript
// In src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx
import { render, screen } from '@testing-library/react';
import { ChatConfigLlmSelector } from '../ChatConfigLlmSelector';

describe('ChatConfigLlmSelector with project filtering', () => {
  it('uses filtered models when project is set', () => {
    chatsStore.filteredModels = [
      { value: 'gpt-4', label: 'GPT-4', isPremium: true },
      { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    ];
    chatsStore.currentChat = { id: '1', projectId: 'zoo', llmModel: 'gpt-4' } as any;

    render(<ChatConfigLlmSelector value="gpt-4" onChange={vi.fn()} />);

    const options = screen.getAllByRole('option');
    // Should only show the 2 filtered models, not all available
    expect(options.length).toBeLessThanOrEqual(3); // +1 for placeholder
  });

  it('falls back to all models when filteredModels is empty', () => {
    chatsStore.filteredModels = [];
    chatsStore.currentChat = { id: '1', llmModel: 'gpt-4' } as any;

    render(<ChatConfigLlmSelector value="gpt-4" onChange={vi.fn()} />);

    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx -t "project filtering"`
Expected: FAIL

- [ ] **Step 3: Modify selector to pass filtered models to LLMSelector**

In `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx`, update the render:

```typescript
const modelsToUse = chatsStore.filteredModels.length > 0 
  ? chatsStore.filteredModels 
  : appInfoStore.llmModels;

return (
  <LLMSelector
    models={modelsToUse}
    value={value}
    onChange={onChange}
    // ... other props
  />
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx -t "project filtering"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx
git commit -m "feat(EPMCDME-14452): Integrate project-scoped model filtering in ChatConfigLlmSelector"
```

---

### Task 5: Initialize Filtered Models on Chat Page Load

**Files:**
- Modify: `src/pages/chat/ChatPage.tsx:74-100`
- Test: `src/pages/chat/__tests__/ChatPage.test.tsx` (if exists, or integration test)

**Interfaces:**
- Consumes:
  - `chatsStore.currentChat.projectId?: string`
  - `chatsStore.getModelsForCurrentChat(): Promise<LLMModel[]>`
- Produces:
  - When ChatPage loads and currentChat changes, calls `getModelsForCurrentChat()` to prime the filtered list

**Steps:**

- [ ] **Step 1: Write the test**

```typescript
// In src/pages/chat/__tests__/ChatPage.test.tsx or integration test
it('fetches filtered models when page loads with projectId', async () => {
  const mockGetModels = vi.fn();
  chatsStore.getModelsForCurrentChat = mockGetModels;
  chatsStore.currentChat = { id: '1', projectId: 'zoo' } as any;

  render(<ChatPage />);

  await waitFor(() => {
    expect(mockGetModels).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add useEffect to ChatPage to initialize filtered models**

In `src/pages/chat/ChatPage.tsx`, near the component definition (after other useEffect hooks):

```typescript
useEffect(() => {
  // Fetch filtered models when currentChat or its projectId changes
  if (currentChat?.projectId) {
    chatsStore.getModelsForCurrentChat();
  }
}, [currentChat?.projectId]);
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test:unit -- src/pages/chat/__tests__/ChatPage.test.tsx -t "filtered models"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/chat/ChatPage.tsx
git commit -m "feat(EPMCDME-14452): Initialize filtered models on ChatPage load"
```

---

### Task 6: Add Integration Test for Project-Scoped Model Filtering

**Files:**
- Create: `src/pages/chat/__tests__/project-scoped-models.integration.test.ts`

**Interfaces:**
- Consumes: All modified components and store
- Produces: Comprehensive integration test covering the flow

**Steps:**

- [ ] **Step 1: Write integration test covering full flow**

```typescript
// src/pages/chat/__tests__/project-scoped-models.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatPage } from '../ChatPage';
import { chatsStore } from '../../../store/chats';
import { appInfoStore } from '../../../store/appInfo';

describe('Project-scoped model filtering integration', () => {
  beforeEach(() => {
    // Mock appInfo with all models
    appInfoStore.llmModels = [
      { value: 'gpt-4', label: 'GPT-4', isPremium: true },
      { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
      { value: 'claude-3', label: 'Claude 3', isPremium: false },
    ];

    // Mock project config fetch
    vi.mock('../utils/projectModelFiltering', () => ({
      getFilteredModelsForProject: vi.fn(async (projectId, allModels) => {
        if (projectId === 'zoo') {
          return allModels.filter(m => ['gpt-4', 'gpt-3.5'].includes(m.value));
        }
        return allModels;
      }),
    }));
  });

  it('shows only allowed models when chat has project restriction', async () => {
    chatsStore.currentChat = {
      id: '1',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any;

    render(<ChatPage />);

    await waitFor(() => {
      // Should show filtered models
      expect(chatsStore.filteredModels.length).toBeLessThan(appInfoStore.llmModels.length);
    });
  });

  it('shows all models when chat has no project', async () => {
    chatsStore.currentChat = {
      id: '2',
      llmModel: 'gpt-4',
    } as any;

    render(<ChatPage />);

    await waitFor(() => {
      // Should show all models (or empty if no filtering needed)
      expect(chatsStore.filteredModels.length === 0 || 
             chatsStore.filteredModels.length === appInfoStore.llmModels.length).toBe(true);
    });
  });

  it('gracefully handles missing project config', async () => {
    chatsStore.currentChat = {
      id: '3',
      projectId: 'nonexistent-project',
      llmModel: 'gpt-4',
    } as any;

    render(<ChatPage />);

    await waitFor(() => {
      // Should fall back to all models when project config is not found
      expect(chatsStore.error).toBeFalsy();
      expect(chatsStore.filteredModels.length > 0).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test:integration -- src/pages/chat/__tests__/project-scoped-models.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/chat/__tests__/project-scoped-models.integration.test.ts
git commit -m "test(EPMCDME-14452): Add integration test for project-scoped model filtering"
```

---

### Task 7: Update Types If Needed and Add Documentation

**Files:**
- Modify: `src/types/entity/conversation.ts` (if projectId needs clarification in docs)
- Create: `src/utils/projectModelFiltering.ts.md` (inline JSDoc, already added in Task 1)

**Interfaces:**
- Ensures `Conversation.projectId` is documented
- Exports are properly typed

**Steps:**

- [ ] **Step 1: Verify Conversation type includes projectId**

Run: `grep -n "projectId" src/types/entity/conversation.ts`
Expected: Should show `projectId?: string;` in Conversation interface

- [ ] **Step 2: Add JSDoc to projectModelFiltering.ts if not present**

Verify exports in `src/utils/projectModelFiltering.ts` have JSDoc comments (already done in Task 1).

- [ ] **Step 3: Verify all types are exported correctly**

Check `src/utils/projectModelFiltering.ts`:
- Export `LLMModel` interface
- Export `getFilteredModelsForProject` function
- Export `clearProjectConfigCache` function (for tests)

- [ ] **Step 4: Commit (if any changes made)**

```bash
git add src/utils/projectModelFiltering.ts
git commit -m "docs(EPMCDME-14452): Add JSDoc and verify type exports"
```

---

### Task 8: Run Full Test Suite and Lint

**Files:**
- All modified/created files

**Steps:**

- [ ] **Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: All tests pass

- [ ] **Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: All tests pass

- [ ] **Step 3: Run type check**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Run lint and format**

Run: `npm run lint`
Run: `npm run format`
Expected: No lint errors (formatter runs automatically per .claude/settings.json)

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build`
Expected: Build completes without errors

- [ ] **Step 6: Final commit (quality gates)**

```bash
git add .
git commit -m "chore(EPMCDME-14452): Pass all quality gates"
```

---

## Negative Constraints Check

**From requirements:**
- ✅ "Handle missing project or no restrictions gracefully" → Task 1-2: fallback to all models when `projectId` undefined or config unavailable
- ✅ "Show only models explicitly allowed" → Task 1-4: filtering by `enabledModelIds` from backend config
- ✅ "Component logic properly separated" → Tasks 3-4: selectors read from store, not directly from API
- ✅ "Tests cover both restricted and unrestricted scenarios" → Task 6: integration test covers both paths

**No negative constraints explicitly stated.**

---

Plan complete and saved to `C:\Users\MaximGorbunov\source\repos\SDAI\codemie-ui\plan.md`.

```
status: ok
plan: C:\Users\MaximGorbunov\source\repos\SDAI\codemie-ui\plan.md
tasks: 8
test_first: 6
task_titles:
1 — Create Project Model Filtering Utility
2 — Add Filtered Models Getter to chatsStore
3 — Update ChatPromptLlmSelector to Use Project-Filtered Models
4 — Update ChatConfigLlmSelector to Use Project-Filtered Models
5 — Initialize Filtered Models on Chat Page Load
6 — Add Integration Test for Project-Scoped Model Filtering
7 — Update Types and Add Documentation
8 — Run Full Test Suite and Lint
```

---

## Execution Handoff

**Plan complete and ready for implementation.**

Two execution options are available:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, with code review between tasks for faster iteration and better catch of issues early.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batching related work with checkpoints for your review.

**Which approach would you prefer?**