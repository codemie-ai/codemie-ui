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

import { proxy } from 'valtio'

import type {
  AssessmentResponse,
  AuditConfigResponse,
  Bucket,
  BulkUnpublishResponse,
  EntityKind,
  EntityPromptResponse,
  EntityReviewDetail,
  FacetsResponse,
  MarketplaceAssistantsRow,
  OverviewResponse,
  CleanupRow,
} from '@/types/generated/marketplaceManagement'
import api from '@/utils/api'

export type AssistantRow = MarketplaceAssistantsRow

export interface AssessmentEntry {
  isAssessing: boolean
  assessment: AssessmentResponse | null
  error: string | null
}

interface MarketplaceManagementStoreType {
  entityKind: EntityKind
  isLoadingOverview: boolean
  isLoadingCleanup: boolean
  overviewLoadError: string | null
  overview: OverviewResponse | null
  facets: FacetsResponse | null
  auditConfig: AuditConfigResponse | null
  cleanup: {
    items: CleanupRow[]
    total: number
    page: number
    pageSize: number
    bucket: Bucket | '' | 'ALL'
    reason: string | null
    tier: string | null
    verdict: string | null
    mcp: string | null
    category: string | null
    /** Quality-check id from the Overview's "Failed quality checks" table. */
    rule: string | null
    /** Ordering key sent as `order_by` (see SORT_OPTIONS). */
    order_by: string | null
    query: string
    selected: Set<string>
    loadError: string | null
  }
  /**
   * AI assessments by assistant id. `POST /assess` cannot be cancelled and can
   * take minutes, so its state cannot live in one shared slot: closing the
   * drawer or opening another assistant must neither drop the running request's
   * result nor show it under a different assistant's name.
   */
  assessments: Record<string, AssessmentEntry>
  /**
   * Audit progress lives on the store, not in the Overview page's local
   * state. `POST /audit/run` is synchronous and can take minutes; with the
   * flag in component state, switching tabs or reloading reset the button to
   * "Run audit" while the audit was still running, so the admin concluded the
   * click had done nothing and clicked again.
   */
  isAuditing: boolean
  auditStartedAt: number | null
  auditError: string | null
  /**
   * Terminal `RunStatus` of the last run, verbatim from the server
   * (`SUCCEEDED` | `PARTIAL` | `FAILED` | `CANCELLED`), or null when the
   * server does not report one. `PARTIAL` means the pass completed but ran
   * degraded — the similarity backend was unavailable, so the verdicts cover
   * a subset — and it arrives with `error: null`, which is exactly why it
   * needs a field of its own: without it the UI cannot tell a degraded run
   * from a full one.
   */
  auditStatus: string | null
  /** Documents the similarity pass actually saw, when the server reports it. */
  auditEsDocCount: number | null

  assistants: {
    items: AssistantRow[]
    total: number
    hasLoaded: boolean
  }
  loadAssistants(statusFilter?: string): Promise<void>
  loadOverview(): Promise<void>
  loadFacets(): Promise<void>
  loadAuditConfig(kind: EntityKind): Promise<void>
  loadCleanup(): Promise<void>
  runAudit(): Promise<void>
  refreshAuditStatus(): Promise<void>
  approve(aid: string): Promise<void>
  reject(aid: string, reason: string): Promise<void>
  forcePublish(aid: string, override_notice: string): Promise<void>
  withdraw(aid: string, bucket?: Bucket | null): Promise<void>
  approveBulk(aids: string[]): Promise<BulkResult>
  rejectBulk(aids: string[], reason: string): Promise<BulkResult>
  withdrawBulk(
    aids: string[],
    bucketById?: Record<string, Bucket | null | undefined>
  ): Promise<BulkUnpublishResult>
  assessWithAI(aid: string, llmModel?: string): Promise<void>
  /**
   * `GET /entities/{kind}/{eid}`. Answers with the `EntityReviewDetail`
   * projection (35 allow-listed keys), NOT an `Assistant`: no `system_prompt`,
   * no `toolkits`, no `mcp_servers` (EXECUTION-PLAN 8.1, F-18/F-19). It was
   * typed `Record<string, unknown>` here, which is what let the drawer cast it
   * to `Assistant` and render a component built for the old 54-column dump.
   */
  getAssistantDetail(aid: string, signal?: AbortSignal): Promise<EntityReviewDetail>
  /**
   * `GET /entities/{kind}/{eid}/prompt`. The system prompt lives behind its own
   * route because reading an entity's instructions is separately audited —
   * so it is fetched on an explicit reviewer action, never eagerly.
   */
  getEntityPrompt(aid: string): Promise<EntityPromptResponse>
  resetCleanupFilters(): void
  setCleanupBucket(bucket: string): void
  setCleanupMcp(v: string | null): void
  setCleanupCategory(v: string | null): void
}

