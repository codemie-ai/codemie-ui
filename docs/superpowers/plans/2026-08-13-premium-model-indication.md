# Premium Model Indication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually indicate premium models across CodeMie UI (chat picker, chat prompt, assistant form, budgets page) backed by a new `is_premium` flag on `GET /v1/llm_models`, plus a `/help/models` catalog page.

**Architecture:** Backend (`codemie` repo) adds `is_premium: Optional[bool]` to the `LLMModel` DTO and populates it in one place (`LlmService.get_allowed_chat_models`) from the existing alias check, only when a `premium_models` budget is configured. Frontend (`codemie-ui` repo) maps the flag onto `ModelOption` and renders a shared `PremiumModelBadge` (existing `StatusBadge` Warning variant) in all selection surfaces, an amber tint + dismissible `InfoWarning` tip on the chat prompt, a link on the premium budget card, and a new filterable models catalog page.

**Spec:** `codemie-ui/docs/superpowers/specs/2026-08-13-premium-model-indication-design.md`

**Tech Stack:** Python/FastAPI/Pydantic/pytest (backend); React 19/TypeScript/Valtio/Tailwind/PrimeReact/Vitest+RTL (frontend).

**Repos:** Tasks 1–2 run in `/Users/Nikita_Levyankov/repos/codemie-ai/codemie`; Tasks 3–9 in `/Users/Nikita_Levyankov/repos/codemie-ai/codemie-ui`; Task 10 uses both. Commit steps are per-repo. Repo policy: git operations only with user confirmation — confirm before each commit step.

---

## Known limitation (accepted in spec review)

When a chat uses "Assistant Default" (no explicit `llmModel` on the conversation), the assistant's configured model is resolved server-side at request time and is not available to the UI. Premium indication in chat (trigger badge, tint, tip) therefore applies only when an explicit premium model is selected on the chat. The picker still shows badges on all premium rows.

---

## Task 1: Backend — `is_premium` on `LLMModel` + population

**Files:**
- Modify: `src/codemie/configs/llm_config.py` (LLMModel, after `api_version`, line ~102)
- Modify: `src/codemie/service/llm_service/llm_service.py:390-411` (`get_allowed_chat_models`)
- Test: `tests/codemie/service/test_llm_service.py` (append new test class)

- [ ] **Step 1: Write the failing tests**

Append to `tests/codemie/service/test_llm_service.py`:

```python
class TestApplyPremiumFlags:
    """Tests for is_premium population in get_allowed_chat_models."""

    @pytest.fixture(autouse=True)
    def clear_premium_caches(self):
        from codemie.enterprise.litellm.dependencies import is_premium_model, is_premium_models_enabled

        is_premium_models_enabled.cache_clear()
        is_premium_model.cache_clear()
        yield
        is_premium_models_enabled.cache_clear()
        is_premium_model.cache_clear()

    @contextlib.contextmanager
    def _premium_budget(self, enabled: bool):
        from codemie.configs.budget_config import budget_config
        from codemie.configs.config import PredefinedBudgetConfig

        current = [b for b in budget_config.predefined_budgets if b.budget_category != "premium_models"]
        if enabled:
            current.append(
                PredefinedBudgetConfig(
                    budget_id="premium_models",
                    name="Premium",
                    description=None,
                    soft_budget=0.0,
                    max_budget=0.0,
                    budget_duration="30d",
                    budget_category="premium_models",
                )
            )
        with patch.object(budget_config, "predefined_budgets", current):
            yield

    def _models(self):
        from codemie.configs.llm_config import LLMModel

        return [
            LLMModel(base_name="claude-opus-4-1", deployment_name="claude-opus-4-1", enabled=True),
            LLMModel(base_name="gpt-4o", deployment_name="gpt-4o", enabled=True),
        ]

    def test_premium_flag_set_when_feature_enabled_and_alias_matches(self):
        from codemie.configs.config import config
        from codemie.service.llm_service.llm_service import llm_service

        with self._premium_budget(True), patch.object(config, "LITELLM_PREMIUM_MODELS_ALIASES", ["opus"]):
            with patch.object(llm_service, "get_allowed_models") as mock_allowed:
                from codemie.configs.llm_config import LiteLLMModels

                mock_allowed.return_value = LiteLLMModels(chat_models=self._models(), embedding_models=[])
                result = llm_service.get_allowed_chat_models(user=MagicMock())

        by_name = {m.base_name: m for m in result}
        assert by_name["claude-opus-4-1"].is_premium is True
        assert by_name["gpt-4o"].is_premium is False

    def test_premium_flag_none_when_feature_disabled(self):
        from codemie.configs.config import config
        from codemie.service.llm_service.llm_service import llm_service

        with self._premium_budget(False), patch.object(config, "LITELLM_PREMIUM_MODELS_ALIASES", ["opus"]):
            with patch.object(llm_service, "get_allowed_models") as mock_allowed:
                from codemie.configs.llm_config import LiteLLMModels

                mock_allowed.return_value = LiteLLMModels(chat_models=self._models(), embedding_models=[])
                result = llm_service.get_allowed_chat_models(user=MagicMock())

        assert all(m.is_premium is None for m in result)
```

