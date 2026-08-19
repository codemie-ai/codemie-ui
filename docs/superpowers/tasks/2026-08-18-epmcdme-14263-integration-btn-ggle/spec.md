# Spec — EPMCDME-14263: Add User Integration button missing for Google and other datasources

## Problem

The "Add User Integration" button is not shown for Google and other required datasource types when no project integrations are configured. It does appear for Git. This blocks users from creating an integration from within the datasource creation flow.

## Root Cause

`IntegrationSelectDropdown` guards its empty-state "Add User Integration" button with `!disabled`. `IntegrationSection` passes `disabled={isRequired && hasNoSettings}`, which evaluates to `true` for all required-by-default datasource types (Google, Confluence, Jira, Xray, SharePoint, Azure DevOps, SVN) when no settings exist. This suppresses the button.

Git explicitly passes `isRequired={false}`, keeping `disabled=false` and allowing the button to appear.

## Solution

Remove the `!disabled` guard from the empty-state branch in `IntegrationSelectDropdown`. The button is the only way to add an integration from this flow and must always be shown when `settingsDefinitions` is empty, regardless of the `disabled` prop.

## Acceptance Criteria

- "Add User Integration" button is shown for Google when no project integrations are configured
- "Add User Integration" button is shown for all other required datasource types when no project integrations are configured
- Git continues to show the button (unchanged)
- When integrations exist, the Select dropdown still renders (unchanged)
- Clicking "Add User Integration" opens the integration creation popup
- No regression in assistant toolkit components (they don't pass `disabled`)
