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

import { Dispatch, Ref, SetStateAction, useCallback, useEffect, useRef } from 'react'

import { useWorkflowContractsEnabled } from '@/hooks/useFeatureFlags'
import {
  WorkflowIssue,
  isWorkflowAssistantToolIssue,
  isWorkflowAssistantMcpIssue,
} from '@/types/entity'
import { StateConfiguration } from '@/types/workflowEditor'
import { NodeType, NodeTypes } from '@/types/workflowEditor/base'
import {
  CustomNodeConfiguration,
  CustomNodeType,
  ToolStateConfiguration,
} from '@/types/workflowEditor/configuration'
import {
  CONTRACT_ERROR_TYPE,
  isHiddenControlPath,
} from '@/utils/workflowEditor/helpers/contractProtocol'
import { ISSUE_SEVERITY } from '@/utils/workflowEditor/helpers/issueSeverity'
import { getCustomActorType } from '@/utils/workflowEditor/helpers/nodes/nodeTypeCheckers'

import { CUSTOM_NODE_TYPES_USING_TASK } from '../configPanels/components/CustomNodeSelector'
import { isFieldSupported, isAdvancedConfigField } from '../utils/visualEditorFieldRegistry'

const getStateById = (
  stateId: string,
  configStates: StateConfiguration[]
): StateConfiguration | null => {
  return configStates.find((state) => state.id === stateId) ?? null
}

/** Rank of an issue's outcome; an unknown outcome is treated as ERROR (fail closed). */
const severityRank = (issue: WorkflowIssue): number =>
  (ISSUE_SEVERITY[issue.outcome] ?? ISSUE_SEVERITY.ERROR).rank

/** Assistants always show Task; a custom node shows it for the actor types that read it (CustomTab). */
const hasTaskField = (state: StateConfiguration, customNodes?: CustomNodeConfiguration[]) => {
  if (state._meta?.type === NodeTypes.ASSISTANT) return true
  if (state._meta?.type !== NodeTypes.CUSTOM) return false
  const actorType = getCustomActorType(
    (state as { custom_node_id?: string }).custom_node_id,
    customNodes
  )
  return CUSTOM_NODE_TYPES_USING_TASK.has(actorType as CustomNodeType)
}

/** An issue whose path would open a missing or different control on this state's node type. */
const isHiddenControlIssue = (
  issue: WorkflowIssue,
  state: StateConfiguration | null,
  customNodes?: CustomNodeConfiguration[]
): boolean =>
  !!state?._meta?.type &&
  isHiddenControlPath(issue.path, state._meta.type as NodeType, hasTaskField(state, customNodes))

/**
 * `tool_args.<key>` set on the state itself overrides the tool definition. The Tool form only edits
 * the shared definition, so it cannot repair this binding without touching other states.
 */
const isStateOwnedToolArg = (issue: WorkflowIssue, state: StateConfiguration | null): boolean => {
  if (state?._meta?.type !== NodeTypes.TOOL) return false

  const key = /^tool_args\.([^.]+)/.exec(issue.path)?.[1]
  const stateToolArgs = (state as ToolStateConfiguration).tool_args
  return !!key && !!stateToolArgs && Object.hasOwn(stateToolArgs, key)
}

/** Contract keys of a state and of the workflow; their controls are hidden while the contracts flag is off. */
const STATE_CONTRACT_KEYS = ['input_schema', 'save_validation']
const WORKFLOW_CONTRACT_KEYS = ['save_validation', 'require_input_contracts']

const isContractKeyPath = (path: string, keys: string[]) =>
  keys.some((key) => path === key || path.startsWith(`${key}.`))

/**
 * No visual control can receive this issue, so it is shown and opened in the YAML editor. With the
 * contracts flag off the backend still rejects a malformed contract key (a schema check that does not
 * depend on the flag), and its control is hidden, so the issue goes to YAML where the value was typed.
 */
