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

import { describe, expect, it } from 'vitest'

import type { UaSettingSpec, UaSettingsSchema, UaStoredOverrides } from '@/types/usageAttribution'

import { UA_LINK_PARAM } from '../constants'
import { restoreSaved } from '../hooks/useSettingsOverrides'
import {
  buildSettingsLink,
  encodedSize,
  readSettingsLink,
  sanitizeOverrides,
} from '../settings/settingsModel'

const spec = (
  fields: Pick<UaSettingSpec, 'key' | 'type' | 'default'> & Partial<UaSettingSpec>
): UaSettingSpec => ({
  group: 'display',
  tier: 'view',
  label: fields.key,
  description: '',
  min: null,
  max: null,
  step: null,
  unit: null,
  max_items: null,
  max_item_length: null,
  ...fields,
})

const SCHEMA: UaSettingsSchema = {
  schema_version: 3,
  defaults_hash: 'defaults-3',
  can_tune: true,
  can_refresh: true,
  enrichment: true,
  tuning: {
    enabled: true,
    roles: ['admin', 'maintainer'],
    max_override_bytes: 4096,
    max_custom_computations_per_hour: 10,
    max_computations_per_hour: 60,
  },
  tiers: [
    { id: 'view', label: 'Display only', description: '' },
    { id: 'analysis', label: 'New analysis', description: '' },
    { id: 'fetch', label: 'New Elasticsearch read', description: '' },
  ],
  groups: [{ id: 'display', label: 'Display', tier: 'view' }],
  settings: [
    spec({
      key: 'sharedProjectThresholdPer30Days',
      type: 'money',
      default: 100,
      min: 0,
      max: 10_000,
    }),
    spec({ key: 'minimumConfidence', type: 'share', default: 0.6, min: 0.3, max: 0.95 }),
    spec({ key: 'repositoriesPerPerson', type: 'int', default: 10, min: 1, max: 50 }),
    spec({ key: 'personHistory.enabled', type: 'bool', default: true }),
    spec({
      key: 'excludedRepositories',
      type: 'list',
      default: [],
      max_items: 50,
      max_item_length: 100,
    }),
    spec({
      key: 'ownerProjectRules',
      type: 'rules',
      default: [],
      max_items: 50,
      max_item_length: 100,
    }),
  ],
  fixed: {
    signal_points: {},
    max_range_days: 365,
    analysis_cache_minutes: 15,
    analysis_timeout_seconds: 120,
    fallback_field_since: '2026-01-01',
  },
}

/** The #fragment of a shared link that carries this JSON text (ASCII), as "Copy link" encodes it. */
const linkHash = (json: string): string =>
  `#${UA_LINK_PARAM}=${btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

/** What the tab does with a shared link: read the fragment, then check it against the schema. */
const openLink = (json: string) =>
  sanitizeOverrides(SCHEMA, readSettingsLink(linkHash(json), UA_LINK_PARAM))

describe('settings model — a shared settings link', () => {
  it('keeps the valid values that differ from the defaults', () => {
    const { overrides, dropped } = openLink(
      '{"sharedProjectThresholdPer30Days":500,"minimumConfidence":0.6,"excludedRepositories":[" a/b ","a/b"]}'
    )

    expect(overrides).toEqual({
      sharedProjectThresholdPer30Days: 500,
      excludedRepositories: ['a/b'],
    })
    expect(dropped).toBe(0)
  })

  it('drops and counts the settings the schema does not know', () => {
    const { overrides, dropped } = openLink(
      '{"sharedProjectThresholdPer30Days":500,"maxRangeDays":3650,"analysisCacheMinutes":0}'
    )

    expect(overrides).toEqual({ sharedProjectThresholdPer30Days: 500 })
    expect(dropped).toBe(2)
  })

  it.each(['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty'])(
    'drops a "%s" key without touching any prototype',
    (key) => {
      const { overrides, dropped } = openLink(
        `{"${key}":{"polluted":true,"can_tune":true},"sharedProjectThresholdPer30Days":500}`
      )

      expect(dropped).toBe(1)
      expect(Object.keys(overrides)).toEqual(['sharedProjectThresholdPer30Days'])
      expect(Object.getPrototypeOf(overrides)).toBe(Object.prototype)
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false)
    }
  )

  it.each([
    ['money above the maximum', 'sharedProjectThresholdPer30Days', 10_001],
    ['money below the minimum', 'sharedProjectThresholdPer30Days', -1],
    ['a share above the maximum', 'minimumConfidence', 0.99],
    ['a share below the minimum', 'minimumConfidence', 0.1],
    ['a whole number with a fraction', 'repositoriesPerPerson', 2.5],
    ['a whole number above the maximum', 'repositoriesPerPerson', 51],
    ['a number as text', 'sharedProjectThresholdPer30Days', '500'],
    ['a switch as text', 'personHistory.enabled', 'false'],
    ['a list that is not a list', 'excludedRepositories', 'a/b'],
    [
      'a list with too many values',
      'excludedRepositories',
      Array.from({ length: 51 }, (_, i) => `r${i}`),
    ],
    ['a list with a value too long', 'excludedRepositories', ['x'.repeat(101)]],
    ['a rule with a slash in the owner', 'ownerProjectRules', [{ owner: 'a/b', project: 'p' }]],
    ['a rule of wildcards only', 'ownerProjectRules', [{ owner: '*', project: 'p' }]],
    ['a rule without a project', 'ownerProjectRules', [{ owner: 'payments', project: ' ' }]],
  ])('drops %s', (_case, key, value) => {
    const { overrides, dropped } = openLink(JSON.stringify({ [key]: value }))

    expect(overrides).toEqual({})
    expect(dropped).toBe(1)
  })

  it.each(['[1,2]', 'null', '"text"', '42'])(
    'ignores a link whose JSON is not an object: %s',
    (json) => {
      expect(openLink(json)).toEqual({ overrides: {}, dropped: 0 })
    }
  )

  it.each([
    ['not base64url', `#${UA_LINK_PARAM}=<script>`],
    ['not JSON', `#${UA_LINK_PARAM}=bm90IGpzb24`],
    ['another parameter', '#other=eyJ4IjoxfQ'],
  ])('reads nothing from a fragment that is %s', (_case, hash) => {
    expect(readSettingsLink(hash, UA_LINK_PARAM)).toBeNull()
  })

  it('reads back what "Copy link" wrote', () => {
    const values = {
      sharedProjectThresholdPer30Days: 500,
      ownerProjectRules: [{ owner: 'payments', project: 'northwind-payments' }],
    }
    const link = buildSettingsLink(values, UA_LINK_PARAM, {
      origin: 'https://codemie.example.com',
      pathname: '/analytics',
      search: '?tab=usageAttribution',
    } as Location)

    const read = readSettingsLink(new URL(link).hash, UA_LINK_PARAM)

    expect(sanitizeOverrides(SCHEMA, read)).toEqual({ overrides: values, dropped: 0 })
  })

  it('measures a link over the byte cap, which Analysis Settings then refuses to apply', () => {
    // Every value is valid on its own: 50 repositories of 90 characters.
    const repositories = Array.from({ length: 50 }, (_, i) => `${i}`.padStart(90, 'r'))
    const { overrides, dropped } = openLink(JSON.stringify({ excludedRepositories: repositories }))

    expect(dropped).toBe(0)
    expect(encodedSize(overrides)).toBeGreaterThan(SCHEMA.tuning.max_override_bytes)
  })
})

