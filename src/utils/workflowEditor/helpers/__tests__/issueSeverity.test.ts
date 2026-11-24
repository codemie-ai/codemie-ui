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

import { describe, it, expect } from 'vitest'

import { IssueOutcome, WorkflowIssue } from '@/types/entity'

import { getNodeOutline, groupIssuesByState, ISSUE_SEVERITY, worstSeverity } from '../issueSeverity'

const issue = (id: string, outcome: IssueOutcome): WorkflowIssue =>
  ({ id, message: id, path: 'task', configLine: 0, error_type: 'x', outcome } as WorkflowIssue)

describe('ISSUE_SEVERITY', () => {
  it('ranks ERROR above WARNING above UNVERIFIED', () => {
    expect(ISSUE_SEVERITY.ERROR.rank).toBeGreaterThan(ISSUE_SEVERITY.WARNING.rank)
    expect(ISSUE_SEVERITY.WARNING.rank).toBeGreaterThan(ISSUE_SEVERITY.UNVERIFIED.rank)
  })

  it('labels the groups', () => {
    expect(ISSUE_SEVERITY.ERROR.groupLabel).toBe('Errors')
    expect(ISSUE_SEVERITY.WARNING.groupLabel).toBe('Warnings')
    expect(ISSUE_SEVERITY.UNVERIFIED.groupLabel).toBe('Unverified')
  })

  it('gives UNVERIFIED no outline and starts it collapsed', () => {
    expect(ISSUE_SEVERITY.UNVERIFIED.outline).toBeNull()
    expect(ISSUE_SEVERITY.UNVERIFIED.defaultCollapsed).toBe(true)
  })

  it('outlines errors and warnings, expanded by default', () => {
    expect(ISSUE_SEVERITY.ERROR.outline).toBe('error')
    expect(ISSUE_SEVERITY.WARNING.outline).toBe('warning')
    expect(ISSUE_SEVERITY.ERROR.defaultCollapsed).toBe(false)
    expect(ISSUE_SEVERITY.WARNING.defaultCollapsed).toBe(false)
  })

  it('maps outcomes to badge status and button colour', () => {
    expect(ISSUE_SEVERITY.ERROR.badgeStatus).toBe('error')
    expect(ISSUE_SEVERITY.WARNING.badgeStatus).toBe('warning')
    expect(ISSUE_SEVERITY.UNVERIFIED.badgeStatus).toBe('not_started')
    expect(ISSUE_SEVERITY.ERROR.buttonColor).toBe('red')
    expect(ISSUE_SEVERITY.WARNING.buttonColor).toBe('amber')
    expect(ISSUE_SEVERITY.UNVERIFIED.buttonColor).toBe('grey')
  })
})

describe('worstSeverity', () => {
  const never = () => false

  it('returns the highest-ranked outcome among unresolved issues', () => {
    const issues = [issue('a', 'UNVERIFIED'), issue('b', 'WARNING'), issue('c', 'ERROR')]
    expect(worstSeverity(issues, never)).toBe('ERROR')
    expect(worstSeverity(issues.slice(0, 2), never)).toBe('WARNING')
    expect(worstSeverity(issues.slice(0, 1), never)).toBe('UNVERIFIED')
  })

  it('skips resolved issues', () => {
    const issues = [issue('a', 'WARNING'), issue('c', 'ERROR')]
    expect(worstSeverity(issues, (i) => i.id === 'c')).toBe('WARNING')
  })

  it('returns null when everything is resolved or there are no issues', () => {
    expect(worstSeverity([issue('a', 'ERROR')], () => true)).toBeNull()
    expect(worstSeverity([], never)).toBeNull()
  })
})

describe('node outlines', () => {
  const on = (id: string, outcome: IssueOutcome, extra: Partial<WorkflowIssue> = {}) =>
    ({ ...issue(id, outcome), stateId: 's1', ...extra } as WorkflowIssue)
  const supported = () => true
  const unsupported = () => false
  const never = () => false

  it('groups issues by state and skips stateless ones', () => {
    const grouped = groupIssuesByState([on('a', 'ERROR'), on('b', 'WARNING'), issue('c', 'ERROR')])
    expect(grouped.get('s1')?.map((i) => i.id)).toEqual(['a', 'b'])
    expect(grouped.size).toBe(1)
  })

  it('picks the highest-ranked outline and ignores UNVERIFIED and resolved issues', () => {
    const list = [on('u', 'UNVERIFIED'), on('w', 'WARNING'), on('e', 'ERROR')]
    expect(getNodeOutline(list, never, supported)).toBe('error')
    expect(getNodeOutline(list, (i) => i.id === 'e', supported)).toBe('warning')
    expect(getNodeOutline([list[0]], never, supported)).toBeNull()
    expect(getNodeOutline(undefined, never, supported)).toBeNull()
  })

  it('only applies the support filter to non-contract issues', () => {
    const contract = on('c', 'WARNING', { error_type: 'contract_validation' })
    expect(getNodeOutline([contract], never, unsupported)).toBe('warning')
    expect(getNodeOutline([on('o', 'ERROR')], never, unsupported)).toBeNull()
  })
})
