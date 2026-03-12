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

import { useState, useEffect } from 'react'

import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import { guardrailStore } from '@/store/guardrail'
import { EntityGuardrailAssignment, GuardrailEntity } from '@/types/entity/guardrail'
import { cn } from '@/utils/utils'

import GuardrailAssignmentsDetailsList from './GuardrailAssignmentsDetailsList'

interface GuardrailAssignmentsDetailsProps {
  project?: string
  entity: GuardrailEntity
  entityId: string
  guardrailAssignments: EntityGuardrailAssignment[]
  className?: string
}

interface GuardrailWithName extends EntityGuardrailAssignment {
  name: string
}

const addGuardrailNames = (
  assignments: EntityGuardrailAssignment[],
  namesMap: Map<string, string>
): GuardrailWithName[] => {
  return assignments.map((a) => ({
    ...a,
    name: namesMap.get(a.guardrail_id) ?? a.guardrail_id,
  }))
}

const GuardrailAssignmentsDetails = ({
  project,
  entity,
  entityId,
  guardrailAssignments,
  className,
}: GuardrailAssignmentsDetailsProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [globalAssignments, setGlobalAssignments] = useState<GuardrailWithName[]>([])
  const [entityAssignments, setEntityAssignments] = useState<GuardrailWithName[]>([])
  const [hasProjectGuardrails, setHasProjectGuardrails] = useState(false)

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!project) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const { data: projectGuardrails } = await guardrailStore.fetchGuardrails(
          { project },
          0,
          1000
        )

        if (projectGuardrails.length === 0) {
          setHasProjectGuardrails(false)
          setGlobalAssignments([])
          setEntityAssignments([])
          setIsLoading(false)
          return
        }

        setHasProjectGuardrails(true)

        const namesMap = new Map<string, string>()
        for (const guardrail of projectGuardrails) {
          namesMap.set(guardrail.guardrailId, guardrail.name)
        }

        const allEntityAssignments = await guardrailStore.fetchEntityAssignments(project, entity)
        const globalRaw = allEntityAssignments.filter((a) => a.entity_id !== entityId)

        const globalMap = new Map<string, (typeof allEntityAssignments)[0]>()
        for (const assignment of globalRaw) {
          const existing = globalMap.get(assignment.guardrail_id)

          if (!existing || assignment.scope === GuardrailEntity.PROJECT) {
            globalMap.set(assignment.guardrail_id, assignment)
          }
        }

        const global = Array.from(globalMap.values()).map((a) => ({
          guardrail_id: a.guardrail_id,
          mode: a.mode,
          source: a.source,
          editable: true,
        }))

        const globalGuardrailIds = global.map((a) => a.guardrail_id)

        const entityOnly = guardrailAssignments.filter(
          (a) => !globalGuardrailIds.includes(a.guardrail_id)
        )

        setGlobalAssignments(addGuardrailNames(global, namesMap))
        setEntityAssignments(addGuardrailNames(entityOnly, namesMap))
      } catch (error) {
        console.error('Error fetching guardrail assignments:', error)
        setEntityAssignments(guardrailAssignments.map((a) => ({ ...a, name: a.guardrail_id })))
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssignments()
  }, [project, entity, entityId, guardrailAssignments])

  if (isLoading || !hasProjectGuardrails) return null

  const hasAnyAssignments = globalAssignments.length > 0 || entityAssignments.length > 0

  return (
    <DetailsSidebarSection headline="GUARDRAILS" itemsWrapperClassName="-mt-2">
      {!hasAnyAssignments ? (
        <p className="text-xs text-text-secondary">No assigned guardrails</p>
      ) : (
        <div className={cn('text-xs flex flex-col gap-3', className)}>
          <GuardrailAssignmentsDetailsList title="Global" assignments={globalAssignments} />
          <GuardrailAssignmentsDetailsList title="Individual" assignments={entityAssignments} />
        </div>
      )}
    </DetailsSidebarSection>
  )
}

export default GuardrailAssignmentsDetails