// Path-segment form of an entity kind. The backend router mounts every
// endpoint under `/v1/marketplace-management/entities/{kind}/...` and
// accepts the plural nouns; keep the enum-style store value but translate
// at the boundary.
const kindPath = (): string =>
  marketplaceManagementStore.entityKind === 'WORKFLOW' ? 'workflows' : 'assistants'
const mmBase = (): string => `v1/marketplace-management/entities/${kindPath()}`

/**
 * `api.makeRequest` rejects with a cloned `Response` carrying `parsedError`,
 * not an `Error` (src/utils/api.ts). `err instanceof Error` is therefore false
 * for every HTTP failure and `String(err)` yields the literal string
 * "[object Response]" — which is non-empty, so a `|| fallback` never fires and
 * the admin saw "[object Response]" in the banner. This is the extraction the
 * rest of the repo uses (src/store/budgets.ts:96).
 */
export const errorMessage = (error: unknown, fallback: string): string => {
  const e = error as { parsedError?: { message?: string }; message?: string } | null
  return e?.parsedError?.message || e?.message || fallback
}

// Requests that render their own inline banner opt out of the global toast so
// a single failure is not reported twice, in two different wordings.
const OWN_ERROR_UI = { skipErrorHandling: true }

const EMPTY_ASSESSMENT: AssessmentEntry = { isAssessing: false, assessment: null, error: null }

/** Running `POST /assess` calls by assistant id; see `assessWithAI`. */
const inFlightAssessments = new Map<string, Promise<void>>()

// Monotonic request ids. A slow response for filter A must not overwrite the
// rendered result of a later request for filter B — without this, typing in
// the search box could leave the table showing an earlier query's rows.
let cleanupRequestId = 0
let assistantsRequestId = 0

/**
 * Shape of GET /entities/{kind}/audit/status.
 *
 * `status` and `es_doc_count` are optional because the live backend does not
 * emit them yet (EXECUTION-PLAN 9.2 adds them); every read below tolerates
 * their absence, so this stays correct both before and after that lands.
 */
interface AuditStatusResponse {
  is_running: boolean
  run_id: string | null
  started_at: number | null
  finished_at: number | null
  error: string | null
  status?: string | null
  es_doc_count?: number | null
}

/** The one terminal status that means "complete and undegraded". */
export const AUDIT_STATUS_SUCCEEDED = 'SUCCEEDED'

const AUDIT_POLL_MS = 3000
/** Stop following a run after this long so a wedged server cannot pin the UI. */
const AUDIT_POLL_TIMEOUT_MS = 30 * 60 * 1000

const applyAuditStatus = (status: AuditStatusResponse): void => {
  marketplaceManagementStore.isAuditing = Boolean(status?.is_running)
  // `started_at` is epoch SECONDS from Python's time.time().
  marketplaceManagementStore.auditStartedAt = status?.started_at ? status.started_at * 1000 : null
  marketplaceManagementStore.auditError = status?.error ?? null
  marketplaceManagementStore.auditStatus = status?.status ?? null
  marketplaceManagementStore.auditEsDocCount = status?.es_doc_count ?? null
}

/** Only one poll loop at a time, however many tabs or clicks triggered it. */
let auditPollInFlight: Promise<void> | null = null