Add missing imports at top of the test file if not already present: `import contextlib`, `from unittest.mock import MagicMock, patch`, `import pytest` (match the file's existing imports — reuse what's there).

- [ ] **Step 2: Run tests to verify they fail**

Run: `poetry run pytest tests/codemie/service/test_llm_service.py::TestApplyPremiumFlags -v`
Expected: FAIL (`LLMModel` has no attribute / field `is_premium`).

- [ ] **Step 3: Implement**

In `src/codemie/configs/llm_config.py`, add to `LLMModel` right after the `api_version` field (line ~102):

```python
    is_premium: Optional[bool] = None  # Set only when a premium_models budget is configured; True if base_name matches LITELLM_PREMIUM_MODELS_ALIASES
```

In `src/codemie/service/llm_service/llm_service.py`, replace the body of `get_allowed_chat_models` (currently ends with `return self._filter_models_by_visibility(user_models.chat_models, include_all)` at line 411):

```python
        user_models = self.get_allowed_models(user)
        models = self._filter_models_by_visibility(user_models.chat_models, include_all)
        return self._apply_premium_flags(models)

    @staticmethod
    def _apply_premium_flags(models: List[LLMModel]) -> List[LLMModel]:
        """Set is_premium on each model when the premium-models budget feature is enabled.

        When no premium_models budget is configured the field stays None and is omitted
        from API responses (response_model_exclude_none=True on the router).
        """
        from codemie.enterprise.litellm.dependencies import is_premium_model, is_premium_models_enabled

        if not is_premium_models_enabled():
            return models
        for model in models:
            model.is_premium = is_premium_model(model.base_name)
        return models
```

The lazy import matches the existing pattern in this module (`from codemie.enterprise.litellm import get_user_allowed_models` inside `get_allowed_models`, line 331).

- [ ] **Step 4: Run tests to verify they pass**

Run: `poetry run pytest tests/codemie/service/test_llm_service.py -v`
Expected: PASS (new class + all pre-existing tests in the file).

- [ ] **Step 5: Commit**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie
git add src/codemie/configs/llm_config.py src/codemie/service/llm_service/llm_service.py tests/codemie/service/test_llm_service.py
git commit -m "feat: expose is_premium flag on LLM models API"
```

---

## Task 2: Backend — router serialization contract test

**Files:**
- Test: `tests/codemie/rest_api/routers/test_llm_models.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/codemie/rest_api/routers/test_llm_models.py` (the file already has a `mock_llm_service` fixture patching `codemie.rest_api.routers.llm_models.llm_service` and a `client`):

```python
def test_llm_models_is_premium_serialization(mock_llm_service, client):
    """is_premium appears in JSON only when set (response_model_exclude_none)."""
    mock_llm_service.get_allowed_chat_models.return_value = [
        LLMModel(
            base_name="claude-opus-4-1",
            deployment_name="claude-opus-4-1",
            enabled=True,
            label="Claude Opus 4.1",
            is_premium=True,
        ),
        LLMModel(base_name="gpt-4o", deployment_name="gpt-4o", enabled=True, label="GPT-4o"),
    ]

    response = client.get("/v1/llm_models")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["is_premium"] is True
    assert "is_premium" not in payload[1]
```

Reuse the file's existing `LLMModel` import / fixture names — adjust the test signature to match what the file already defines.

- [ ] **Step 2: Run test to verify it fails**

Run: `poetry run pytest tests/codemie/rest_api/routers/test_llm_models.py::test_llm_models_is_premium_serialization -v`
Expected: PASS already if Task 1 is done (the field exists); if it fails on unexpected serialization, fix expectations. This test locks the contract: field present only when set.

- [ ] **Step 3: Run the full router + premium test files**

Run: `poetry run pytest tests/codemie/rest_api/routers/test_llm_models.py tests/enterprise/litellm/test_premium_models_budget.py -v`
Expected: PASS, no regressions.

- [ ] **Step 4: Commit**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie
git add tests/codemie/rest_api/routers/test_llm_models.py
git commit -m "test: cover is_premium serialization contract on /v1/llm_models"
```

