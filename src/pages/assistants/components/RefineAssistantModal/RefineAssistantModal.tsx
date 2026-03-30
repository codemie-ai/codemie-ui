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

import React, { useEffect, useMemo, useState } from 'react'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { assistantsStore } from '@/store/assistants'
import {
  AssistantAIRefineFields,
  AssistantAIRefineResponse,
  FieldRecommendation,
  RecommendationAction,
} from '@/types/entity/assistant'

import AnalysisSummary from './components/AnalysisSummary'
import ContextRecommendationItem from './components/ContextRecommendationItem'
import FieldRecommendationItem from './components/FieldRecommendationItem'
import { RecommendationCountBadge } from './components/RecommendationCountBadge'
import ToolRecommendationItem from './components/ToolRecommendationItem'

export interface RefineAssistantModalProps {
  visible: boolean
  refineFields: AssistantAIRefineFields
  onHide: () => void
  onApplyFieldSuggestions: (fields: FieldRecommendation[]) => void
  onApplyToolSuggestions: (
    tools: Array<{ toolkitName: string; name: string; action: string; reason: string }>
  ) => void
  onApplyContextSuggestions: (contexts: Array<{ name: string; action: string }>) => void
  getRefineFieldValue: (fieldName: string, refineFields: AssistantAIRefineFields) => any
  getRefineFieldRecommendation: (
    fieldRecommendation: FieldRecommendation,
    refineFields: AssistantAIRefineFields
  ) => any
}

interface ToolRecommendation {
  toolkitName: string
  name: string
  action: RecommendationAction
  reason: string
  isCurrentlySelected: boolean
  isApplied: boolean
  displayAction: RecommendationAction
}

interface AppliedRecommendations {
  fields: Set<string>
  tools: Set<string>
  dataSources: Set<string>
}

