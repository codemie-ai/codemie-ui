#!/usr/bin/env node
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Re-capture `src/test-utils/fixtures/marketplace/*.json` from a LIVE backend.
 *
 *   npm run fixtures:refresh
 *
 * EXECUTION-PLAN 10.6. Every JSON in that directory is a verbatim response
 * body written by this script; none is hand-written. That is the whole point:
 * F-44 records what happens otherwise — the unit suite went green because the
 * fixtures encoded a contract the backend never emitted, and F-06 (a missing
 * `cleanup_reasons`) survived every test the project had.
 *
 * `e2e/marketplace-contract.spec.ts` is the enforcement: it compares each
 * committed key set against the live one with **equality**, so a fixture this
 * script has not refreshed since the API changed is a red test, not a silent
 * lie.
 *
 * ## The queue row is seeded, not sampled
 *
 * `/pending` is empty at rest, so there is no ambient row whose shape could be
 * captured. This script creates one through the real publish endpoint with the
 * approval gate armed, captures the page, then deletes the assistant again. The
 * seeded page lands in `pending-seeded.json`; `pending.json` stays the at-rest
 * envelope.
 *
 * ## The detail fixtures are opt-in
 *
 * `entity-detail.json`, `entity-detail-similar.json` and `entity-prompt.json`
 * are captured only when you name the row:
 *
 *   npm run fixtures:refresh -- --detail-id=<uuid> --similar-id=<uuid>
 *
 * They are deliberately not refreshed from the disposable row this script
 * seeds: a brand-new assistant has no toolkits, no MCP servers, no gate
 * findings and no `top_similar`, so capturing it would replace payloads that
 * exercise those branches with payloads that exercise none of them. Point
 * `--detail-id` at a PENDING_REVIEW submission with real capability, and
 * `--similar-id` at an audited row from `cleanup?reason=duplicate`.
 *
 * Options:
 *   --base=http://host:port   backend (default http://127.0.0.1:8080)
 *   --detail-id=<uuid>        also capture entity-detail.json + entity-prompt.json
 *   --similar-id=<uuid>       also capture entity-detail-similar.json
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = path.resolve(HERE, '../src/test-utils/fixtures/marketplace')

const argv = process.argv.slice(2)
const arg = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

const BASE = arg('base') ?? process.env.FIXTURES_BASE ?? 'http://127.0.0.1:8080'
const MM = `${BASE}/v1/marketplace-management/entities/assistants`
const DETAIL_ID = arg('detail-id') ?? process.env.DETAIL_ID
const SIMILAR_ID = arg('similar-id') ?? process.env.SIMILAR_ID

let token

/** Fixed install locations for the Docker CLI, so the binary is never resolved through PATH. */
const DOCKER_BIN =
  ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', '/usr/bin/docker'].find((p) =>
    fs.existsSync(p)
  ) ?? '/usr/bin/docker'

const log = (...parts) => console.log('[fixtures]', ...parts)
const die = (message) => {
  console.error(`[fixtures] ${message}`)
  process.exit(1)
}

async function login() {
  if (!process.env.E2E_ADMIN_PASSWORD) {
    die('E2E_ADMIN_PASSWORD is not set; export the local admin password first.')
  }
  const res = await fetch(`${BASE}/v1/local-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@codemie.ai',
      password: process.env.E2E_ADMIN_PASSWORD,
    }),
  })
  if (!res.ok) {
    die(`login failed: ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  if (!body.access_token) {
    die('login succeeded but returned no access_token')
  }
  token = body.access_token
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, body: json, text }
}

