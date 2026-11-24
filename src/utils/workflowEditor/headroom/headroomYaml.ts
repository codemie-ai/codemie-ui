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
import type { HeadroomOverride, HeadroomStrategy } from '@/types/entity/assistant'

export type HeadroomField = keyof Required<HeadroomOverride>

export const HEADROOM_STRATEGIES: HeadroomStrategy[] = ['lossless', 'balanced', 'aggressive']

export const HEADROOM_BOOLEAN_FIELDS = [
  'enabled',
  'compress_user_messages',
  'compress_tool_outputs',
] as const

export const HEADROOM_KEYS: HeadroomField[] = [...HEADROOM_BOOLEAN_FIELDS, 'strategy']

export const HEADROOM_DEFAULTS: Required<HeadroomOverride> = {
  enabled: false,
  compress_user_messages: true,
  compress_tool_outputs: true,
  strategy: 'balanced',
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The block to write into the YAML, or undefined (key omitted) when it carries no overrides. */
export function buildHeadroom(block: HeadroomOverride | undefined): HeadroomOverride | undefined {
  return block && Object.keys(block).length ? block : undefined
}

/**
 * Sets or removes one field. Returns undefined when the block ends up empty.
 * Other keys are kept as written, invalid or unknown ones included: the backend validates the YAML.
 */
export function setHeadroomField<K extends HeadroomField>(
  block: HeadroomOverride | undefined,
  key: K,
  value: HeadroomOverride[K] | undefined
): HeadroomOverride | undefined {
  const next: HeadroomOverride = isPlainObject(block) ? { ...block } : {}
  if (value === undefined) {
    delete next[key]
  } else {
    next[key] = value
  }
  return buildHeadroom(next)
}

export type HeadroomSource = 'node' | 'workflow' | 'assistant' | 'default'

export function resolveEffective<K extends HeadroomField>(
  field: K,
  node: HeadroomOverride | undefined,
  workflow: HeadroomOverride | undefined,
  assistant?: HeadroomOverride | null
): { value: Required<HeadroomOverride>[K]; source: HeadroomSource } {
  const layers: [HeadroomSource, HeadroomOverride | null | undefined][] = [
    ['node', node],
    ['workflow', workflow],
    ['assistant', assistant],
  ]
  const hit = layers.find(([, layer]) => layer?.[field] !== undefined)
  if (hit) {
    return { value: hit[1]![field] as Required<HeadroomOverride>[K], source: hit[0] }
  }
  return { value: HEADROOM_DEFAULTS[field], source: 'default' }
}
