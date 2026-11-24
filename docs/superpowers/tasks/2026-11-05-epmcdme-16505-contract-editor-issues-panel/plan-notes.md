# Plan notes for the planner (from the spec gate, EPMCDME-16505)

Inputs: spec.md (approved), technical-analysis.md, grounding.md (verified backend + UI facts), arch-review/arch-review-brief.local.md. Users's model instructions: planner runs on Opus 5.5 medium.

## Requirements-check findings carried as plan notes (minor, user approved the spec with these open)
- SR-001 (AC23/AC14): consuming a `created` outcome on mount must also put the edit page in the saved-with-warnings state (header toggle `Done · ✓ Saved (disabled) · Run anyway`, clean baseline, Run anyway available) and show the single "Workflow saved with N warnings" toast, with "created" wording in the panel banner.
- SR-002: spec wording "save responses are never dropped" vs "a response after unmount / route change neither navigates nor writes the store" — implement it as: not discarded by the request token / config-differs check; the only non-applied case is a response arriving after its page unmounted or its route workflow changed. State in the plan (and test) whether a create that succeeded after the new page unmounted is silently accepted.
- SR-003 (AC29): `FieldController` passes `fieldState.warning` to the `Input`/`Textarea` it wraps (all registered Input/Textarea controls get amber); Select/dropdown controls (e.g. the validation mode dropdown) stay neutral for warnings by design.
- SR-004 (Check): non-contract warnings in a Check response (`consumer_slot`, tool-access) go through `notifyAboutWarnings` as on save and do not count as findings for the no-findings / UNVERIFIED-only / panel decision.
- SR-005 PLANNING GATES (verify in the plan's first tasks, with fallback): (a) whether `shouldResolveIssue` resolves workflow-level paths (AC15) — fallback: extend it to the Advanced-tab keys; (b) whether the run popup's shared `FormIDs.WORKFLOW_FORM` registration (`WorkflowStartExecutionPopup.tsx:58-60`, `getCurrentValues` always null) masks the form's dirty check — fallback: give the popup its own form id or skip registration while it is open.
- SR-006 tests to include in the plan: `workflowWarnings` partition and both integration kinds (AC8/AC20); YAML-only 2xx summary toast with up to three warnings plus "… and N more" (AC31); `AdvancedConfigTab` `validation` and `require_input_contracts` write and persist (AC5); no `ContractFields` on conditional/switch/iterator (AC4).

## Constraints the plan must honour (user corrections, recorded in the spec Decisions)
- Do NOT restrict `output_schema` registration to `contract_validation`; `mergeTypes` would make it contract-only. Transform's state-level `output_schema` must not open `TransformForm`'s `config.output_schema` field (isContractYamlOnly handles it).
- Every Check failure (timeout, 5xx, non-contract 400, 403/404/410) shows the author something; silent only for an abort caused by a new Check or unmount.
- Other (non-contract) 400s carry no `warnings`/`coverage`, and `details` can be a string.
- Check endpoints: edit page `POST /v1/workflows/{id}/validate` (full update body incl. history); new page `POST /v1/workflows/validate` (with `project`, no history). Always `error_format=json` except YAML-only mode, which keeps today's request and `API.handleError`.
- After a clean Save and Run on the new page, closing the run popup replaces the route with the created workflow's edit page (unblockTransition → router.replace → blockTransition, per `WorkflowStartExecutionPopup.tsx:100-106`).
- AC19 reads optional `meta.strict_source` (16504 will add it; not in the backend today). Test with mocked responses.
- Project rules: a PostToolUse hook runs prettier + eslint --fix on `src/` edits (do not re-run); tests only run/written when the plan's TDD tasks require them for the new behaviour; ticket key `EPMCDME-16505` on every commit (`EPMCDME-16505: Capital sentence`); branch `EPMCDME-16505_contract-editor-issues-panel`.
