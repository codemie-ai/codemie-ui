# EPMCDME-16505: Save-time Contract Editor Controls and Issues Panel (codemie-ui)

Source: https://jiraeu.epam.com/browse/EPMCDME-16505 (Sub-task, Open). Parent: EPMCDME-16500. Sibling: EPMCDME-16504 (save-validation-codemie-api) — supplies the error type, issue shape, coverage object and new validate-before-save endpoint this ticket depends on. UI design: https://kb.epam.com/pages/viewpage.action?pageId=2995591113 (FR-20261006-001 6. UI Design).

**Context:** The node editor has an output contract control on common-panel node types but no input contract control and no validation mode selector. The sub-workflow panel has no output contract control. The issues panel shows only error or resolved badges with no severity or coverage summary, and warnings appear only as toasts. The backend error handler recognises a fixed list of error types. Configuration paths need a per-node, per-error-type registration before an issue can navigate to its control. The existing dry-run endpoint needs a saved workflow.

**Story:** As a workflow author using the visual editor, I want to declare node contracts and a validation mode in the editor, see contract issues grouped by severity with a coverage summary, and validate a new workflow before its first save, so that I can fix a broken data hand-off where I build the workflow.

**Background:** Covers the editor half of save-time validation: input contract and validation mode controls, the sub-workflow output contract control, workflow-level defaults, the severity-grouped issues panel, the error type whitelist and field-path registry, and dry-run on the new-workflow page.

**Out of scope:** The error type string, issue shape, coverage object and new endpoint (save-validation-codemie-api). Outcome computation (save-validation-codemie-linker). Documentation (save-validation-codemie-docs). Runtime findings in the execution view (Story 3).

## Acceptance Criteria

**Node editor controls**
1. Assistant, custom, tool, transform and sub-workflow nodes each gain an input contract control.
2. Any node with a state configuration has a validation mode selector.
3. Sub-workflow nodes gain an output contract control.
4. Condition, switch and iterator canvas nodes have no contract control of their own (negative).
5. The workflow settings panel exposes the workflow-level validation default and the mandatory-input-contracts switch.

**Issues panel**
6. Contract errors, warnings and unverified notices share one issue shape, grouped by severity, with the unverified group collapsed by default.
7. The panel shows the coverage summary.
8. A contract warning never appears as a toast, except the save-confirmation count and the YAML-only summary toast (negative).
9. Selecting an issue highlights its node and navigates to the field; if no visual control is registered, it falls back to the YAML line.

**Registration**
10. The new contract validation error type is in the backend error handler's recognised list (negative without it).
11. Contract issue config paths are in the field-path-to-visual-control registry.

**Dry-run before first save**
12. The new-workflow page can dry-run through the new validate-before-save endpoint and show the same warnings and coverage shape.

**Save outcomes**
13. A save that succeeds with a WARNING stays open with the baseline reset and issues kept, shows a "saved" banner and coverage, and one toast reads "Workflow saved with N warnings".
14. A saved-with-warnings clean form shows the header `Done · ✓ Saved (disabled) · Run anyway`.
15. Editing any field restores `Cancel · Save · Save and Run` and marks edited cards Resolved.
16. Selecting Done navigates like Save does today, with no unsaved-changes dialog.
17. A save with no findings, or UNVERIFIED-only notices, shows today's toast and navigates back (negative).
18. A save rejected by a contract error shows warnings and UNVERIFIED notices in their own groups, with no saved banner.
19. A rejection under workflow-level strict shows one line naming the mode. A node-level strict rejection adds a `node strict` tag to the card.
20. Existing `consumer_slot` and `script_step_owner_integration` warnings stay toasts (negative).

**Save and Run**
21. Save and Run with a WARNING saves, does not open the run popup, and enters the saved-with-warnings state. Run anyway opens the run popup without saving again.
22. Save and Run with a clean or UNVERIFIED-only result opens the run popup. Any error opens the panel and starts no run (negative).

**New workflow page**
23. Save or Save and Run returning a WARNING replaces the route with the edit page in the saved-with-warnings state, with "created" wording. A second save cannot create a duplicate, and Done or Back do not return to the new-workflow page.

**Check**
24. The canvas toolbar has a Check button that dry-runs without saving, on both the edit page and the new-workflow page.
25. Check with findings opens the panel with all severities, the coverage summary and a "not saved yet" note.
26. Check with no findings shows a toast with the node count and closes the panel. With UNVERIFIED-only notices, the toast says so and the panel opens with that group expanded.

**Severity display**
27. The Issues button is red with at least one error, amber with warnings only, and shows the count. Node outlines are red for unresolved errors, amber for unresolved warnings, and absent for UNVERIFIED.
28. WARNING cards have an amber border and badge. UNVERIFIED cards have a grey border and badge.
29. Go to Issue on a warning shows an amber field outline and text. Errors stay red. `Input` and `Textarea` gain this as an optional prop.

**Restore and YAML-only mode**
30. A restore from version history with contract warnings sends them to the panel with a "not saved yet" note.
31. With the visual editor disabled, a save with warnings navigates back with one summary toast listing up to three warnings and "… and N more".
