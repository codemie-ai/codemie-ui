# EPMCDME-13222: Improve Google Docs datasource indexing — per-user integration

**Type**: Task  
**Status**: In Progress → Ready for review  
**Priority**: Critical  
**Epic**: EPMCDME-216  
**Fix Version**: Prod 2.37.0  
**Jira**: https://jiraeu.epam.com/browse/EPMCDME-13222

## Summary

Replace the shared service account Google Docs indexing approach with a per-user Google OAuth 2.0 integration. Frontend scope: OAuth popup flow, generic OAuth abstraction, form guard, edit-mode support.

## Branch

TBD (pending Phase 2)

## Linked Artifacts

- `docs/superpowers/runs/20260701-1634-main/requirements.md`
- `docs/superpowers/runs/20260701-1634-main/api-contract.md`

## History

| When | Event | Detail |
|------|-------|--------|
| 2026-07-01T16:34:00Z | work_item.created | Run 20260701-1634-main started for frontend OAuth integration |
| 2026-07-01T16:35:00Z | work_item.linked_artifact | requirements.md written |
| 2026-07-01T16:35:00Z | work_item.linked_artifact | api-contract.md written (API contract for backend parallelization) |
