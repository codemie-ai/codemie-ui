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

import { describe, it, expect } from 'vitest'

import { resolveSkillOptions } from '../SkillSelector.utils'

describe('resolveSkillOptions', () => {
  const loadedOptions = [{ value: 'sk-known', label: 'epam-pptx-template', description: 'desc' }]

  it('returns loadedOptions unchanged when every selected id is already loaded', () => {
    expect(resolveSkillOptions(loadedOptions, ['sk-known'])).toEqual(loadedOptions)
  })

  it('adds a hidden option for a selected id missing from loadedOptions, using knownSkills for the name', () => {
    const result = resolveSkillOptions(
      loadedOptions,
      ['sk-known', 'sk-hidden'],
      [{ id: 'sk-hidden', name: 'codemie-speech-presentation-content' }]
    )

    expect(result).toEqual([
      ...loadedOptions,
      { value: 'sk-hidden', label: 'codemie-speech-presentation-content', description: undefined },
    ])
  })

  it('falls back to the raw id when a selected id is unknown everywhere', () => {
    const result = resolveSkillOptions([], ['sk-missing'])

    expect(result).toEqual([{ value: 'sk-missing', label: 'sk-missing', description: undefined }])
  })

  it('does not duplicate an option that is both loaded and in knownSkills', () => {
    const result = resolveSkillOptions(
      loadedOptions,
      ['sk-known'],
      [{ id: 'sk-known', name: 'stale-name-should-be-ignored' }]
    )

    expect(result).toEqual(loadedOptions)
  })

  it('carries the description through for a hidden option', () => {
    const result = resolveSkillOptions(
      [],
      ['sk-hidden'],
      [{ id: 'sk-hidden', name: 'name', description: 'hidden description' }]
    )

    expect(result).toEqual([
      { value: 'sk-hidden', label: 'name', description: 'hidden description' },
    ])
  })

  it('handles multiple hidden ids, each resolved independently', () => {
    const result = resolveSkillOptions(
      [],
      ['sk-a', 'sk-b'],
      [
        { id: 'sk-a', name: 'Skill A' },
        { id: 'sk-b', name: 'Skill B' },
      ]
    )

    expect(result).toEqual([
      { value: 'sk-a', label: 'Skill A', description: undefined },
      { value: 'sk-b', label: 'Skill B', description: undefined },
    ])
  })

  it('returns loadedOptions unchanged when selectedIds is empty', () => {
    expect(resolveSkillOptions(loadedOptions, [])).toEqual(loadedOptions)
  })

  it('returns an empty array when there are no loaded options and no selected ids', () => {
    expect(resolveSkillOptions([], [])).toEqual([])
  })
})
