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

import { FC } from 'react'

import type {
  AuditConfigResponse,
  EntityReviewDetail,
  PolishCheckResult,
} from '@/types/generated/marketplaceManagement'

import { AuditSection, GateBadge, renderSimilaritySubtitle } from './AuditResultsBadges'
import {
  CORE_RULES,
  getCoreGateLabel,
  getPolishCheckLabel,
  getPolishTarget,
  getPolishVerdict,
  getQualityGateLabel,
  getUsageVerdict,
  getUsageVerdictLabel,
  QUALITY_GATE_RULE_SET,
  QUALITY_GATE_RULES,
} from './auditResultsHelpers'
import SimilarityBar from './SimilarityBar'
import UsageTierBar from './UsageTierBar'
import VerdictChip from './VerdictChip'

interface AuditResultsTabProps {
  detail: EntityReviewDetail
  auditConfig: AuditConfigResponse | null | undefined
}

const AuditResultsTab: FC<AuditResultsTabProps> = ({ detail, auditConfig }) => {
  const gateFindings = detail.gate_findings ?? []
  const coreFindingRules = new Set(
    gateFindings.filter((f) => CORE_RULES.has(f.rule)).map((f) => f.rule)
  )
  // Findings for the 4 constant critical gates, keyed by rule for O(1) lookup.
  const qualityGateFindingMap = new Map(
    gateFindings.filter((f) => QUALITY_GATE_RULE_SET.has(f.rule)).map((f) => [f.rule, f])
  )

  // Ignore similarity score when the matched entity has been deleted (b_name == null means deleted).
  // A deleted duplicate is no longer a concern, so treat it as no match.
  const matchScore = detail.top_similar?.b_name != null ? detail.top_similar.combined : null

  // Polish check rows — 4 fixed checks, each in unavailable state when
  // polish_check_results is absent (best-effort — may have failed to load).
  const polishChecks = detail.polish_check_results
  const POLISH_CHECKS = ['description', 'categories', 'icon', 'starters'] as const
  const polishCheckMap: Map<string, PolishCheckResult> = new Map(
    (polishChecks ?? []).map((r) => [r.check, r])
  )

  const usageTierKey = detail.usage_tier?.toUpperCase()
  const usageSubtitle = detail.usage_tier ? (
    <span>
      {detail.unique_users_count != null && (
        <>
          <span className="text-text-primary">{detail.unique_users_count} users</span>
          {' · '}
        </>
      )}
      {detail.usage_tier}
    </span>
  ) : undefined
  const usageVerdict = getUsageVerdict(usageTierKey)
  const usageVerdictLabel = getUsageVerdictLabel(usageTierKey)

  const similarityThresholds = auditConfig?.similarity?.thresholds ?? null
  const topSimilar = detail.top_similar
  const matchFlagged =
    topSimilar?.b_verdict_kind === 'CANDIDATE_FOR_CLEANUP' &&
    detail.verdict_kind?.toUpperCase() !== 'CANDIDATE_FOR_CLEANUP' &&
    matchScore != null &&
    similarityThresholds != null &&
    matchScore >= similarityThresholds.critical
  const topSimilarScore = topSimilar?.reason === 'es_knn' || matchFlagged ? null : matchScore
  const similaritySubtitle = renderSimilaritySubtitle(matchScore, topSimilar, matchFlagged)
  const similarityVerdict = similarityThresholds != null ? !detail.similarity_failed : null

  // The backend words every duplicate verdict "Near-duplicate of X.", but an exact-name
  // match can fire with low structural overlap — say what actually matched.
  const decisionDetail =
    topSimilar?.reason === 'exact_name_match' &&
    topSimilar.b_name != null &&
    detail.decision_detail === `Near-duplicate of ${topSimilar.b_name}.`
      ? `Same name as ${topSimilar.b_name}.`
      : detail.decision_detail

  const qualityFailureCount = qualityGateFindingMap.size
  const qualitySummary = (
    <span>
      <span className="text-text-primary">
        {qualityFailureCount} {qualityFailureCount === 1 ? 'failure' : 'failures'}
      </span>
      {' · target = 0'}
    </span>
  )
  const qualityVerdict = qualityFailureCount === 0

  const coreGates = auditConfig?.verification?.core_gates ?? null
  const coreFailureCount = coreFindingRules.size
  const coreSummary = (
    <span>
      <span className="text-text-primary">
        {coreFailureCount} {coreFailureCount === 1 ? 'failure' : 'failures'}
      </span>
      {' · target = 0'}
    </span>
  )

  const polishFailureCount =
    polishChecks == null
      ? 0
      : POLISH_CHECKS.reduce(
          (acc, check) => acc + (polishCheckMap.get(check)?.passed === false ? 1 : 0),
          0
        )
  const polishTarget = getPolishTarget(usageTierKey)
  const polishSummary = (
    <span>
      <span className="text-text-primary">
        {polishFailureCount} {polishFailureCount === 1 ? 'failure' : 'failures'}
      </span>
      {polishTarget && ` · ${polishTarget}`}
    </span>
  )

  return (
    <div className="flex flex-col overflow-y-auto px-6 py-4">
      {/* 1. Decision — two-column: label+chip left, text right */}
      {(detail.verdict_kind || detail.decision_detail) && (
        <section className="flex flex-col gap-3 border-t border-border-structural mt-4 pt-4 first:border-t-0 first:mt-0 first:pt-0">
          <div className="flex items-end gap-6">
            <div className="flex flex-col shrink-0 items-start gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Decision
              </h3>
              {detail.verdict_kind && (
                <VerdictChip kind={detail.verdict_kind} className="text-xs" />
              )}
            </div>
            {decisionDetail && <p className="flex-1 text-xs text-text-primary">{decisionDetail}</p>}
          </div>
        </section>
      )}

      {/* 2. Users usage */}
      <AuditSection
        title="Users usage"
        subtitle={usageSubtitle}
        verdict={usageVerdict}
        verdictLabel={usageVerdictLabel}
      >
        <UsageTierBar
          usage_tier={detail.usage_tier}
          unique_users_count={detail.unique_users_count}
          usageTiers={auditConfig?.usage_tiers ?? null}
          verification={auditConfig?.verification ?? null}
        />
      </AuditSection>

      {/* 3. Similarity */}
      <AuditSection title="Similarity" subtitle={similaritySubtitle} verdict={similarityVerdict}>
        <SimilarityBar topSimilarScore={topSimilarScore} thresholds={similarityThresholds} />
      </AuditSection>

      {/* 4. Core quality gates */}
      <AuditSection
        title="Core quality gates"
        subtitle={coreSummary}
        verdict={coreFailureCount === 0}
      >
        <div className="flex flex-wrap gap-2">
          {Array.from(CORE_RULES).map((rule) => (
            <GateBadge
              key={rule}
              label={getCoreGateLabel(rule, coreGates)}
              passed={!coreFindingRules.has(rule)}
              testId={`core-gate-${rule}`}
            />
          ))}
        </div>
      </AuditSection>

      {/* 5. Default quality gates */}
      <AuditSection
        title="Default quality gates"
        subtitle={qualitySummary}
        verdict={qualityVerdict}
      >
        <div className="flex flex-wrap gap-2">
          {QUALITY_GATE_RULES.map((rule) => (
            <GateBadge
              key={rule}
              label={getQualityGateLabel(rule, auditConfig?.gates ?? null)}
              passed={!qualityGateFindingMap.has(rule)}
              testId={`quality-gate-${rule}`}
            />
          ))}
        </div>
      </AuditSection>

      {/* 6. Polish quality gates */}
      <AuditSection
        title="Polish quality gates"
        subtitle={polishSummary}
        verdict={getPolishVerdict(polishChecks, usageTierKey, polishFailureCount)}
      >
        <div className="flex flex-wrap gap-2">
          {POLISH_CHECKS.map((check) => {
            const result = polishCheckMap.get(check)
            const passed: boolean | 'unavailable' =
              polishChecks == null ? 'unavailable' : result?.passed ?? 'unavailable'
            return (
              <GateBadge
                key={check}
                label={getPolishCheckLabel(check, result)}
                passed={passed}
                testId={`polish-check-${check}`}
              />
            )
          })}
        </div>
      </AuditSection>
    </div>
  )
}

export default AuditResultsTab