---

## Task 3: Frontend — data layer (`ModelOption.isPremium` + catalog fields)

**Files:**
- Modify: `src/types/entity/configuration.ts:34-39`
- Modify: `src/store/appInfo.ts:256-272` (`getLLMModels` mapping)
- Test: `src/store/__tests__/appInfo.test.ts`

The catalog page (Task 8) needs more than `value/label` — extend the mapping now with cost and capability fields so all surfaces share one shape.

- [ ] **Step 1: Write the failing test**

In `src/store/__tests__/appInfo.test.ts`, add a test in the existing describe block for `getLLMModels` (match the file's existing api-mocking pattern):

```ts
it('maps is_premium, cost and capability fields from the API response', async () => {
  mockAPI.get.mockResolvedValueOnce({
    json: async () => [
      {
        base_name: 'claude-opus-4-1',
        label: 'Claude Opus 4.1',
        default: false,
        provider: 'anthropic',
        is_premium: true,
        multimodal: true,
        supports_image_generation: false,
        default_for_categories: ['reasoning'],
        cost: { input: 0.000015, output: 0.000075 },
        features: { tools: true },
      },
      {
        base_name: 'gpt-4o',
        label: 'GPT-4o',
        default: true,
        provider: 'azure_openai',
        features: { tools: true },
      },
    ],
  } as Response)

  const models = await appInfoStore.getLLMModels()

  expect(models[0]).toEqual({
    value: 'claude-opus-4-1',
    label: 'Claude Opus 4.1',
    isDefault: false,
    provider: 'anthropic',
    isPremium: true,
    multimodal: true,
    supportsImageGeneration: false,
    supportsTools: true,
    defaultForCategories: ['reasoning'],
    cost: { input: 0.000015, output: 0.000075 },
  })
  expect(models[1].isPremium).toBeUndefined()
  expect(models[1].cost).toBeUndefined()
})
```

If the file mocks `api` differently (e.g. via a shared `mockAPI` helper from test-utils), adapt the mock call to the existing pattern in that file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/__tests__/appInfo.test.ts`
Expected: FAIL (received object lacks the new fields).

- [ ] **Step 3: Implement**

In `src/types/entity/configuration.ts`, extend `ModelOption`:

```ts
export interface ModelOption {
  value: string
  label: string
  isDefault: boolean
  provider?: string
  isPremium?: boolean
  multimodal?: boolean
  supportsImageGeneration?: boolean
  supportsTools?: boolean
  defaultForCategories?: string[]
  cost?: { input: number; output: number }
}
```

In `src/store/appInfo.ts`, update the `getLLMModels` mapping (lines 261-266):

```ts
      appInfoStore.llmModels = data.map((model: any) => ({
        value: model.base_name,
        label: model.label,
        isDefault: model.default,
        provider: model.provider,
        isPremium: model.is_premium,
        multimodal: model.multimodal,
        supportsImageGeneration: model.supports_image_generation,
        supportsTools: model.features?.tools,
        defaultForCategories: model.default_for_categories,
        cost: model.cost ? { input: model.cost.input, output: model.cost.output } : undefined,
      }))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/store/__tests__/appInfo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie-ui
git add src/types/entity/configuration.ts src/store/appInfo.ts src/store/__tests__/appInfo.test.ts
git commit -m "feat: map is_premium and catalog fields onto ModelOption"
```

---

## Task 4: Frontend — shared `PremiumModelBadge` component

**Files:**
- Create: `src/components/PremiumModelBadge/PremiumModelBadge.tsx`
- Create: `src/components/PremiumModelBadge/index.ts`
- Test: `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PremiumModelBadge from '../PremiumModelBadge'

describe('PremiumModelBadge', () => {
  it('renders the Premium status badge with the rates tooltip', () => {
    render(<PremiumModelBadge />)

    const badge = screen.getByRole('status', { name: 'Premium' })
    expect(badge).toBeInTheDocument()
    expect(badge.parentElement).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    expect(badge.parentElement).toHaveAttribute(
      'data-tooltip-content',
      'Premium model — higher usage rates apply'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/PremiumModelBadge`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/components/PremiumModelBadge/PremiumModelBadge.tsx`:

```tsx
import { FC } from 'react'

import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'

export const PREMIUM_MODEL_TOOLTIP = 'Premium model — higher usage rates apply'

const PremiumModelBadge: FC = () => (
  <span
    className="inline-flex shrink-0"
    data-tooltip-id="react-tooltip"
    data-tooltip-content={PREMIUM_MODEL_TOOLTIP}
  >
    <StatusBadge status={StatusEnum.Warning} text="Premium" />
  </span>
)

export default PremiumModelBadge
```

Note: verify the `StatusEnum` export style in `src/components/StatusBadge/StatusBadge.tsx` — it is exported as a named const (`export const StatusEnum = {...}`) alongside the default export; import accordingly.

`src/components/PremiumModelBadge/index.ts`:

```ts
export { default } from './PremiumModelBadge'
export { PREMIUM_MODEL_TOOLTIP } from './PremiumModelBadge'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/PremiumModelBadge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PremiumModelBadge
git commit -m "feat: add shared PremiumModelBadge component"
```

---

## Task 5: Frontend — chat model picker badges (`ChatPromptLlmSelector`)

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx`
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the existing test file (store mocks already exist — extend `mockAppInfoStore.llmModels` entries with `isPremium: true` where needed):

```tsx
it('shows Premium badge on premium model options', async () => {
  mockAppInfoStore.llmModels = [
    { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
    { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
  ]
  mockChatsStore.currentChat = { id: 'chat-1' } as Conversation

  render(<ChatPromptLlmSelector />)
  fireEvent.click(screen.getByText('Default')) // open the panel

  expect(await screen.findByText('Premium')).toBeInTheDocument()
  expect(screen.getByText('GPT-4o')).toBeInTheDocument()
})

it('shows Premium badge in the trigger when a premium model is selected', () => {
  mockAppInfoStore.llmModels = [
    { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
  ]
  mockChatsStore.currentChat = { id: 'chat-1', llmModel: 'claude-opus-4-1' } as Conversation

  render(<ChatPromptLlmSelector />)

  expect(screen.getByText('Premium')).toBeInTheDocument()
})

it('does not show Premium badge for standard models', () => {
  mockAppInfoStore.llmModels = [
    { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
  ]
  mockChatsStore.currentChat = { id: 'chat-1', llmModel: 'gpt-4o' } as Conversation

  render(<ChatPromptLlmSelector />)

  expect(screen.queryByText('Premium')).not.toBeInTheDocument()
})
```

Adapt panel-opening interaction to however existing tests in this file open the combobox.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ChatPromptLlmSelector`
Expected: FAIL on the two new "shows Premium badge" tests.

- [ ] **Step 3: Implement**

In `ChatPromptLlmSelector.tsx`:

a) Import: `import PremiumModelBadge from '@/components/PremiumModelBadge'`

b) In `renderOption`, model branch (currently lines 152-157):

```tsx
    const model = llmModels.find((m) => m.value === item.value)
    if (!model) return null
    return (
      <>
        <span className="truncate">{model.label}</span>
        {model.isPremium && <PremiumModelBadge />}
        {state.selected && <CheckSvg className="w-4 h-4 shrink-0" />}
      </>
    )
```

c) In the `OPTION_ID_RECOMMENDED` branch, add the badge after the label block when `defaultModel.isPremium`:

```tsx
          <div className="flex flex-col min-w-0">
            <span className="truncate">{defaultModel.label}</span>
            <span className="text-xs text-text-tertiary">Recommended</span>
          </div>
          {defaultModel.isPremium && <PremiumModelBadge />}
```

d) In `renderTrigger`, add the badge between the label and the chevron:

```tsx
  const showPremiumBadge = selectedModel?.isPremium ?? false
  ...
      <span className="text-xs font-medium">{triggerLabel}</span>
      {showPremiumBadge && <PremiumModelBadge />}
      <ChevronDownSvg className="w-3 h-3 shrink-0 opacity-60" />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ChatPromptLlmSelector`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatPrompt
git commit -m "feat: show Premium badge in chat model picker and trigger"
```

---

## Task 6: Frontend — chat prompt tint + dismissible premium tip

**Files:**
- Create: `src/pages/chat/components/ChatPrompt/ChatPremiumModelTip.tsx`
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` (wrapper classes ~line 232-257, tip render before the border-wrapper div)
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPremiumModelTip.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatPremiumModelTip from '../ChatPremiumModelTip'

describe('ChatPremiumModelTip', () => {
  it('shows the premium message with the model label', () => {
    render(<ChatPremiumModelTip modelLabel="Claude Opus 4.1" onDismiss={vi.fn()} />)

    expect(screen.getByText(/Premium model active/)).toBeInTheDocument()
    expect(screen.getByText(/Claude Opus 4.1/)).toBeInTheDocument()
    expect(screen.getByText(/higher usage rates apply/)).toBeInTheDocument()
  })

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn()
    render(<ChatPremiumModelTip modelLabel="Claude Opus 4.1" onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ChatPremiumModelTip`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/pages/chat/components/ChatPrompt/ChatPremiumModelTip.tsx`:

```tsx
import { FC } from 'react'

import CloseSvg from '@/assets/icons/close.svg?react'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'

interface ChatPremiumModelTipProps {
  modelLabel: string
  onDismiss: () => void
}

const ChatPremiumModelTip: FC<ChatPremiumModelTipProps> = ({ modelLabel, onDismiss }) => (
  <div className="relative w-full max-w-5xl mx-auto mb-2">
    <InfoWarning
      type={InfoWarningType.WARNING}
      message={`Premium model active — ${modelLabel} · higher usage rates apply to this conversation`}
      className="pr-8"
    />
    <button
      type="button"
      aria-label="Dismiss premium model tip"
      onClick={onDismiss}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-quaternary hover:text-text-primary transition-colors"
    >
      <CloseSvg className="w-3.5 h-3.5" />
    </button>
  </div>
)

export default ChatPremiumModelTip
```

Check `src/assets/icons/` for the exact close icon filename (`close.svg` / `cross.svg`) and `InfoWarningType` import path (`@/constants`) before writing; adjust to what exists.

In `ChatPrompt.tsx`:

a) Imports and snapshot — the file already imports `useSnapshot`; add:

```tsx
import PremiumModelBadge from '@/components/PremiumModelBadge' // not needed here; tip only:
import ChatPremiumModelTip from './ChatPremiumModelTip'
import { appInfoStore } from '@/store/appInfo'
```

(Add only what is missing — `appInfoStore` may already be imported.)

b) Inside the component, near the other snapshots (`defaultAssistant` line ~105):

```tsx
  const { llmModels } = useSnapshot(appInfoStore)
  const effectiveModel = currentChat?.llmModel
    ? llmModels.find((m) => m.value === currentChat.llmModel)
    : null
  const isPremiumActive = effectiveModel?.isPremium ?? false
  const premiumTipKey = `${currentChat?.id}:${effectiveModel?.value}`
  const [dismissedPremiumTipKey, setDismissedPremiumTipKey] = useState<string | null>(null)
```

c) Tint — in the inner prompt container div (currently `className={cn('flex flex-col gap-2 p-2 rounded-xl bg-surface-elevated cursor-text', resizable ? 'h-full min-h-0' : 'min-h-32 max-h-64')}`, lines ~251-258), append the premium clause:

```tsx
              className={cn(
                'flex flex-col gap-2 p-2 rounded-xl bg-surface-elevated cursor-text',
                resizable ? 'h-full min-h-0' : 'min-h-32 max-h-64',
                isPremiumActive && 'bg-yellow-500/[0.07] ring-1 ring-yellow-500/45'
              )}
```

d) Tip — inside the `px-6` container, immediately before the border-wrapper div (line ~240, before `<div className={getBorderWrapperClassName(...)}`):

```tsx
          {isPremiumActive && dismissedPremiumTipKey !== premiumTipKey && (
            <ChatPremiumModelTip
              modelLabel={effectiveModel!.label}
              onDismiss={() => setDismissedPremiumTipKey(premiumTipKey)}
            />
          )}
```

The tip reappears automatically when chat id or model changes, since the key changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ChatPremiumModelTip`
Expected: PASS. Then run the whole ChatPrompt suite: `npm test -- src/pages/chat/components/ChatPrompt` — expected PASS (update existing ChatPrompt tests only if the new snapshot fields break mocks; add `llmModels: []` to existing appInfo mocks if needed).

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatPrompt
git commit -m "feat: premium tint and dismissible tip on chat prompt"
```

---

## Task 7: Frontend — assistant form & chat Configuration selector (`LLMSelector`)

**Files:**
- Modify: `src/components/form/MultiSelect/MultiSelect.tsx:80-84` (widen `MultiSelectOptionType`)
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` (options map lines 82-103, JSX lines 128-151)
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx` (create if missing — check the directory first and extend the existing file if present)

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import LLMSelector from '../LLMSelector'

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ],
    imageGenerationModels: [],
    getLLMModels: vi.fn(),
    getImageGenerationModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

describe('LLMSelector premium badge', () => {
  it('passes options with isPremium flag and renders badge via renderOption', () => {
    render(<LLMSelector value="claude-opus-4-1" onChange={vi.fn()} allowEmpty />)

    // Selected value template shows the badge for the premium selection
    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0)
  })

  it('renders no badge for a standard selection', () => {
    render(<LLMSelector value="gpt-4o" onChange={vi.fn()} allowEmpty />)

    expect(screen.queryByText('Premium')).not.toBeInTheDocument()
  })
})
```

If an existing `LLMSelector.test.tsx` already mocks the stores, extend it instead of creating parallel mocks.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LLMSelector`
Expected: FAIL (no "Premium" rendered).

- [ ] **Step 3: Implement**

a) Widen the option type in `MultiSelect.tsx` (line 80-84) so boolean flags type-check:

```ts
export type MultiSelectOptionType = Record<
  string,
  string | boolean | undefined | { label: string; value: string | number | boolean }
>
```

b) In `LLMSelector.tsx`, preserve `isPremium` in the options map (line 93):

```ts
        ...models.map(({ label, value, isPremium }) => ({ label, value, isPremium })),
```

c) Add a custom option renderer (also used for the selected value) above the return:

