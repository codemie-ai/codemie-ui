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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Yup from 'yup'

import { appInfoStore } from '@/store/appInfo'
import { EffortLevel } from '@/types/entity/assistant'
import { ModelOption } from '@/types/entity/configuration'

import { getEffortLevels, buildEffortRule, isWarningEffortLevel } from '../effortConstraints'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { llmModels: [] as ModelOption[] },
}))

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

describe('getEffortLevels', () => {
  beforeEach(() => {
    appInfoStore.llmModels = []
  })

  it('returns [] when the store has no matching model (store miss)', () => {
    appInfoStore.llmModels = [
      model({ value: 'gpt-4o-2024-08-06', effortLevels: [EffortLevel.LOW, EffortLevel.HIGH] }),
    ]
    expect(getEffortLevels('does-not-exist')).toEqual([])
  })

  it('returns [] when the matching model has no effortLevels', () => {
    appInfoStore.llmModels = [model({ value: 'gpt-4o-2024-08-06' })]
    expect(getEffortLevels('gpt-4o-2024-08-06')).toEqual([])
  })

  it("returns the model's own effortLevels array when present", () => {
    appInfoStore.llmModels = [
      model({
        value: 'claude-sonnet-4',
        effortLevels: [
          EffortLevel.LOW,
          EffortLevel.MEDIUM,
          EffortLevel.HIGH,
          EffortLevel.XHIGH,
          EffortLevel.MAX,
        ],
      }),
    ]
    expect(getEffortLevels('claude-sonnet-4')).toEqual([
      EffortLevel.LOW,
      EffortLevel.MEDIUM,
      EffortLevel.HIGH,
      EffortLevel.XHIGH,
      EffortLevel.MAX,
    ])
  })

  it('returns [] for undefined model value', () => {
    expect(getEffortLevels(undefined)).toEqual([])
  })
})

describe('buildEffortRule', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({
        value: 'claude-sonnet-4',
        effortLevels: [EffortLevel.LOW, EffortLevel.MEDIUM, EffortLevel.HIGH],
      }),
      model({ value: 'gpt-4o-2024-08-06' }),
    ]
  })

  const wrap = () =>
    Yup.object({
      llm_model_type: Yup.string(),
      effort: buildEffortRule(),
    })

  it('accepts a level that IS in the resolved model effortLevels', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-sonnet-4', effort: EffortLevel.MEDIUM })
    ).resolves.toBeDefined()
  })

  it('rejects a level that is NOT in that list', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-sonnet-4', effort: 'ultra' })
    ).rejects.toThrow(/Effort is not supported for this model/)
  })

  it('is a no-op (accepts anything, including undefined) when the model has no effortLevels', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', effort: 'anything' })
    ).resolves.toBeDefined()
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', effort: undefined })
    ).resolves.toBeDefined()
  })

  it('is a no-op when the model is not in the store', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'does-not-exist', effort: 'anything' })
    ).resolves.toBeDefined()
  })

  it('accepts undefined effort when the model has effortLevels', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-sonnet-4', effort: undefined })
    ).resolves.toBeDefined()
  })
})

describe('isWarningEffortLevel', () => {
  const fiveTierLevels = [
    EffortLevel.LOW,
    EffortLevel.MEDIUM,
    EffortLevel.HIGH,
    EffortLevel.XHIGH,
    EffortLevel.MAX,
  ]

  it.each<[string | undefined, boolean]>([
    ['max', true],
    ['xhigh', true],
    ['low', false],
    ['medium', false],
    ['high', false],
    [undefined, false],
  ])('%s -> %s against a 5-tier model', (level, expected) => {
    expect(isWarningEffortLevel(level, fiveTierLevels)).toBe(expected)
  })

  it("does not warn on 'high' when it is a model's top level", () => {
    expect(
      isWarningEffortLevel('high', [EffortLevel.LOW, EffortLevel.MEDIUM, EffortLevel.HIGH])
    ).toBe(false)
  })

  it("warns on 'max' for a model without 'xhigh'", () => {
    expect(
      isWarningEffortLevel('max', [
        EffortLevel.LOW,
        EffortLevel.MEDIUM,
        EffortLevel.HIGH,
        EffortLevel.MAX,
      ])
    ).toBe(true)
  })

  it('returns false when the level is not in the given levels at all', () => {
    expect(isWarningEffortLevel('xhigh', [EffortLevel.LOW, EffortLevel.MEDIUM])).toBe(false)
  })

  it('returns false when no levels are given (model has no effortLevels)', () => {
    expect(isWarningEffortLevel('xhigh')).toBe(false)
  })

  it('returns false for an undefined level regardless of levels', () => {
    expect(isWarningEffortLevel(undefined, fiveTierLevels)).toBe(false)
  })
})
