# EPMCDME-14276: Fix Inconsistent Button Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `FormAutocomplete` (embeddingsModel) to appear before `IntegrationSection` in 6 IndexType datasource form components so the "Add User Integration"/"Refresh" buttons always render below "Model used for embeddings", matching the reference Git layout.

**Architecture:** Pure JSX reordering inside each component's return statement — no logic, no props, no stores change. Five files share an identical swap pattern; SharePoint requires the FormAutocomplete to move above its auth-method RadioGroup block.

**Tech Stack:** React 18 · TypeScript 5 · react-hook-form · Vite 5

---

## File Map

| File | Change |
|---|---|
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeJira.tsx` | Swap: `FormAutocomplete` before `IntegrationSection` |
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeConfluence.tsx` | Swap: `FormAutocomplete` before `IntegrationSection` |
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXray.tsx` | Swap: `FormAutocomplete` before `IntegrationSection` |
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWorkItem.tsx` | Swap: `FormAutocomplete` before `IntegrationSection` |
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWiki.tsx` | Swap: `FormAutocomplete` before `IntegrationSection` |
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx` | Move `FormAutocomplete` above the auth RadioGroup div |

---

### Task 1: Fix Jira, Confluence, Xray, AzureDevOpsWorkItem, AzureDevOpsWiki

**Test-first: no** — pure JSX reordering; no DOM-order tests exist; existing `IntegrationSection.test.tsx` tests button behavior in isolation and is unaffected by element order in parent components.

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeJira.tsx`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeConfluence.tsx`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXray.tsx`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWorkItem.tsx`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWiki.tsx`

All five files share the same wrong pattern: `IntegrationSection` rendered first, then `FormAutocomplete`. In each file, move the `FormAutocomplete` block to appear immediately **before** `IntegrationSection`. No other changes.

- [ ] **Step 1: Fix IndexTypeJira.tsx**

Replace the block starting at `<IntegrationSection` (currently before `FormAutocomplete`) so the order becomes `FormAutocomplete` then `IntegrationSection`:

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for Jira"
        integrationPlaceholder="Integration for Jira"
      />
```

- [ ] **Step 2: Fix IndexTypeConfluence.tsx**

Same swap — `FormAutocomplete` before `IntegrationSection`:

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for Confluence"
        integrationPlaceholder="Integration for Confluence"
      />
```

- [ ] **Step 3: Fix IndexTypeXray.tsx**

Same swap — `FormAutocomplete` before `IntegrationSection`:

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for X-ray"
        integrationPlaceholder="Integration for X-ray"
        credentialType="xray"
      />
```

- [ ] **Step 4: Fix IndexTypeAzureDevOpsWorkItem.tsx**

Same swap — `FormAutocomplete` before `IntegrationSection`:

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for Azure DevOps Work Items"
        integrationPlaceholder="Integration for Azure DevOps Work Items"
        credentialType="azuredevops"
      />
```

- [ ] **Step 5: Fix IndexTypeAzureDevOpsWiki.tsx**

Same swap — `FormAutocomplete` before `IntegrationSection`:

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for Azure DevOps Wiki"
        integrationPlaceholder="Integration for Azure DevOps Wiki"
        credentialType="azuredevops"
      />
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeJira.tsx
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeConfluence.tsx
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXray.tsx
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWorkItem.tsx
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWiki.tsx
git commit -m "EPMCDME-14276: Move embeddingsModel field above IntegrationSection in Jira, Confluence, Xray, AzureDevOps"
```

---

### Task 2: Fix SharePoint

**Test-first: no** — same reasoning as Task 1; pure JSX reordering.

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx`

SharePoint is slightly more involved. The current last element is `FormAutocomplete` (embeddingsModel) at line ~260, after all auth-method conditional blocks. The auth RadioGroup starts at line ~177 inside `<div className="mb-4">`. The fix: cut `FormAutocomplete` from its current position at the end and paste it immediately **before** `<div className="mb-4">` (the auth RadioGroup wrapper), directly after `<SharePointContentTypesSection control={control} />`.

- [ ] **Step 1: Remove FormAutocomplete from its current position at the end**

Delete these lines (currently the last JSX element before the closing `</div>`):

```tsx
      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
```

- [ ] **Step 2: Insert FormAutocomplete between SharePointContentTypesSection and the auth RadioGroup div**

Place it immediately after `<SharePointContentTypesSection control={control} />` and before `<div className="mb-4">`:

```tsx
      <SharePointContentTypesSection control={control} />

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />

      <div className="mb-4">
        <p className="mb-2 text-xs text-text-tertiary">Authentication Method:</p>
        <RadioGroup
          name="sharepointAuthMethod"
          options={visibleAuthMethodOptions}
          value={authMethod}
          onChange={(v) => handleAuthMethodChange(String(v))}
        />
      </div>
```

The rest of the component (all three auth conditionals) remains exactly as-is.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx
git commit -m "EPMCDME-14276: Move embeddingsModel field above auth RadioGroup in SharePoint"
```

---

### Task 3: Verify

**Test-first: n/a**

- [ ] **Step 1: Run type-check**

```bash
npm run typecheck
```

Expected: zero errors. If TypeScript reports errors, they will be in the 6 modified files — check that no JSX element was accidentally broken during the move (mismatched closing tags, missing props).

- [ ] **Step 2: Visually verify in the running app**

Start the app and open a datasource creation/edit form. Switch through datasource types (Jira, Confluence, Xray, Azure DevOps Work Items, Azure DevOps Wiki, SharePoint with "Use Integration" selected) and confirm:

- "Model used for embeddings" dropdown appears **above** the "Add User Integration" and "Refresh" buttons.
- Git and SVN forms look unchanged.
- Google form looks unchanged.
- SharePoint with OAuth auth methods (not "Use Integration") still renders correctly — the embeddings model field should appear above the auth RadioGroup.
