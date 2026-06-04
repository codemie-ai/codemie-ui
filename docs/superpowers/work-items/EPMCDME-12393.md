# Work Item: EPMCDME-12393

**External Ticket**: https://jiraeu.epam.com/browse/EPMCDME-12393
**Status**: In Progress
**Assignee**: vladyslav_yurchenko1@epam.com
**Parent Epic**: EPMCDME-217 — [Improv&Stab] Community features
**External Sync**: synced
**Branch**: TBD

## Summary

Enable file upload in user input during human-in-the-loop workflow interruption in chat and usual execution modes

## Description

Users should be able to upload files as part of their input when workflow execution is interrupted by a human-in-the-loop step. This capability should be available in both chat mode and usual execution mode. The enhancement will allow users to continue interrupted workflow execution with complete contextual input, including attached files, and will improve consistency of the workflow experience across supported execution modes.

## Acceptance Criteria

- User can upload files in the input form when workflow execution is interrupted by a human-in-the-loop step.
- File upload is available in chat mode.
- File upload is available in usual execution mode.
- User can submit textual input together with uploaded files.
- Uploaded files are passed as part of the resumed workflow execution input after the interruption step.
- The behavior is consistent across chat mode and usual execution mode.
- Existing human-in-the-loop interruption flow without files continues to work correctly.

## Linked Artifacts

- `docs/superpowers/runs/20260526-1142-EPMCDME-12393_enable-file-upload-hitl/requirements.md`

## History

| Timestamp | Event | Summary |
|-----------|-------|---------|
| 2026-05-26T11:43:00.000Z | work_item.created | Local work item created from Jira EPMCDME-12393 via BriAnnA adapter |
| 2026-05-26T11:43:00.000Z | work_item.adapter_receipt | Jira lookup succeeded via BriAnnA; external sync: synced |
| 2026-05-26T11:43:00.000Z | work_item.linked_artifact | requirements.md linked |
