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

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import StatusWarningSVG from '@/assets/icons/status-warning.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import FieldRecommendationItem from '@/pages/assistants/components/RefineAssistantModal/components/FieldRecommendationItem'
import { RecommendationCountBadge } from '@/pages/assistants/components/RefineAssistantModal/components/RecommendationCountBadge'
import ToolRecommendationItem from '@/pages/assistants/components/RefineAssistantModal/components/ToolRecommendationItem'
import { skillsStore } from '@/store/skills'
import { FieldRecommendation, RecommendationAction } from '@/types/entity/assistant'
import { SkillAIRefineFields, SkillAIRefineResponse } from '@/types/entity/skill'

interface RefineSkillModalProps {
  visible: boolean
  refineFields: SkillAIRefineFields
  onHide: () => void
  onApplyFieldSuggestions: (fields: FieldRecommendation[]) => void
  onApplyToolSuggestions: (
    tools: Array<{ toolkitName: string; name: string; action: string; reason: string }>
  ) => void
  getRefineFieldValue: (
    fieldName: string,
    refineFields: SkillAIRefineFields
  ) => string | string[] | null
  getRefineFieldRecommendation: (
    fieldRecommendation: FieldRecommendation,
    refineFields: SkillAIRefineFields
  ) => string | string[] | null
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
}