describe('settings model — restoring the saved settings', () => {
  const saved = (fields: Partial<UaStoredOverrides> = {}): UaStoredOverrides => ({
    schemaVersion: SCHEMA.schema_version,
    defaultsHash: SCHEMA.defaults_hash,
    overrides: { sharedProjectThresholdPer30Days: 500 },
    updatedAt: '2026-10-13T10:00:00Z',
    ...fields,
  })

  it('applies settings saved for the same schema and defaults, and rewrites nothing', () => {
    expect(restoreSaved(SCHEMA, saved())).toEqual({
      overrides: { sharedProjectThresholdPer30Days: 500 },
      notices: [],
      rewrite: undefined,
    })
  })

  it('has nothing to restore when nothing was saved', () => {
    expect(restoreSaved(SCHEMA, null)).toEqual({ overrides: {}, notices: [], rewrite: undefined })
  })

  it('clears settings saved for another schema version', () => {
    expect(restoreSaved(SCHEMA, saved({ schemaVersion: 2 }))).toEqual({
      overrides: {},
      notices: [
        'Your saved analysis settings were made for an older version of this tab and were cleared.',
      ],
      rewrite: null,
    })
  })

  it('keeps settings saved under other defaults, says so, and stores the new defaults hash', () => {
    const restored = restoreSaved(SCHEMA, saved({ defaultsHash: 'defaults-2' }))

    expect(restored.overrides).toEqual({ sharedProjectThresholdPer30Days: 500 })
    expect(restored.notices).toEqual([
      'The defaults changed since you saved your settings; review them in Analysis Settings.',
    ])
    expect(restored.rewrite).toMatchObject({
      schemaVersion: SCHEMA.schema_version,
      defaultsHash: 'defaults-3',
      overrides: { sharedProjectThresholdPer30Days: 500 },
    })
  })

  it('removes saved settings that now equal the new defaults', () => {
    const restored = restoreSaved(
      SCHEMA,
      saved({ defaultsHash: 'defaults-2', overrides: { sharedProjectThresholdPer30Days: 100 } })
    )

    expect(restored).toEqual({ overrides: {}, notices: [], rewrite: null })
  })

  it('drops saved settings that are no longer valid, a __proto__ key among them', () => {
    const restored = restoreSaved(
      SCHEMA,
      saved({
        overrides: JSON.parse(
          '{"__proto__":{"polluted":true},"removedSetting":1,"repositoriesPerPerson":500,"sharedProjectThresholdPer30Days":500}'
        ),
      })
    )

    expect(restored.overrides).toEqual({ sharedProjectThresholdPer30Days: 500 })
    expect(restored.notices).toEqual(['3 saved settings are no longer valid and were dropped.'])
    expect(restored.rewrite).toMatchObject({ overrides: { sharedProjectThresholdPer30Days: 500 } })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('removes the saved settings when none is valid any more', () => {
    const restored = restoreSaved(SCHEMA, saved({ overrides: { removedSetting: 1 } }))

    expect(restored.overrides).toEqual({})
    expect(restored.notices).toEqual(['1 saved setting is no longer valid and was dropped.'])
    expect(restored.rewrite).toBeNull()
  })

  it('does not apply saved settings when the user cannot tune them (can_tune false), and keeps them', () => {
    const restored = restoreSaved({ ...SCHEMA, can_tune: false }, saved())

    expect(restored).toEqual({
      overrides: {},
      notices: [
        'Your saved analysis settings are not applied: only admins and maintainers can change them.',
      ],
      rewrite: undefined,
    })
  })
})
