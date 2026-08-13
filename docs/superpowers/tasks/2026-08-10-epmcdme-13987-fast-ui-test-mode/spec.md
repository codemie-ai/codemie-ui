# EPMCDME-13987 — Add fast UI test mode: run sanity-ui against a production build (`npm run test-harness:fast`)

Source: Jira EPMCDME-13987 (Task, status "Ready for Review"). Transcribed verbatim from the ticket
for the acceptance lens; parent investigation EPMCDME-13981 summarized below as context.

## Description (verbatim from ticket)

Implements the recommendation from the EPMCDME-13981 investigation.

Adds an npm script `test-harness:fast` to codemie-ui that runs the sanity-ui suite against a
production bundle served by nginx (new compose profile `uitest`, service `codemie-ui-static`)
instead of the Vite dev server.

Measured on the investigation environment: 69 tests in ~3min at -n 8 vs ~17min at -n 4 against the
dev server, with fewer flaky retries.

Scope:

- codemie-ui: Dockerfile.test multi-stage build with nginx stage and /api proxy config,
  orchestration script with automatic dev-server restore on all exit paths including Ctrl-C,
  package.json script
- codemie-onboarding: compose service + dev UI memory limit 1G to 4G, README note

The changeset passed an independent adversarial review; all 15 findings addressed.

## Acceptance criteria (verbatim from ticket)

1. `npm run test-harness:fast` builds, swaps, runs the suite, restores the dev server, and
   propagates the suite exit code
2. Documented in the onboarding README

## Context from the parent investigation (EPMCDME-13981)

Problem: a full sanity-ui run (codemie-test-harness, 69 tests) takes ~16 minutes on a local Windows
dev environment (Rancher Desktop/WSL2, 16 CPUs). The dominant cost is that tests run against the
Vite dev server, where every full page load re-serves ~1000 unbundled modules and takes 5-10
seconds; UI tests perform full page loads constantly.

Goal: significantly reduce wall-clock while keeping (or improving) stability, so contributors can
run the mandatory pre-MR sanity suite quickly.

Benchmark result recorded on the ticket (69 tests, identical conditions):

| Configuration | Wall-clock | Reruns |
|---|---|---|
| Vite dev server, `-n 4` (previous default) | 17m16s | 1 |
| Vite dev server, `-n 8` | 12m38s | 3 |
| Production build served by nginx, `-n 8` | 3m08s | 1 |

Recommendation carried into this ticket: provide an optional "prod-serve" test mode for local
pre-MR runs; **the dev server remains the default for development**.

Implementation constraints identified during the investigation (each is a correctness requirement
for this changeset):

- nginx needs a `location /api` with `proxy_pass` to the backend, and `proxy_buffering off` for SSE
  chat streaming.
- `index.html` loads `/config.js` at runtime, which must define
  `window._env_ = { VITE_API_URL: '/api' }`.
- The `vite build` needs ~3G Node heap.

Accepted trade-offs (not defects): test mode only — no HMR; a `dist` rebuild (~1-2 min) is needed to
pick up UI changes.

## Notes for the reviewer

- This is developer tooling only. No files under `src/` are touched; the served application is the
  unchanged production build.
- The two repos ship together: codemie-ui MR !1654 and codemie-onboarding MR !33. The compose
  service is profile-gated (`uitest`) and therefore inert until the codemie-ui MR merges.
