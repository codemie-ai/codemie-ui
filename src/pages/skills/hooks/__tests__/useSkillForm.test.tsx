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

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { useSkillForm } from '@/pages/skills/hooks/useSkillForm'
import * as skillValidation from '@/pages/skills/validation/skillValidation'
import { skillsStore } from '@/store/skills'

vi.mock('@/store/skills', () => ({
  skillsStore: {
    skillConfig: null,
    getSkillConfig: vi
      .fn()
      .mockResolvedValue({ max_content_length: 30000, min_content_length: 100 }),
  },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    builtinSubagentsCatalog: [],
    getBuiltinSubagentsCatalog: vi.fn(),
  },
}))

describe('useSkillForm', () => {
  beforeEach(() => {
    vi.mocked(skillsStore.getSkillConfig).mockClear()
  })

  afterEach(() => {
    ;(skillsStore as any).skillConfig = null
  })

  it('calls skillsStore.getSkillConfig on mount', async () => {
    renderHook(() => useSkillForm())
    expect(skillsStore.getSkillConfig).toHaveBeenCalledTimes(1)
  })

  it('passes max_content_length from skillConfig to createSkillValidationSchema', () => {
    ;(skillsStore as any).skillConfig = { max_content_length: 45000, min_content_length: 100 }
    const spy = vi.spyOn(skillValidation, 'createSkillValidationSchema')

    renderHook(() => useSkillForm())

    expect(spy).toHaveBeenCalledWith(45000)
    spy.mockRestore()
  })
})