const pollUntilAuditFinishes = (): Promise<void> => {
  if (auditPollInFlight) return auditPollInFlight

  auditPollInFlight = (async () => {
    const deadline = Date.now() + AUDIT_POLL_TIMEOUT_MS
    try {
      while (marketplaceManagementStore.isAuditing && Date.now() < deadline) {
        // Sequential by design: this is a poll loop, so each wait and each
        // status read must happen after the previous one. Running them
        // concurrently would spam the endpoint instead of pacing it.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, AUDIT_POLL_MS)
        })
        // eslint-disable-next-line no-await-in-loop
        await marketplaceManagementStore.refreshAuditStatus()
      }

      // The run has ended, so pull in what it produced. This lives here and
      // not in `runAudit` on purpose: an admin who merely *discovered* a
      // colleague's run never called `runAudit`, so this is the only refresh
      // they get. Without it their KPI cards keep the pre-audit numbers until
      // they reload by hand — the second half of F-63.
      // Skipped when the deadline, not the run, ended the loop: the audit is
      // still in flight and its results are not final.
      if (!marketplaceManagementStore.isAuditing) {
        await marketplaceManagementStore.loadOverview()
        await marketplaceManagementStore.loadFacets()
      }
    } finally {
      auditPollInFlight = null
    }
  })()

  return auditPollInFlight
}

/**
 * Outcome of a fan-out bulk action. `succeeded`/`failed` hold entity ids so
 * the caller can clear exactly the selection that was actually processed.
 */
export interface BulkResult {
  succeeded: string[]
  failed: Array<{ id: string; message: string }>
}

export type BulkUnpublishResult = BulkUnpublishResponse

const runBulk = async (
  ids: string[],
  request: (id: string) => Promise<Response>
): Promise<BulkResult> => {
  const settled = await Promise.allSettled(ids.map((id) => request(id)))
  const result: BulkResult = { succeeded: [], failed: [] }
  settled.forEach((outcome, index) => {
    const id = ids[index]
    if (outcome.status === 'fulfilled') result.succeeded.push(id)
    else result.failed.push({ id, message: errorMessage(outcome.reason, 'Request failed') })
  })
  return result
}

