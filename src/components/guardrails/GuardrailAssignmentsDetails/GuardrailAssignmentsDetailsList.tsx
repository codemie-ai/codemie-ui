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

import { guardrailModeLabel, guardrailSourceLabel } from '@/constants/guardrails'
import { EntityGuardrailAssignment } from '@/types/entity/guardrail'

interface GuardrailAssignmentsDetailsListProps {
  assignments: (EntityGuardrailAssignment & { name: string })[]
  title: string
}

const GuardrailAssignmentsDetailsList: React.FC<GuardrailAssignmentsDetailsListProps> = ({
  assignments,
  title,
}) => {
  if (!assignments.length) return null

  return (
    <div>
      <h6 className="text-text-quaternary mb-2">{title}</h6>
      <div className="flex flex-col gap-2">
        {assignments.map((item) => (
          <div
            key={`${item.guardrail_id}-${item.mode}-${item.source}`}
            className="py-2 px-3 flex flex-col gap-1 rounded-lg bg-surface-base-secondary border border-border-specific-panel-outline"
          >
            <h5 className="font-semibold text-text-primary">{item.name}</h5>
            <div className="flex gap-4 text-text-quaternary">
              <p className="w-28">Source: {guardrailSourceLabel[item.source]}</p>
              <p className="w-28">Mode: {guardrailModeLabel[item.mode]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GuardrailAssignmentsDetailsList
