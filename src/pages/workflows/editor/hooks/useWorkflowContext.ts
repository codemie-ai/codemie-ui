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

import { createContext, Dispatch, SetStateAction, useContext } from 'react'

import { WorkflowIssue } from '@/types/entity'

import {
  GetIssueField,
  GetToolIssue,
  GetMcpIssue,
  IsIssueDirty,
  IsIssueResolved,
  MarkIssueDirty,
  GoToField,
  RemoveArrayIssue,
} from './useWorkflowFieldIssues'

type WorkflowContextType = {
  selectedStateId: string | null

  issues: WorkflowIssue[] | null
  activeIssue: WorkflowIssue | null
  setActiveIssue: (issue: WorkflowIssue | null) => void
  getIssueField: GetIssueField
  getToolIssue: GetToolIssue
  getMcpIssue: GetMcpIssue
  goToField: GoToField

  isIssueResolved: IsIssueResolved
  isIssueDirty: IsIssueDirty

  markIssueDirty: MarkIssueDirty
  clearAllDirtyIssues: () => void
  clearAllDirtyMcpIssues: (mcpName: string) => void
  resolveAllDirtyIssues: () => void
  removeArrayIssue: RemoveArrayIssue
  tempIssues: WorkflowIssue[] | null | undefined
  setIssues: Dispatch<SetStateAction<WorkflowIssue[] | null>> | undefined
  setTempIssues: (issues: WorkflowIssue[] | null | undefined) => void
}

export const WorkflowContext = createContext<WorkflowContextType | null>(null)

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext)
  if (!context) throw new Error('useWorkflowContext must be used withing WorkflowContext provider')
  return context
}