const RefineAssistantModal: React.FC<RefineAssistantModalProps> = ({
  visible,
  onHide,
  refineFields,
  onApplyFieldSuggestions,
  onApplyToolSuggestions,
  onApplyContextSuggestions,
  getRefineFieldValue,
  getRefineFieldRecommendation,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AssistantAIRefineResponse | null>(null)
  const [appliedRecommendations, setAppliedRecommendations] = useState<AppliedRecommendations>({
    fields: new Set(),
    tools: new Set(),
    dataSources: new Set(),
  })

  useEffect(() => {
    if (visible && !response && !loading) {
      setLoading(true)
      setError(null)
      setAppliedRecommendations({
        fields: new Set(),
        tools: new Set(),
        dataSources: new Set(),
      })

      assistantsStore
        .refineAssistantWithAI(refineFields)
        .then((result) => {
          setResponse(result)
        })
        .catch((err) => {
          setError(err.message || 'Failed to get AI suggestions')
        })
        .finally(() => {
          setLoading(false)
        })
    }

    if (!visible) {
      setResponse(null)
      setError(null)
      setAppliedRecommendations({
        fields: new Set(),
        tools: new Set(),
        dataSources: new Set(),
      })
    }
  }, [visible, refineFields])

  const getCurrentlySelectedTools = useMemo(() => {
    const currentTools = new Set<string>()
    if (refineFields.toolkits) {
      refineFields.toolkits.forEach((toolkit) => {
        toolkit.tools?.forEach((tool) => {
          currentTools.add(tool.name)
        })
      })
    }
    return currentTools
  }, [refineFields.toolkits])

  const fieldRecommendations = useMemo(() => {
    if (!response?.fields) return []
    return response.fields
  }, [response])

  const toolRecommendations = useMemo(() => {
    const tools: ToolRecommendation[] = []

    if (response?.toolkits) {
      response.toolkits.forEach((toolkit) => {
        toolkit.tools.forEach((tool) => {
          const isCurrentlySelected = getCurrentlySelectedTools.has(tool.name)
          const toolKey = `${toolkit.toolkit}-${tool.name}`
          // This is a fix of BE bug, to be fixed:
          const action = isCurrentlySelected ? tool.action : RecommendationAction.CHANGE

          tools.push({
            toolkitName: toolkit.toolkit,
            name: tool.name,
            action,
            reason: tool.reason ?? '',
            isCurrentlySelected,
            isApplied: appliedRecommendations.tools.has(toolKey),
            displayAction:
              action === RecommendationAction.CHANGE ? RecommendationAction.ADD : action, // Change for tool means adding
          })
        })
      })
    }

    return tools
  }, [response, getCurrentlySelectedTools, appliedRecommendations.tools])

  const contextRecommendations = useMemo(() => {
    if (!response?.context) return []

    return response.context.map((context) => {
      const isCurrentlyEnabled = refineFields.context?.some((c) => c.name === context.name) ?? false
      const contextKey = context.name

      return {
        ...context,
        isCurrentlyEnabled,
        isApplied: appliedRecommendations.dataSources.has(contextKey),
      }
    })
  }, [response, refineFields.context, appliedRecommendations.dataSources])

  const actionableRecommendations = useMemo(() => {
    const actionableFields = fieldRecommendations
    const actionableTools = toolRecommendations.filter(
      (tool) => tool.action !== RecommendationAction.KEEP
    )
    const actionableContexts = contextRecommendations.filter(
      (context) => context.action !== RecommendationAction.KEEP
    )

    return {
      fields: actionableFields,
      tools: actionableTools,
      contexts: actionableContexts,
      total: actionableFields.length + actionableTools.length + actionableContexts.length,
    }
  }, [fieldRecommendations, toolRecommendations, contextRecommendations])

  const unappliedActionableRecommendations = useMemo(() => {
    const unappliedFields = actionableRecommendations.fields.filter(
      (field) => !appliedRecommendations.fields.has(field.name)
    )

    const unappliedTools = actionableRecommendations.tools.filter(
      (tool) => !appliedRecommendations.tools.has(`${tool.toolkitName}-${tool.name}`)
    )

    const unappliedContexts = actionableRecommendations.contexts.filter(
      (context) => !appliedRecommendations.dataSources.has(context.name)
    )

    return {
      fields: unappliedFields,
      tools: unappliedTools,
      contexts: unappliedContexts,
      total: unappliedFields.length + unappliedTools.length + unappliedContexts.length,
    }
  }, [actionableRecommendations, appliedRecommendations])

  const hasUnappliedChanges = unappliedActionableRecommendations.total > 0

  const handleApplyFieldSuggestion = (field: FieldRecommendation) => {
    onApplyFieldSuggestions([field])

    // Track applied field
    setAppliedRecommendations((prev) => ({
      ...prev,
      fields: new Set(prev.fields).add(field.name),
    }))
  }

  const handleApplyToolSuggestion = (tool: ToolRecommendation) => {
    onApplyToolSuggestions([
      {
        toolkitName: tool.toolkitName,
        name: tool.name,
        action: tool.action,
        reason: tool.reason,
      },
    ])

    // Track applied tool
    const toolKey = `${tool.toolkitName}-${tool.name}`
    setAppliedRecommendations((prev) => ({
      ...prev,
      tools: new Set(prev.tools).add(toolKey),
    }))
  }

  const handleApplyContextSuggestion = (context: { name: string; action: string }) => {
    onApplyContextSuggestions([context])

    // Track applied context
    setAppliedRecommendations((prev) => ({
      ...prev,
      dataSources: new Set(prev.dataSources).add(context.name),
    }))
  }

  const handleApplyAllSuggestions = () => {
    // Apply all fields in batch
    if (unappliedActionableRecommendations.fields.length > 0) {
      onApplyFieldSuggestions(unappliedActionableRecommendations.fields)

      // Mark all as applied in a single setState call
      setAppliedRecommendations((prev) => ({
        ...prev,
        fields: new Set([
          ...prev.fields,
          ...unappliedActionableRecommendations.fields.map((field) => field.name),
        ]),
      }))
    }

    // Apply all tool suggestions in a single batch update to avoid race conditions
    if (unappliedActionableRecommendations.tools.length > 0) {
      const toolSuggestions = unappliedActionableRecommendations.tools.map((tool) => ({
        toolkitName: tool.toolkitName,
        name: tool.name,
        action: tool.action,
        reason: tool.reason,
      }))
      onApplyToolSuggestions(toolSuggestions)

      // Mark all as applied in a single setState call
      setAppliedRecommendations((prev) => ({
        ...prev,
        tools: new Set([
          ...prev.tools,
          ...unappliedActionableRecommendations.tools.map(
            (tool) => `${tool.toolkitName}-${tool.name}`
          ),
        ]),
      }))
    }

    // Apply all contexts in batch
    if (unappliedActionableRecommendations.contexts.length > 0) {
      const contextSuggestions = unappliedActionableRecommendations.contexts.map((context) => ({
        name: context.name,
        action: context.action,
      }))
      onApplyContextSuggestions(contextSuggestions)

      // Mark all as applied in a single setState call
      setAppliedRecommendations((prev) => ({
        ...prev,
        dataSources: new Set([
          ...prev.dataSources,
          ...unappliedActionableRecommendations.contexts.map((context) => context.name),
        ]),
      }))
    }
  }

  const handleRetry = () => {
    setError(null)
    setResponse(null)
    setLoading(true)

    assistantsStore
      .refineAssistantWithAI(refineFields)
      .then((result) => {
        setResponse(result)
      })
      .catch((err) => {
        setError(err.message || 'Failed to get AI suggestions')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center pb-12 pt-6">
          <Spinner inline className="w-8 h-8" />
          <p className="mt-4 text-sm text-text-quaternary">
            Analyzing your Assistant configuration
          </p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-failed-secondary mb-4 flex flex-col items-center">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium">Failed to get AI suggestions</p>
            <p className="text-sm text-text-quaternary mt-2">{error}</p>
          </div>
          <Button variant={ButtonType.PRIMARY} onClick={handleRetry}>
            Try Again
          </Button>
        </div>
      )
    }

    if (response) {
      return (
        <div className="space-y-6">
          <AnalysisSummary
            fieldsCount={actionableRecommendations.fields.length}
            toolsCount={actionableRecommendations.tools.length}
            contextsCount={actionableRecommendations.contexts.length}
          />

          {fieldRecommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-normal text-text-primary">Fields to Improve</h3>
                <RecommendationCountBadge fieldRecommendations={fieldRecommendations} />
              </div>
              {fieldRecommendations.map((field) => (
                <FieldRecommendationItem
                  key={field.name}
                  field={field}
                  currentValue={getRefineFieldValue(field.name, refineFields) as string | string[]}
                  recommendedValue={
                    getRefineFieldRecommendation(field, refineFields) as string | string[]
                  }
                  onApply={handleApplyFieldSuggestion}
                  isApplied={appliedRecommendations.fields.has(field.name)}
                />
              ))}
            </div>
          )}

          {toolRecommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-normal text-text-primary">Toolkit Recommendations</h3>
                <RecommendationCountBadge fieldRecommendations={toolRecommendations} />
              </div>
              {toolRecommendations.map((tool) => (
                <ToolRecommendationItem
                  key={`${tool.toolkitName}-${tool.name}`}
                  toolkitName={tool.toolkitName}
                  toolName={tool.name}
                  action={tool.displayAction}
                  reason={tool.reason}
                  isCurrentlyEnabled={tool.isCurrentlySelected}
                  isApplied={tool.isApplied}
                  onApply={() => handleApplyToolSuggestion(tool)}
                />
              ))}
            </div>
          )}

          {contextRecommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-normal text-text-primary">
                  Datasource Recommendations
                </h3>
                <RecommendationCountBadge fieldRecommendations={contextRecommendations} />
              </div>
              {contextRecommendations.map((context) => (
                <ContextRecommendationItem
                  key={context.name}
                  context={context}
                  isCurrentlyEnabled={context.isCurrentlyEnabled}
                  isApplied={context.isApplied}
                  onApply={() =>
                    handleApplyContextSuggestion({ name: context.name, action: context.action })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const footerContent = response && (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm text-text-quaternary">
        {hasUnappliedChanges ? (
          <span>
            {unappliedActionableRecommendations.total} change(s) available
            {!!unappliedActionableRecommendations.total && (
              <span>
                {' '}
                ({unappliedActionableRecommendations.fields.length} field(s),{' '}
                {unappliedActionableRecommendations.tools.length} tool(s)),{' '}
                {unappliedActionableRecommendations.contexts.length} datasource(s))
              </span>
            )}
          </span>
        ) : (
          <span>All looks good!</span>
        )}
      </div>

      <div className="flex gap-4">
        <Button variant={ButtonType.SECONDARY} onClick={onHide}>
          Close
        </Button>
        {hasUnappliedChanges && (
          <Button variant={ButtonType.PRIMARY} onClick={handleApplyAllSuggestions}>
            Apply All Changes
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Popup
      className="max-w-6xl w-full"
      overlayClassName="z-60"
      header="AI Refinement Analysis"
      visible={visible}
      onHide={onHide}
      withBorder
      hideFooter={!response}
      footerContent={footerContent}
      bodyClassName="max-h-[calc(90vh-200px)] overflow-y-auto"
    >
      {renderContent()}
    </Popup>
  )
}

export default RefineAssistantModal