```tsx
    const renderOption = (option: { label: string; isPremium?: boolean }) => (
      <span className="flex items-center gap-2 min-w-0">
        <span className="truncate">{option.label}</span>
        {option.isPremium && <PremiumModelBadge />}
      </span>
    )
```

d) Pass it to `MultiSelect` in the JSX:

```tsx
        <MultiSelect
          singleValue
          label={label}
          hint={hint}
          error={error}
          placeholder={placeholder}
          className={className}
          value={value}
          options={options}
          onChange={(e) => onChange(e.target.value ?? '')}
          onFilter={() => {}}
          renderOption={renderOption}
          selectedItemTemplate={renderOption}
          ref={selectRef}
        />
```

e) Import `PremiumModelBadge` at the top. `ChatConfigLlmSelector` wraps `LLMSelector` and inherits the behavior with no changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- LLMSelector`
Expected: PASS. Also run `npm test -- MultiSelect` to catch regressions from the type widening.

- [ ] **Step 5: Commit**

```bash
git add src/components/form/MultiSelect src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx
git commit -m "feat: show Premium badge in assistant LLM selector"
```

---

## Task 8: Frontend — models catalog page (`/help/models`)

**Files:**
- Create: `src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx`
- Create: `src/pages/help/ModelsCatalog/constants.ts`
- Create: `src/pages/help/ModelsCatalog/index.ts`
- Modify: `src/router.tsx` (~line 635, `otherRoutes`)
- Modify: `src/pages/help/HelpPage.tsx` (add link card, following the Release Notes pattern at lines 182-195)
- Test: `src/pages/help/ModelsCatalog/__tests__/ModelsCatalogPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ModelsCatalogPage from '../ModelsCatalogPage'

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      {
        label: 'Claude Opus 4.1',
        value: 'claude-opus-4-1',
        isDefault: false,
        provider: 'anthropic',
        isPremium: true,
        multimodal: true,
        supportsTools: true,
        cost: { input: 0.000015, output: 0.000075 },
      },
      {
        label: 'GPT-4o',
        value: 'gpt-4o',
        isDefault: true,
        provider: 'azure_openai',
        multimodal: true,
        supportsTools: true,
        defaultForCategories: ['global'],
        cost: { input: 0.0000025, output: 0.00001 },
      },
    ],
    getLLMModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

