import { Dispatch, Ref, SetStateAction, useCallback, useEffect, useRef } from 'react'

import {
  WorkflowIssue,
  isWorkflowAssistantToolIssue,
  isWorkflowAssistantMcpIssue,
} from '@/types/entity'
import { StateConfiguration } from '@/types/workflowEditor'

import { isFieldSupported, isAdvancedConfigField } from '../utils/visualEditorFieldRegistry'

export const findLastNumberSegment = (str: string): number | null => {
  const segments = str.split('.')
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = Number(segments[i])
    if (segments[i] && !Number.isNaN(segment)) return segment
  }

  return null
}

const getStateById = (
  stateId: string,
  configStates: StateConfiguration[]
): StateConfiguration | null => {
  return configStates.find((state) => state.id === stateId) ?? null
}

export type FieldElement = {
  focus: () => void
  scrollIntoView: (options: ScrollIntoViewOptions) => void
}

export type WorkflowField = { node: FieldElement }
export type WorkflowFields = Map<string, WorkflowField>

export type MarkIssueDirty = (issue: WorkflowIssue) => void
export type IsIssueResolved = (issue: WorkflowIssue) => boolean
export type IsIssueDirty = (issue: WorkflowIssue) => boolean
export type RemoveArrayIssue = (removedIndex: number, stateId: string, pathPrefix: string) => void

export type GoToField = (issue: WorkflowIssue) => void
export type GetIssueField = <TElem extends FieldElement = HTMLInputElement>(
  path: string
) => {
  ref: Ref<TElem>
  fieldError?: string
  issue?: WorkflowIssue
  onChange: () => void
}

export type GetToolIssue = (params: { toolkit: string; tool?: string; path: 'tools' }) => {
  fieldError?: string
  issue: WorkflowIssue
  onChange: () => void
} | null

export type GetMcpIssue = (params: { mcpName: string; path: string | RegExp }) => {
  fieldError?: string
  issue: WorkflowIssue
  onChange: () => void
} | null

interface UseWorkflowFieldsParams {
  configStates: StateConfiguration[]
  activeIssue: WorkflowIssue | null
  selectedStateId: string | null
  openNodeTab: (issue: WorkflowIssue) => void
  openYamlTab: (issue: WorkflowIssue) => void
  openAdvancedConfigTab: (issue: WorkflowIssue) => void
  openState: (stateId: string) => void
  issues: WorkflowIssue[] | null
  tempIssues: WorkflowIssue[] | undefined | null
  setTempIssues: (issues: WorkflowIssue[]) => void
  isIssueResolved: (issue: string | WorkflowIssue) => boolean
  isIssueDirty: (issue: string | WorkflowIssue) => boolean
  markIssueDirty: (issue: string | WorkflowIssue) => void
  setDirtyIssues: Dispatch<SetStateAction<Set<string>>>
}

