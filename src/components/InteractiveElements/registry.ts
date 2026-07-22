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

import type { InteractiveElement, InteractiveFeaturesConfig } from '@/types/entity/interactive'

/**
 * Single source of truth for the interactive-element CATALOG on the frontend.
 *
 * The wire discriminator, which feature enables an element, its human label (for the
 * assistant-config catalog list) and whether it carries an answer all live here — so
 * the catalog is data, not hardcoded names scattered across components. To add an
 * element type, add a descriptor here (plus its renderer in InteractiveSurface and, for
 * inputs, its validator) — nothing else enumerates the catalog.
 *
 * Mirrors the backend registry (core/interactive.py). The backend remains authoritative
 * for gating what an agent may emit; this drives FE rendering/collection/validation and
 * the config catalog display.
 */

export type InteractiveFeatureKey = keyof InteractiveFeaturesConfig

export interface ElementDescriptor {
  type: InteractiveElement['type']
  /** PRIMARY feature flag that enables this element in the config catalog; null = layout
   *  (always on). An element may be enabled by more than one feature on the backend
   *  (e.g. `button` also via `short_forms`); this is only its main grouping for display. */
  feature: InteractiveFeatureKey | null
  label: string
  isInput: boolean
}

export const ELEMENT_REGISTRY: ElementDescriptor[] = [
  { type: 'text', feature: null, label: 'Text', isInput: false },
  { type: 'column', feature: null, label: 'Column', isInput: false },
  { type: 'row', feature: null, label: 'Row', isInput: false },
  { type: 'button', feature: 'action_buttons', label: 'Buttons', isInput: false },
  { type: 'multiple_choice', feature: 'choice', label: 'Multiple choice', isInput: true },
  { type: 'dropdown', feature: 'choice', label: 'Dropdown', isInput: true },
  { type: 'text_field', feature: 'short_forms', label: 'Text fields', isInput: true },
  { type: 'checkbox', feature: 'short_forms', label: 'Checkboxes', isInput: true },
  { type: 'date_picker', feature: 'short_forms', label: 'Date picker', isInput: true },
]

/** Catalog element labels grouped by the feature that enables them (for the config UI). */
export const elementsByFeature = (): Record<InteractiveFeatureKey, string[]> => {
  const grouped = { action_buttons: [], choice: [], short_forms: [] } as Record<
    InteractiveFeatureKey,
    string[]
  >
  for (const descriptor of ELEMENT_REGISTRY) {
    if (descriptor.feature) grouped[descriptor.feature].push(descriptor.label)
  }
  return grouped
}

/** Flat list of every non-layout catalog element label (for a single-toggle catalog view). */
export const catalogElementLabels = (): string[] =>
  ELEMENT_REGISTRY.filter((descriptor) => descriptor.feature !== null).map(
    (descriptor) => descriptor.label
  )
