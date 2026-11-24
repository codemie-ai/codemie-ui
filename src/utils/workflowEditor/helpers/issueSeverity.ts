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
 * Presentation table for issue outcomes. Amber reuses the existing `warning` badge / `aborted-*` tokens.
 */

import type { StatusType } from '@/components/StatusBadge'
import { IssueOutcome, WorkflowIssue } from '@/types/entity'

import { CONTRACT_ERROR_TYPE } from './contractProtocol'

export interface IssueSeverityConfig {
  rank: number
  groupLabel: string
  badgeStatus: StatusType
  borderClass: string
  buttonColor: 'red' | 'amber' | 'grey'
  outline: 'error' | 'warning' | null
  defaultCollapsed: boolean
}

export const ISSUE_SEVERITY: Record<IssueOutcome, IssueSeverityConfig> = {
  ERROR: {
    rank: 3,
    groupLabel: 'Errors',
    badgeStatus: 'error',
    borderClass: 'border-border-error/50',
    buttonColor: 'red',
    outline: 'error',
    defaultCollapsed: false,
  },
  WARNING: {
    rank: 2,
    groupLabel: 'Warnings',
    badgeStatus: 'warning',
    borderClass: 'border-aborted-secondary',
    buttonColor: 'amber',
    outline: 'warning',
    defaultCollapsed: false,
  },
  UNVERIFIED: {
    rank: 1,
    groupLabel: 'Unverified',
    badgeStatus: 'not_started',
    borderClass: 'border-border-quaternary',
    buttonColor: 'grey',
    outline: null,
    defaultCollapsed: true,
  },
}

/** Highest-ranked outcome among unresolved issues, or null when none are left. */
export const worstSeverity = (
  issues: WorkflowIssue[],
  isResolved: (issue: WorkflowIssue) => boolean
): IssueOutcome | null =>
  issues.reduce<IssueOutcome | null>((worst, issue) => {
    if (isResolved(issue)) return worst
    if (!worst || ISSUE_SEVERITY[issue.outcome].rank > ISSUE_SEVERITY[worst].rank) {
      return issue.outcome
    }
    return worst
  }, null)

export type NodeOutline = IssueSeverityConfig['outline']

/** Groups issues by the state they belong to. Built once per issue list. */
export const groupIssuesByState = (issues: WorkflowIssue[] | null | undefined) => {
  const byState = new Map<string, WorkflowIssue[]>()
  issues?.forEach((issue) => {
    if (!issue.stateId) return
    const list = byState.get(issue.stateId)
    if (list) list.push(issue)
    else byState.set(issue.stateId, [issue])
  })
  return byState
}

/**
 * Outline of one node: the highest-ranked outline among its unresolved issues. A contract
 * issue always counts (its path may have no control); other issues must pass `isSupported`.
 */
export const getNodeOutline = (
  stateIssues: WorkflowIssue[] | undefined,
  isResolved: (issue: WorkflowIssue) => boolean,
  isSupported: (issue: WorkflowIssue) => boolean
): NodeOutline => {
  let best: NodeOutline = null
  let bestRank = 0
  stateIssues?.forEach((issue) => {
    const { outline, rank } = ISSUE_SEVERITY[issue.outcome]
    if (!outline || rank <= bestRank || isResolved(issue)) return
    if (issue.error_type !== CONTRACT_ERROR_TYPE && !isSupported(issue)) return
    best = outline
    bestRank = rank
  })
  return best
}
