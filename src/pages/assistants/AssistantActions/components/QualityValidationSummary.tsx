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

import React from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import {
  QualityValidationRecommendations,
  RecommendationAction,
  ToolkitRecommendation,
  FieldRecommendation,
  ContextRecommendation,
} from '@/types/entity/assistant'
import { humanize } from '@/utils/helpers'

import SeverityBadge from './SeverityBadge'

interface QualityAssessmentProps {
  recommendations: QualityValidationRecommendations
}

type ReasoningSectionProps = { field: FieldRecommendation }

const ReasoningSection: React.FC<ReasoningSectionProps> = ({ field }) => (
  <li className="py-3 px-4 rounded-lg bg-gradient1">
    <div className="flex flex-row gap-2 items-center justify-between">
      <div className="flex flex-row gap-2 items-center flex-1">
        <AIGenerateSVG className="text-base flex-shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-text-primary">{humanize(field.name)}</p>
      </div>
      <SeverityBadge severity={field.severity} />
    </div>
    {field.reason && (
      <p className="text-xs text-text-primary leading-relaxed mt-1">{field.reason}</p>
    )}
  </li>
)

type ToolkitSectionProps = { toolkit: ToolkitRecommendation }

const ToolkitSection: React.FC<ToolkitSectionProps> = ({ toolkit }) => {
  const toolsFiltered = toolkit.tools.filter(
    (tool) => tool.reason !== undefined && tool.action !== RecommendationAction.KEEP
  )

  if (toolsFiltered.length === 0) return null

  return (
    <li className="py-3 px-4 rounded-lg bg-gradient1">
      <div className="flex flex-row gap-2">
        <AIGenerateSVG className="text-base flex-shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-text-primary">{toolkit.toolkit} Toolkit</p>
      </div>
      <ul className="mt-2 space-y-2">
        {toolsFiltered.map((tool) => (
          <li key={`${toolkit.toolkit}-${tool.name}`} className="py-1">
            <div className="flex flex-row gap-2 items-center justify-between">
              <p className="text-xs font-semibold text-text-primary">{humanize(tool.name)}</p>
              <SeverityBadge severity={tool.severity} />
            </div>
            {tool.reason && (
              <p className="text-xs text-text-primary leading-relaxed mt-1">{tool.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

type ContextSectionProps = { context: ContextRecommendation }

const ContextSection: React.FC<ContextSectionProps> = ({ context }) => (
  <li className="py-3 px-4 rounded-lg bg-gradient1">
    <div className="flex flex-row gap-2 items-center justify-between">
      <div className="flex flex-row gap-2 items-center flex-1">
        <AIGenerateSVG className="text-base flex-shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-text-primary">
          Datasource {humanize(context.name)}
        </p>
      </div>
      <SeverityBadge severity={context.severity} />
    </div>
    {context.reason && (
      <p className="text-xs text-text-primary leading-relaxed mt-1">{context.reason}</p>
    )}
  </li>
)

const QualityAssessment: React.FC<QualityAssessmentProps> = ({
  recommendations: { fields, toolkits, context },
}) => {
  const fieldsFiltered = fields?.filter(
    (field) => field.reason !== undefined && field.action !== RecommendationAction.KEEP
  )

  const toolkitsFlatten = toolkits?.reduce((acc, toolkit) => {
    const existing = acc.find((t) => t.toolkit === toolkit.toolkit)
    if (existing) {
      existing.tools.push(...toolkit.tools)
    } else {
      acc.push({ ...toolkit })
    }
    return acc
  }, [] as ToolkitRecommendation[])

  const toolkitsFiltered = toolkitsFlatten?.filter((toolkit) =>
    toolkit.tools.some(
      (tool) => tool.reason !== undefined && tool.action !== RecommendationAction.KEEP
    )
  )

  const contextFiltered = context?.filter(
    (ctx) => ctx.reason !== undefined && ctx.action !== RecommendationAction.KEEP
  )

  const hasRecommendations =
    (fieldsFiltered?.length ?? 0) > 0 ||
    (toolkitsFiltered?.length ?? 0) > 0 ||
    (contextFiltered?.length ?? 0) > 0

  const renderContent = () => {
    if (hasRecommendations) {
      return (
        <ul className="mt-2 space-y-4">
          {fieldsFiltered?.map(
            (field) =>
              field.reason && <ReasoningSection field={field} key={`field-${field.name}`} />
          )}
          {toolkitsFiltered?.map((toolkit) => (
            <ToolkitSection toolkit={toolkit} key={`toolkit-${toolkit.toolkit}`} />
          ))}
          {contextFiltered?.map((ctx) => (
            <ContextSection context={ctx} key={`context-${ctx.name}`} />
          ))}
        </ul>
      )
    }

    return (
      <div className="mt-2 py-3 px-4 rounded-lg bg-gradient1">
        <div className="flex flex-row gap-2">
          <AIGenerateSVG className="text-base flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary leading-relaxed">
            The assistant configuration needs improvement to meet marketplace quality standards.
            Please update the assistant settings manually.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg px-6 py-4 max-h-96 overflow-y-auto show-scroll">
      <div className="flex flex-row gap-2">
        <p className="text-base text-text-primary font-sm font-semibold">Analysis Summary</p>
      </div>

      {renderContent()}
    </div>
  )
}

export default QualityAssessment
