# EPMCDME-14276: Fix Inconsistent Button Positioning Across Datasource Types

## Problem

The "Add User Integration" and "Refresh" buttons (rendered by `IntegrationSection`) appear at
inconsistent positions depending on the datasource type:

- **Git, SVN** (correct): buttons appear *after* the "Model used for embeddings" field.
- **Jira, Confluence, Xray, AzureDevOpsWorkItem, AzureDevOpsWiki, SharePoint** (wrong): buttons
  appear *before* "Model used for embeddings".

## Desired Layout

All datasource types should follow the Git reference layout:

```
[datasource-specific fields]
[Model used for embeddings]       ← FormAutocomplete name="embeddingsModel"
[Add User Integration] [Refresh]  ← IntegrationSection
```

## Scope

### Files to change

| File | Change |
|---|---|
| `IndexTypeJira.tsx` | Move `FormAutocomplete` (embeddingsModel) before `IntegrationSection` |
| `IndexTypeConfluence.tsx` | Move `FormAutocomplete` (embeddingsModel) before `IntegrationSection` |
| `IndexTypeXray.tsx` | Move `FormAutocomplete` (embeddingsModel) before `IntegrationSection` |
| `IndexTypeAzureDevOpsWorkItem.tsx` | Move `FormAutocomplete` (embeddingsModel) before `IntegrationSection` |
| `IndexTypeAzureDevOpsWiki.tsx` | Move `FormAutocomplete` (embeddingsModel) before `IntegrationSection` |
| `IndexTypeSharePoint.tsx` | Move `FormAutocomplete` (embeddingsModel) above the auth RadioGroup, so it appears before all auth-conditional blocks |

### Files explicitly out of scope

- `IndexTypeGit.tsx` — already correct (reference implementation)
- `IndexTypeSvn.tsx` — already correct
- `IndexTypeGoogle.tsx` — OAuth-first layout is intentional; left untouched
- `IndexTypeFile.tsx` — no IntegrationSection; not affected
- `IntegrationSection.tsx` — no changes to the component itself

### What must not change

- No form elements added or removed.
- No changes to props, classNames, conditional rendering logic, state, hooks, or stores.
- No changes outside the 6 listed files.

## SharePoint detail

SharePoint uses an auth method RadioGroup to switch between Integration (service account),
CodeMie OAuth, and Custom OAuth. `IntegrationSection` is only rendered when the Integration
option is selected.

Current order:
```
[siteUrl] [ContentTypes] [auth RadioGroup]
  {INTEGRATION && IntegrationSection}
  {OAUTH_CUSTOM && custom fields}
  {isMicrosoftAuth && Microsoft sign-in}
[FormAutocomplete embeddingsModel]         ← wrong position
```

After fix:
```
[siteUrl] [ContentTypes]
[FormAutocomplete embeddingsModel]         ← moved above auth RadioGroup
[auth RadioGroup]
  {INTEGRATION && IntegrationSection}
  {OAUTH_CUSTOM && custom fields}
  {isMicrosoftAuth && Microsoft sign-in}
```

## Acceptance Criteria

1. When Jira, Confluence, Xray, Azure DevOps Work Items, or Azure DevOps Wiki datasource is
   selected, the "Model used for embeddings" field appears above the "Add User Integration"
   and "Refresh" buttons.
2. When SharePoint is selected with the "Use Integration" auth method, the "Model used for
   embeddings" field appears above the "Add User Integration" and "Refresh" buttons.
3. The Git and SVN forms are visually unchanged.
4. The Google form is visually unchanged.
5. No form fields are added, removed, or reordered beyond what is described above.
