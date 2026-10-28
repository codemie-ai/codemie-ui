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
 * Everything a moderator is shown about one entity.
 *
 * `GET /entities/{kind}/{eid}` stopped answering with the 54-column assistant
 * dump in EXECUTION-PLAN 8.1 (F-18, F-19): `toolkits` and `mcp_servers`
 * embedded credential values, and `system_prompt_history` carried every
 * superseded revision, to an audience of every admin *or maintainer*. What it
 * answers with now is `EntityReviewDetail` — an allow-list of 35 keys where
 * capability is reported as names and counts.
 *
 * The drawer used to hand that projection to `AssistantDetailsEmbedded` behind
 * `as unknown as Assistant`. That component reads `toolkits`, `mcp_servers`
 * and `system_prompt`, none of which exist here, so the reviewer's drawer
 * rendered almost nothing (and threw inside the sidebar sections). This pane
 * renders the projection itself — no cast, no field the API does not emit.
 *
 * The system prompt is deliberately not part of the payload and is fetched by
 * an explicit action, because `GET .../prompt` is separately audited: the point
 * of 8.1 is that reading an entity's instructions is a recorded event, not a
 * side effect of opening a drawer.
 */

import { FC, useState } from 'react'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { getAssistantLink } from '@/pages/assistants/utils/getAssistantLink'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { EntityReviewDetail } from '@/types/generated/marketplaceManagement'

import { Chips, Field, Section } from './EntityReviewPaneHelpers'
import { EntitySubmissionSection } from './EntitySubmissionSection'
import { verdictKindLabel } from './ReasonChip'
import SeverityChip from './SeverityChip'

interface EntityReviewPaneProps {
  detail: EntityReviewDetail
  isCleanupQueue?: boolean
}

