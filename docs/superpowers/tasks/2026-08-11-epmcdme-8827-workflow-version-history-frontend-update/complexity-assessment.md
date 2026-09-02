# Complexity Assessment

**Task**: Implement EPMCDME-8827 Workflow Version History Frontend Update with Assistant-style YAML history popup, side-by-side diff, rollback API, shared component extraction, and legacy UI removal.  
**Generated**: 2026-08-11T16:05:00+03:00

## Scores

| Dimension | Score | Label |
|---|---|---|
| component_scope | 5 | XL |
| requirements_clarity | 2 | S |
| technical_risk | 5 | XL |
| file_change_estimate | 5 | XL |
| dependencies | 1 | XS |
| affected_layers | 3 | M |

**Total**: 21/36  
**Size**: L  
**Routing**: brainstorming  
**SPLIT REQUIRED**: No

## Key reasoning

- **component_scope**: Rewrites popup, dual YAML entry points, page orchestration, store/types, and extracts shared `VersionHistoryDiffView`.
- **technical_risk**: Rollback → refetch → reinitialize editors → clear dirty baseline has no exact precedent; WRITE-gated Restore on shared history tab must not break Assistant.
- **file_change_estimate**: Roughly 11–15+ production/test files including deletes and substantial test rewrite.

## Red flags applied

- Component Scope L→XL: shared utilities extraction + WRITE gating on `VersionedFieldHistoryTab`
- Technical Risk L→XL: authorization (READ browse vs WRITE restore/rollback)
