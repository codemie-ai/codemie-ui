# QA report — EPMCDME-13911 (React 18→19 upgrade)

Date: 2026-08-05 · Branch: EPMCDME-13911_react-19-upgrade (commit 8961a0acf)

## Gates

| Gate | Result | Notes |
|---|---|---|
| typecheck (`tsc --noEmit`) | PASS | one predicted fix applied (main.tsx non-null assertion) |
| unit+integration tests (vitest) | PASS | 395/395 files, 4656 passed, 1 skipped; suite time 309s → 188s after the ProjectSelector race fix |
| SPA build (`npm run build`) | PASS | |
| keycloak entry build | PASS (vite stage) | jar packaging needs Maven (absent locally) — covered by CI |
| lint | SKIPPED-LOCAL | all 8570 errors = known broken local alias resolver (4286 import/no-unresolved + 4284 import/extensions; fails on main too); CI lint is authoritative; zero non-resolver findings |
| test-harness `--sanity-ui` | 65 passed, 3 failed → triaged below | |
| manual browser smoke (dev server, real stack) | PASS | login, chat, new-assistant form, assistants list, workflows: 0 console errors; /analytics 404 = feature gate by design; Ctrl+B tooltip verified visible on hover |

## Harness failure triage (3)

1. `test_stop_generation_button_css_state_and_halt_flow` — PASSES in isolation; full-run
   failure correlates with unhealthy local litellm container (needs live generation).
   Env/flaky, not a React 19 regression.
2. `test_create_file_datasource` — PASSES in isolation; indexing-dependent. Env/flaky.
3. `test_hover_sidebar_toggle_button_shows_and_hides_ctrl_b_tooltip` — fails
   deterministically, but NOT because of the tooltip (verified visible manually).
   Root cause: **duplicate `#chat-sidebar` DOM id** → Playwright strict-mode violation
   in the page object. The duplicate comes from main: `ChatPage.tsx:85` (Panel id,
   EPMCDME-10137, 2026-07-27) vs `ChatSidebar.tsx:66` (Sidebar id, EPMCDME-13270,
   2026-08-04). **Pre-existing main regression, unrelated to this branch** (our diff
   does not touch these files); breaks the harness sanity suite for everyone.
   → Needs a bug report to the owners of EPMCDME-13270.

## Screenshots (after)

screenshots/react19-after-chat.png, react19-after-new-assistant.png,
react19-after-assistants.png ("before" to be captured from main during MR prep if the
compliance bot requires the pair).
