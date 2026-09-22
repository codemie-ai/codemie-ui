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

import { isAdvancedConfigField } from '@/pages/workflows/editor/utils/visualEditorFieldRegistry'
import { StateConfiguration } from '@/types/workflowEditor/configuration'
import {
  getStateNext,
  isDecisionState,
  isIterator,
  isNoteState,
} from '@/utils/workflowEditor/helpers/states'

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function omitNonSemanticFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (key === '_meta') {
      const meta = obj._meta
      if (isPlainRecord(meta) && meta.type !== undefined) {
        result._meta = { type: meta.type }
      }
      continue
    }
    if (isAdvancedConfigField(key)) continue
    result[key] = obj[key]
  }
  return result
}

const TOPOLOGY_NEXT_KEYS = new Set([
  'state_id',
  'state_ids',
  'meta_next_state_id',
  'meta_iter_state_id',
  'condition',
  'switch',
  'iter_key',
])

function withoutTopology(next: unknown): unknown {
  if (!isPlainRecord(next)) return next

  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(next)) {
    if (TOPOLOGY_NEXT_KEYS.has(key)) continue
    rest[key] = value
  }

  return Object.keys(rest).length === 0 ? undefined : rest
}

function stripConditionTargets(condition: unknown): unknown {
  if (!isPlainRecord(condition)) return condition
  return { expression: condition.expression }
}

function stripSwitchTargets(sw: unknown): unknown {
  if (!isPlainRecord(sw)) return sw

  const { cases } = sw
  return {
    cases: Array.isArray(cases)
      ? cases.map((entry) => {
          if (!isPlainRecord(entry)) return entry
          return { condition: entry.condition }
        })
      : cases,
  }
}

function overlayCanvasOwnedFields(
  state: StateConfiguration,
  clean: Record<string, unknown>
): unknown {
  const next = getStateNext(state)

  if (isDecisionState(state)) {
    return {
      ...clean,
      condition: stripConditionTargets(next?.condition),
      switch: stripSwitchTargets(next?.switch),
    }
  }

  if (isIterator(state)) {
    return { ...clean, iter_key: next?.iter_key }
  }

  if (isNoteState(state)) {
    return { ...clean, note: state._meta?.data?.note }
  }

  return clean
}

function semanticSnapshot(state: StateConfiguration): unknown {
  const clean = omitNonSemanticFields(state as unknown as Record<string, unknown>)

  if ('next' in clean) {
    const stripped = withoutTopology(clean.next)
    if (stripped === undefined) {
      delete clean.next
    } else {
      clean.next = stripped
    }
  }

  return overlayCanvasOwnedFields(state, clean)
}

export function stableJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableJson).join(',')}]`
  const keys = Object.keys(obj as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${stableJson((obj as Record<string, unknown>)[k])}`
  )
  return `{${pairs.join(',')}}`
}

export function semanticallyEqual(a: StateConfiguration, b: StateConfiguration): boolean {
  return stableJson(semanticSnapshot(a)) === stableJson(semanticSnapshot(b))
}
