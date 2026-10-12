# Local Verification

What to run and record before opening an MR, beyond the lint and unit gates. Answers: in what order,
against what, with what evidence, and how it reaches the MR description.

Unit and integration tests prove the component works against mocks. This guide proves the feature works
in a real browser against a real backend. Both are required for a user-visible change.

## Order

1. Quality gates pass — [quality-gates.md](../quality-gates.md).
2. Harness sanity run: `npm run test-harness`.
3. At least one hand-driven scenario per acceptance criterion, in the browser, against the backend branch
   the feature depends on.

A gate that could not run is unverified, not passed. Say so in the MR.

## Environment

| Item | Rule |
|---|---|
| Backend | Start it from the branch (or release) the ticket names and confirm it serves the new behaviour (a request that only the new code answers). Record its branch and sha. |
| UI | `npm run dev` from this branch. Confirm the page shows the new code (a visible element that did not exist before). |
| Data | Use disposable users, workflows and integrations. Test values only, never real credentials. |
| Harness | Needs the stack up and `~/.codemie/test-harness.json`. If it cannot run, fix the setup instead of skipping it. |
| Cleanup | Stop everything you started and delete the test data you created. |

## Harness Sanity Run

| Avoid | Prefer |
|---|---|
| Pasting a run that was aborted or overloaded the backend | Rerun with fewer workers: `uvx codemie-test-harness run sanity-ui -n 2` and say which invocation you used |
| Choosing extra marks from memory | `uvx codemie-test-harness marks --verbose`, then run the marks for the changed area |
| Skipping because the change is small | Every change needs a fresh run |

## Scenarios

Cover, in this order:

1. **Happy path** in user order: open, edit, save, reopen, confirm it round-trips.
2. **Every state the ticket describes**: empty, populated, global/non-global, creator/non-creator, whichever apply.
3. **Failure paths**: invalid input, a backend error response, a backend warning. Make the backend produce each;
   do not hand-edit the response.
4. **Negative control** for every "absent" claim (the field is not sent, the editor is not shown): first show the
   positive case, then the absence.
5. **Persistence**: reload the page and confirm the saved state, not the local form state.

For each scenario record what you did, what you expected and what happened.

## Evidence

| Evidence | How |
|---|---|
| Screenshots | **Required** for every scenario: one per user-visible state, before/after for changed UI. Full window, readable at 100%. `N/A` only when the diff cannot alter the UI, with the reason in the MR. |
| Requests | The relevant request and response from the network tab (or the saved JSON) when the scenario depends on the payload. |
| Console | Note any error or warning raised during the scenario. A clean console is a result too. |

Keep raw files in `local/` (gitignored) and attach the screenshots to the MR. Do not commit them.
Do not include tokens, cookies or real user data in any screenshot or payload.

## Triage Of Failures

1. Read the first failing frame.
2. Reproduce on `main` with the same complete config.
3. Classify: environment, test flake, pre-existing, or caused by this change.
4. Group failures by cause in the MR, one block per cause.

## Reporting

Fill the MR template ([.gitlab/merge_request_templates/Default.md](../../../.gitlab/merge_request_templates/Default.md)):

- `## Test harness` — the pasted summary and any failures grouped by cause.
- `## Verified locally` — a one-line stand description and a short bullet list of the scenarios checked on top, then the scenarios in a collapsed `<details>` block: one subsection per scenario (Did / Expected / Happened) with its screenshots (mandatory, see Evidence); a scenario without screenshots is incomplete.
- Do not list bugs found or setup problems fixed while preparing the environment; those belong in commits or the ticket.
