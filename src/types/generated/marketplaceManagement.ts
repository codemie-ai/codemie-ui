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

/* eslint-disable */
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by `npm run generate:types` from
 * src/types/generated/marketplaceManagement.openapi.json, which is itself
 * captured from the backend by `npm run generate:types:refresh`.
 *
 * Editing this file by hand is how the marketplace-management types drifted
 * from the API in the first place. Change the backend response model, refresh
 * the snapshot, and fix the compile errors instead.
 */

export interface paths {
  '/v1/marketplace-management/entities/{kind}/{eid}': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Entity Detail
     * @description Drawer detail view for a single entity — dispatches by kind.
     */
    get: operations['get_entity_detail_v1_marketplace_management_entities__kind___eid__get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/{eid}/assess': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Assess Assistant
     * @description Run an LLM quality assessment on a single entity.
     *
     *     Rate limited (F-37): every call bills a provider, so an impatient click or
     *     a retry loop is a cost incident as well as a load one.
     */
    post: operations['assess_assistant_v1_marketplace_management_entities__kind___eid__assess_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/{eid}/prompt': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Entity Prompt
     * @description The current system prompt, as a separate and separately audited read.
     *
     *     EXECUTION-PLAN 8.1 allows the full prompt "behind a separate, separately
     *     audited call" — this is it. Splitting it out means opening the review
     *     drawer no longer discloses the instructions of every assistant in the
     *     tenant as a side effect; reading them is now a deliberate act recorded as
     *     a real `activity_events` row naming the reader and the entity, not just a
     *     log line (MR !4070 review comment #16).
     *
     *     Superseded revisions (`system_prompt_history`) are *not* returned: no
     *     review decision depends on what the prompt used to say, and the history is
     *     the largest share of what F-18 exposed. Only how many there are.
     */
    get: operations['get_entity_prompt_v1_marketplace_management_entities__kind___eid__prompt_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/audit/history': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Audit History
     * @description List recent persisted audit runs.
     */
    get: operations['get_audit_history_v1_marketplace_management_entities__kind__audit_history_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/audit/run': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Run Audit
     * @description Start an audit pass in the background and return immediately.
     *
     *     A full audit takes minutes (gate checks + similarity + persistence), so
     *     running it inline held the request open and starved the worker; clients
     *     could not tell a slow audit from a dead button. The run now happens on a
     *     worker thread and the caller polls ``GET /audit/status``.
     *
     *     A run of one entity kind is a **deployment-wide** singleton, enforced by the
     *     partial unique index `uq_mm_audit_run_active` rather than by any in-process
     *     flag (design-persistence.md 3.3). A second call — a double-click, a second
     *     admin, or an admin served by a different pod mid-rollout — is refused with
     *     **409** carrying the in-flight run's id, so the caller can poll that run
     *     instead of believing it started one (F-17, F-49).
     *
     *     Rate limited (F-37): a run is one ES round trip and one insert per entity.
     *     `request` is present because slowapi reads the client key off it; it is not
     *     used by the handler itself.
     */
    post: operations['run_audit_v1_marketplace_management_entities__kind__audit_run_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/audit/status': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Audit Status
     * @description Whether an audit is currently running, and how the last one ended.
     *
     *     Server-held state, so it is correct for every admin and survives a page
     *     reload — the UI cannot know this on its own.
     */
    get: operations['get_audit_status_v1_marketplace_management_entities__kind__audit_status_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/bulk-unpublish': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Bulk Unpublish
     * @description Unpublish multiple entities in a single request.
     *
     *     Partial semantics: every entity_id is attempted independently -- one
     *     entity_id raising never aborts the ones after it (MR !4070 review comment
     *     #17), and a de-index failure is reported as a failure rather than folded
     *     into the success count, since `withdraw()` commits the status change and
     *     only reports indexing as a best-effort side effect (CR-023 in
     *     queue_service.decide). The response documents which succeeded (unpublished
     *     count) and which failed (failed list with per-entity reasons). Callers
     *     should inspect the failed list to identify IDs that need a retry or manual
     *     intervention. FastAPI automatically validates entity_ids constraints (422
     *     for empty or >500 items).
     */
    post: operations['bulk_unpublish_v1_marketplace_management_entities__kind__bulk_unpublish_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/cleanup': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Cleanup
     * @description Filtered cleanup queue.
     *
     *     Defaults to bucket=DELETE.  Pass bucket="" (or bucket=ALL) to clear the
     *     bucket filter — that lists every bucket, VERIFIED included. An explicit
     *     bucket=VERIFIED still narrows to just that one. The filter logic mirrors
     *     the PoC /api/marketplace/cleanup.
     *
     *     `order_by` is accepted as a raw string and coerced to `CleanupOrderBy`
     *     safely: an unrecognised value silently falls back to the default ordering
     *     rather than returning a 422, so a FE client using a value the current
     *     server does not know yet degrades gracefully (EPMCDME-15333).
     */
    get: operations['get_cleanup_v1_marketplace_management_entities__kind__cleanup_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/config': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Config
     * @description Return the audit engine configuration for a specific entity kind.
     *
     *     Each kind carries its own gate thresholds, similarity settings, and
     *     weights — assistants and workflows may enforce different rules.
     */
    get: operations['get_config_v1_marketplace_management_entities__kind__config_get']
    /**
     * Update Config
     * @description Apply partial config updates to the kind-scoped audit config.
     *
     *     Changes are persisted to DynamicConfigService (CR-012) so they survive a
     *     pod restart.  The sections written back to storage use the camelCase JSON
     *     keys that `_read_*_overrides()` already knows how to read:
     *
     *     * ``gates``       → ``CUSTOMER_CONFIG__MARKETPLACE_CORE_GATES``
     *     * ``similarity``  → ``CUSTOMER_CONFIG__MARKETPLACE_SIMILARITY``
     *
     *     ``usage_tiers`` (percentile thresholds) has no corresponding reader in
     *     `configs/marketplace_management.py` yet, so it cannot be persisted and the
     *     audit would never see it (the validator Config is rebuilt from storage on
     *     every call). It is refused with 400 rather than acknowledged and ignored.
     *
     *     Each persisted section records a ``THRESHOLD_UPDATED`` activity event, the
     *     same way the declarations router does for these settings.
     *
     *     Returns 503 when the DynamicConfigService write fails so that a silent
     *     200 cannot imply a durable update that was not actually stored.
     */
    put: operations['update_config_v1_marketplace_management_entities__kind__config_put']
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/facets': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Facets
     * @description Distinct MCP, category, and cluster facets for dropdown filters.
     */
    get: operations['get_facets_v1_marketplace_management_entities__kind__facets_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/marketplace-assistants': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * List Marketplace Assistants
     * @description List of marketplace assistants, filterable by review status.
     *
     *     Paginated when `page_size` is given; omit it to get every matching row in one response.
     */
    get: operations['list_marketplace_assistants_v1_marketplace_management_entities__kind__marketplace_assistants_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/overview': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get Overview
     * @description High-level marketplace health KPIs: bucket rollup, gate hits, discovery hints.
     */
    get: operations['get_overview_v1_marketplace_management_entities__kind__overview_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/pending': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * List Pending
     * @description Paginated list of entities awaiting marketplace review.
     */
    get: operations['list_pending_v1_marketplace_management_entities__kind__pending_get']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/pending/{eid}/approve': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Approve Pending
     * @description Approve a pending marketplace submission.
     *
     *     The body is the compare-and-set in `queue_service.decide`; a second admin
     *     acting on the same version gets 409, not a silently discarded decision.
     */
    post: operations['approve_pending_v1_marketplace_management_entities__kind__pending__eid__approve_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/pending/{eid}/force-publish': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Force Publish Pending
     * @description Force-publish an entity to the marketplace, bypassing review gates.
     *
     *     The `override_notice` is now *persisted* on the decision row rather than
     *     validated, echoed and discarded (F-34), and
     *     `ck_mm_review_decision_override_notice` makes losing it again impossible.
     */
    post: operations['force_publish_pending_v1_marketplace_management_entities__kind__pending__eid__force_publish_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/pending/{eid}/reject': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Reject Pending
     * @description Reject a pending submission: unpublish, unverify and de-index it.
     *
     *     Rejection is a takedown, not a relabelling — see `queue_service` (F-04).
     */
    post: operations['reject_pending_v1_marketplace_management_entities__kind__pending__eid__reject_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/marketplace-management/entities/{kind}/pending/{eid}/withdraw': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    get?: never
    put?: never
    /**
     * Withdraw Pending
     * @description Withdraw an entity from the marketplace: unpublish, unverify, de-index.
     */
    post: operations['withdraw_pending_v1_marketplace_management_entities__kind__pending__eid__withdraw_post']
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export interface components {
  schemas: {
    /**
     * ApproveIn
     * @description The decider comes from the access token; `expected_version` pins the content that was reviewed.
     */
    ApproveIn: {
      /**
       * Expected Version
       * @description The `marketplace_version` the reviewer looked at. The decision applies only if the row is still at this version, otherwise 409. Omit to decide against whatever version the row has now.
       */
      expected_version?: number | null
    }
    /** AssessIn */
    AssessIn: {
      /** Llm Model */
      llm_model?: string | null
    }
    /**
     * AssessmentDimension
     * @description Score + rationale for one quality dimension.
     *
     *     OpenAI structured-output requires closed schemas (no extra keys), so we
     *     model each dimension explicitly instead of using a bare Dict[str, Any].
     *
     *     `score` is bounded 0-100 (F-75): the prompt has always declared the range
     *     and nothing enforced it, so a model that answered 900 propagated straight
     *     through to the reviewer and into `mm_llm_assessment`, where the CHECK
     *     constraint `ck_mm_llm_assessment_score` would then reject the row.
     */
    AssessmentDimension: {
      /** Score */
      score: number
      /** Justification */
      justification: string
      /** Suggested Fix */
      suggested_fix: string
    }
    /**
     * AssessmentFields
     * @description Per-dimension scores for the 5 quality dimensions.
     *
     *     Fixed keys instead of a free-form dict so the schema is closed for
     *     OpenAI's structured-output validator.
     */
    AssessmentFields: {
      metadata_polish: components['schemas']['AssessmentDimension']
      description_quality: components['schemas']['AssessmentDimension']
      prompt_substance: components['schemas']['AssessmentDimension']
      category_fit: components['schemas']['AssessmentDimension']
      uniqueness: components['schemas']['AssessmentDimension']
    }
    /**
     * AssessmentResponse
     * @description Structured quality assessment for a single assistant, as returned by the API.
     *
     *     The LLM-authored half is inherited; the four fields below are provenance the
     *     service fills in. `cached` and `assessed_at` make the §4.3 cache visible
     *     rather than silent — a reviewer who sees a stale-looking verdict can tell
     *     that it was produced earlier, and by which model.
     */
    AssessmentResponse: {
      fields: components['schemas']['AssessmentFields']
      /** Suggested Fixes */
      suggested_fixes: string[]
      /** Overall Score */
      overall_score: number
      verdict_recommendation: components['schemas']['Bucket-Output']
      /**
       * Cached
       * @default false
       */
      cached: boolean
      /** @default LLM */
      source: components['schemas']['AssessmentSource']
      /** Assessed At */
      assessed_at?: string | null
      /** Llm Model */
      llm_model?: string | null
    }
    /**
     * AssessmentSource
     * @description Which engine produced an assessment.
     *
     *     `DETERMINISTIC` is not a degraded LLM answer — it is the eight-gate registry
     *     at `validator/gates.py` scored into the same five dimensions. Per
     *     `design-persistence.md` §7 F1 the LLM is *advisory*, so a model outage must
     *     downgrade the answer, never fail the request. The reviewer needs to know
     *     which one they are reading, hence the field on the wire.
     * @enum {string}
     */
    AssessmentSource: 'LLM' | 'DETERMINISTIC'
    /**
     * AuditConfigResponse
     * @description The audit engine configuration for one entity kind.
     */
    AuditConfigResponse: {
      gates: components['schemas']['GatesConfig']
      similarity: components['schemas']['SimilarityConfig']
      usage_tiers: components['schemas']['UsageTiersConfig']
      verification: components['schemas']['VerificationConfig']
    }
    /**
     * AuditHistoryResponse
     * @description Recent audit runs, newest first.
     */
    AuditHistoryResponse: {
      /**
       * Runs
       * @default []
       */
      runs: components['schemas']['AuditRunRow'][]
    }
    /**
     * AuditRunRow
     * @description One persisted `mm_audit_run` row, as the history table renders it.
     */
    AuditRunRow: {
      /** Id */
      id: string
      entity_kind?: components['schemas']['EntityKind'] | null
      /** Started Ts */
      started_ts: number
      /** Finished Ts */
      finished_ts?: number | null
      /** Total Records */
      total_records?: number | null
      /** Engine Took Seconds */
      engine_took_seconds?: number | null
    }
    /**
     * AuditStatusResponse
     * @description Server-held state of the current or most recent audit for one kind.
     *
     *     `POST /audit/run` returns this too: it hands the work to a worker thread
     *     and answers 202 with the status of the run it just started (or, if one was
     *     already in flight, of that one).
     */
    AuditStatusResponse: {
      /** Is Running */
      is_running: boolean
      /** Run Id */
      run_id?: string | null
      /** Started At */
      started_at?: number | null
      /** Finished At */
      finished_at?: number | null
      /** Error */
      error?: string | null
      status?: components['schemas']['RunStatus'] | null
      /** Similarity Backend */
      similarity_backend?: string | null
      /** Es Doc Count */
      es_doc_count?: number | null
      /**
       * Degraded
       * @default false
       */
      degraded: boolean
      /** Degraded Reason */
      degraded_reason?: string | null
    }
    /**
     * Bucket
     * @description Adoption-aware, tier-driven surface bucket. Orthogonal to VerdictKind.
     *
     *     Three buckets — the sub-type of a delete (dead / semantic-clone / big-cluster
     *     surplus / invalid metadata / etc.) is carried in `Verdict.bucket_reason`.
     *
     *     Ordering matches the display order in the Overview KPI row.
     * @enum {string}
     */
    'Bucket-Input': 'VERIFIED' | 'COMMUNITY' | 'DELETE'
    /**
     * Bucket
     * @enum {string}
     */
    'Bucket-Output': 'VERIFIED' | 'COMMUNITY' | 'DELETE'
    /** BulkUnpublishFailure */
    BulkUnpublishFailure: {
      /** Entity Id */
      entity_id: string
      /** Reason */
      reason: string
    }
    /** BulkUnpublishRequest */
    BulkUnpublishRequest: {
      /** Entity Ids */
      entity_ids: string[]
    }
    /** BulkUnpublishResponse */
    BulkUnpublishResponse: {
      /** Unpublished */
      unpublished: number
      /** Failed */
      failed?: components['schemas']['BulkUnpublishFailure'][]
    }
    /**
     * CleanupReason
     * @enum {string}
     */
    CleanupReason: 'duplicate' | 'purpose_duplicate' | 'semantic_clone' | 'invalid' | 'dead'
    /**
     * CleanupResponse
     * @description A page of the Cleanup table. `total` counts the whole filtered set.
     */
    CleanupResponse: {
      /** Total */
      total: number
      /** Page */
      page: number
      /** Page Size */
      page_size: number
      /**
       * Items
       * @default []
       */
      items: components['schemas']['CleanupRow'][]
    }
    /**
     * CleanupRow
     * @description One row of the Cleanup table.
     *
     *     Every field the table renders is flat on the row. `verdict_kind`,
     *     `cleanup_reason` and the `canonical_*` refs used to exist only inside the
     *     nested `verdict` object while the frontend read them flat, so the Decision
     *     column rendered an em-dash on every row (F-15); `unique_likes_count` rode
     *     along on the record but was never put on the row, so Likes was
     *     permanently empty (F-58).
     */
    CleanupRow: {
      /** Id */
      id: string
      /** Name */
      name?: string | null
      /** Creator */
      creator?: string | null
      /**
       * Categories
       * @default []
       */
      categories: string[]
      /** Unique Users Count */
      unique_users_count?: number | null
      /** Unique Likes Count */
      unique_likes_count?: number | null
      usage_tier?: components['schemas']['UsageTier'] | null
      bucket?: components['schemas']['Bucket-Output'] | null
      /** Bucket Reason */
      bucket_reason?: string | null
      verdict_kind?: components['schemas']['VerdictKind'] | null
      cleanup_reason?: components['schemas']['CleanupReason'] | null
      /** Canonical Id */
      canonical_id?: string | null
      /** Canonical Name */
      canonical_name?: string | null
      /** Canonical Users */
      canonical_users?: number | null
      /** Cluster Size */
      cluster_size?: number | null
      verdict?: components['schemas']['VerdictPayload'] | null
      /**
       * Critical Count
       * @default 0
       */
      critical_count: number
      /**
       * Optional Count
       * @default 0
       */
      optional_count: number
      /** Detail */
      detail?: string | null
      top_similar?: components['schemas']['SimilarPair'] | null
    }
    /**
     * ClusterFacet
     * @description A duplicate cluster, as offered by the Cleanup filter bar.
     */
    ClusterFacet: {
      /** Cluster Id */
      cluster_id: number
      /** Size */
      size: number
      /** Canonical Name */
      canonical_name?: string | null
    }
    /**
     * ReviewGateFinding
     * @description One deterministic gate finding, without its `detail` payload.
     *
     *     `Finding.detail` carries the matched location and the pattern that fired;
     *     the rule, the severity and the (already redacted) message are what a
     *     reviewer acts on.
     */
    codemie__rest_api__routers__marketplace_management__ReviewGateFinding: {
      /** Rule */
      rule: string
      /** Severity */
      severity: string
      /** Message */
      message: string
    }
    /**
     * ReviewGateFinding
     * @description One deterministic gate finding returned on the pending queue row.
     *
     *     Mirrors the same-named class in `rest_api/routers/marketplace_management.py`
     *     (rule, severity, message) so that `PendingRow.gate_findings` is typed
     *     rather than left as `List[Dict[str, Any]]`, which gave no schema to callers.
     *     `detail` is intentionally absent: the raw gate detail carries matched
     *     locations and patterns that are not needed for queue review.
     */
    codemie__service__marketplace_management__models__ReviewGateFinding: {
      /** Rule */
      rule: string
      /** Severity */
      severity: string
      /** Message */
      message: string
    }
    /**
     * ConfigUpdate
     * @description Partial config update for one entity kind's audit engine configuration.
     *
     *     Each field corresponds to a top-level section of `AuditConfigResponse`.
     *     Typed models replace bare `dict` so that unknown keys are rejected (422)
     *     and integer thresholds cannot be zeroed out via the API (CR-002).
     */
    ConfigUpdate: {
      gates?: components['schemas']['GatesConfig'] | null
      similarity?: components['schemas']['SimilarityConfig'] | null
      usage_tiers?: components['schemas']['UsageTiersConfig'] | null
    }
    /**
     * ConfigUpdateResponse
     * @description Result of `PUT /config`: the config as it now stands, after the merge.
     */
    ConfigUpdateResponse: {
      /** Ok */
      ok: boolean
      entity_kind: components['schemas']['EntityKind']
      config: components['schemas']['AuditConfigResponse']
    }
    /** ConsolidationConfig */
    ConsolidationConfig: {
      /** Big Cluster Min */
      big_cluster_min: number
      /** Keep Top N Per Cluster */
      keep_top_n_per_cluster: number
    }
    /** CoreGatesConfig */
    CoreGatesConfig: {
      /** Description Min */
      description_min: number
      /** System Prompt Min */
      system_prompt_min: number
      /** Substance Prompt Alt Min */
      substance_prompt_alt_min: number
    }
    /**
     * EntityKind
     * @enum {string}
     */
    EntityKind: 'ASSISTANT' | 'WORKFLOW'
    /**
     * EntityPromptResponse
     * @description The current system prompt, on its own separately audited endpoint.
     */
    EntityPromptResponse: {
      /** Id */
      id?: string | null
      /** Name */
      name: string
      /** System Prompt */
      system_prompt: string
      /**
       * System Prompt Revisions
       * @default 0
       */
      system_prompt_revisions: number
    }
    /**
     * EntityReviewDetail
     * @description What a moderator is shown about one entity — and nothing more.
     *
     *     EXECUTION-PLAN 8.1 (F-18, F-19, S11, S12, R6). This route used to answer
     *     with `assistant.model_dump(mode="json")`: all 54 columns, to an audience of
     *     every admin **or maintainer**, for every assistant in the tenant. Three of
     *     those columns are the problem:
     *
     *     * `toolkits` and `mcp_servers` embed `SettingsBase.credential_values` and
     *       raw MCP arguments — the very structures the publish gate scans *for
     *       inline credentials* (`gates.gate_no_inline_credentials`);
     *     * `system_prompt_history` is every superseded revision of the instructions;
     *     * `prompt_variables` carried unmasked sensitive defaults, which the
     *       canonical `/v1/assistants/id/{id}` route masks.
     *
     *     So this is an allow-list, not a redaction pass: a column added to
     *     `Assistant` tomorrow is absent here until somebody decides it belongs.
     *     Capability is reported as *names and counts*, which is what "does this
     *     assistant do anything, and with what" actually needs.
     *
     *     The current system prompt is not here either. A reviewer does need to read
     *     it, so it has its own endpoint (`GET /entities/{kind}/{eid}/prompt`) that
     *     logs who read which prompt — a separately auditable call, per 8.1.
     */
    EntityReviewDetail: {
      /** Id */
      id?: string | null
      /** Name */
      name: string
      /** Description */
      description: string
      /**
       * Categories
       * @default []
       */
      categories: string[]
      /** Icon Url */
      icon_url?: string | null
      /**
       * Conversation Starters
       * @default []
       */
      conversation_starters: string[]
      /** Submitted By */
      submitted_by?: string | null
      /** Creator */
      creator?: string | null
      /** Project */
      project?: string | null
      /** Created Date */
      created_date?: string | null
      /** Updated Date */
      updated_date?: string | null
      /** Marketplace Submitted At */
      marketplace_submitted_at?: string | null
      /** Marketplace Status */
      marketplace_status?: string | null
      /**
       * Marketplace Version
       * @default 0
       */
      marketplace_version: number
      /** Is Global */
      is_global?: boolean | null
      /**
       * Is Verified
       * @default false
       */
      is_verified: boolean
      /** Marketplace Decided At */
      marketplace_decided_at?: string | null
      /** Marketplace Decided By */
      marketplace_decided_by?: string | null
      /** Marketplace Decision Reason */
      marketplace_decision_reason?: string | null
      /** Unique Users Count */
      unique_users_count?: number | null
      /** Unique Likes Count */
      unique_likes_count?: number | null
      /** Unique Dislikes Count */
      unique_dislikes_count?: number | null
      /** Clone Count */
      clone_count?: number | null
      /**
       * Toolkit Names
       * @default []
       */
      toolkit_names: string[]
      /**
       * Mcp Server Names
       * @default []
       */
      mcp_server_names: string[]
      /**
       * Skill Count
       * @default 0
       */
      skill_count: number
      /**
       * Nested Assistant Count
       * @default 0
       */
      nested_assistant_count: number
      /**
       * Datasource Count
       * @default 0
       */
      datasource_count: number
      /**
       * Prompt Variables
       * @default []
       */
      prompt_variables: components['schemas']['ReviewPromptVariable'][]
      /**
       * System Prompt Length
       * @default 0
       */
      system_prompt_length: number
      /**
       * System Prompt Revisions
       * @default 0
       */
      system_prompt_revisions: number
      /**
       * Gate Findings
       * @default []
       */
      gate_findings: components['schemas']['codemie__rest_api__routers__marketplace_management__ReviewGateFinding'][]
      /**
       * Critical Count
       * @default 0
       */
      critical_count: number
      /**
       * Optional Count
       * @default 0
       */
      optional_count: number
      top_similar?: components['schemas']['SimilarPair'] | null
      /** Override Notice */
      override_notice?: string | null
      /** Overridden By */
      overridden_by?: string | null
      /** Bypassed Gate Findings */
      bypassed_gate_findings?:
        | components['schemas']['codemie__rest_api__routers__marketplace_management__ReviewGateFinding'][]
        | null
      /**
       * Bypassed Gate Findings Unavailable
       * @default false
       */
      bypassed_gate_findings_unavailable: boolean
      /** Verdict Kind */
      verdict_kind?: string | null
      /** Cleanup Reason */
      cleanup_reason?: string | null
      /** Bucket */
      bucket?: string | null
      /** Decision Detail */
      decision_detail?: string | null
      /** Bucket Reason */
      bucket_reason?: string | null
      /** Usage Tier */
      usage_tier?: string | null
      /** Polish Check Results */
      polish_check_results?: components['schemas']['PolishCheckResult'][] | null
      /**
       * Similarity Failed
       * @default false
       */
      similarity_failed: boolean
    }
    /**
     * FacetCount
     * @description One selectable filter value and how many entities carry it.
     */
    FacetCount: {
      /** Value */
      value: string
      /** Count */
      count: number
    }
    /**
     * FacetCountWithUsers
     * @description A facet count that also carries the adoption behind it (Overview only).
     */
    FacetCountWithUsers: {
      /** Value */
      value: string
      /** Count */
      count: number
      /** Total Users */
      total_users: number
    }
    /**
     * FacetsResponse
     * @description Every vocabulary the Cleanup filter bar offers.
     *
     *     All seven keys are required: a facet served as `undefined` is a dropdown
     *     the UI has to hardcode, which is how the reason filter came to offer nine
     *     codes of which one was reachable (F-33, F-68).
     */
    FacetsResponse: {
      /** Mcps */
      mcps: components['schemas']['FacetCount'][]
      /** Categories */
      categories: components['schemas']['FacetCount'][]
      /** Clusters */
      clusters: components['schemas']['ClusterFacet'][]
      /** Reasons */
      reasons: components['schemas']['FacetCount'][]
      /** Tiers */
      tiers: components['schemas']['FacetCount'][]
      /** Buckets */
      buckets: components['schemas']['FacetCount'][]
      /** Rules */
      rules: components['schemas']['RuleFacet'][]
    }
    /** ForcePublishIn */
    ForcePublishIn: {
      /** Override Notice */
      override_notice: string
      /**
       * Expected Version
       * @description The `marketplace_version` the reviewer looked at. The decision applies only if the row is still at this version, otherwise 409. Omit to decide against whatever version the row has now.
       */
      expected_version?: number | null
    }
    /**
     * ForcePublishResponse
     * @description Force-publish additionally echoes the override notice and what it bypassed.
     */
    ForcePublishResponse: {
      /** Ok */
      ok: boolean
      entity_kind: components['schemas']['EntityKind']
      /** Entity Id */
      entity_id: string
      status: components['schemas']['MarketplaceStatus']
      indexing?: components['schemas']['IndexingOutcomeModel'] | null
      /** Override Notice */
      override_notice: string
      /**
       * Bypassed Gate Findings
       * @default []
       */
      bypassed_gate_findings: components['schemas']['codemie__service__marketplace_management__models__ReviewGateFinding'][]
      /**
       * Bypassed Gate Findings Unavailable
       * @default false
       */
      bypassed_gate_findings_unavailable: boolean
    }
    /**
     * GateHits
     * @description Rollup of the deterministic quality checks across the whole catalogue.
     */
    GateHits: {
      /** Critical */
      critical: number
      /** Optional */
      optional: number
      /**
       * Per Rule
       * @default []
       */
      per_rule: components['schemas']['RuleHit'][]
    }
    /**
     * GateResultFilter
     * @description Post-filter for the pending queue by live gate finding severity.
     *
     *     Applied after live gate recompute in the router (`_apply_gate_result_filter`).
     *     Does not affect `PendingResponse.total`, which always reflects the SQL count.
     * @enum {string}
     */
    GateResultFilter: 'all_clear' | 'has_critical' | 'has_optional_only'
    /**
     * GateRule
     * @description Every deterministic quality check `gates.py` can emit a Finding for.
     *
     *     This is the vocabulary `GET /entities/{kind}/facets` publishes under
     *     `rules` and `GET /entities/{kind}/cleanup?rule=` accepts. It was an
     *     unconstrained `str` on both sides, so a stale bookmark or a typo returned
     *     `200 {"total": 0}` — indistinguishable from "nothing failed that check"
     *     (F-48).
     *
     *     Kept in lockstep with `gates.py` by
     *     `test_marketplace_management_contract.py::test_gate_rule_enum_matches_the_gates`.
     * @enum {string}
     */
    GateRule:
      | 'name_length'
      | 'name_not_banned'
      | 'description_length'
      | 'description_not_equal_name'
      | 'system_prompt_length'
      | 'at_least_one_category'
      | 'substance'
      | 'no_inline_credentials'
      | 'credential_scan_timeout'
    /** GatesConfig */
    GatesConfig: {
      /** Name Min */
      name_min: number
      /** Name Max */
      name_max: number
      /** Description Min */
      description_min: number
      /** System Prompt Min */
      system_prompt_min: number
      /** Substance Prompt Alt Min */
      substance_prompt_alt_min: number
      /**
       * Banned Generic Names
       * @default []
       */
      banned_generic_names: string[]
      /**
       * Credential Patterns
       * @default []
       */
      credential_patterns: string[]
    }
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components['schemas']['ValidationError'][]
    }
    /**
     * IndexingOutcomeModel
     * @description What happened to this entity's marketplace search-index projection.
     *
     *     Present on every decision that has one (approve / reject / force-publish /
     *     withdraw). It exists because its absence was the delivery mechanism for
     *     F-87: the index write was wrapped in a bare `except`, so a decision whose
     *     projection never landed answered 200 exactly like one that worked, and 200
     *     published assistants went missing from marketplace search with no response,
     *     metric or status anywhere reporting it.
     *
     *     `state == "FAILED"` does **not** mean the decision failed. The decision is
     *     committed and authoritative; the index is a projection of it and is
     *     self-healing on the next replay, reindex or backfill.
     */
    IndexingOutcomeModel: {
      /**
       * Action
       * @description "index" or "remove"
       */
      action: string
      /**
       * State
       * @description "OK" or "FAILED"
       */
      state: string
      /**
       * Attempts
       * @description How many times the write was tried
       */
      attempts: number
      /** Error */
      error?: string | null
    }
    /** MarketplaceAssistantsResponse */
    MarketplaceAssistantsResponse: {
      /** Total */
      total: number
      /** Page */
      page: number
      /** Page Size */
      page_size: number
      /** Items */
      items: components['schemas']['MarketplaceAssistantsRow'][]
    }
    /**
     * MarketplaceAssistantsRow
     * @description PendingRow extended with status-badge fields for the multi-status tab.
     */
    MarketplaceAssistantsRow: {
      /** Assistant Id */
      assistant_id: string
      /** Name */
      name?: string | null
      /** Project */
      project?: string | null
      /** Marketplace Status */
      marketplace_status?: string | null
      /** Submitted At */
      submitted_at?: number | null
      /** Submitted By */
      submitted_by?: string | null
      /**
       * Gate Findings
       * @default []
       */
      gate_findings: components['schemas']['codemie__service__marketplace_management__models__ReviewGateFinding'][]
      /**
       * Categories
       * @default []
       */
      categories: string[]
      /**
       * Gate Recompute Failed
       * @default false
       */
      gate_recompute_failed: boolean
      /**
       * Is Verified
       * @default false
       */
      is_verified: boolean
      /** Marketplace Decision Reason */
      marketplace_decision_reason?: string | null
    }
    /**
     * MarketplaceStatus
     * @enum {string}
     */
    MarketplaceStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
    /**
     * MarketplaceStatusFilter
     * @enum {string}
     */
    MarketplaceStatusFilter: 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'
    /**
     * OverviewResponse
     * @description High-level marketplace health KPIs.
     *
     *     `cleanup_reasons`, `verdicts`, `usage_tiers` and `pending` are declared
     *     required on purpose: all four were absent from the payload while the UI
     *     contract already promised them (F-06, F-59), and an optional field would let
     *     that regress silently a second time.
     */
    OverviewResponse: {
      /** Total */
      total: number
      /** Marketplace Assistants Total */
      marketplace_assistants_total: number
      /** Audited Total */
      audited_total: number
      /** Took Seconds */
      took_seconds: number
      /**
       * Buckets
       * @default {}
       */
      buckets: {
        [key: string]: number
      }
      /**
       * Bucket Usage
       * @default {}
       */
      bucket_usage: {
        [key: string]: number
      }
      /** Latest Audit Run Id */
      latest_audit_run_id?: string | null
      /** Last Run At */
      last_run_at?: string | null
      /** Has Ever Run */
      has_ever_run: boolean
      gate_hits: components['schemas']['GateHits']
      /** Cleanup Reasons */
      cleanup_reasons: {
        [key: string]: number
      }
      /** Verdicts */
      verdicts: {
        [key: string]: number
      }
      /** Usage Tiers */
      usage_tiers: {
        [key: string]: number
      }
      pending: components['schemas']['PendingKpi']
      /**
       * Top Clusters
       * @default []
       */
      top_clusters: components['schemas']['TopCluster'][]
      /**
       * Top Mcps
       * @default []
       */
      top_mcps: components['schemas']['FacetCountWithUsers'][]
      /**
       * Top Categories
       * @default []
       */
      top_categories: components['schemas']['FacetCountWithUsers'][]
    }
    /**
     * PendingKpi
     * @description The review queue as a dashboard tile (EXECUTION-PLAN 7.3, F-59).
     *
     *     `count` is the same number `GET /pending` reports as `total` -- both read
     *     `marketplace_status = 'PENDING_REVIEW'`, so the KPI and the page it links to
     *     cannot drift.
     *
     *     `waiting_over_7d` and `avg_wait_days` are measured from
     *     `marketplace_submitted_at` and are taken only over the rows that carry one.
     *     Rows published before the approval gate existed have no submission time, so
     *     they contribute to `count` and to nothing else -- reporting their age as
     *     zero would make a stale queue look fresh.
     */
    PendingKpi: {
      /** Count */
      count: number
      /** Waiting Over 7D */
      waiting_over_7d: number
      /** Avg Wait Days */
      avg_wait_days: number
    }
    /**
     * PendingOrderBy
     * @description Sort order for the pending queue SQL ORDER BY clause.
     *
     *     `submitted_asc` is the default (oldest-first, specs D-53, P2-18).
     * @enum {string}
     */
    PendingOrderBy: 'submitted_asc' | 'submitted_desc' | 'name_asc'
    /**
     * PendingResponse
     * @description A page of the moderation queue.
     */
    PendingResponse: {
      /** Total */
      total: number
      /** Page */
      page: number
      /** Page Size */
      page_size: number
      /**
       * Items
       * @default []
       */
      items: components['schemas']['PendingRow'][]
    }
    /**
     * PendingRow
     * @description Summary of an assistant awaiting marketplace review.
     */
    PendingRow: {
      /** Assistant Id */
      assistant_id: string
      /** Name */
      name?: string | null
      /** Project */
      project?: string | null
      /** Marketplace Status */
      marketplace_status?: string | null
      /** Submitted At */
      submitted_at?: number | null
      /** Submitted By */
      submitted_by?: string | null
      /**
       * Gate Findings
       * @default []
       */
      gate_findings: components['schemas']['codemie__service__marketplace_management__models__ReviewGateFinding'][]
      /**
       * Categories
       * @default []
       */
      categories: string[]
      /**
       * Gate Recompute Failed
       * @default false
       */
      gate_recompute_failed: boolean
    }
    /**
     * PolishCheckResult
     * @description Result of a single Polish quality gate check for one assistant (EPMCDME-15352).
     */
    PolishCheckResult: {
      /** Check */
      check: string
      /** Passed */
      passed: boolean
      /** Threshold */
      threshold?: number | boolean | null
    }
    /** PolishGatesConfig */
    PolishGatesConfig: {
      /** Description Min */
      description_min: number
      /** Categories Min */
      categories_min: number
      /** Require Icon */
      require_icon: boolean
      /** Conversation Starters Min */
      conversation_starters_min: number
    }
    /** RejectIn */
    RejectIn: {
      /** Reason */
      reason: string
      /**
       * Expected Version
       * @description The `marketplace_version` the reviewer looked at. The decision applies only if the row is still at this version, otherwise 409. Omit to decide against whatever version the row has now.
       */
      expected_version?: number | null
    }
    /**
     * ReviewActionResponse
     * @description Outcome of approve / reject / withdraw on one entity.
     */
    ReviewActionResponse: {
      /** Ok */
      ok: boolean
      entity_kind: components['schemas']['EntityKind']
      /** Entity Id */
      entity_id: string
      status: components['schemas']['MarketplaceStatus']
      indexing?: components['schemas']['IndexingOutcomeModel'] | null
    }
    /**
     * ReviewPromptVariable
     * @description One prompt variable as a reviewer may see it.
     *
     *     Same three fields the canonical assistant detail returns, and the same
     *     masking rule: the default of an `is_sensitive` variable is replaced with
     *     `SENSITIVE_VALUE_MASK` (F-19). Nothing else about the variable is secret,
     *     and a reviewer needs the key and the description to judge the assistant.
     */
    ReviewPromptVariable: {
      /** Key */
      key: string
      /** Description */
      description?: string | null
      /**
       * Default Value
       * @default
       */
      default_value: string
      /**
       * Is Sensitive
       * @default false
       */
      is_sensitive: boolean
    }
    /**
     * RuleFacet
     * @description A quality check as the Cleanup *filter bar* offers it.
     *
     *     Deliberately separate from `RuleHit`: `/facets` keys the rule id as
     *     `value` (uniform with every other facet, so one dropdown component renders
     *     all seven) while `/overview`'s `gate_hits.per_rule` keys it as `rule`. The
     *     two shapes are not interchangeable and modelling them as one silently
     *     dropped the id from whichever endpoint lost the coin toss.
     */
    RuleFacet: {
      value: components['schemas']['GateRule']
      /** Count */
      count: number
      severity: components['schemas']['Severity']
    }
    /**
     * RuleHit
     * @description One quality check, how many entities failed it, and how much it matters.
     *
     *     `rule` is the `GateRule` enum rather than a bare string so the values the
     *     facet offers and the values `GET /cleanup?rule=` accepts are the same
     *     closed set by construction — the drift between those two that produced
     *     unreachable filter options (F-68) cannot recur.
     */
    RuleHit: {
      rule: components['schemas']['GateRule']
      /** Count */
      count: number
      severity: components['schemas']['Severity']
    }
    /**
     * RunStatus
     * @description Lifecycle of one audit run — `ck_mm_audit_run_status` in `n1a2u3d4i5t6`.
     *
     *     `PENDING`/`RUNNING` are the two non-terminal values, and the partial unique
     *     index `uq_mm_audit_run_active` makes "at most one active run per entity
     *     kind" a database invariant over exactly this pair.
     * @enum {string}
     */
    RunStatus: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'CANCELLED'
    /**
     * Severity
     * @description Finding severity per EPMCDME-14231.
     * @enum {string}
     */
    Severity: 'CRITICAL' | 'OPTIONAL'
    /** SimilarityConfig */
    SimilarityConfig: {
      /**
       * Weights
       * @default {}
       */
      weights: {
        [key: string]: number
      }
      thresholds: components['schemas']['SimilarityThresholds']
      /** Report Threshold */
      report_threshold: number
      /** Text Backend */
      text_backend: string
      /** Minilm Model */
      minilm_model: string
      /** System Prompt Ceiling */
      system_prompt_ceiling: number
      /** Shortlist Size */
      shortlist_size: number
      tfidf: components['schemas']['TfidfConfig']
    }
    /** SimilarityThresholds */
    SimilarityThresholds: {
      /** Critical */
      critical: number
      /** Optional */
      optional: number
    }
    /**
     * SimilarPair
     * @description The closest other entity found for a row. Mirrors `SimilarityPair.to_dict()`.
     */
    SimilarPair: {
      /** A Id */
      a_id: string
      /** B Id */
      b_id: string
      /** B Name */
      b_name?: string | null
      /** B Slug */
      b_slug?: string | null
      /** B Project */
      b_project?: string | null
      /**
       * Signals
       * @default {}
       */
      signals: {
        [key: string]: number
      }
      /** Combined */
      combined: number
      severity?: components['schemas']['Severity'] | null
      /** Reason */
      reason?: string | null
      /** B Verdict Kind */
      b_verdict_kind?: string | null
    }
    /** TfidfConfig */
    TfidfConfig: {
      /** Max Features */
      max_features: number
      /**
       * Ngram Range
       * @default []
       */
      ngram_range: number[]
      /** Min Df */
      min_df: number
    }
    /**
     * TopCluster
     * @description A large duplicate cluster with the member the audit would keep.
     */
    TopCluster: {
      /** Cluster Id */
      cluster_id: number
      /** Size */
      size: number
      /** Label */
      label: string
      /** Canonical Id */
      canonical_id?: string | null
      /** Canonical Name */
      canonical_name?: string | null
      /** Canonical Users */
      canonical_users?: number | null
      /** Total Users */
      total_users: number
    }
    /**
     * UsageTier
     * @enum {string}
     */
    UsageTier: 'HOT' | 'WARM' | 'COLD' | 'DEAD'
    /** UsageTiersConfig */
    UsageTiersConfig: {
      /** Hot Percentile */
      hot_percentile: number
      /** Warm Percentile */
      warm_percentile: number
      /** Cold Percentile */
      cold_percentile: number
    }
    /** ValidationError */
    ValidationError: {
      /** Location */
      loc: (string | number)[]
      /** Message */
      msg: string
      /** Error Type */
      type: string
      /** Input */
      input?: unknown
      /** Context */
      ctx?: Record<string, never>
    }
    /**
     * VerdictKind
     * @description Per-assistant triage verdict, aggregated by the engine.
     * @enum {string}
     */
    VerdictKind: 'KEEP' | 'REVIEW' | 'CANDIDATE_FOR_CLEANUP'
    /**
     * VerdictPayload
     * @description The nested verdict object, kept for one release alongside the flat fields.
     *
     *     Mirrors `validator.models.Verdict.to_dict()`. Deprecated — the Cleanup
     *     table reads the flat `verdict_kind` / `cleanup_reason` / `canonical_*`
     *     fields on the row itself (F-15).
     */
    VerdictPayload: {
      kind: components['schemas']['VerdictKind']
      reason?: components['schemas']['CleanupReason'] | null
      /**
       * Detail
       * @default
       */
      detail: string
      /** Canonical Id */
      canonical_id?: string | null
      /** Canonical Name */
      canonical_name?: string | null
      /** Canonical Users */
      canonical_users?: number | null
      /** Cluster Size */
      cluster_size?: number | null
      /** Match Score */
      match_score?: number | null
      bucket?: components['schemas']['Bucket-Output'] | null
      /** Bucket Reason */
      bucket_reason?: string | null
    }
    /** VerificationConfig */
    VerificationConfig: {
      /** Hot Min Users */
      hot_min_users: number
      /** Warm Min Users */
      warm_min_users: number
      /** Cold Min Users */
      cold_min_users: number
      /** Grace Days */
      grace_days: number
      /** Archive Dead After Days */
      archive_dead_after_days: number
      core_gates: components['schemas']['CoreGatesConfig']
      polish_gates: components['schemas']['PolishGatesConfig']
      consolidation: components['schemas']['ConsolidationConfig']
    }
    /**
     * WithdrawIn
     * @description Withdraw carries no fields; the decider comes from the access token.
     */
    WithdrawIn: Record<string, never>
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  get_entity_detail_v1_marketplace_management_entities__kind___eid__get: {
    parameters: {
      query?: never
      header?: never
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EntityReviewDetail']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  assess_assistant_v1_marketplace_management_entities__kind___eid__assess_post: {
    parameters: {
      query?: never
      header?: never
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody?: {
      content: {
        'application/json': components['schemas']['AssessIn']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AssessmentResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_entity_prompt_v1_marketplace_management_entities__kind___eid__prompt_get: {
    parameters: {
      query?: never
      header?: never
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['EntityPromptResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_audit_history_v1_marketplace_management_entities__kind__audit_history_get: {
    parameters: {
      query?: {
        limit?: number
      }
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditHistoryResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  run_audit_v1_marketplace_management_entities__kind__audit_run_post: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      202: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditStatusResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_audit_status_v1_marketplace_management_entities__kind__audit_status_get: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditStatusResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  bulk_unpublish_v1_marketplace_management_entities__kind__bulk_unpublish_post: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['BulkUnpublishRequest']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['BulkUnpublishResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_cleanup_v1_marketplace_management_entities__kind__cleanup_get: {
    parameters: {
      query?: {
        /** @description Surface bucket to list. Send ALL to clear the filter and list every bucket, VERIFIED included. */
        bucket?: components['schemas']['Bucket-Input'] | null
        reason?: components['schemas']['CleanupReason'] | null
        tier?: components['schemas']['UsageTier'] | null
        verdict?: components['schemas']['VerdictKind'] | null
        mcp?: string | null
        category?: string | null
        cluster_id?: number | null
        q?: string | null
        /** @description Quality-check id from GET /overview's gate_hits.per_rule — returns only entities that failed that check. */
        rule?: components['schemas']['GateRule'] | null
        order_by?: string | null
        page?: number
        page_size?: number
      }
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['CleanupResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_config_v1_marketplace_management_entities__kind__config_get: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['AuditConfigResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  update_config_v1_marketplace_management_entities__kind__config_put: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['ConfigUpdate']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ConfigUpdateResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_facets_v1_marketplace_management_entities__kind__facets_get: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['FacetsResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  list_marketplace_assistants_v1_marketplace_management_entities__kind__marketplace_assistants_get: {
    parameters: {
      query?: {
        status?: components['schemas']['MarketplaceStatusFilter'] | null
        page?: number
        page_size?: number | null
      }
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['MarketplaceAssistantsResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  get_overview_v1_marketplace_management_entities__kind__overview_get: {
    parameters: {
      query?: never
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['OverviewResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  list_pending_v1_marketplace_management_entities__kind__pending_get: {
    parameters: {
      query?: {
        page?: number
        page_size?: number
        category?: string | null
        gate_result?: components['schemas']['GateResultFilter'] | null
        order_by?: components['schemas']['PendingOrderBy'] | null
      }
      header?: never
      path: {
        kind: string
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['PendingResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  approve_pending_v1_marketplace_management_entities__kind__pending__eid__approve_post: {
    parameters: {
      query?: never
      header?: {
        /** @description Replay token. Sending the same key twice returns the first call's stored response with `Idempotency-Replayed: true` instead of deciding again. */
        'Idempotency-Key'?: string | null
      }
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['ApproveIn']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ReviewActionResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  force_publish_pending_v1_marketplace_management_entities__kind__pending__eid__force_publish_post: {
    parameters: {
      query?: never
      header?: {
        /** @description Replay token. Sending the same key twice returns the first call's stored response with `Idempotency-Replayed: true` instead of deciding again. */
        'Idempotency-Key'?: string | null
      }
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['ForcePublishIn']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ForcePublishResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  reject_pending_v1_marketplace_management_entities__kind__pending__eid__reject_post: {
    parameters: {
      query?: never
      header?: {
        /** @description Replay token. Sending the same key twice returns the first call's stored response with `Idempotency-Replayed: true` instead of deciding again. */
        'Idempotency-Key'?: string | null
      }
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['RejectIn']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ReviewActionResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
  withdraw_pending_v1_marketplace_management_entities__kind__pending__eid__withdraw_post: {
    parameters: {
      query?: never
      header?: {
        /** @description Replay token. Sending the same key twice returns the first call's stored response with `Idempotency-Replayed: true` instead of deciding again. */
        'Idempotency-Key'?: string | null
      }
      path: {
        eid: string
        kind: string
      }
      cookie?: never
    }
    requestBody?: {
      content: {
        'application/json': components['schemas']['WithdrawIn']
      }
    }
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['ReviewActionResponse']
        }
      }
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['HTTPValidationError']
        }
      }
    }
  }
}

// --- Convenience aliases -------------------------------------------------

export type ApproveIn = components['schemas']['ApproveIn']
export type AssessIn = components['schemas']['AssessIn']
export type AssessmentDimension = components['schemas']['AssessmentDimension']
export type AssessmentFields = components['schemas']['AssessmentFields']
export type AssessmentResponse = components['schemas']['AssessmentResponse']
export type AssessmentSource = components['schemas']['AssessmentSource']
export type AuditConfigResponse = components['schemas']['AuditConfigResponse']
export type AuditHistoryResponse = components['schemas']['AuditHistoryResponse']
export type AuditRunRow = components['schemas']['AuditRunRow']
export type AuditStatusResponse = components['schemas']['AuditStatusResponse']
export type BucketInput = components['schemas']['Bucket-Input']
export type BucketOutput = components['schemas']['Bucket-Output']
export type BulkUnpublishFailure = components['schemas']['BulkUnpublishFailure']
export type BulkUnpublishRequest = components['schemas']['BulkUnpublishRequest']
export type BulkUnpublishResponse = components['schemas']['BulkUnpublishResponse']
export type CleanupReason = components['schemas']['CleanupReason']
export type CleanupResponse = components['schemas']['CleanupResponse']
export type CleanupRow = components['schemas']['CleanupRow']
export type ClusterFacet = components['schemas']['ClusterFacet']
export type codemie__rest_api__routers__marketplace_management__ReviewGateFinding =
  components['schemas']['codemie__rest_api__routers__marketplace_management__ReviewGateFinding']
export type codemie__service__marketplace_management__models__ReviewGateFinding =
  components['schemas']['codemie__service__marketplace_management__models__ReviewGateFinding']
export type ConfigUpdate = components['schemas']['ConfigUpdate']
export type ConfigUpdateResponse = components['schemas']['ConfigUpdateResponse']
export type ConsolidationConfig = components['schemas']['ConsolidationConfig']
export type CoreGatesConfig = components['schemas']['CoreGatesConfig']
export type EntityKind = components['schemas']['EntityKind']
export type EntityPromptResponse = components['schemas']['EntityPromptResponse']
export type EntityReviewDetail = components['schemas']['EntityReviewDetail']
export type FacetCount = components['schemas']['FacetCount']
export type FacetCountWithUsers = components['schemas']['FacetCountWithUsers']
export type FacetsResponse = components['schemas']['FacetsResponse']
export type ForcePublishIn = components['schemas']['ForcePublishIn']
export type ForcePublishResponse = components['schemas']['ForcePublishResponse']
export type GateHits = components['schemas']['GateHits']
export type GateResultFilter = components['schemas']['GateResultFilter']
export type GateRule = components['schemas']['GateRule']
export type GatesConfig = components['schemas']['GatesConfig']
export type HTTPValidationError = components['schemas']['HTTPValidationError']
export type IndexingOutcomeModel = components['schemas']['IndexingOutcomeModel']
export type MarketplaceAssistantsResponse = components['schemas']['MarketplaceAssistantsResponse']
export type MarketplaceAssistantsRow = components['schemas']['MarketplaceAssistantsRow']
export type MarketplaceStatus = components['schemas']['MarketplaceStatus']
export type MarketplaceStatusFilter = components['schemas']['MarketplaceStatusFilter']
export type OverviewResponse = components['schemas']['OverviewResponse']
export type PendingKpi = components['schemas']['PendingKpi']
export type PendingOrderBy = components['schemas']['PendingOrderBy']
export type PendingResponse = components['schemas']['PendingResponse']
export type PendingRow = components['schemas']['PendingRow']
export type PolishCheckResult = components['schemas']['PolishCheckResult']
export type PolishGatesConfig = components['schemas']['PolishGatesConfig']
export type RejectIn = components['schemas']['RejectIn']
export type ReviewActionResponse = components['schemas']['ReviewActionResponse']
export type ReviewPromptVariable = components['schemas']['ReviewPromptVariable']
export type RuleFacet = components['schemas']['RuleFacet']
export type RuleHit = components['schemas']['RuleHit']
export type RunStatus = components['schemas']['RunStatus']
export type Severity = components['schemas']['Severity']
export type SimilarityConfig = components['schemas']['SimilarityConfig']
export type SimilarityThresholds = components['schemas']['SimilarityThresholds']
export type SimilarPair = components['schemas']['SimilarPair']
export type TfidfConfig = components['schemas']['TfidfConfig']
export type TopCluster = components['schemas']['TopCluster']
export type UsageTier = components['schemas']['UsageTier']
export type UsageTiersConfig = components['schemas']['UsageTiersConfig']
export type ValidationError = components['schemas']['ValidationError']
export type VerdictKind = components['schemas']['VerdictKind']
export type VerdictPayload = components['schemas']['VerdictPayload']
export type VerificationConfig = components['schemas']['VerificationConfig']
export type WithdrawIn = components['schemas']['WithdrawIn']
export type Bucket = components['schemas']['Bucket-Output']
