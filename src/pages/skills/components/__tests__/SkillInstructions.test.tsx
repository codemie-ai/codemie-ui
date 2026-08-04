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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SkillInstructions from '@/pages/skills/components/SkillInstructions'

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), success: vi.fn() } }))

describe('SkillInstructions', () => {
  it('renders character counter with the provided maxContentLength', () => {
    render(<SkillInstructions maxContentLength={50000} value="" onChange={() => {}} />)
    expect(screen.getByText(/50,000/)).toBeTruthy()
  })

  it('renders character counter with a different maxContentLength', () => {
    render(<SkillInstructions maxContentLength={45000} value="" onChange={() => {}} />)
    expect(screen.getByText(/45,000/)).toBeTruthy()
  })
})
