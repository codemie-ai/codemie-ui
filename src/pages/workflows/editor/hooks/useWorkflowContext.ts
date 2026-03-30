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
