# EPMCDME-17322: Hide disabled models on the Help models catalog

**Goal:** `ReadOnlyModelsCatalogPage` no longer lists models with `status === 'disabled'`; re-enabled models reappear on the next fetch; all other models render as before.

**Architecture:** Filter at page level, so the shared `getLLMCatalog` store action and `ProjectModelsSection` stay unchanged. Routers are left as is (the ticket names models only). Backend `include_all` behaviour is unverifiable from this repo.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] A model disabled on Administration → Model management is not displayed on the Help models catalog.
- [ ] When it is re-enabled, it is displayed again.
- [ ] Models that are not disabled (enabled, deprecated, no status) are displayed as before.

## Task 1 — Filter disabled models in ReadOnlyModelsCatalogPage

**Files:**
- Modify: `src/pages/help/ModelsCatalog/ReadOnlyModelsCatalogPage.tsx:18-48`
- Test: `src/pages/help/ModelsCatalog/__tests__/ReadOnlyModelsCatalogPage.test.tsx`

**Test-first:** yes — with a store model set to `status: 'disabled'`, its row is absent from the rendered list and from the provider options. Flipping it back to `'enabled'` and re-rendering shows it again. A `deprecated` model and a model with no status still render.

- [ ] Add a test in the `model metadata` describe block (see the deprecated tests at lines 66-130 for the store-mutation and render pattern), and run it to see it fail.
- [ ] In the page, add a `useMemo` `visibleModels = llmModels.filter((m) => m.status !== 'disabled')` (deps `[llmModels]`). Use `visibleModels` in place of `llmModels` in `providers` (line 34), `filtered` (line 40) and `premiumCount` (line 48), so the provider dropdown and premium count do not include hidden models.
- [ ] Run the test file and confirm it passes along with the existing tests.

## Negative-constraint pass

- Assumption "not in the shared `getLLMCatalog` store action, so `ProjectModelsSection` is unaffected" — honored by Task 1 (page-only change, `appInfo.ts` untouched).
- "Routers left as is" — honored (`RoutersSection` input unchanged).
- No other prohibitions stated in the inline requirements.
