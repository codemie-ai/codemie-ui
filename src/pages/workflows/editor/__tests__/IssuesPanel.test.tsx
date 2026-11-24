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

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyOutcome, contractOutcomeStore } from '@/store/contractOutcome'
import { IssueOutcome, WorkflowIssue } from '@/types/entity'

import { WorkflowContext } from '../hooks/useWorkflowContext'
import IssuesPanel from '../IssuesPanel'

const issue = (id: string, outcome: IssueOutcome, meta?: WorkflowIssue['meta']): WorkflowIssue =>
  ({
    id,
    message: `${outcome} message ${id}`,
    path: 'input_schema',
    outcome,
    configLine: 1,
    meta,
  } as WorkflowIssue)

const renderPanel = (issues: WorkflowIssue[] | null, outcomeKey?: string) =>
  render(
    <WorkflowContext.Provider
      value={
        {
          issues,
          outcomeKey,
          goToField: vi.fn(),
          isIssueResolved: () => false,
        } as unknown as React.ContextType<typeof WorkflowContext>
      }
    >
      <IssuesPanel />
    </WorkflowContext.Provider>
  )

const parsed = (extra = {}) => ({ ...extra })

describe('IssuesPanel', () => {
  afterEach(() => {
    contractOutcomeStore.outcome = null
  })

  it('renders page issues grouped by outcome', () => {
    renderPanel([issue('a', 'ERROR')])
    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('ERROR message a')).toBeInTheDocument()
  })

  it('shows coverage and the context note for a matching outcome key', () => {
    applyOutcome(
      parsed({
        coverage: {
          validated_states: 1,
          total_states: 2,
          uncovered_state_ids: ['b'],
          analysed: true,
          cap_reached: false,
        },
        truncated: 2,
      }),
      'not-saved',
      'wf-1'
    )
    renderPanel([issue('o1', 'WARNING')], 'wf-1')

    expect(screen.getByText('WARNING message o1')).toBeInTheDocument()
    expect(screen.getByText('Input contract coverage: 1 of 2 states')).toBeInTheDocument()
    expect(screen.getByText(/not saved yet/i)).toBeInTheDocument()
    expect(screen.getByText('2 more warnings not shown')).toBeInTheDocument()
  })

  it('ignores an outcome that belongs to another page', () => {
    applyOutcome(parsed(), 'saved', 'other')
    renderPanel([issue('a', 'ERROR')], 'wf-1')

    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument()
  })

  it('shows only the page issues, nothing from the outcome store', () => {
    applyOutcome(parsed(), 'not-saved', 'wf-1')
    renderPanel(null, 'wf-1')

    expect(screen.queryByText('Errors')).not.toBeInTheDocument()
    expect(screen.queryByText('Warnings')).not.toBeInTheDocument()
    expect(screen.getByText('No issues found')).toBeInTheDocument()
  })

  it('shows no context note for an outcome without context', () => {
    applyOutcome(parsed(), undefined, 'wf-1')
    renderPanel([issue('a', 'WARNING')], 'wf-1')

    expect(screen.queryByTestId('issues-context-note')).not.toBeInTheDocument()
  })

  it.each([
    ['saved', /saved with warnings/i],
    ['created', /created/i],
  ] as const)('shows a %s banner', (context, text) => {
    applyOutcome(parsed(), context, 'new')
    renderPanel(null, 'new')
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('shows no banner for a rejected outcome', () => {
    applyOutcome(parsed(), 'rejected', 'wf-1')
    renderPanel(null, 'wf-1')
    expect(screen.queryByTestId('issues-context-note')).not.toBeInTheDocument()
  })

  it('shows the workflow-level mode line when an issue has strict_source workflow', () => {
    renderPanel([issue('a', 'ERROR', { strict_source: 'workflow' })])
    expect(screen.getByText(/workflow-level save validation \(strict\)/i)).toBeInTheDocument()
  })
})
