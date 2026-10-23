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

/**
 * Analysis settings overrides: validation against the GET /settings schema, encoding for `?overrides=`, links and
 * the YAML export. Pure functions, so the dialog, the storage and the tests share one implementation.
 */

import type {
  UaOwnerRule,
  UaSettingSpec,
  UaSettingValue,
  UaSettingsSchema,
  UaTier,
} from '@/types/usageAttribution'

export type OverridesMap = Record<string, UaSettingValue>

const TIER_RANK: Record<UaTier, number> = { view: 0, analysis: 1, fetch: 2 }

/** A Map, not an object: keys from a link or storage such as "constructor" must not find inherited members. */
export const specsByKey = (schema: UaSettingsSchema): Map<string, UaSettingSpec> =>
  new Map(schema.settings.map((s) => [s.key, s]))

/** Stable JSON: object keys sorted, so equal values compare and encode equally. */
export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    const entryText = ([k, v]: [string, unknown]) => `${JSON.stringify(k)}:${stableStringify(v)}`
    return `{${entries.map(entryText).join(',')}}`
  }
  return JSON.stringify(value)
}

export const sameValue = (a: unknown, b: unknown): boolean =>
  stableStringify(a) === stableStringify(b)

const formatBound = (spec: UaSettingSpec, value: number): string => {
  if (spec.type === 'money') return `$${value.toLocaleString('en-US')}`
  if (spec.type === 'share') return `${Math.round(value * 100)}%`
  return String(value)
}

/** The value as the dialog shows it, e.g. "$1,000", "60%", "on", "3 values". */
export const displayValue = (spec: UaSettingSpec, value: UaSettingValue | undefined): string => {
  if (value === undefined || value === null) return '—'
  switch (spec.type) {
    case 'money':
      return formatBound(spec, Number(value))
    case 'share':
      return formatBound(spec, Number(value))
    case 'bool':
      return value ? 'on' : 'off'
    case 'list': {
      const n = (value as string[]).length
      return n === 1 ? '1 value' : `${n} values`
    }
    case 'rules': {
      const n = (value as UaOwnerRule[]).length
      return n === 1 ? '1 rule' : `${n} rules`
    }
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

export const rangeText = (spec: UaSettingSpec): string =>
  spec.min !== null && spec.max !== null
    ? `${formatBound(spec, spec.min)} to ${formatBound(spec, spec.max)}`
    : ''

const validateList = (spec: UaSettingSpec, value: unknown): string => {
  const maxItems = spec.max_items ?? 50
  const maxLength = spec.max_item_length ?? 100
  if (!Array.isArray(value)) return 'A list of values'
  if (value.length > maxItems) return `Up to ${maxItems} values`
  const valid = value.every(
    (x) => typeof x === 'string' && x.trim() && x.trim().length <= maxLength
  )
  return valid ? '' : `Values of 1 to ${maxLength} characters`
}

/** '' for a valid owner of a rule, otherwise the message (the same rules as the backend). */
export const ruleOwnerError = (owner: string): string => {
  const bare = owner.trim().replace(/\/\*?$/, '')
  if (!bare) return 'Enter an owner'
  if (bare.includes('/')) return 'An owner has no slash: the rule covers all of its repositories'
  // An owner of wildcards only would pair thousands of repositories.
  if (bare.replace(/[*?[\]!]/g, '').length < 2)
    return 'An owner needs at least two characters besides wildcards'
  return ''
}

const isValidRule = (rule: unknown, maxLength: number): boolean => {
  if (!rule || typeof rule !== 'object') return false
  const { owner, project } = rule as UaOwnerRule
  if (typeof owner !== 'string' || typeof project !== 'string') return false
  return (
    !ruleOwnerError(owner) &&
    !!project.trim() &&
    owner.length <= maxLength &&
    project.length <= maxLength
  )
}

const validateRules = (spec: UaSettingSpec, value: unknown): string => {
  const maxItems = spec.max_items ?? 50
  if (!Array.isArray(value)) return 'A list of rules'
  if (value.length > maxItems) return `Up to ${maxItems} rules`
  return value.every((r) => isValidRule(r, spec.max_item_length ?? 100))
    ? ''
    : 'Each rule needs an owner (two characters or more besides wildcards, no slash) and a project'
}

const validateNumber = (spec: UaSettingSpec, value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Enter a number'
  if (spec.type === 'int' && !Number.isInteger(value)) return 'Whole numbers only'
  const below = spec.min !== null && value < spec.min - 1e-9
  const above = spec.max !== null && value > spec.max + 1e-9
  return below || above ? `Allowed ${rangeText(spec)}` : ''
}

/** '' when the value is valid for its setting, otherwise the message (the same rules as the backend). */
export const validateSetting = (spec: UaSettingSpec, value: unknown): string => {
  switch (spec.type) {
    case 'bool':
      return typeof value === 'boolean' ? '' : 'On or off'
    case 'list':
      return validateList(spec, value)
    case 'rules':
      return validateRules(spec, value)
    default:
      return validateNumber(spec, value)
  }
}

export const normalizeValue = (spec: UaSettingSpec, value: UaSettingValue): UaSettingValue => {
  if (spec.type === 'list') {
    const out: string[] = []
    for (const item of value as string[]) {
      const text = item.trim()
      if (text && !out.includes(text)) out.push(text)
    }
    return out
  }
  if (spec.type === 'rules') {
    const seen = new Set<string>()
    const out: UaOwnerRule[] = []
    for (const rule of value as UaOwnerRule[]) {
      const owner = rule.owner
        .trim()
        .replace(/\/\*?$/, '')
        .toLowerCase()
      if (seen.has(owner)) continue
      seen.add(owner)
      out.push({ owner, project: rule.project.trim() })
    }
    return out
  }
  return value
}

/** Keeps the valid values that differ from the defaults; counts the ones dropped (unknown or invalid). */
export const sanitizeOverrides = (
  schema: UaSettingsSchema,
  raw: unknown
): { overrides: OverridesMap; dropped: number } => {
  const specs = specsByKey(schema)
  const overrides: OverridesMap = {}
  let dropped = 0
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { overrides, dropped }
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const spec = specs.get(key)
    if (!spec || validateSetting(spec, value)) {
      dropped += 1
      continue
    }
    const normalized = normalizeValue(spec, value as UaSettingValue)
    if (!sameValue(normalized, spec.default)) overrides[key] = normalized
  }
  return { overrides, dropped }
}

export const changedKeys = (schema: UaSettingsSchema, map: OverridesMap): string[] => {
  const specs = specsByKey(schema)
  return Object.keys(map).filter((k) => {
    const spec = specs.get(k)
    return !!spec && !sameValue(map[k], spec.default)
  })
}

/** Only the changed, valid values: what is stored and sent. */
export const cleanOverrides = (schema: UaSettingsSchema, map: OverridesMap): OverridesMap => {
  const specs = specsByKey(schema)
  const out: OverridesMap = {}
  for (const key of changedKeys(schema, map).sort((a, b) => a.localeCompare(b))) {
    const spec = specs.get(key)
    if (spec && !validateSetting(spec, map[key])) out[key] = normalizeValue(spec, map[key])
  }
  return out
}

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string): string => {
  const padded =
    text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** base64url of the JSON of the overrides, or null when there are none. */
export const encodeOverrides = (map: OverridesMap): string | null =>
  Object.keys(map).length ? toBase64Url(stableStringify(map)) : null

export const decodeOverrides = (text: string): unknown => {
  try {
    return JSON.parse(fromBase64Url(text))
  } catch {
    return null
  }
}

export const encodedSize = (map: OverridesMap): number => encodeOverrides(map)?.length ?? 0

/** The costliest tier among the overridden settings: what applying them costs. */
export const tierOf = (schema: UaSettingsSchema, keys: string[]): UaTier | null => {
  const specs = specsByKey(schema)
  let tier: UaTier | null = null
  for (const key of keys) {
    const t = specs.get(key)?.tier
    if (t && (tier === null || TIER_RANK[t] > TIER_RANK[tier])) tier = t
  }
  return tier
}

/** The tiers of the settings that change between two override sets (what Apply recomputes). */
export const pendingTier = (
  schema: UaSettingsSchema,
  applied: OverridesMap,
  draft: OverridesMap
): UaTier | null => {
  const specs = specsByKey(schema)
  const keys = new Set([...Object.keys(applied), ...Object.keys(draft)])
  const changed = [...keys].filter((k) => {
    const spec = specs.get(k)
    if (!spec) return false
    const a = k in applied ? applied[k] : spec.default
    const d = k in draft ? draft[k] : spec.default
    return !sameValue(a, d)
  })
  return tierOf(schema, changed)
}

const yamlScalar = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value)
  return String(value)
}