describe('ModelsCatalogPage', () => {
  it('renders models with provider, capabilities, cost and premium badge', () => {
    render(<ModelsCatalogPage />)

    expect(screen.getByText('Claude Opus 4.1')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('$15.00 / $75.00')).toBeInTheDocument()
    expect(screen.getByText('$2.50 / $10.00')).toBeInTheDocument()
  })

  it('filters by search text', () => {
    render(<ModelsCatalogPage />)

    fireEvent.change(screen.getByPlaceholderText('Search models…'), { target: { value: 'opus' } })

    expect(screen.getByText('Claude Opus 4.1')).toBeInTheDocument()
    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument()
  })

  it('filters to premium only', () => {
    render(<ModelsCatalogPage />)

    fireEvent.click(screen.getByRole('checkbox', { name: /premium only/i }))

    expect(screen.getByText('Claude Opus 4.1')).toBeInTheDocument()
    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument()
  })

  it('renders a dash when cost is missing', () => {
    mockAppInfoStore.llmModels[1].cost = undefined
    render(<ModelsCatalogPage />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ModelsCatalogPage`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/pages/help/ModelsCatalog/constants.ts`:

```ts
export const HELP_MODELS_ROUTE = '/help/models'
```

`src/pages/help/ModelsCatalog/index.ts`:

```ts
export { default } from './ModelsCatalogPage'
export { HELP_MODELS_ROUTE } from './constants'
```

`src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx`:

```tsx
import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import PremiumModelBadge from '@/components/PremiumModelBadge'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertexai: 'Google Vertex AI',
  anthropic: 'Anthropic',
  'vertex_ai-anthropic_models': 'Vertex AI Anthropic',
}

const formatCost = (cost?: { input: number; output: number }) =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

const ModelsCatalogPage: FC = () => {
  const { llmModels, getLLMModels } = useSnapshot(appInfoStore)
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('')
  const [premiumOnly, setPremiumOnly] = useState(false)

  useEffect(() => {
    getLLMModels()
  }, [getLLMModels])

  const providers = useMemo(
    () => [...new Set(llmModels.map((m) => m.provider).filter(Boolean))] as string[],
    [llmModels]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return llmModels.filter(
      (m) =>
        (!q || m.label.toLowerCase().includes(q)) &&
        (!provider || m.provider === provider) &&
        (!premiumOnly || m.isPremium)
    )
  }, [llmModels, search, provider, premiumOnly])

  const premiumCount = llmModels.filter((m) => m.isPremium).length

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto w-full">
        <h1 className="text-h2 text-text-primary mb-2">Available models</h1>
        <p className="text-sm text-text-tertiary mb-6">
          All models available on this deployment. <span className="text-aborted-primary">Premium</span>{' '}
          models are billed at higher rates and count against your project&rsquo;s Premium models budget.
        </p>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="bg-surface-base-secondary border border-border-secondary rounded-lg px-3 py-2 text-sm text-text-primary w-60"
          />
          <select
            aria-label="Filter by provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-surface-base-secondary border border-border-secondary rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="">All providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={premiumOnly}
              onChange={(e) => setPremiumOnly(e.target.checked)}
              aria-label="Premium only"
            />
            Premium only
          </label>
          <span className="ml-auto text-xs text-text-quaternary">
            {filtered.length} models · {premiumCount} premium
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-specific-table-header text-text-quaternary text-xs uppercase">
              <th className="text-left px-3 py-2 font-medium">Model</th>
              <th className="text-left px-3 py-2 font-medium">Provider</th>
              <th className="text-left px-3 py-2 font-medium">Capabilities</th>
              <th className="text-left px-3 py-2 font-medium">Cost / 1M tokens (in / out)</th>
              <th className="text-left px-3 py-2 font-medium">Default for</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.value}
                className={cn('border-b border-border-structural', m.isPremium && 'bg-yellow-500/5')}
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 text-text-primary font-medium">
                    {m.label}
                    {m.isPremium && <PremiumModelBadge />}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  {(m.provider && (PROVIDER_LABELS[m.provider] ?? m.provider)) || '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1 flex-wrap">
                    {m.multimodal && <span className="text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary">multimodal</span>}
                    {m.supportsTools && <span className="text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary">tools</span>}
                    {m.supportsImageGeneration && <span className="text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary">image gen</span>}
                  </span>
                </td>
                <td className={cn('px-3 py-2 font-geist-mono text-xs', m.isPremium ? 'text-aborted-primary' : 'text-text-primary')}>
                  {formatCost(m.cost)}
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  {m.defaultForCategories?.length ? m.defaultForCategories.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}

export default ModelsCatalogPage
```

Verify the `PageLayout` import path against `src/pages/terms/TermsAndConditionsPage.tsx` (it uses `@/components/Layouts/Layout` — match its exact import style) and adjust class names to the styling guide if the tokens differ.

In `src/router.tsx`, add to `otherRoutes` after the `help` entry:

```tsx
  {
    id: 'help-models',
    path: 'help/models',
    Component: ModelsCatalogPage,
  },
```

with `import ModelsCatalogPage from '@/pages/help/ModelsCatalog'` alongside the other page imports.

In `src/pages/help/HelpPage.tsx`, add a link card following the Release Notes pattern (insert before the `finalSections.push` for Product Updates, or as its own section):

```ts
    finalSections.push({
      title: 'Platform',
      description: 'Deployment-specific information',
      items: [
        {
          name: 'Available Models',
          description: 'Browse all models on this deployment, including premium models and their rates.',
          type: 'link',
          link: resolvePath('help/models').pathname,
          buttonText: 'View Models',
        },
      ],
    })
```

Match the surrounding code for `resolvePath` import (already used in the file).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ModelsCatalogPage`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint` (per `.ai-run/guides/quality-gates.md` — use the exact script names from package.json if they differ)
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/help src/router.tsx
git commit -m "feat: add /help/models catalog page with premium indicators and filters"
```

---

## Task 9: Frontend — budget card link to catalog

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` (AssignedCard, after the details grid, lines ~223-246)
- Test: extend the existing card test if present (check `__tests__` next to it), otherwise create `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import ProjectBudgetCard from '../ProjectBudgetCard'
import { ProjectBudget } from '@/types/entity/projectBudget'

const baseBudget: ProjectBudget = {
  budget_id: 'b1',
  name: 'Budget',
  budget_category: 'premium_models',
  max_budget: 100,
  soft_budget: 80,
  budget_duration: 'monthly',
  budget_reset_at: null,
  provider_sync_status: 'ok',
} as ProjectBudget

describe('ProjectBudgetCard premium link', () => {
  it('shows the catalog link on the assigned premium_models card', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={baseBudget} />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /view covered premium models/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/help/models'))
  })

  it('does not show the link for other categories or the empty card', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard
          variant="assigned"
          mode="view"
          budget={{ ...baseBudget, budget_category: 'platform' }}
        />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: /view covered premium models/i })).not.toBeInTheDocument()
  })
})
```

Adjust the `ProjectBudget` literal to the real type fields (see `src/types/entity/projectBudget.ts`) if the cast is insufficient.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProjectBudgetCard`
Expected: FAIL (no link).

- [ ] **Step 3: Implement**

In `ProjectBudgetCard.tsx`, inside `AssignedCard`, immediately after the details grid `</div>` (line 246):

```tsx
        {budget.budget_category === 'premium_models' && (
          <Link
            to={HELP_MODELS_ROUTE}
            className="text-xs text-text-accent hover:text-text-accent-hover transition-colors w-fit"
          >
            View covered premium models →
          </Link>
        )}
```

Imports to add:

```tsx
import { Link } from 'react-router-dom'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProjectBudgetCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx
git commit -m "feat: link premium budget card to models catalog"
```

---

## Task 10: End-to-end verification (backend + frontend + Playwright)

Not a coding task — the acceptance runbook. Execute after Tasks 1–9 merge into local working trees.

- [ ] **Step 1: Run the backend with a known premium config**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie
export LITELLM_PREMIUM_MODELS_ALIASES='["opus"]'
# ensure budgets config includes a budget with budget_category="premium_models"
# start the app per repo README (e.g. poetry run uvicorn / make target)
```

- [ ] **Step 2: Verify the API contract with curl**

```bash
curl -s http://localhost:PORT/v1/llm_models -H "Authorization: ..." | jq '.[] | {base_name, is_premium}'
```

Expected: models whose name contains "opus" have `"is_premium": true`; all others lack the key entirely. Then restart the backend **without** the premium budget in budgets config and confirm `is_premium` is absent from every model.

- [ ] **Step 3: Run the frontend**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie-ui
npm run dev   # http://localhost:5173, pointed at the local backend
```

- [ ] **Step 4: Playwright CLI walkthrough**

Drive with Playwright CLI (`npx playwright codegen http://localhost:5173` for authoring, or a scripted session). Verify against the approved mockups (`.superpowers/brainstorm/67779-1786632916/content/premium-input-final.html`):

- Chat picker dropdown: premium rows show the Premium pill; standard rows don't.
- Select a premium model: trigger gains the pill; prompt container shows amber tint; tip strip appears above the prompt.
- Dismiss the tip (✕): it disappears; tint and trigger badge remain.
- Switch back to a standard model: pill, tint, and tip all disappear.
- Re-select the premium model: tip reappears (dismissal reset on model change).
- Assistant create/edit form: LLM Model dropdown rows + selected value show the pill for premium models.
- Administration → project budgets: assigned Premium models card shows "View covered premium models →"; link lands on `/help/models`.
- `/help/models`: search, provider filter, and Premium-only toggle filter the table; premium rows show the pill, amber tint, and amber cost.

- [ ] **Step 5: Quality gates**

```bash
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie-ui && npm run lint && npm run typecheck && npm test
cd /Users/Nikita_Levyankov/repos/codemie-ai/codemie && poetry run pytest tests/
```

Expected: all green (use the exact gate commands from `.ai-run/guides/quality-gates.md` / codemie `Makefile`).

---

## Self-review notes (spec coverage)

- Backend flag + gating → Tasks 1–2. Data layer → Task 3. Badge component → Task 4.
- Chat picker/trigger → Task 5. Tint + tip → Task 6. Assistant form + chat config → Task 7.
- Catalog page + Help hub link → Task 8. Budget card link → Task 9. E2E/API verification → Task 10.
- Accepted limitation documented above the tasks (Assistant Default resolution).