// The annotation is load-bearing, not decoration: the object literal below
// references `marketplaceManagementStore` from its own methods, so without it
// TypeScript falls back to `any` for the whole store (TS7022, silenced by
// `noImplicitAny: false`) and every component read through `useSnapshot`
// escapes type checking — which is how a read of `overview.pending`, a field
// the API never emitted, survived in two places.
export const marketplaceManagementStore: MarketplaceManagementStoreType = proxy({
  entityKind: 'ASSISTANT',
  isLoadingOverview: false,
  isLoadingCleanup: false,
  overviewLoadError: null,
  overview: null,
  facets: null,
  auditConfig: null,
  cleanup: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    // Matches DEFAULT_BUCKET in useMarketplaceFilters ("All" = every
    // bucket, VERIFIED included). Starting at '' meant hydration always changed
    // the value on a clean URL, which fired the cleanup fetch twice on every
    // fresh navigation.
    bucket: 'ALL',
    reason: null,
    tier: null,
    verdict: null,
    mcp: null,
    category: null,
    rule: null,
    order_by: null,
    query: '',
    selected: new Set<string>(),
    loadError: null,
  },
  assistants: {
    items: [] as AssistantRow[],
    total: 0,
    hasLoaded: false,
  },
  assessments: {},
  isAuditing: false,
  auditStartedAt: null,
  auditError: null,
  auditStatus: null,
  auditEsDocCount: null,

  loadAssistants(statusFilter?: string) {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    // Client-side search/category/waitTime filters need all rows present;
    // omitting page_size makes the backend return every row.
    const query = params.toString()
    const suffix = query ? `?${query}` : ''
    const url = `${mmBase()}/marketplace-assistants${suffix}`

    assistantsRequestId += 1
    const requestId = assistantsRequestId

    return api
      .get(url, OWN_ERROR_UI)
      .then((res) => res.json())
      .then((data: { total: number; items: AssistantRow[] }) => {
        if (requestId !== assistantsRequestId) return
        marketplaceManagementStore.assistants.items = data.items ?? []
        marketplaceManagementStore.assistants.total = data.total
        marketplaceManagementStore.assistants.hasLoaded = true
      })
      .catch((err: unknown) => {
        if (requestId !== assistantsRequestId) return
        throw err
      })
  },

  loadOverview() {
    marketplaceManagementStore.isLoadingOverview = true
    marketplaceManagementStore.overviewLoadError = null
    return api
      .get(`${mmBase()}/overview`, OWN_ERROR_UI)
      .then((res) => res.json())
      .then((data: OverviewResponse) => {
        marketplaceManagementStore.overview = data
        marketplaceManagementStore.overviewLoadError = null
      })
      .catch((err: unknown) => {
        marketplaceManagementStore.overviewLoadError = errorMessage(err, 'Failed to load Overview.')
      })
      .finally(() => {
        marketplaceManagementStore.isLoadingOverview = false
      })
  },

  loadFacets() {
    return api
      .get(`${mmBase()}/facets`)
      .then((res) => res.json())
      .then((data: FacetsResponse) => {
        marketplaceManagementStore.facets = data
      })
      .catch(() => {
        // Facets only populate optional filter dropdowns. A failure here must
        // not surface as an unhandled rejection or block the table; the global
        // toast from api.handleError already tells the admin something failed.
        marketplaceManagementStore.facets = null
      })
  },

  loadAuditConfig(_kind: EntityKind) {
    // `_kind` is accepted to match the method signature but `mmBase()` already
    // reads `entityKind` from the store, so the path is always consistent.
    return api
      .get(`${mmBase()}/config`)
      .then((res) => res.json())
      .then((data: AuditConfigResponse) => {
        marketplaceManagementStore.auditConfig = data
      })
      .catch(() => {
        // Config only drives tooltip content. A failure must not block the
        // table; the info icons render without threshold numbers instead.
        marketplaceManagementStore.auditConfig = null
      })
  },

  loadCleanup() {
    const { page, pageSize, bucket, reason, tier, verdict, mcp, category, rule, order_by, query } =
      marketplaceManagementStore.cleanup

    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('page_size', String(pageSize))
    // Always send `bucket` — the empty string means "all buckets" and the
    // backend router only defaults to DELETE when the param is absent. If
    // we omitted the param when bucket==="", clicking a facet row (which
    // navigates with ?bucket=&mcp=…) would silently narrow to DELETE and
    // return zero results for MCPs that live in VERIFIED/COMMUNITY.
    // `bucket` is `'ALL'` in the store (the UI-facing "all buckets" sentinel —
    // see ALL_BUCKETS in useMarketplaceFilters.ts), but the generated
    // `Bucket-Input` enum has no 'ALL' member, only 'VERIFIED' | 'COMMUNITY' |
    // 'DELETE' | ''. Sending 'ALL' verbatim 422s the request, which happened
    // on the queue's default load and on every Overview drill-down link
    // (all of which build ?bucket=ALL&...).
    params.append('bucket', bucket === 'ALL' ? '' : bucket ?? '')
    if (reason) params.append('reason', reason)
    if (tier) params.append('tier', tier)
    if (verdict) params.append('verdict', verdict)
    if (mcp) params.append('mcp', mcp)
    if (category) params.append('category', category)
    if (rule) params.append('rule', rule)
    // Inert until the backend honours it (EXECUTION-PLAN 5.6) — an unknown
    // query param is ignored by FastAPI, so sending it cannot break the read.
    if (order_by) params.append('order_by', order_by)
    if (query) params.append('q', query)

    marketplaceManagementStore.cleanup.loadError = null
    marketplaceManagementStore.isLoadingCleanup = true
    // Drop the previous filter's rows immediately. Leaving them in place made
    // the table render the old result set under the new filter until the
    // response landed.
    marketplaceManagementStore.cleanup.items = []
    cleanupRequestId += 1
    const requestId = cleanupRequestId
    const isStale = (): boolean => requestId !== cleanupRequestId

    return api
      .get(`${mmBase()}/cleanup?${params.toString()}`, OWN_ERROR_UI)
      .then((res) => res.json())
      .then((data: { total: number; page: number; page_size: number; items: CleanupRow[] }) => {
        if (isStale()) return
        marketplaceManagementStore.cleanup.items = data.items
        marketplaceManagementStore.cleanup.total = data.total
        marketplaceManagementStore.cleanup.page = data.page
        marketplaceManagementStore.cleanup.pageSize = data.page_size
        marketplaceManagementStore.cleanup.loadError = null
      })
      .catch((err: unknown) => {
        // Surface an inline banner via `loadError` so the admin can see why
        // the table stopped refreshing (typically a 5xx). The store never
        // throws out of this callback so React never sees an unhandled reject.
        if (isStale()) return
        marketplaceManagementStore.cleanup.loadError = errorMessage(
          err,
          'Failed to load cleanup queue. Retry in a moment.'
        )
      })
      .finally(() => {
        if (isStale()) return
        marketplaceManagementStore.isLoadingCleanup = false
      })
  },

  /**
   * Read the server's audit status into the store.
   *
   * The server owns "is an audit running", so this is correct for every
   * admin and survives a page reload — in-memory UI state could do neither.
   */
  async refreshAuditStatus() {
    try {
      const status: AuditStatusResponse = await api
        .get(`${mmBase()}/audit/status`, OWN_ERROR_UI)
        .then((res) => res.json())
      applyAuditStatus(status)
    } catch {
      // A failed status poll must not strand the button in a running state
      // forever; leave the last known value and let the next poll correct it.
      return
    }
    // Adopting `is_running` without following the run is what left the button
    // on "Running audit…" forever for the *second* admin (F-63): this call is
    // the only thing that ever discovers a run started elsewhere, and nothing
    // downstream of it polled. Deliberately not awaited — the caller is a
    // mount effect, and the run can take minutes.
    if (marketplaceManagementStore.isAuditing) {
      // `pollUntilAuditFinishes` is a no-op when a loop is already running, so
      // repeated status reads (this method is itself the poll body) cannot
      // multiply the request rate. The promise is intentionally not awaited
      // and never rejects — the loop swallows status failures itself.
      pollUntilAuditFinishes()
    }
  },

  /**
   * Start an audit and follow it to completion.
   *
   * `POST /audit/run` returns as soon as the run is queued (202), so this
   * polls `GET /audit/status` until the server reports it finished, then
   * refreshes the data the audit produced.
   */
  async runAudit() {
    const status: AuditStatusResponse = await api
      .post(`${mmBase()}/audit/run`, {}, OWN_ERROR_UI)
      .then((res) => res.json())
    applyAuditStatus(status)

    // The poll refreshes the overview and the facets once the run ends, so
    // there is nothing to re-read here. Repeating those two calls — as this
    // method and the Overview page's click handler both used to — cost four
    // extra audit-cache reads per audit (F-62).
    await pollUntilAuditFinishes()

    if (marketplaceManagementStore.auditError) {
      throw new Error(marketplaceManagementStore.auditError)
    }
  },

  approve(aid) {
    return api
      .post(`${mmBase()}/pending/${encodeURIComponent(aid)}/approve`, {})
      .then((res) => res.json())
  },

  reject(aid, reason) {
    return api
      .post(`${mmBase()}/pending/${encodeURIComponent(aid)}/reject`, { reason })
      .then((res) => res.json())
  },

  forcePublish(aid, override_notice) {
    return api
      .post(`${mmBase()}/pending/${encodeURIComponent(aid)}/force-publish`, {
        override_notice,
      })
      .then((res) => res.json())
  },

  withdraw(aid, bucket) {
    return api
      .post(`${mmBase()}/pending/${encodeURIComponent(aid)}/withdraw`, {})
      .then((res) => res.json())
      .then((data) => {
        // Decrement the tab badge locally instead of refetching `overview`.
        const { overview } = marketplaceManagementStore
        if (overview) {
          if (bucket) {
            overview.buckets[bucket] = Math.max(0, (overview.buckets[bucket] ?? 0) - 1)
          } else {
            overview.marketplace_assistants_total = Math.max(
              0,
              overview.marketplace_assistants_total - 1
            )
          }
        }
        return data
      })
  },

  // Bulk endpoints have no backend counterpart yet — fan out per-item calls
  // under a shared spinner so callers still get "one action, one await".
  // Once the backend gains true /bulk routes, swap this for a single POST.
  //
  // `Promise.allSettled`, never `Promise.all`: with `all`, one failure
  // rejected the whole call while the other requests kept running, so the
  // caller's refresh and clear-selection never ran. The table then still
  // listed assistants that HAD been approved, with their ids still selected —
  // pressing the button again re-approved them. Callers get a per-item result
  // so they can refresh, drop the ids that succeeded, and report the rest.
  async approveBulk(aids) {
    return runBulk(aids, (aid) =>
      api.post(`${mmBase()}/pending/${encodeURIComponent(aid)}/approve`, {}, OWN_ERROR_UI)
    )
  },

  async rejectBulk(aids, reason) {
    return runBulk(aids, (aid) =>
      api.post(`${mmBase()}/pending/${encodeURIComponent(aid)}/reject`, { reason }, OWN_ERROR_UI)
    )
  },

  // Bulk unpublish for the cleanup queue (EPMCDME-14765). Replaced fan-out
  // with a single bulk endpoint so the admin sees one atomic result instead
  // of N individual toasts.
  async withdrawBulk(aids, bucketById) {
    // Replaced fan-out with a single bulk endpoint (EPMCDME-14765).
    // The endpoint uses partial semantics: it returns 200 with an `unpublished`
    // count and a `failed` list so the caller can surface per-entity errors.
    const response = await api.post(
      `${mmBase()}/bulk-unpublish`,
      { entity_ids: aids },
      OWN_ERROR_UI
    )
    const result: BulkUnpublishResult = await response.json()
    if (response.ok) {
      // `response.ok` only means the request itself succeeded — the body
      // still carries a per-entity `failed` list (EPMCDME-14234, CR-011).
      // Clearing the whole selection here previously dropped ids the
      // response reported as failed, telling the admin they were withdrawn
      // when they weren't and leaving no way to see/retry them.
      const failedIds = new Set(result.failed?.map((f) => f.entity_id) ?? [])
      marketplaceManagementStore.cleanup.selected = new Set(
        [...marketplaceManagementStore.cleanup.selected].filter((id) => failedIds.has(id))
      )

      // Decrement per succeeded id only, same as withdraw().
      const { overview } = marketplaceManagementStore
      if (overview && bucketById) {
        aids.forEach((id) => {
          if (failedIds.has(id)) return
          const bucket = bucketById[id]
          if (bucket) {
            overview.buckets[bucket] = Math.max(0, (overview.buckets[bucket] ?? 0) - 1)
          }
        })
      }
    }
    return result
  },

  assessWithAI(aid, llmModel) {
    // A second click (row menu, then the drawer button) joins the running
    // request instead of billing the provider twice.
    const running = inFlightAssessments.get(aid)
    if (running) return running

    const update = (patch: Partial<AssessmentEntry>) => {
      const current = marketplaceManagementStore.assessments[aid] ?? EMPTY_ASSESSMENT
      marketplaceManagementStore.assessments[aid] = { ...current, ...patch }
    }
    update({ isAssessing: true, error: null })
    const body: Record<string, unknown> = {}
    if (llmModel) body.llm_model = llmModel

    const request = api
      .post(`${mmBase()}/${encodeURIComponent(aid)}/assess`, body, OWN_ERROR_UI)
      .then((res) => res.json())
      .then((data: AssessmentResponse) => update({ assessment: data }))
      .catch((err: unknown) => {
        // Surface an in-panel error so admins understand why the assessment
        // didn't appear (the global toast disappears in ~4s). isAssessing
        // resets in .finally so the button returns to its idle label.
        update({ error: errorMessage(err, 'Assessment failed. Please try again.') })
      })
      .finally(() => {
        update({ isAssessing: false })
        inFlightAssessments.delete(aid)
      })
    inFlightAssessments.set(aid, request)
    return request
  },

  getAssistantDetail(aid, signal) {
    return api
      .get(`${mmBase()}/${encodeURIComponent(aid)}`, { ...OWN_ERROR_UI, signal })
      .then((res) => res.json())
  },

  getEntityPrompt(aid) {
    return api.get(`${mmBase()}/${encodeURIComponent(aid)}/prompt`).then((res) => res.json())
  },

  resetCleanupFilters() {
    marketplaceManagementStore.cleanup.bucket = 'ALL'
    marketplaceManagementStore.cleanup.reason = null
    marketplaceManagementStore.cleanup.tier = null
    marketplaceManagementStore.cleanup.verdict = null
    marketplaceManagementStore.cleanup.mcp = null
    marketplaceManagementStore.cleanup.category = null
    marketplaceManagementStore.cleanup.rule = null
    marketplaceManagementStore.cleanup.order_by = null
    marketplaceManagementStore.cleanup.query = ''
    marketplaceManagementStore.cleanup.page = 1
  },

  setCleanupBucket(bucket) {
    marketplaceManagementStore.cleanup.bucket = bucket as Bucket | '' | 'ALL'
    marketplaceManagementStore.cleanup.page = 1
  },

  setCleanupMcp(v) {
    marketplaceManagementStore.cleanup.mcp = v
    marketplaceManagementStore.cleanup.page = 1
  },

  setCleanupCategory(v) {
    marketplaceManagementStore.cleanup.category = v
    marketplaceManagementStore.cleanup.page = 1
  },
})