const RefineSkillModal: React.FC<RefineSkillModalProps> = ({
  visible,
  onHide,
  refineFields,
  onApplyFieldSuggestions,
  onApplyToolSuggestions,
  getRefineFieldValue,
  getRefineFieldRecommendation,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<SkillAIRefineResponse | null>(null)
  const [appliedRecommendations, setAppliedRecommendations] = useState<AppliedRecommendations>({
    fields: new Set(),
    tools: new Set(),
  })

  useEffect(() => {
    if (visible && !response && !loading) {
      setLoading(true)
      setError(null)
      setAppliedRecommendations({ fields: new Set(), tools: new Set() })

      skillsStore
        .refineSkillWithAI(refineFields)
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
      setAppliedRecommendations({ fields: new Set(), tools: new Set() })
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

  const fieldRecommendations = useMemo(() => response?.fields ?? [], [response])

  const toolRecommendations = useMemo(() => {
    const tools: ToolRecommendation[] = []
    if (response?.toolkits) {
      response.toolkits.forEach((toolkit) => {
        toolkit.tools.forEach((tool) => {
          const isCurrentlySelected = getCurrentlySelectedTools.has(tool.name)
          const toolKey = `${toolkit.toolkit}-${tool.name}`
          const action = isCurrentlySelected ? tool.action : RecommendationAction.CHANGE
          tools.push({
            toolkitName: toolkit.toolkit,
            name: tool.name,
            action,
            reason: tool.reason ?? '',
            isCurrentlySelected,
            isApplied: appliedRecommendations.tools.has(toolKey),
            displayAction:
              action === RecommendationAction.CHANGE ? RecommendationAction.ADD : action,
          })
        })
      })
    }
    return tools
  }, [response, getCurrentlySelectedTools, appliedRecommendations.tools])

  const actionableRecommendations = useMemo(() => {
    const actionableFields = fieldRecommendations
    const actionableTools = toolRecommendations.filter(
      (tool) => tool.action !== RecommendationAction.KEEP
    )
    return {
      fields: actionableFields,
      tools: actionableTools,
      total: actionableFields.length + actionableTools.length,
    }
  }, [fieldRecommendations, toolRecommendations])

  const unappliedActionableRecommendations = useMemo(() => {
    const unappliedFields = actionableRecommendations.fields.filter(
      (field) => !appliedRecommendations.fields.has(field.name)
    )
    const unappliedTools = actionableRecommendations.tools.filter(
      (tool) => !appliedRecommendations.tools.has(`${tool.toolkitName}-${tool.name}`)
    )
    return {
      fields: unappliedFields,
      tools: unappliedTools,
      total: unappliedFields.length + unappliedTools.length,
    }
  }, [actionableRecommendations, appliedRecommendations])

  const hasUnappliedChanges = unappliedActionableRecommendations.total > 0

  const handleApplyFieldSuggestion = (field: FieldRecommendation) => {
    onApplyFieldSuggestions([field])
    setAppliedRecommendations((prev) => ({
      ...prev,
      fields: new Set(prev.fields).add(field.name),
    }))
  }

  const handleApplyToolSuggestion = (tool: ToolRecommendation) => {
    onApplyToolSuggestions([
      { toolkitName: tool.toolkitName, name: tool.name, action: tool.action, reason: tool.reason },
    ])
    const toolKey = `${tool.toolkitName}-${tool.name}`
    setAppliedRecommendations((prev) => ({
      ...prev,
      tools: new Set(prev.tools).add(toolKey),
    }))
  }

  const handleApplyAllSuggestions = () => {
    if (unappliedActionableRecommendations.fields.length > 0) {
      onApplyFieldSuggestions(unappliedActionableRecommendations.fields)
      setAppliedRecommendations((prev) => ({
        ...prev,
        fields: new Set([
          ...prev.fields,
          ...unappliedActionableRecommendations.fields.map((f) => f.name),
        ]),
      }))
    }

    if (unappliedActionableRecommendations.tools.length > 0) {
      onApplyToolSuggestions(
        unappliedActionableRecommendations.tools.map((tool) => ({
          toolkitName: tool.toolkitName,
          name: tool.name,
          action: tool.action,
          reason: tool.reason,
        }))
      )
      setAppliedRecommendations((prev) => ({
        ...prev,
        tools: new Set([
          ...prev.tools,
          ...unappliedActionableRecommendations.tools.map((t) => `${t.toolkitName}-${t.name}`),
        ]),
      }))
    }
  }

  const handleRetry = () => {
    setError(null)
    setResponse(null)
    setLoading(true)
    skillsStore
      .refineSkillWithAI(refineFields)
      .then((result) => setResponse(result))
      .catch((err) => setError(err.message || 'Failed to get AI suggestions'))
      .finally(() => setLoading(false))
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center pb-12 pt-6">
          <Spinner inline className="w-8 h-8" />
          <p className="mt-4 text-sm text-text-quaternary">Analyzing your Skill configuration</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-failed-secondary mb-4 flex flex-col items-center">
            <StatusWarningSVG className="w-12 h-12 mb-4" />
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
      const { total } = actionableRecommendations
      return (
        <div className="space-y-6">
          <div className="bg-magical-button rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <AIGenerateSVG className="text-white text-base flex-shrink-0 mt-1" />
              <h3 className="text-base font-semibold text-white">Analysis Summary</h3>
            </div>
            {total === 0 ? (
              <p className="text-sm text-white/90 leading-relaxed">
                Your skill looks great! AI found no fields that need improvements.
              </p>
            ) : (
              <p className="text-sm text-white/90 leading-relaxed">
                {actionableRecommendations.fields.length > 0 &&
                  `Identified ${actionableRecommendations.fields.length} field${
                    actionableRecommendations.fields.length > 1 ? 's' : ''
                  } that can be improved`}
                {actionableRecommendations.fields.length > 0 &&
                  actionableRecommendations.tools.length > 0 &&
                  ' and '}
                {actionableRecommendations.tools.length > 0 &&
                  `${actionableRecommendations.tools.length} tool${
                    actionableRecommendations.tools.length > 1 ? 's' : ''
                  } recommendation${actionableRecommendations.tools.length > 1 ? 's' : ''}`}
                . Review the suggestions below and apply the ones most relevant for your skill.
              </p>
            )}
          </div>

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
            {unappliedActionableRecommendations.total} change(s) available (
            {unappliedActionableRecommendations.fields.length} field(s),{' '}
            {unappliedActionableRecommendations.tools.length} tool(s))
          </span>
        ) : (
          <span>All looks good!</span>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant={ButtonType.BASE} onClick={onHide}>
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

export default RefineSkillModal
