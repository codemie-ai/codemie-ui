# Premium Model Indication in Chat & Model Selection — Design

Date: 2026-08-13
Status: Final (visually reviewed with user via mockups)
Repos: `codemie` (backend), `codemie-ui` (frontend)

## Problem

Premium models (e.g. Claude Opus) are billed against a separate `premium_models` budget
at higher rates, but the UI gives no indication that a model is premium — neither when
selecting a model (chat picker, assistant configuration) nor while chatting. Users can
unknowingly incur premium charges.

## Background (current state)

### Backend (`codemie`)

- Premium is a **static, config-driven** concept: `LITELLM_PREMIUM_MODELS_ALIASES` env var
  (substring match, case-insensitive), checked by `is_premium_model()` in
  `codemie/src/codemie/enterprise/litellm/dependencies.py:507`.
- The feature is only active when a budget with category `premium_models` exists
  (`is_premium_models_enabled()`, `dependencies.py:486`).
- Today it is used **only for budget attribution** (requests re-keyed to a derived
  LiteLLM user and charged against the premium budget).
- `GET /v1/llm_models` (`rest_api/routers/llm_models.py:32`) returns `List[LLMModel]`;
  the `LLMModel` DTO (`configs/llm_config.py:84`) has **no premium flag**.

### Frontend (`codemie-ui`)

- `ModelOption` (`src/types/entity/configuration.ts:34`): `{ value, label, isDefault, provider }`.
- API mapping in `getLLMModels` (`src/store/appInfo.ts:256`) — fetches `GET v1/llm_models`.
- Model selection surfaces:
  - Chat input picker: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx`
    (SearchableCombobox; custom `renderOption`; trigger shows selected model label).
  - Assistant create/edit form: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`
    (shared single-value `MultiSelect`, checkboxes hidden, supports custom `itemTemplate`).
  - Chat configuration panel: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx`
    (wraps `LLMSelector` — inherits changes for free).
- Reusable visuals already in the design system:
  - `StatusBadge` (`src/components/StatusBadge/StatusBadge.tsx`) — Warning variant uses the
    `aborted-*` tokens (dark: bg `#492B00`, text `#F5A534`, border `#663B00`; light: bg
    `#FAF2E7`, text/border `#F5A534`). 17px uppercase bold pill with 7px dot.
  - `InfoWarning` (`src/components/InfoWarning/InfoWarning.tsx`) — WARNING type:
    `flex p-2 rounded-md border text-xs bg-aborted-primary/20 border-aborted-primary`
    with an 18px info icon.
- Tooltips: `react-tooltip` via `data-tooltip-id="react-tooltip"`.
- No i18n in the main app — plain English string constants.

## Decision: backend-driven flag

The backend is the single source of truth for premium-ness (it owns the alias config and
the budget gating). Alternatives rejected:

- **Frontend alias matching** — duplicates env config in the UI, drifts silently.
- **Cost-threshold inference** from `LLMModel.cost` — premium is a billing-category
  decision, not a price threshold; would mislabel models.

## UX direction (chosen via visual review of mockups)

All visuals reuse existing design-system pieces; no new component families.

1. **Selection time** — `StatusBadge` "Premium" pill (Warning variant, verbatim) on:
   - chat picker dropdown rows (`ChatPromptLlmSelector.renderOption`),
   - assistant form dropdown rows + the closed field's selected value (`LLMSelector`
     custom `renderOption`/`itemTemplate`),
   - chat Configuration panel selector (inherits from `LLMSelector`).
   Tooltip on the badge: "Premium model — higher usage rates apply".
2. **Active in chat, ambient** — the chat prompt container gets a premium treatment while
   the effective model is premium: ~7% `yellow-500` wash over the input background +
   border at ~45% amber (built from `yellow-a*` tokens so light theme adapts). The picker
   trigger also carries the Premium pill next to the model name.
3. **Active in chat, explicit** — an `InfoWarning` (WARNING type) tip strip directly
   above the chat prompt:
   "**Premium model active** — Claude Opus 4.1 · higher usage rates apply to this
   conversation". Dismissible per chat (✕); dismissal resets when the model changes, so
   switching back to a premium model re-arms the tip.

