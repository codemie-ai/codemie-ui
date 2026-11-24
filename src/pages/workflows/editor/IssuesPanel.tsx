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

import { Component, ReactNode } from 'react'
import { useSnapshot } from 'valtio'

import { contractOutcomeStore, OutcomeContext } from '@/store/contractOutcome'

import { useWorkflowContext } from './hooks/useWorkflowContext'
import IssueGroups, { groupIssues } from './IssueGroups'

const CONTEXT_NOTES: Record<OutcomeContext, string | null> = {
  saved: 'Saved with warnings',
  created: 'Workflow created with warnings',
  'not-saved': 'Changes not saved yet',
  rejected: null,
}

const STRICT_LINE = 'Blocked by the workflow-level save validation (strict)'

class IssuesErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <p className="text-sm text-text-quaternary">Issues could not be displayed.</p>
    }
    return this.props.children
  }
}

const IssuesPanelContent = () => {
  const { goToField, issues, isIssueResolved, outcomeKey } = useWorkflowContext()
  const { outcome: storedOutcome } = useSnapshot(contractOutcomeStore)
  const outcome = storedOutcome && storedOutcome.key === outcomeKey ? storedOutcome : null

  const allIssues = issues ?? []
  const hasWorkflowStrict = allIssues.some((issue) => issue.meta?.strict_source === 'workflow')

  return (
    <IssueGroups
      groups={groupIssues(allIssues)}
      coverage={outcome?.coverage}
      truncated={outcome?.truncated}
      contextNote={outcome?.context ? CONTEXT_NOTES[outcome.context] : null}
      strictLine={hasWorkflowStrict ? STRICT_LINE : null}
      onGo={goToField}
      isResolved={isIssueResolved}
    />
  )
}

const IssuesPanel = () => (
  <IssuesErrorBoundary>
    <IssuesPanelContent />
  </IssuesErrorBoundary>
)

export default IssuesPanel