const EntityReviewPane: FC<EntityReviewPaneProps> = ({ detail, isCleanupQueue = false }) => {
  const [prompt, setPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)

  const handleShowPrompt = (): void => {
    if (!detail.id || isLoadingPrompt) return
    setIsLoadingPrompt(true)
    setPromptError(null)
    marketplaceManagementStore
      .getEntityPrompt(detail.id)
      .then((res) => setPrompt(res.system_prompt))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        setPromptError(msg || 'Could not load the system prompt.')
      })
      .finally(() => setIsLoadingPrompt(false))
  }

  const similar = detail.top_similar

  return (
    <div className="flex flex-col gap-5 text-sm">
      <EntitySubmissionSection detail={detail} />

      {isCleanupQueue && detail.verdict_kind && (
        <Section title="Decision">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Verdict" testId="review-verdict-kind">
              {verdictKindLabel(detail.verdict_kind)}
            </Field>
            {detail.decision_detail && (
              <Field label="Detail" testId="review-decision-detail">
                {detail.decision_detail}
              </Field>
            )}
          </div>
        </Section>
      )}

      {!isCleanupQueue && (
        <Section title="Quality gates">
          <div className="flex flex-wrap items-center gap-4">
            <Field label="Critical" testId="review-critical-count">
              {detail.critical_count}
            </Field>
            <Field label="Minor" testId="review-optional-count">
              {detail.optional_count}
            </Field>
          </div>
          <ul className="flex flex-col gap-2" data-testid="review-gate-findings">
            {detail.gate_findings.length === 0 ? (
              <li className="text-xs text-text-tertiary">No gate failures.</li>
            ) : (
              detail.gate_findings.map((finding) => (
                <li
                  key={`${finding.rule}-${finding.message}`}
                  data-testid={`review-gate-finding-${finding.rule}`}
                  data-severity={finding.severity}
                  className="flex flex-col gap-1 rounded-md border border-border-structural bg-surface-base-secondary p-2"
                >
                  <span className="flex items-center gap-2">
                    <SeverityChip severity={finding.severity} />
                    <span className="text-[11px] font-medium text-text-secondary">
                      {finding.rule}
                    </span>
                  </span>
                  <span className="text-xs text-text-primary">{finding.message}</span>
                </li>
              ))
            )}
          </ul>
        </Section>
      )}

      <Section
        title="Capability"
        action={
          <Button
            variant="tertiary"
            className="h-7 text-xs"
            onClick={handleShowPrompt}
            disabled={isLoadingPrompt || !detail.id}
            data-testid="review-show-prompt"
          >
            {prompt == null ? 'Show system prompt' : 'Reload system prompt'}
          </Button>
        }
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Toolkits
          </span>
          <Chips values={detail.toolkit_names} testId="review-toolkits" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            MCP servers
          </span>
          <Chips values={detail.mcp_server_names} testId="review-mcp-servers" />
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Field label="Skills" testId="review-skill-count">
            {detail.skill_count}
          </Field>
          <Field label="Nested assistants" testId="review-nested-count">
            {detail.nested_assistant_count}
          </Field>
          <Field label="Datasources" testId="review-datasource-count">
            {detail.datasource_count}
          </Field>
          <Field label="Prompt length" testId="review-prompt-length">
            {detail.system_prompt_length} chars
          </Field>
          <Field label="Prompt revisions" testId="review-prompt-revisions">
            {detail.system_prompt_revisions}
          </Field>
          <Field label="Prompt variables" testId="review-prompt-variable-count">
            {detail.prompt_variables.length}
          </Field>
        </div>

        {/* The prompt itself is a separate, separately audited request — it is
            never part of the payload that opens this drawer. */}
        {isLoadingPrompt && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Spinner inline className="size-4" />
            <span>Loading system prompt…</span>
          </div>
        )}
        {promptError && (
          <div
            role="alert"
            data-testid="review-prompt-error"
            className="rounded-md border border-failed-secondary/40 bg-failed-secondary/10 p-2 text-xs text-failed-secondary"
          >
            {promptError}
          </div>
        )}
        {prompt != null && (
          <pre
            data-testid="review-system-prompt"
            className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border-structural bg-surface-base-secondary p-3 text-[11px] leading-relaxed text-text-primary"
          >
            {prompt}
          </pre>
        )}
      </Section>

      <Section title="Adoption">
        <div className="grid grid-cols-4 gap-x-4 gap-y-3">
          <Field label="Users" testId="review-users-count">
            {detail.unique_users_count ?? 0}
          </Field>
          <Field label="Likes" testId="review-likes-count">
            {detail.unique_likes_count ?? 0}
          </Field>
          <Field label="Dislikes" testId="review-dislikes-count">
            {detail.unique_dislikes_count ?? 0}
          </Field>
          <Field label="Clones" testId="review-clone-count">
            {detail.clone_count ?? 0}
          </Field>
        </div>
      </Section>

      <Section title="Closest match">
        {similar ? (
          <div
            data-testid="review-top-similar"
            data-score={similar.combined}
            data-match-id={similar.b_id}
            data-match-reason={similar.reason ?? ''}
            className="flex flex-col gap-1 rounded-md border border-border-structural bg-surface-base-secondary p-2 text-xs"
          >
            {similar.b_name == null ? (
              // Branch 2: matched assistant was deleted
              <div data-testid="review-top-similar-deleted">
                {similar.b_id}
                <span> (this assistant no longer exists)</span>
              </div>
            ) : (
              // Branch 3: matched assistant exists — use slug URL when available
              <span className="font-semibold text-text-primary">
                <a
                  href={getAssistantLink({
                    id: similar.b_id,
                    slug: similar.b_slug ?? '',
                    project: similar.b_project ?? '',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="review-top-similar-link"
                  className="text-text-accent underline-offset-2 hover:underline"
                >
                  {similar.b_name || 'Unnamed assistant'}
                </a>
                <span className="ml-2 font-normal text-text-secondary">
                  - {Math.round(similar.combined * 100)}% similar
                </span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-tertiary" data-testid="review-top-similar-empty">
            No similar entity found by the last audit.
          </span>
        )}
      </Section>

      {detail.conversation_starters.length > 0 && (
        <Section title="Conversation starters">
          <ul
            className="flex list-disc flex-col gap-1 pl-4 text-xs text-text-secondary"
            data-testid="review-conversation-starters"
          >
            {detail.conversation_starters.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

export default EntityReviewPane
