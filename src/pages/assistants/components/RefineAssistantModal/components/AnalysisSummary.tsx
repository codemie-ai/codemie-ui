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

interface AnalysisSummaryProps {
  fieldsCount: number
  toolsCount: number
  contextsCount: number
}

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  fieldsCount,
  toolsCount,
  contextsCount,
}) => {
  const total = fieldsCount + toolsCount + contextsCount

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-success-primary mb-4 flex flex-col items-center">
          <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">Your assistant looks great!</p>
          <p className="text-sm text-text-quaternary mt-2">
            AI found no fields that need improvements.
          </p>
        </div>
      </div>
    )
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const buildMessage = () => {
    const parts: string[] = []

    if (fieldsCount > 0) {
      parts.push(`${fieldsCount} field${fieldsCount > 1 ? 's' : ''} that can be improved`)
    }

    if (toolsCount > 0) {
      parts.push(
        `${toolsCount} tool${toolsCount > 1 ? 's' : ''} recommendation${toolsCount > 1 ? 's' : ''}`
      )
    }

    if (contextsCount > 0) {
      parts.push(
        `${contextsCount} datasource${contextsCount > 1 ? 's' : ''} recommendation${
          contextsCount > 1 ? 's' : ''
        }`
      )
    }

    if (parts.length === 0) return ''

    if (parts.length === 1) {
      return `Identified ${parts[0]}.`
    }

    if (parts.length === 2) {
      return `Identified ${parts[0]} and ${parts[1]}.`
    }

    // parts.length === 3
    return `Identified ${parts[0]}, ${parts[1]}, and ${parts[2]}.`
  }

  return (
    <div className="bg-magical-button rounded-lg p-4">
      <div className="flex items-start gap-2 mb-2">
        <AIGenerateSVG className="text-white text-base flex-shrink-0 mt-1" />
        <h3 className="text-base font-semibold text-white">Analysis Summary</h3>
      </div>
      <p className="text-sm text-white text-opacity-90 leading-relaxed">
        {buildMessage()} Review the suggestions below and apply the ones most relevant for your
        assistant.
      </p>
    </div>
  )
}

export default AnalysisSummary