const isYamlOnlyIssue = (
  issue: WorkflowIssue,
  state: StateConfiguration | null,
  customNodes: CustomNodeConfiguration[] | undefined,
  contractsEnabled: boolean
): boolean =>
  (!contractsEnabled && isContractKeyPath(issue.path, STATE_CONTRACT_KEYS)) ||
  isHiddenControlIssue(issue, state, customNodes) ||
  isStateOwnedToolArg(issue, state)

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
  path: string,
  /** `stateOnly` ignores workflow-level issues (no `stateId`), for controls that exist once per node. */
  options?: { stateOnly?: boolean }
) => {
  ref: Ref<TElem>
  fieldError?: string
  fieldWarning?: string
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
  /** Actors of custom nodes, to tell which custom nodes show a Task field. */
  customNodes?: CustomNodeConfiguration[]
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
  customNodes,
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
  const [contractsEnabled] = useWorkflowContractsEnabled()

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
        const isHiddenContractKey =
          !contractsEnabled && isContractKeyPath(issue.path, WORKFLOW_CONTRACT_KEYS)
        if (isAdvancedConfigField(issue.path) && !isHiddenContractKey) {
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
      if (
        state &&
        !isYamlOnlyIssue(issue, state, customNodes, contractsEnabled) &&
        isFieldSupported(issue.path, state._meta?.type, issue.error_type)
      ) {
        openNodeTab(issue)
        openState(state.id)
        return
      }

      openYamlTab(issue)
    },

    [
      configStates,
      customNodes,
      contractsEnabled,
      openNodeTab,
      openYamlTab,
      openAdvancedConfigTab,
      openState,
    ]
  )

  const getIssueField: GetIssueField = useCallback(
    (path, options) => {
      const matchingIssues =
        tempIssues?.filter((issue) => {
          const stateMatches =
            issue.stateId === selectedStateId || (!issue.stateId && !options?.stateOnly)

          if (!stateMatches || issue.path !== path) return false

          return !isYamlOnlyIssue(
            issue,
            getStateById(issue.stateId ?? '', configStates),
            customNodes,
            contractsEnabled
          )
        }) ?? []
      const selectedIssues = selectedStateId
        ? matchingIssues.filter((issue) => !issue.stateId || issue.stateId === selectedStateId)
        : matchingIssues

      const isActive = (candidate: WorkflowIssue) =>
        !isIssueResolved(candidate) && !isIssueDirty(candidate)

      // The worst unresolved issue wins; with none left, the first match still binds the field ref.
      const unresolvedIssue = selectedIssues.reduce<WorkflowIssue | undefined>(
        (worst, candidate) =>
          isActive(candidate) && (!worst || severityRank(candidate) > severityRank(worst))
            ? candidate
            : worst,
        undefined
      )
      const issue = (unresolvedIssue ?? selectedIssues[0]) as WorkflowIssue | undefined
      // Several issues can share one control: focus follows the one Go to Issue selected, while the
      // inline message and severity come from the worst unresolved one.
      const focusIssue =
        selectedIssues.find((candidate) => candidate.id === activeIssue?.id) ?? issue

      if (!issue || !unresolvedIssue) {
        return {
          onChange: () => {},
          ref: (node) => setFieldRef({ issue: focusIssue, node }),
          issue,
        }
      }

      // Contract `details` holds provenance (producers), `message` the finding itself.
      const message =
        issue.error_type === CONTRACT_ERROR_TYPE
          ? issue.message || issue.details
          : issue.details ?? issue.message
      const outcome = ISSUE_SEVERITY[issue.outcome] ? issue.outcome : 'ERROR'

      return {
        fieldError: outcome === 'ERROR' ? message : undefined,
        fieldWarning: outcome === 'WARNING' ? message : undefined,
        ref: (node) => setFieldRef({ issue: focusIssue, node }),
        onChange: () => markIssueDirty(issue),
        issue,
      }
    },
    [
      activeIssue,
      isIssueResolved,
      isIssueDirty,
      tempIssues,
      selectedStateId,
      configStates,
      customNodes,
      contractsEnabled,
      setFieldRef,
      markIssueDirty,
    ]
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

  const removeArrayIssue: RemoveArrayIssue = useCallback(
    (removedIndex, stateId, pathPrefix) => {
      const base = tempIssues ?? issues
      if (!base) return

      const prefixWithDot = `${pathPrefix}.`
      // Index of the array element an issue path points at, e.g. `config.mappings.10.x` -> 10.
      const getElementIndex = (issue: WorkflowIssue): number | null => {
        if (issue.stateId !== stateId || !issue.path.startsWith(prefixWithDot)) return null
        const [segment] = issue.path.slice(prefixWithDot.length).split('.')
        return /^\d+$/.test(segment) ? Number(segment) : null
      }

      let changed = false
      const nextIssues = base.map((issue) => {
        const elementIndex = getElementIndex(issue)
        if (elementIndex === null || elementIndex < removedIndex) return issue

        changed = true
        // Findings on the deleted element are resolved; only later elements shift down by one.
        if (elementIndex === removedIndex) {
          markIssueDirty(issue)
          return issue
        }

        const rest = issue.path.slice(prefixWithDot.length).split('.').slice(1).join('.')
        const restSuffix = rest ? `.${rest}` : ''
        return { ...issue, path: `${prefixWithDot}${elementIndex - 1}${restSuffix}` }
      })

      if (changed) setTempIssues(nextIssues)
    },
    [issues, tempIssues, setTempIssues, markIssueDirty]
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
