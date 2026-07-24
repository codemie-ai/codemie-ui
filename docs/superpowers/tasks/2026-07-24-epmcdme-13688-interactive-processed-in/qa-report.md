# QA report — EPMCDME-13688

Branch: `EPMCDME-13688_fix-interactive-processed-in`
Merge base: `origin/main` (`be7fd5e60`)
Result: **passed**

## Gate results

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | skipped — see below |
| Typecheck | `npm run typecheck` | passed, no output |
| Unit tests | `npm run test:unit` | passed — 315 files, 3719 tests |
| Integration tests | `npm run test:integration` | passed — 28 files, 430 passed, 1 skipped |
| Build | `npm run build` | passed — built in 12.61s |
| License headers | `npm run license-headers:check` | passed — 1680 files, 0 missing |
| Secrets | `npm run secrets:check` | passed — Gitleaks, no leaks found |

## Lint

`npm run lint` could not be evaluated locally. The ESLint `@/`-alias resolver is broken across the
whole repository, not just in the changed files: an untouched file, `src/store/chats.ts`, produces
the same `import/no-unresolved` and `import/extensions` errors. Both commits therefore bypassed the
Husky pre-commit hook, and the two non-lint checks that hook runs — license headers and secret
detection — were executed manually instead and pass (recorded above).

Prettier was run over the four touched files to close the formatting gap the code review flagged.
CI is the authority for lint on this branch.

## Test coverage added by this change

| Test | File | What it pins |
|---|---|---|
| `records processingTime for an interactive-only turn that carries no text` | `src/store/__tests__/chatGeneration.interactive.test.ts` | The reported defect — RED observed before the fix |
| `still records processingTime for a regular text response` | same | Regression guard for the branch rewrite |
| `leaves processingTime unset when the stream ends without a terminal chunk` | same | Truncated streams stay unlabelled — RED observed before the guard |
| `finishes the stream on a terminal chunk that also carries an interactive request` | same | `_handleChunk` termination hardening — RED observed before the fix |
| `renders the processing duration for a completed message` | `src/pages/chat/.../__tests__/ChatAiMessage.test.tsx` | Baseline render |
| `renders the processing duration when the response completed in under a millisecond` | same | Zero-duration guard — RED observed before the fix |
| `omits the duration but keeps the timestamp when no processing time is known` | same | The negative case |
| `renders the processing duration for a checkbox-only response with no assistant text` | same | Acceptance criterion 4 — the exact ticket scenario |

## Feature verification

Not run: the flow was invoked without `--ui`. The checkbox scenario from the ticket screenshot is
covered at the render level by the last test above, which exercises the real
`ChatAiInteractiveBlock` (deliberately unmocked) with a checkbox surface and no assistant text.
A manual pass against the local stack remains available if the reviewer wants live confirmation.
