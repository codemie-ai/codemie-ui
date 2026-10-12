## Overview

<!-- 1–3 sentences: what problem this solves and for whom. No implementation details. -->

Closes EPMCDME-XXXX

## How it is solved

<!-- 3–6 bullets: the shape of the solution, where the logic lives, the main design choice.
     A reviewer should get a rough picture of the implementation before opening the diff. -->

-

## Reviewer notes

<!-- Only what a reviewer needs to review and merge: risky or non-obvious places, deviations from the ticket or spec,
     rollout steps. Not a list of everything that changed, not lint or cleanup fixes, not the history of this MR.
     Delete the lines that do not apply. -->

- **Not directly related to the task:** <!-- tooling, config, refactors bundled in, and why -->
- **Risky or non-obvious places:** <!-- shared stores, form plumbing, backend wording the UI depends on, compatibility -->
- **Deviations from the ticket/spec:** <!-- and why -->
- **Rollout / config:** <!-- new env vars, window._env_ keys, feature flags, backend version the UI requires -->
- **Follow-ups / known limitations:** <!-- what is deliberately not done -->

## Test harness

<!-- Keep this heading and the code block below: the MR compliance bot checks for them (screenshots are not accepted
     here; screenshots go to "Verified locally"). Paste only results that were actually produced. -->

Command: `npm run test-harness`

```
<paste the terminal summary. All green: a single line, e.g. `42 passed, 1 skipped, 2 rerun`>
```

### Failed tests

<!-- Delete this subsection if nothing failed. Group tests by cause: one `####` block per cause.
     Several failed tests usually share one cause and one fix, so do not repeat the reasoning per test. -->

#### <cause in a few words>

- **Tests:** `path::test_a`, `path::test_b`
- **Why this is not caused by this MR:** <!-- evidence, e.g. the same tests fail on main; the cause is in the test or the data -->
- **Fix:** <!-- link to the MR, or N/A -->

- [ ] I checked that these failures are not caused by my local setup: the stack, `~/.codemie/test-harness.json` and every required variable are set correctly, and the result on `main` was taken with that same complete config (a run on `main` with missing config proves nothing).

### Additional tests (optional)

<!-- Tests run beyond the sanity set: what was run (path, marker, command) and the result. Details are optional. -->

## Verified locally

<!-- Checks done by hand against a real backend, not unit tests. Follow
     .ai-run/guides/testing/local-verification.md.
     Layout: one line about the stand, a SHORT list of the scenarios checked (one bullet each, with the
     result), then everything else inside the collapsed <details> block below.
     Inside the block, one `###` subsection per scenario: what was done, what was expected, what happened.
     Screenshots are REQUIRED for every user-visible state of every scenario (before/after for changed UI);
     attach them to the MR (drag the file into the description or a comment) and show them inside the block.
     `N/A` is allowed only when the diff cannot alter the UI; write the reason on the line.
     Keep a blank line after <summary> and before </details> so markdown renders inside the block.
     Describe only the verification itself. Do not list bugs found or environment problems fixed while preparing
     the setup; those are not verification results and belong in the commits or the ticket if they matter. -->

<stand: backend and UI versions, users, test data>

Checked, all as expected:

- <scenario 1: what was checked, result>
- <scenario 2: what was checked, result>

<details>
<summary>Scenarios, expected results and screenshots</summary>

### <scenario name>

- **Did:**
- **Expected:**
- **Happened:**
- **Screenshots (required):** <!-- attached image(s) of every visible state, or `N/A — <reason>` -->

</details>

## Documentation

<!-- Link to the documentation PR, or `N/A — no user-facing change`. -->

## Checklist

- [ ] Self-reviewed
- [ ] Tests written/updated (or deliberately none: say why in Reviewer notes)
- [ ] Screenshots attached for every scenario in `Verified locally` (or `N/A` — the diff cannot alter UI, reason given there)
- [ ] No breaking changes (or clearly documented above)
- [ ] Dependency, Dockerfile or security-relevant change: reviewer asked to post `/sanity`