4. **Budgets admin surface** — on the project budgets page
   (`ProjectBudgetsSection` → `ProjectBudgetCard`, assigned variant of the
   `premium_models` card): a "View covered premium models →" link appended under the
   limits grid, navigating to the models catalog page (below). No model chips on the
   card. The empty ("not assigned") premium card is unchanged.
5. **Models catalog page** — a new in-app page at `/help/models`, following the
   `terms-and-conditions` pattern (dedicated route rendering API-driven content), linked
   from the Help Center hub and from the budget card:
   - Header: "Available models" + explainer line ("**Premium** models are billed at
     higher rates and count against your project's Premium models budget").
   - Filter bar: text search (label), provider dropdown, "Premium only" toggle, and a
     "N models · M premium" count.
   - Table columns: **Model** (label + Premium StatusBadge when applicable), **Provider**
     (from `LLMModel.provider`), **Capabilities** (chips: multimodal / tools / image
     gen), **Cost / 1M tokens** (`cost.input`/`cost.output` × 1M, amber for premium rows,
     hidden when cost is null), **Default for** (from `default_for_categories`).
   - Premium rows carry a subtle amber row tint (`yellow-500/5`).
   - Data: same `GET v1/llm_models` + `is_premium` — no new backend endpoint.

Explicitly **not** included (YAGNI):

- Per-message model badges — messages carry no model reference today; separate feature.
- Full-width warning banner at the top of chat — rejected in visual review in favor of
  the tip above the input.
- Exact prices inside chat/model pickers — per-token figures live on the catalog page
  only; chat surfaces keep the qualitative "higher rates" wording.
- Hint line under the assistant-form field — rejected in visual review; badge only.
- Premium model list on the external docs site (docs.codemie.ai) — static and shared
  across deployments; the list is deployment-specific, so it lives in-app.
- Model list in user-budget views (`BudgetSpendCell` tooltip) — possible follow-up.

## Design

### 1. Backend: expose `is_premium` on `LLMModel`

- Add `is_premium: Optional[bool] = None` to `LLMModel` in
  `codemie/src/codemie/configs/llm_config.py`.
- Populate in `map_litellm_to_llm_model`
  (`codemie/src/codemie/enterprise/litellm/models.py`) via the existing
  `is_premium_model(base_name)` (lru_cached, cheap).
- Set the field **only when `is_premium_models_enabled()`** is true. If no premium budget
  is configured, premium billing does not apply and the badge would be noise; the field
  stays `None` and is omitted from the response (`response_model_exclude_none=True` on
  the endpoint already).

### 2. Frontend data layer

- `ModelOption` gains `isPremium?: boolean`.
- `getLLMModels` (`appInfo.ts`) maps `is_premium → isPremium`.

### 3. Chat model picker (`ChatPromptLlmSelector`)

- `renderOption`: append the Premium `StatusBadge` after the label for models with
  `isPremium` (including the "Recommended" pseudo-row when the default model is premium;
  "Assistant Default" resolves at runtime — badge only if the resolved default is
  premium).
- Trigger: when the effective model is premium, render the Premium pill between the
  truncated label and the chevron; badge carries the tooltip
  "Premium model — higher usage rates apply".

### 4. Chat prompt ambient treatment (`ChatPrompt`)

- When the effective model is premium, apply a conditional wrapper class on the prompt
  container: `bg-yellow-500/[0.07]`-style wash + `border-yellow-500/45` (exact tokens per
  styling guide). Removed the moment a non-premium model is selected.

### 5. Premium tip strip (`ChatPrompt` area)

- New small component (e.g. `ChatPremiumModelTip`) rendered directly above the prompt
  when the effective model is premium: `InfoWarning` WARNING type, message
  "**Premium model active** — {model label} · higher usage rates apply to this
  conversation".
- Dismiss button (✕). Dismissal state is per chat id + model value (in-memory store or
  chat-level state — no persistence needed); resets when the model changes.

### 6. Assistant form & chat Configuration (`LLMSelector`)

- Pass a custom `renderOption` into `MultiSelect` that renders the label + Premium pill
  for premium options. `ChatConfigLlmSelector` inherits automatically.
- Selected value in the closed field also shows the pill (via the selected-item template).

### 7. Project budgets card (`ProjectBudgetCard`)

- In `AssignedCard`, when `budget.budget_category === 'premium_models'`, append a
  "View covered premium models →" link under the details grid, navigating to
  `/help/models`. No model chips on the card (rejected in review — link only).

### 8. Models catalog page (`/help/models`)

- New route + page component under `src/pages/help/` (terms-and-conditions pattern),
  linked from the Help Center hub (`HelpPage` sections) and from the budget card.
- Local state filters: search text, provider, premium-only toggle. Filter
  `appInfoStore.llmModels` client-side; no pagination needed initially (model counts are
  in the dozens), virtual scroll out of scope.
- Cost cell renders `$X / $Y per 1M tokens` from `cost.input`/`cost.output`; renders "—"
  when cost is null.

### 9. Error handling / edge cases

- Backend field absent (older backend, or feature disabled) → `isPremium` undefined → no
  badge/tip/tint anywhere; the catalog page still renders (all-standard list) since
  it is the general model catalog. Fully backward compatible.
- Stored model on a chat/assistant no longer exists → existing `InfoWarning` invalid-model
  behavior in `LLMSelector` is unchanged.
- Model list not yet loaded → no premium UI until `llmModels` resolves (same as today for
  labels).

### 10. Testing

**Unit tests**

- Backend: unit test that a model matching `LITELLM_PREMIUM_MODELS_ALIASES` with a
  premium budget configured yields `is_premium=True`; non-matching model → falsy; feature
  disabled → field `None`.
- Frontend: unit tests for `getLLMModels` mapping; badge rendering in
  `ChatPromptLlmSelector` (option + trigger) and `LLMSelector` (custom item template);
  tip visibility/dismiss/reset-on-model-change; prompt container premium class toggling;
  budget card link (premium category, assigned variant only); catalog page filtering
  (search / provider / premium-only) and cost formatting.

**API contract verification (config-driven)**

Run the `codemie` backend locally with a known config and verify the endpoint reflects it:

- With `LITELLM_PREMIUM_MODELS_ALIASES=["opus"]` and a `premium_models` budget in the
  budgets config → `GET /v1/llm_models` returns `is_premium: true` on models whose name
  contains "opus" (case-insensitive, substring), and `is_premium` absent/false on others.
- With aliases set but **no** premium budget configured → field absent from the response.
- With aliases empty → field absent.
- Regression: response shape otherwise unchanged (`response_model_exclude_none` behavior
  preserved).

**E2E verification (Playwright)**

With the configured backend running and `codemie-ui` dev server up, drive the UI with
Playwright CLI and verify:

- Chat picker: premium models show the Premium badge in dropdown rows; selecting one adds
  the badge to the trigger, tints the prompt container, and shows the tip strip; the tip
  dismisses and reappears on model change; switching to a standard model removes all
  premium UI.
- Assistant form: badges in the LLM Model dropdown and on the selected value.
- Budgets page: assigned premium card shows the "View covered premium models →" link;
  link navigates to `/help/models`.
- Catalog page: premium rows show badge + cost; search / provider / "Premium only"
  filters work; row count text is correct.

## Mockups

Reviewed and approved with the user via the Superpowers visual companion; HTML mockups
persist under `.superpowers/brainstorm/67779-1786632916/content/` (gitignored):

- `premium-badge-style-v2.html` — badge style options (chose StatusBadge pill)
- `premium-input-realistic.html` — input tint treatment on the real chat prompt
- `premium-tip-placement.html` — tip placement (chose strip above input)
- `premium-assistant-form.html` — assistant form treatment (chose badge only)
- `premium-input-final.html` — final combined chat states (normal / premium / dismissed)
- `premium-budget-card.html` — budget card placements (chose link-only to catalog page)
- `premium-help-center.html` — help-center split options (chose hybrid)
- `premium-models-page.html` — models catalog page (chose full table with cost column)
