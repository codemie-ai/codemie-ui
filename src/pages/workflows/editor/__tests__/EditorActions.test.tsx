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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkflowIssue } from '@/types/entity'

import { TAB_DATA } from '../constants'
import EditorActions from '../EditorActions'

vi.mock('valtio', () => ({
  useSnapshot: () => ({ configs: [] }),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {},
}))

const contextState = vi.hoisted(() => ({
  issues: null as WorkflowIssue[] | null,
  resolved: new Set<string>(),
  onCheck: undefined as (() => void) | undefined,
  isChecking: false,
  isCheckLocked: false,
}))

vi.mock('../hooks/useWorkflowContext', () => ({
  useWorkflowContext: () => ({
    issues: contextState.issues,
    isIssueResolved: (issue: WorkflowIssue) => contextState.resolved.has(issue.id),
    onCheck: contextState.onCheck,
    isChecking: contextState.isChecking,
    isCheckLocked: contextState.isCheckLocked,
  }),
}))

const featureFlags = vi.hoisted(() => ({ contractsEnabled: true }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useWorkflowContractsEnabled: () => [featureFlags.contractsEnabled, true],
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))

afterEach(() => {
  cleanup()
  contextState.issues = null
  contextState.resolved = new Set()
  contextState.onCheck = undefined
  contextState.isChecking = false
  contextState.isCheckLocked = false
  featureFlags.contractsEnabled = true
})

const makeIssue = (id: string, outcome: WorkflowIssue['outcome']): WorkflowIssue =>
  ({ id, outcome, message: id, path: 'config', configLine: 1 } as unknown as WorkflowIssue)

describe('EditorActions', () => {
  const defaultProps = {
    isFullscreen: true,
    canUndo: false,
    hasValidationErrors: false,
    onUndo: vi.fn(),
    onBeautify: vi.fn(),
    tabs: [],
    toggleTabs: vi.fn(),
  }

  it('renders Version History after Beautify when onShowVisualVersionHistory is provided', () => {
    render(<EditorActions {...defaultProps} onShowVisualVersionHistory={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    const beautifyIndex = buttons.findIndex((btn) => btn.textContent?.includes('Beautify'))
    const versionHistoryIndex = buttons.findIndex((btn) =>
      btn.textContent?.includes('Version History')
    )

    expect(beautifyIndex).toBeGreaterThanOrEqual(0)
    expect(versionHistoryIndex).toBeGreaterThan(beautifyIndex)
  })

  it('calls onShowVisualVersionHistory when the toolbar button is clicked', () => {
    const onShowVisualVersionHistory = vi.fn()
    render(
      <EditorActions {...defaultProps} onShowVisualVersionHistory={onShowVisualVersionHistory} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Version History (visual editor)' }))
    expect(onShowVisualVersionHistory).toHaveBeenCalledTimes(1)
  })

  it('does not disable Version History when the YAML panel is open', () => {
    render(
      <EditorActions
        {...defaultProps}
        tabs={[TAB_DATA.YAML.ID]}
        onShowVisualVersionHistory={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Version History (visual editor)' })
    ).not.toBeDisabled()
  })

  describe('Check button', () => {
    it('is disabled while a save is in flight or after a create', () => {
      contextState.onCheck = vi.fn()
      contextState.isCheckLocked = true

      render(<EditorActions {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    })

    it('is hidden while workflow contracts are disabled', () => {
      featureFlags.contractsEnabled = false
      contextState.onCheck = vi.fn()

      render(<EditorActions {...defaultProps} />)

      expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    })

    it('is hidden when the page supplies no onCheck', () => {
      render(<EditorActions {...defaultProps} />)
      expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
    })

    it('calls onCheck when clicked', () => {
      contextState.onCheck = vi.fn()
      render(<EditorActions {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Check' }))

      expect(contextState.onCheck).toHaveBeenCalledTimes(1)
    })

    it('is disabled while a check is in flight', () => {
      contextState.onCheck = vi.fn()
      contextState.isChecking = true
      render(<EditorActions {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    })

    it('sits right before the Issues button', () => {
      contextState.onCheck = vi.fn()
      contextState.issues = [makeIssue('a', 'ERROR')]
      render(<EditorActions {...defaultProps} />)

      const names = screen.getAllByRole('button').map((btn) => btn.textContent)
      const checkIndex = names.findIndex((name) => name?.includes('Check'))
      const issuesIndex = names.findIndex((name) => name?.includes('Issues'))
      expect(checkIndex).toBeGreaterThanOrEqual(0)
      expect(issuesIndex).toBe(checkIndex + 1)
    })
  })

  describe('Issues button', () => {
    const renderButton = () => {
      render(<EditorActions {...defaultProps} />)
      return screen.getByRole('button', { name: /Issues/ })
    }

    it('is hidden when there are no issues', () => {
      render(<EditorActions {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /Issues/ })).not.toBeInTheDocument()
    })

    it('shows the unresolved count and is red when an error is unresolved', () => {
      contextState.issues = [
        makeIssue('a', 'ERROR'),
        makeIssue('b', 'WARNING'),
        makeIssue('c', 'UNVERIFIED'),
        makeIssue('d', 'ERROR'),
      ]
      contextState.resolved = new Set(['d'])
      const button = renderButton()

      expect(button).toHaveTextContent('3')
      expect(button).toHaveAttribute('data-severity', 'red')
    })

    it('is amber when the worst unresolved issue is a warning', () => {
      contextState.issues = [makeIssue('a', 'ERROR'), makeIssue('b', 'WARNING')]
      contextState.resolved = new Set(['a'])
      const button = renderButton()

      expect(button).toHaveTextContent('1')
      expect(button).toHaveAttribute('data-severity', 'amber')
    })

    it('is grey when only unverified issues are unresolved', () => {
      contextState.issues = [makeIssue('a', 'UNVERIFIED'), makeIssue('b', 'UNVERIFIED')]
      const button = renderButton()

      expect(button).toHaveTextContent('2')
      expect(button).toHaveAttribute('data-severity', 'grey')
    })

    it('is grey with no count once every issue is resolved', () => {
      contextState.issues = [makeIssue('a', 'ERROR')]
      contextState.resolved = new Set(['a'])
      const button = renderButton()

      expect(button).toHaveAttribute('data-severity', 'grey')
      expect(button).not.toHaveTextContent('1')
    })
  })
})
