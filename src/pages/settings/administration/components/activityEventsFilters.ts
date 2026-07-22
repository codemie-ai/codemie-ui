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

import { ActivityEventFilterOptions } from '@/types/entity/activityEvent'

export function computeFilteredOptions(
  filterOptions: ActivityEventFilterOptions | null,
  selectedDomains: string[]
): { eventTypeOptions: string[]; entityTypeOptions: string[] } {
  if (!filterOptions) return { eventTypeOptions: [], entityTypeOptions: [] }
  if (!selectedDomains.length) {
    return {
      eventTypeOptions: [...filterOptions.event_types].sort((a, b) => a.localeCompare(b)),
      entityTypeOptions: [...filterOptions.entity_types].sort((a, b) => a.localeCompare(b)),
    }
  }
  const eventTypes = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.event_types ?? [])
  )
  const entityTypes = new Set(
    selectedDomains.flatMap((d) => filterOptions.mapping[d]?.entity_types ?? [])
  )
  return {
    eventTypeOptions: [...eventTypes].sort((a, b) => a.localeCompare(b)),
    entityTypeOptions: [...entityTypes].sort((a, b) => a.localeCompare(b)),
  }
}

export function revalidateSelections(
  filterOptions: ActivityEventFilterOptions | null,
  selectedDomains: string[],
  selectedEventTypes: string[],
  selectedEntityTypes: string[]
): { eventType: string[]; entityType: string[] } {
  if (!filterOptions || !selectedDomains.length) {
    return { eventType: selectedEventTypes, entityType: selectedEntityTypes }
  }
  const { eventTypeOptions, entityTypeOptions } = computeFilteredOptions(
    filterOptions,
    selectedDomains
  )
  const allowedEvents = new Set(eventTypeOptions)
  const allowedEntities = new Set(entityTypeOptions)
  return {
    eventType: selectedEventTypes.filter((e) => allowedEvents.has(e)),
    entityType: selectedEntityTypes.filter((t) => allowedEntities.has(t)),
  }
}
