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

import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { PromptVariable } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

interface PromptVariablesReviewProps {
  promptVariables: PromptVariable[]
  message?: string
}

export const PromptVariablesReview: React.FC<PromptVariablesReviewProps> = ({
  promptVariables,
  message = 'This assistant contains prompt variables that will be injected into the system prompt.',
}) => {
  const sensitiveVariables = promptVariables.filter((v) => v.is_sensitive)

  if (!promptVariables.length) return null

  return (
    <div className="mb-6">
      <h3 className="text-base text-text-quaternary font-medium mb-2">Prompt Variables Review</h3>
      <p className="text-sm mb-4">{message}</p>

      <div className="mb-4">
        <InfoWarning
          type={InfoWarningType.WARNING}
          message="Sensitive prompt variables will not be visible to other users, but will be injected into the system prompt when the assistant is invoked."
        />

        <div className="variables-list mt-4 border border-border-structural rounded-md p-4 bg-surface-base-secondary">
          {/* All variables section */}
          <div className="mb-3">
            <span className="text-sm font-medium text-text-primary">All Variables:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {promptVariables.map((variable, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'text-xs px-2 py-1 rounded flex items-center gap-1',
                    variable.is_sensitive
                      ? 'bg-aborted-tertiary text-aborted-primary border border-aborted-secondary'
                      : 'bg-surface-specific-dropdown-hover text-text-primary border border-border-structural'
                  )}
                >
                  {variable.is_sensitive && <i className="bi bi-shield-lock" />}
                  {variable.key}
                </span>
              ))}
            </div>
          </div>

          {/* Sensitive variables highlight */}
          {sensitiveVariables.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border-structural">
              <span className="text-sm font-medium text-aborted-primary">
                Sensitive Variables ({sensitiveVariables.length}):
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {sensitiveVariables.map((variable, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-aborted-tertiary text-aborted-primary border border-aborted-secondary flex items-center gap-1"
                  >
                    <i className="bi bi-shield-lock" />
                    {variable.key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
