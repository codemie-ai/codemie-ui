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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IssueOutcome, WorkflowIssue } from '@/types/entity'
import { ContractCoverage } from '@/utils/workflowEditor/helpers/contractProtocol'

import IssueGroups, { groupIssues, IssueGroupsProps } from '../IssueGroups'

const issue = (
  id: string,
  outcome: IssueOutcome,
  extra: Partial<WorkflowIssue> = {}
): WorkflowIssue =>
  ({
    id,
    message: `${outcome} message ${id}`,
    path: 'input_schema',
    outcome,
    configLine: 1,
    stateId: 'a',
    ...extra,
  } as WorkflowIssue)

const coverage = (extra: Partial<ContractCoverage> = {}): ContractCoverage => ({
  validated_states: 3,
  total_states: 5,
  uncovered_state_ids: ['x', 'y'],
  analysed: true,
  cap_reached: false,
  ...extra,
})

const renderGroups = (props: Partial<IssueGroupsProps> = {}) => {
  const issues = props.groups
    ? []
    : [issue('e', 'ERROR'), issue('w', 'WARNING'), issue('u', 'UNVERIFIED')]
  const onGo = vi.fn()
  render(
    <IssueGroups groups={groupIssues(issues)} onGo={onGo} isResolved={() => false} {...props} />
  )
  return { onGo }
}

describe('IssueGroups', () => {
  it('puts issues into Errors, Warnings and a collapsed Unverified group', () => {
    renderGroups()

    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('Warnings')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(screen.getByText('ERROR message e')).toBeInTheDocument()
    expect(screen.getByText('WARNING message w')).toBeInTheDocument()
    expect(screen.queryByText('UNVERIFIED message u')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Unverified/ }))
    expect(screen.getByText('UNVERIFIED message u')).toBeInTheDocument()
  })

  it('expands Unverified when it is the only group', () => {
    renderGroups({ groups: groupIssues([issue('u', 'UNVERIFIED')]) })
    expect(screen.getByText('UNVERIFIED message u')).toBeInTheDocument()
  })

  it('uses the severity border and shows meta.label on the card', () => {
    renderGroups({
      groups: groupIssues([issue('w', 'WARNING', { meta: { label: 'Input contract' } })]),
    })

    expect(screen.getByText('Input contract')).toBeInTheDocument()
    expect(screen.getByTestId('issue-card-w')).toHaveClass('border-aborted-secondary')
  })

  it('shows "No issues found" when there are no groups', () => {
    renderGroups({ groups: [] })
    expect(screen.getByText('No issues found')).toBeInTheDocument()
  })

  it('calls onGo for a card', () => {
    const { onGo } = renderGroups({ groups: groupIssues([issue('e', 'ERROR')]) })
    fireEvent.click(screen.getByRole('button', { name: 'Go to Issue' }))
    expect(onGo).toHaveBeenCalledWith(expect.objectContaining({ id: 'e' }))
  })

  it('marks resolved cards as Resolved', () => {
    renderGroups({ groups: groupIssues([issue('e', 'ERROR')]), isResolved: () => true })
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })

  describe('coverage', () => {
    it('shows the input contract coverage line and uncovered ids', () => {
      renderGroups({ coverage: coverage() })
      expect(screen.getByText('Input contract coverage: 3 of 5 states')).toBeInTheDocument()
      expect(screen.getByText(/x, y/)).toBeInTheDocument()
    })

    it('shows "Contracts not analysed" when analysed is false', () => {
      renderGroups({ coverage: coverage({ analysed: false }) })
      expect(screen.getByText('Contracts not analysed')).toBeInTheDocument()
      expect(screen.queryByText(/Input contract coverage/)).not.toBeInTheDocument()
    })

    it('shows a cap note when the cap was reached', () => {
      renderGroups({ coverage: coverage({ cap_reached: true }) })
      expect(screen.getByText(/analysis cap/i)).toBeInTheDocument()
    })

    it('is hidden when coverage is absent', () => {
      renderGroups()
      expect(screen.queryByText(/Input contract coverage/)).not.toBeInTheDocument()
      expect(screen.queryByText('Contracts not analysed')).not.toBeInTheDocument()
    })
  })

  it('shows how many warnings were truncated', () => {
    renderGroups({ truncated: 4 })
    expect(screen.getByText('4 more warnings not shown')).toBeInTheDocument()
  })

  it('shows the context note', () => {
    renderGroups({ contextNote: 'Changes not saved yet' })
    expect(screen.getByText('Changes not saved yet')).toBeInTheDocument()
  })

  describe('strict', () => {
    it('shows the mode line and tag', () => {
      renderGroups({
        groups: groupIssues([issue('e', 'ERROR', { meta: { strict_source: 'state' } })]),
        strictLine: 'Blocked by the workflow-level save validation (strict)',
      })

      expect(
        screen.getByText('Blocked by the workflow-level save validation (strict)')
      ).toBeInTheDocument()
      expect(screen.getByText('node save validation (strict)')).toBeInTheDocument()
    })

    it('shows neither when strict_source is missing', () => {
      renderGroups()
      expect(screen.queryByText('node save validation (strict)')).not.toBeInTheDocument()
      expect(screen.queryByText(/save validation \(strict\)/)).not.toBeInTheDocument()
    })

    it('does not tag a workflow-level strict card as node save validation', () => {
      renderGroups({
        groups: groupIssues([issue('e', 'ERROR', { meta: { strict_source: 'workflow' } })]),
      })
      expect(screen.queryByText('node save validation (strict)')).not.toBeInTheDocument()
    })
  })
})
