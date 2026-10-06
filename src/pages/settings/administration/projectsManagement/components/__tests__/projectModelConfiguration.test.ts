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

import { ModelOption } from '@/types/entity/configuration'
import {
  DEFAULT_PROJECT_MODEL_SETTINGS,
  ProjectModelSettings,
} from '@/types/entity/projectModelSettings'

import {
  describeRouterAvailability,
  getConfigurableModels,
  getNewModelsPolicy,
  getRouterModels,
  isModelAvailable,
  selectionToSettings,
  settingsToSelection,
} from '../projectModelConfiguration'

const model = (value: string, extra: Partial<ModelOption> = {}): ModelOption => ({
  value,
  label: value,
  isDefault: false,
  ...extra,
})

const MODELS = [model('a'), model('b'), model('premium', { isPremium: true })]
const settings = (extra: Partial<ProjectModelSettings> = {}): ProjectModelSettings => ({
  ...DEFAULT_PROJECT_MODEL_SETTINGS,
  ...extra,
})

describe('projectModelConfiguration', () => {
  it('separates routers from the configurable checklist', () => {
    const models = [...MODELS, model('router', { isRouter: true })]

    expect(getConfigurableModels(models).map((m) => m.value)).toEqual(['a', 'b', 'premium'])
    expect(getRouterModels(models).map((m) => m.value)).toEqual(['router'])
  })

  it('maps the list mode to the new-models policy', () => {
    expect(getNewModelsPolicy('allow_list')).toBe('disable')
    expect(getNewModelsPolicy('deny_list')).toBe('enable')
    expect(getNewModelsPolicy('all')).toBe('enable')
  })

  it.each([
    [settings(), { a: 'enabled', b: 'enabled', premium: 'enabled' }],
    [
      settings({ mode: 'allow_list', models: ['a'] }),
      { a: 'enabled', b: 'disabled', premium: 'disabled' },
    ],
    [
      settings({ mode: 'deny_list', models: ['a'] }),
      { a: 'disabled', b: 'enabled', premium: 'enabled' },
    ],
  ])('derives the checklist from stored settings (%#)', (stored, expected) => {
    expect(settingsToSelection(stored, MODELS)).toEqual(expected)
  })

  it('stores an allow list when new models should stay hidden', () => {
    const result = selectionToSettings(settings(), { a: 'enabled', b: 'disabled' }, 'disable')

    expect(result).toMatchObject({ mode: 'allow_list', models: ['a'] })
  })

  it('stores a deny list, or no list at all, when new models should appear', () => {
    expect(
      selectionToSettings(settings(), { a: 'enabled', b: 'disabled' }, 'enable')
    ).toMatchObject({ mode: 'deny_list', models: ['b'] })
    expect(selectionToSettings(settings(), { a: 'enabled' }, 'enable')).toMatchObject({
      mode: 'all',
      models: [],
    })
  })

  it('keeps member overrides and other fields from the base settings', () => {
    const base = settings({
      default_model: 'a',
      member_overrides: { u1: { disabled_models: ['b'], default_model: null } },
    })

    const result = selectionToSettings(base, { a: 'enabled' }, 'enable')

    expect(result.default_model).toBe('a')
    expect(result.member_overrides).toEqual(base.member_overrides)
  })

  it('treats premium models as unavailable while premium hiding is on', () => {
    const selection = { a: 'enabled', premium: 'enabled' } as const

    expect(isModelAvailable(MODELS[0], selection, true)).toBe(true)
    expect(isModelAvailable(MODELS[2], selection, true)).toBe(false)
    expect(isModelAvailable(MODELS[2], selection, false)).toBe(true)
    expect(isModelAvailable(MODELS[1], { b: 'disabled' }, false)).toBe(false)
  })

  it('describes router availability the way the backend decides it', () => {
    expect(describeRouterAvailability(false, {}, false)).toMatch(/off/)
    expect(describeRouterAvailability(true, { a: 'enabled' }, false)).toMatch(
      /offered in model pickers/
    )
    expect(describeRouterAvailability(true, { a: 'disabled' }, false)).toMatch(
      /only when every model/
    )
    expect(describeRouterAvailability(true, { a: 'enabled' }, true)).toMatch(
      /only when every model/
    )
  })
})
