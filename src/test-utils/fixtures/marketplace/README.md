# Captured marketplace-management payloads

Every `*.json` here is a **verbatim response body** recorded from a live backend
by `npm run fixtures:refresh`
(`codemie-ui/scripts/refresh-marketplace-fixtures.mjs`). None of them is
hand-written.

That distinction is the whole point of these files. FINDINGS **F-44** records the
previous state: the unit fixtures were invented (`cleanup_reason: 'LOW_QUALITY'`,
`verdict_kind: 'cleanup'`, a pending row carrying `creator`/`categories`), so the
suite was green *because* the contract was broken — every assertion was
`expect(() => render(...)).not.toThrow()`, which a column rendering an em-dash on
every row passes happily.

If a payload changes, **re-run the refresh script against the live stack**. Do
not edit a `.json` by hand, and do not invent a row to make a test pass.

```bash
npm run fixtures:refresh
npm run fixtures:refresh -- --detail-id=<uuid> --similar-id=<uuid>
```

`capture.sh` still exists but only forwards to the script above; the shell
version could not produce `pending-seeded.json`.

## What enforces this

`e2e/marketplace-contract.spec.ts` (EXECUTION-PLAN 10.6) fetches each route from
the live API and compares its key set against the committed fixture with
**equality** — not `objectContaining`, not a `toHaveProperty` loop:

- a **superset** check cannot detect a key the backend *stopped* emitting, which
  is exactly how F-06 (`cleanup_reasons` missing from `/overview`) survived every
  test the project had;
- a **subset** check cannot detect a key the fixture *invented*, which is F-44.

So a fixture that has not been refreshed since the API changed is a red test, not
a silent lie. Run it after every refresh:

```bash
npx playwright test e2e/marketplace-contract.spec.ts --reporter=line --workers=1
```

| File | Request |
| --- | --- |
| `overview.json` | `GET /v1/marketplace-management/entities/assistants/overview` |
| `facets.json` | `GET …/facets` |
| `cleanup-delete.json` | `GET …/cleanup?bucket=DELETE&page_size=5` |
| `cleanup-duplicate.json` | `GET …/cleanup?bucket=DELETE&reason=duplicate&page_size=1` |
| `cleanup-verified.json` | `GET …/cleanup?bucket=VERIFIED&page_size=5` |
| `pending.json` | `GET …/pending?page_size=25` — the queue **at rest** |
| `pending-seeded.json` | `GET …/pending?page_size=100` with one seeded submission in it |
| `entity-detail.json` | `GET …/{eid}` — the `EntityReviewDetail` projection |
| `entity-detail-similar.json` | the same projection for an audited row with `top_similar` |
| `entity-prompt.json` | `GET …/{eid}/prompt` |

## Why each cleanup slice exists

- `cleanup-delete.json` — the queue's default view (`bucket=DELETE`).
- `cleanup-duplicate.json` — one row carrying `canonical_id` /
  `canonical_name` / `match_score`, so it is the one that exercises the
  "↳ canonical:" hint in the Assistant column. Captured at `page_size=1`
  deliberately: how many duplicates the corpus holds is an audit outcome that
  moves between runs.
- `cleanup-verified.json` — rows with real adoption, so the Likes column has
  non-zero values to render (the DELETE bucket is entirely unliked).

## The two pending fixtures

`pending.json` is the queue **at rest** and is legitimately empty: nothing sits
in `PENDING_REVIEW` between runs. It therefore proves the *envelope*
(`total`/`page`/`page_size`/`items`) and nothing about a row. The refresh script
refuses to overwrite it while the live queue is busy, so another run's submission
can never be baked into the file every unit test renders.

`pending-seeded.json` is where the `PendingRow` contract lives (F-31). The
refresh script creates an assistant, publishes it through the **real** endpoint
with `MARKETPLACE_APPROVAL_GATE_ENABLED` armed, captures the one row that
appears, and deletes the assistant again — so the row is the backend's own
output for a genuine submission.

The contract F-94 settled is visible in it: the timestamp is spelled
`submitted_at`, it is an **epoch float in seconds** (`MarketplacePendingPage`
does `new Date(item.submitted_at * 1000)`), and there is no `submitted_ts`.

If the gate is off, publish stamps `APPROVED` immediately, no row ever reaches
the queue and the refresh **fails loudly** rather than writing an empty fixture:

```bash
echo MARKETPLACE_APPROVAL_GATE_ENABLED=true >> codemie/.env && docker restart codemie
```

## Why the detail fixtures are opt-in

`entity-detail.json`, `entity-detail-similar.json` and `entity-prompt.json` are
captured only when you pass `--detail-id` / `--similar-id`. The disposable row
the script seeds has no toolkits, no MCP servers, no gate findings and no
`top_similar`, so refreshing them from it would replace payloads that exercise
those branches with payloads that exercise none of them. Point `--detail-id` at a
`PENDING_REVIEW` submission with real capability and `--similar-id` at an audited
row from `cleanup?reason=duplicate`.

`entity-detail.json` is the 35-key `EntityReviewDetail` projection introduced by
EXECUTION-PLAN 8.1 — **not** the old 54-column assistant dump. It carries no
`system_prompt`, no `toolkits` and no `mcp_servers`; those leaked credentials to
every admin and maintainer, and the prompt moved to the separately audited
`…/{eid}/prompt` route.
