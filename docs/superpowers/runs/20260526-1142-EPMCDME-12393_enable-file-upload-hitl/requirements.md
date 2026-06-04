# Requirements — 20260526-1142-EPMCDME-12393_enable-file-upload-hitl

**Source**: ticket:EPMCDME-12393
**Work Item**: docs/superpowers/work-items/EPMCDME-12393.md
**Original input**: |
  EPMCDME-12393

## Goal

Enable file upload in the user input form when workflow execution is interrupted by a human-in-the-loop step, available in both chat mode and usual execution mode.

## Acceptance Criteria

- User can upload files in the input form when workflow execution is interrupted by a human-in-the-loop step.
- File upload is available in chat mode.
- File upload is available in usual execution mode.
- User can submit textual input together with uploaded files.
- Uploaded files are passed as part of the resumed workflow execution input after the interruption step.
- The behavior is consistent across chat mode and usual execution mode.
- Existing human-in-the-loop interruption flow without files continues to work correctly.

## Context

- Parent Epic: EPMCDME-217 — [Improv&Stab] Community features
- Related bug: EPMCDME-12378 — "Workflow interruption in human-in-the-loop disables chat input and material upload functionality" (this story likely implements the fix/feature that resolves that bug)
- Two execution modes must be covered: chat mode and usual (standard) execution mode
- Preconditions: workflow has a HITL interruption step, execution reaches the interruption point, user has files ready
- Scenarios:
  1. Chat mode: start workflow → interrupted → user provides text + files → submits → workflow resumes with both
  2. Usual mode: same flow in usual execution mode

## Open questions

(none)