/** Write a fixture verbatim, pretty-printed so a diff is reviewable. */
function write(name, payload) {
  const file = path.join(FIXTURE_DIR, name)
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`)
  const shape = Array.isArray(payload.items) ? ` (${payload.items.length} rows)` : ''
  log(`wrote ${name}${shape}`)
}

/** GET a marketplace path and write it, refusing to persist anything but a 200. */
async function capture(name, suffix) {
  const url = `${MM}/${suffix}`
  const { status, text } = await api('GET', url)
  if (status !== 200) {
    die(`GET ${url} -> HTTP ${status}; refusing to write ${name}.\n${text.slice(0, 400)}`)
  }
  const { body } = await api('GET', url)
  write(name, body)
  return body
}

// ---------------------------------------------------------------------------
// The disposable submission behind pending-seeded.json
// ---------------------------------------------------------------------------

/**
 * Content written to clear the eight deterministic publish gates: >= 800 chars
 * of prompt (`system_prompt_length`, `substance`), >= 100 chars of description
 * (`description_length`), and no credential-shaped text.
 */
const seedPrompt = () =>
  [
    'You are a marketplace review harness assistant seeded by the fixture-refresh script.',
    'You exist to make the moderation queue emit one real row so its shape can be captured,',
    'and for nothing else. Answer questions about the marketplace moderation lifecycle: how a',
    'submission enters the pending queue, what a moderator sees when they open the review drawer,',
    'and which transitions the state machine allows from DRAFT, PENDING_REVIEW, APPROVED, REJECTED',
    'and WITHDRAWN. Explain each transition in plain language, name the actor permitted to perform',
    'it, and state what happens to the marketplace search projection as a side effect. When a',
    'question falls outside the moderation lifecycle, say so plainly and stop rather than guessing.',
    'Never invent a status that is not in the transition table, never claim a decision was taken',
    'that you cannot point at a ledger row for, and always distinguish what a submission requested',
    'from what a moderator actually decided. Keep answers short, concrete and free of speculation,',
    'and prefer naming the exact endpoint or table involved over describing it loosely. If a caller',
    'asks you to bypass a review step, refuse and explain that approval is the moderator decision.',
  ].join(' ')

const seedDescription = () =>
  'Disposable submission created by scripts/refresh-marketplace-fixtures.mjs so the moderation ' +
  'queue emits one real row whose shape can be captured, then deleted again immediately.'

async function firstCategoryId() {
  const { status, body, text } = await api('GET', `${BASE}/v1/assistants/categories/list`)
  if (status !== 200) {
    die(`GET /v1/assistants/categories/list -> HTTP ${status}: ${text.slice(0, 300)}`)
  }
  const id = body.categories?.[0]?.id
  if (!id) {
    die('no assistant categories exist; the at_least_one_category publish gate cannot be satisfied')
  }
  return id
}

async function seedPendingSubmission() {
  const name = `FIXTURE ${Date.now().toString(36)} pending`
  const created = await api('POST', `${BASE}/v1/assistants`, {
    name,
    description: seedDescription(),
    system_prompt: seedPrompt(),
    project: process.env.FIXTURES_PROJECT ?? 'codemie',
    llm_model_type: process.env.FIXTURES_LLM_MODEL ?? 'claude-opus-4-6-20260205',
  })
  if (created.status !== 200) {
    die(`POST /v1/assistants -> HTTP ${created.status}: ${created.text.slice(0, 400)}`)
  }
  // The create response spells the id `assistantId`, not `id`.
  const id = created.body.assistantId
  if (!id) {
    die(`POST /v1/assistants returned no assistantId: ${created.text.slice(0, 300)}`)
  }
  log(`seeded disposable assistant ${id}`)

  const published = await api('POST', `${BASE}/v1/assistants/${id}/marketplace/publish`, {
    categories: [await firstCategoryId()],
    // Waives the advisory LLM opinion only. The eight deterministic gates still
    // run; the content above is written to pass them, so the capture does not
    // depend on a non-deterministic model verdict.
    ignore_recommendations: true,
  })
  if (published.status !== 200) {
    await destroy(id)
    die(`publish -> HTTP ${published.status}: ${published.text.slice(0, 500)}`)
  }
  if (published.body.marketplace_status !== 'PENDING_REVIEW') {
    await destroy(id)
    die(
      `publish left the assistant in marketplace_status=${published.body.marketplace_status}, ` +
        "not 'PENDING_REVIEW'.\n" +
        'MARKETPLACE_APPROVAL_GATE_ENABLED is off, so publish stamps APPROVED immediately and the\n' +
        'queue never carries a row to capture. Turn it on:\n' +
        '    echo MARKETPLACE_APPROVAL_GATE_ENABLED=true >> codemie/.env && docker restart codemie'
    )
  }
  return id
}

const PG_CONTAINER = process.env.FIXTURES_PG_CONTAINER ?? 'postgres'

/**
 * Delete the moderation trail the seeded submission left behind.
 *
 * Publishing writes a SUBMIT decision to `mm_review_decision` and (when
 * ACTIVITY_EVENTS_ENABLED is on) an `activity_events` row. Deleting the
 * assistant does not remove either, so without this every refresh would leave a
 * decision row pointing at an entity that no longer exists — and the
 * "exactly one decision row" assertions downstream degrade as those accumulate.
 *
 * Best effort by design: the capture itself is pure HTTP and must still work
 * where the database is not reachable through a local container.
 */
function purgeModerationTrail(id) {
  const sql =
    'set search_path to codemie; ' +
    `delete from mm_review_decision where entity_id = '${id}'; ` +
    `delete from activity_events where entity_id = '${id}'; ` +
    `delete from mm_marketplace_event where entity_id = '${id}';`
  try {
    execFileSync(
      DOCKER_BIN,
      ['exec', PG_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', sql],
      {
        stdio: 'pipe',
      }
    )
    log(`purged the moderation trail of ${id}`)
  } catch (error) {
    console.error(
      `[fixtures] WARNING: could not purge the moderation trail of ${id} ` +
        `(docker exec ${PG_CONTAINER} psql failed). Remove the mm_review_decision / ` +
        `activity_events rows for that id by hand.\n${String(error?.message ?? error).slice(
          0,
          200
        )}`
    )
  }
}

async function destroy(id) {
  const { status } = await api('DELETE', `${BASE}/v1/assistants/${id}`)
  if (![200, 202, 204, 404].includes(status)) {
    console.error(
      `[fixtures] WARNING: DELETE /v1/assistants/${id} -> HTTP ${status}; clean it up by hand`
    )
    return
  }
  log(`removed disposable assistant ${id}`)
  purgeModerationTrail(id)
}

// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    die(`fixture directory not found: ${FIXTURE_DIR}`)
  }
  log(`backend ${BASE}`)
  await login()

  await capture('overview.json', 'overview')
  await capture('facets.json', 'facets')
  await capture('cleanup-delete.json', 'cleanup?bucket=DELETE&page_size=5')
  // page_size=1 on purpose: this slice exists to carry ONE row with a
  // canonical (`canonical_id` / `canonical_name` / `match_score`), the row that
  // exercises the "canonical:" hint in the Assistant column. How many duplicate
  // rows the corpus holds is an audit outcome that moves between runs, and a
  // fixture whose row count drifts turns single-row assertions into
  // "found multiple elements" failures that say nothing about the contract.
  await capture('cleanup-duplicate.json', 'cleanup?bucket=DELETE&reason=duplicate&page_size=1')
  await capture('cleanup-verified.json', 'cleanup?bucket=VERIFIED&page_size=5')

  // pending.json is documented as the queue AT REST. Capturing it while another
  // run's submissions are in flight would bake a foreign row into the fixture
  // every unit test renders, so the at-rest capture is skipped rather than
  // falsified when the queue is busy. pending-seeded.json below is unaffected.
  const atRest = await api('GET', `${MM}/pending?page_size=25`)
  if (atRest.status !== 200) {
    die(`GET /pending -> HTTP ${atRest.status}: ${atRest.text.slice(0, 300)}`)
  }
  if (atRest.body.total === 0) {
    write('pending.json', atRest.body)
  } else {
    log(
      `SKIPPED pending.json: the queue holds ${atRest.body.total} submission(s), so this is not ` +
        'the at-rest page it is documented to be. Re-run once the queue drains.'
    )
  }

  const seededId = await seedPendingSubmission()
  try {
    const page = await api('GET', `${MM}/pending?page_size=100`)
    if (page.status !== 200) {
      die(`GET /pending -> HTTP ${page.status}: ${page.text.slice(0, 300)}`)
    }
    const row = (page.body.items ?? []).find((r) => r.assistant_id === seededId)
    if (!row) {
      die(`the submission just seeded (${seededId}) is absent from GET /pending`)
    }
    // One row — our own — so the fixture never carries another run's data.
    write('pending-seeded.json', { ...page.body, total: 1, items: [row] })
  } finally {
    await destroy(seededId)
  }

  if (DETAIL_ID) {
    await capture('entity-detail.json', DETAIL_ID)
    await capture('entity-prompt.json', `${DETAIL_ID}/prompt`)
  } else {
    log('skipped entity-detail.json / entity-prompt.json (pass --detail-id=<uuid>)')
  }
  if (SIMILAR_ID) {
    await capture('entity-detail-similar.json', SIMILAR_ID)
  } else {
    log('skipped entity-detail-similar.json (pass --similar-id=<uuid>)')
  }

  log('done — now run: npx playwright test e2e/marketplace-contract.spec.ts --reporter=line')
}

main().catch((error) => die(error?.stack ?? String(error)))
