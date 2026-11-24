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

import { useState } from 'react'

import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import { IssueOutcome, WorkflowIssue } from '@/types/entity'
import { cn } from '@/utils/utils'
import {
  ContractCoverage,
  formatCoverage,
  ISSUE_OUTCOMES,
} from '@/utils/workflowEditor/helpers/contractProtocol'
import { ISSUE_SEVERITY } from '@/utils/workflowEditor/helpers/issueSeverity'

export interface IssueGroup {
  outcome: IssueOutcome
  issues: WorkflowIssue[]
}

export interface IssueGroupsProps {
  groups: IssueGroup[]
  coverage?: ContractCoverage
  truncated?: number
  contextNote?: string | null
  strictLine?: string | null
  onGo: (issue: WorkflowIssue) => void
  isResolved: (issue: WorkflowIssue) => boolean
}

/** Splits issues into the non-empty groups, most severe first. */
export const groupIssues = (issues: WorkflowIssue[]): IssueGroup[] =>
  ISSUE_OUTCOMES.map((outcome) => ({
    outcome,
    issues: issues.filter((issue) => issue.outcome === outcome),
  })).filter((group) => group.issues.length > 0)

// `coverage` comes from parseCoverage, which already guarantees every field's type.
const Coverage = ({ coverage }: { coverage: ContractCoverage }) => {
  if (!coverage.analysed) {
    return <p className="text-xs text-text-quaternary">Contracts not analysed</p>
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-text-quaternary">
      <p>{formatCoverage(coverage)}</p>
      {coverage.uncovered_state_ids.length > 0 && (
        <p>{`Not validated: ${coverage.uncovered_state_ids.join(', ')}`}</p>
      )}
      {coverage.cap_reached && <p>Analysis cap reached, some states were not checked.</p>}
    </div>
  )
}

interface IssueCardProps {
  issue: WorkflowIssue
  resolved: boolean
  onGo: (issue: WorkflowIssue) => void
}

const IssueCard = ({ issue, resolved, onGo }: IssueCardProps) => {
  const severity = ISSUE_SEVERITY[issue.outcome] ?? ISSUE_SEVERITY.ERROR

  return (
    <li
      data-testid={`issue-card-${issue.id}`}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-3',
        resolved ? 'border-border-quaternary opacity-85' : severity.borderClass
      )}
    >
      <div className="flex items-center gap-2">
        {resolved ? (
          <StatusBadge status="not_started" text="Resolved" />
        ) : (
          <StatusBadge status={severity.badgeStatus} text={severity.groupLabel.replace(/s$/, '')} />
        )}
        {issue.meta?.strict_source === 'state' && (
          <span className="rounded border border-border-quaternary px-1.5 py-0.5 text-[10px] text-text-quaternary">
            node save validation (strict)
          </span>
        )}
      </div>
      <h4 className="text-sm font-semibold">{issue.message}</h4>
      {issue.meta?.label && <p className="text-xs text-text-quaternary">{issue.meta.label}</p>}
      {issue.details && <p className="text-xs text-text-quaternary">{issue.details}</p>}
      <div className="mt-1 flex gap-2">
        <Button type="secondary" className="text-xs" onClick={() => onGo(issue)}>
          Go to Issue
        </Button>
      </div>
    </li>
  )
}

interface GroupSectionProps {
  group: IssueGroup
  collapsed: boolean
  onToggle: () => void
  isResolved: (issue: WorkflowIssue) => boolean
  onGo: (issue: WorkflowIssue) => void
}

const GroupSection = ({ group, collapsed, onToggle, isResolved, onGo }: GroupSectionProps) => {
  const label = ISSUE_SEVERITY[group.outcome].groupLabel

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-2 text-left text-sm font-semibold"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span>{label}</span>
        <span className="text-xs font-normal text-text-quaternary">({group.issues.length})</span>
      </button>
      {!collapsed && (
        <ul className="flex flex-col gap-2">
          {group.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} resolved={isResolved(issue)} onGo={onGo} />
          ))}
        </ul>
      )}
    </section>
  )
}

const IssueGroups = ({
  groups,
  coverage,
  truncated,
  contextNote,
  strictLine,
  onGo,
  isResolved,
}: IssueGroupsProps) => {
  // Unverified starts collapsed unless it is all there is to look at
  const [toggled, setToggled] = useState<Partial<Record<IssueOutcome, boolean>>>({})
  const isCollapsed = (outcome: IssueOutcome) => {
    const defaultCollapsed = ISSUE_SEVERITY[outcome].defaultCollapsed && groups.length > 1
    return toggled[outcome] === undefined ? defaultCollapsed : !!toggled[outcome]
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {contextNote && (
        <p
          data-testid="issues-context-note"
          className="rounded-lg border border-border-quaternary px-3 py-2 text-xs"
        >
          {contextNote}
        </p>
      )}
      {strictLine && <p className="text-xs text-text-quaternary">{strictLine}</p>}
      {coverage && <Coverage coverage={coverage} />}
      {!!truncated && truncated > 0 && (
        <p className="text-xs text-text-quaternary">{`${truncated} more warnings not shown`}</p>
      )}
      {groups.length === 0 && <p className="text-sm text-text-quaternary">No issues found</p>}
      {groups.map((group) => (
        <GroupSection
          key={group.outcome}
          group={group}
          collapsed={isCollapsed(group.outcome)}
          onToggle={() =>
            setToggled((prev) => ({ ...prev, [group.outcome]: !isCollapsed(group.outcome) }))
          }
          isResolved={isResolved}
          onGo={onGo}
        />
      ))}
    </div>
  )
}

export default IssueGroups
