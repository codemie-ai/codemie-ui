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

import type { EntityReviewDetail } from '@/types/generated/marketplaceManagement'

import { Chips, DASH, Field, formatDate, Section } from './EntityReviewPaneHelpers'
import SeverityChip from './SeverityChip'

interface EntitySubmissionSectionProps {
  detail: EntityReviewDetail
}

const hasOverride = (detail: EntityReviewDetail): boolean =>
  Boolean(
    detail.overridden_by ||
      detail.override_notice ||
      detail.bypassed_gate_findings != null ||
      detail.bypassed_gate_findings_unavailable
  )

/**
 * The CRITICAL findings a force-publish waived. `[]` means there were none; the
 * `unavailable` flag means the gates could not be evaluated, so `[]` there would
 * wrongly read as "nothing was waived".
 */
const BypassedFindings: FC<EntitySubmissionSectionProps> = ({ detail }) => {
  const findings = detail.bypassed_gate_findings
  if (detail.bypassed_gate_findings_unavailable) {
    return (
      <Field label="Bypassed gate findings" testId="review-bypassed-findings">
        <span className="text-xs text-text-tertiary">
          The gates could not be evaluated, so the bypassed findings are unknown.
        </span>
      </Field>
    )
  }
  if (findings == null) return null
  return (
    <Field label="Bypassed gate findings" testId="review-bypassed-findings">
      <ul className="flex flex-col gap-2" data-testid="review-bypassed-gate-findings">
        {findings.length === 0 ? (
          <li className="text-xs text-text-tertiary">No bypassed CRITICAL findings.</li>
        ) : (
          findings.map((finding, idx) => (
            <li
              key={`${finding.rule}-${finding.message}-${idx}`}
              data-testid={`review-bypassed-finding-${finding.rule || idx}`}
              data-severity={finding.severity}
              className="flex flex-col gap-1 rounded-md border border-border-structural bg-surface-base-secondary p-2"
            >
              <span className="flex items-center gap-2">
                <SeverityChip severity={finding.severity} />
                <span className="text-[11px] font-medium text-text-secondary">{finding.rule}</span>
              </span>
              <span className="text-xs text-text-primary">{finding.message}</span>
            </li>
          ))
        )}
      </ul>
    </Field>
  )
}

export const EntitySubmissionSection: FC<EntitySubmissionSectionProps> = ({ detail }) => (
  <Section title="Submission">
    <div className="flex flex-col gap-2">
      <p className="font-semibold" data-testid="review-name">
        {detail.name || DASH}
      </p>
      <p className="text-xs leading-relaxed text-text-secondary" data-testid="review-description">
        {detail.description || DASH}
      </p>
      <Chips values={detail.categories} testId="review-categories" />
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Field label="Status" testId="review-status">
        {detail.marketplace_status || DASH}
      </Field>
      <Field label="Visible in marketplace" testId="review-is-global">
        {detail.is_global ? 'Yes' : 'No'}
      </Field>
      <Field label="Submitted by" testId="review-submitted-by">
        {detail.submitted_by || DASH}
      </Field>
      <Field
        label="Submitted at"
        testId="review-submitted-at"
        dataValue={detail.marketplace_submitted_at}
      >
        {formatDate(detail.marketplace_submitted_at)}
      </Field>
      <Field label="Creator" testId="review-creator">
        {detail.creator || DASH}
      </Field>
      <Field label="Project" testId="review-project">
        {detail.project || DASH}
      </Field>
      <Field label="Created" testId="review-created-at">
        {formatDate(detail.created_date)}
      </Field>
      <Field label="Updated" testId="review-updated-at">
        {formatDate(detail.updated_date)}
      </Field>
    </div>
    {detail.marketplace_decided_by && (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Decided by" testId="review-decided-by">
          {detail.marketplace_decided_by}
        </Field>
        <Field
          label="Decided at"
          testId="review-decided-at"
          dataValue={detail.marketplace_decided_at}
        >
          {formatDate(detail.marketplace_decided_at)}
        </Field>
        {detail.marketplace_decision_reason && (
          <div className="col-span-2">
            <Field label="Decision reason" testId="review-decision-reason">
              {detail.marketplace_decision_reason}
            </Field>
          </div>
        )}
      </div>
    )}
    {hasOverride(detail) && (
      <div className="flex flex-col gap-3" data-testid="review-override">
        {detail.overridden_by && (
          <Field label="Overridden by" testId="review-overridden-by">
            {detail.overridden_by}
          </Field>
        )}
        {detail.override_notice && (
          <Field label="Override notice" testId="review-override-notice">
            {detail.override_notice}
          </Field>
        )}
        <BypassedFindings detail={detail} />
      </div>
    )}
  </Section>
)