/** A customer-config snippet with the changed values, ready to make them the defaults. */
export const toYaml = (map: OverridesMap): string => {
  const tree: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const parts = key.split('.')
    let node = tree
    parts.slice(0, -1).forEach((p) => {
      node[p] = (node[p] as Record<string, unknown>) ?? {}
      node = node[p] as Record<string, unknown>
    })
    node[parts[parts.length - 1]] = value
  }
  const lines = ['- id: "features:usageAttribution"', '  settings:']
  const walk = (obj: Record<string, unknown>, indent: string) => {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        if (!value.length) {
          lines.push(`${indent}${key}: []`)
        } else if (typeof value[0] === 'object') {
          lines.push(`${indent}${key}:`)
          ;(value as UaOwnerRule[]).forEach((rule) => {
            lines.push(`${indent}  - owner: ${yamlScalar(rule.owner)}`)
            lines.push(`${indent}    project: ${yamlScalar(rule.project)}`)
          })
        } else {
          lines.push(`${indent}${key}: [${value.map(yamlScalar).join(', ')}]`)
        }
      } else if (value && typeof value === 'object') {
        lines.push(`${indent}${key}:`)
        walk(value as Record<string, unknown>, `${indent}  `)
      } else {
        lines.push(`${indent}${key}: ${yamlScalar(value)}`)
      }
    }
  }
  walk(tree, '    ')
  return lines.join('\n')
}

/** A link to the current page that carries the settings in the URL fragment (never sent to the server). */
export const buildSettingsLink = (
  map: OverridesMap,
  param: string,
  location: Location = window.location
): string => {
  const encoded = encodeOverrides(map)
  const base = `${location.origin}${location.pathname}${location.search}`
  return encoded ? `${base}#${param}=${encoded}` : base
}

export const readSettingsLink = (hash: string, param: string): unknown => {
  const match = new RegExp(`[#&]${param}=([A-Za-z0-9_-]+)`).exec(hash)
  return match ? decodeOverrides(match[1]) : null
}