const useWorkflowFieldIssues = ({
  configStates,
  activeIssue,
  selectedStateId,
  openNodeTab,
  openAdvancedConfigTab,
  openYamlTab,
  openState,
  issues,
  tempIssues,
  isIssueResolved,
  isIssueDirty,
  setTempIssues,
  markIssueDirty,
  setDirtyIssues,
}: UseWorkflowFieldsParams) => {
  const fieldRefs = useRef<WorkflowFields>(new Map())

  const clearAllDirtyMcpIssues = useCallback(
    (mcpName: string) => {
      const issueIdsToRemove = tempIssues
        ?.filter((issue) => isWorkflowAssistantMcpIssue(issue) && issue.meta.mcpName === mcpName)
        .map((issue) => issue.id)

      setDirtyIssues(
        (prev) =>
          new Set([...prev.values()].filter((issueId) => !issueIdsToRemove?.includes(issueId)))
      )
    },
    [tempIssues]
  )

  const lastFocusedIssueId = useRef<string | null>(null)

  useEffect(() => {
    lastFocusedIssueId.current = null
  }, [activeIssue?.id])

  const setFieldRef = useCallback(
    (params: { issue?: WorkflowIssue; node: FieldElement | null }) => {
      const { node, issue } = params
      if (!issue) return

      if (!node) {
        fieldRefs.current.delete(issue.id)
        return
      }

      fieldRefs.current.set(issue.id, { node })

      const pathMatches = activeIssue?.id === issue.id
      const stateIdMatches =
        activeIssue?.stateId === issue.stateId || (!activeIssue?.stateId && !issue.stateId)
      const isVisibleState = issue.stateId === selectedStateId || !issue.stateId || !selectedStateId

      const shouldFocus = activeIssue && pathMatches && stateIdMatches && isVisibleState
      const hasNotBeenFocused = lastFocusedIssueId.current !== issue.id

      if (shouldFocus && hasNotBeenFocused) {
        node?.focus?.()
        node?.scrollIntoView?.({ block: 'center' })
        lastFocusedIssueId.current = issue.id
      }
    },
    [activeIssue, selectedStateId]
  )

  const goToField: GoToField = useCallback(
    (issue) => {
      if (!issue.stateId) {
        if (isAdvancedConfigField(issue.path)) {
          openAdvancedConfigTab(issue)
          return
        }

        openYamlTab(issue)
        return
      }

      if (isWorkflowAssistantToolIssue(issue) || isWorkflowAssistantMcpIssue(issue)) {
        const state = getStateById(issue.stateId, configStates)
        if (state) {
          openNodeTab(issue)
          openState(state.id)
          return
        }
      }

      const state = getStateById(issue.stateId, configStates)
      if (state && isFieldSupported(issue.path, state._meta?.type, issue.error_type)) {
        openNodeTab(issue)
        openState(state.id)
        return
      }

      openYamlTab(issue)
    },

    [configStates, openNodeTab, openYamlTab, openAdvancedConfigTab, openState]
  )

  const getIssueField: GetIssueField = useCallback(
    (path) => {
      const matchingIssues =
        tempIssues?.filter((issue) => {
          const stateMatches = issue.stateId === selectedStateId || !issue.stateId

          return stateMatches && issue.path === path
        }) ?? []
      const selectedIssues = selectedStateId
        ? matchingIssues.filter((issue) => !issue.stateId || issue.stateId === selectedStateId)
        : matchingIssues

      const issue = selectedIssues[0] as WorkflowIssue | undefined
      if ((issue && (isIssueResolved(issue) || isIssueDirty(issue))) || !issue) {
        return {
          onChange: () => {},
          ref: (node) => setFieldRef({ issue, node }),
          issue,
        }
      }

      return {
        fieldError: issue?.details ?? issue.message,
        ref: (node) => setFieldRef({ issue, node }),
        onChange: () => markIssueDirty(issue),
        issue,
      }
    },
    [isIssueResolved, isIssueDirty, tempIssues, selectedStateId, setFieldRef, markIssueDirty]
  )

  const getToolIssue: GetToolIssue = useCallback(
    ({ toolkit, tool, path }) => {
      const matchingIssues =
        tempIssues?.filter((issue) => {
          const stateMatches = issue.stateId === selectedStateId || !issue.stateId
          if (!stateMatches) return false
          if (!isWorkflowAssistantToolIssue(issue)) return false
          const toolkitMatches = issue.meta.toolkitName === toolkit
          const toolMatches = tool ? issue.meta.toolName === tool : true
          const pathMatches = issue.path === path

          return toolkitMatches && toolMatches && pathMatches
        }) ?? []

      const issue = matchingIssues[0] as WorkflowIssue | undefined
      if ((issue && (isIssueDirty(issue) || isIssueResolved(issue))) || !issue) {
        return null
      }

      return {
        fieldError: issue.details ?? issue.message,
        onChange: () => markIssueDirty(issue),
        issue,
      }
    },
    [isIssueDirty, isIssueResolved, tempIssues, selectedStateId, markIssueDirty]
  )

  const getMcpIssue: GetMcpIssue = useCallback(
    ({ mcpName, path }) => {
      const pathRegex = path instanceof RegExp ? path : null

      const matchingIssues =
        tempIssues?.filter((issue) => {
          const stateMatches = issue.stateId === selectedStateId || !issue.stateId
          if (!stateMatches) return false

          if (!isWorkflowAssistantMcpIssue(issue)) return false
          const mcpNameMatches = issue.meta.mcpName === mcpName

          const pathMatches = pathRegex ? pathRegex.test(issue.path) : issue.path === path

          return mcpNameMatches && pathMatches
        }) ?? []

      const issue = matchingIssues[0] as WorkflowIssue | undefined
      if ((issue && (isIssueResolved(issue) || isIssueDirty(issue))) || !issue) {
        return null
      }

      return {
        fieldError: issue.details ?? issue.message,
        onChange: () => markIssueDirty(issue),
        issue,
      }
    },
    [isIssueDirty, isIssueResolved, tempIssues, selectedStateId, markIssueDirty]
  )

  function replaceLastNumberSegment(str: string, newValue: number): string | null {
    const segments = str.split('.')
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const segment = Number(segments[i])
      if (segments[i] && !Number.isNaN(segment)) {
        segments[i] = String(newValue)
        return segments.join('.')
      }
    }

    return null
  }

  const removeArrayIssue: RemoveArrayIssue = useCallback(
    (removedIndex, stateId, pathPrefix) => {
      const arrayIssues =
        issues?.filter((issue) => issue.stateId === stateId && issue.path.startsWith(pathPrefix)) ??
        []

      const removedIssueIndex = arrayIssues.findIndex((issue) => {
        return findLastNumberSegment(issue.path) === removedIndex
      })
      const removedIssue = arrayIssues[removedIssueIndex]

      if (!removedIssue) return
      markIssueDirty(removedIssue)

      const newArrayIssues = arrayIssues.map((issue) => {
        const issueIndex = findLastNumberSegment(issue.path)
        if (issueIndex === null) return issue

        let newIndex = issueIndex
        if (issueIndex === removedIssueIndex) newIndex = NaN
        else if (issueIndex > removedIssueIndex) newIndex -= 1

        return { ...issue, path: replaceLastNumberSegment(issue.path, newIndex) ?? '' }
      })

      const newIssues =
        issues?.map((issue) => {
          const updatedIssue = newArrayIssues.find((arrayIssue) => arrayIssue.id === issue.id)
          if (!updatedIssue) return issue
          return { ...issue, ...updatedIssue }
        }) ?? []

      setTempIssues(newIssues)
    },
    [issues, setTempIssues, markIssueDirty]
  )

  return {
    goToField,
    getIssueField,
    getToolIssue,
    getMcpIssue,
    markIssueDirty,
    isIssueResolved,
    isIssueDirty,
    clearAllDirtyMcpIssues,
    removeArrayIssue,
  }
}

export default useWorkflowFieldIssues
