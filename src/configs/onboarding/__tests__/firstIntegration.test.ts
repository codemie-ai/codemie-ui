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

import { describe, it, expect, vi, afterEach } from 'vitest'

import { NEW_INTEGRATION } from '@/constants/routes'
import { HighlightStep, NavigationStep } from '@/types/onboarding'

import { firstIntegrationFlow } from '../firstIntegration'

describe('firstIntegrationFlow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('opens the unified new integration form at User scope', () => {
    const nav = firstIntegrationFlow.steps.find((s) => s.id === 'nav-create') as NavigationStep
    expect(nav.actionType).toBe('Navigation')
    expect(nav.route).toEqual({ name: NEW_INTEGRATION, query: { scope: 'user' } })
  })

  it('step 2 highlights the Scope field and explains the three scopes', () => {
    const navIdx = firstIntegrationFlow.steps.findIndex((s) => s.id === 'nav-create')
    const step = firstIntegrationFlow.steps[navIdx + 1] as HighlightStep
    expect(step.actionType).toBe('Highlight')

    document.body.innerHTML = '<div data-onboarding="integration-scope-field"></div>'
    const target = (step.target as () => HTMLElement | null)()
    expect(target?.getAttribute('data-onboarding')).toBe('integration-scope-field')

    expect(step.title).toContain('Scope')
    expect(step.description).toContain('only you can use it')
    expect(step.description).toContain('every project you work in')
    expect(step.description).toMatch(/Project[\s\S]*every member/)
    expect(step.description).toContain('project admins')
  })
})
