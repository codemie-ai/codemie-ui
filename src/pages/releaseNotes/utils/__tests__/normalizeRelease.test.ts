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

import { LegacyRelease, SectionCode, SectionedRelease } from '../../types'
import { normalizeRelease } from '../normalizeRelease'

describe('normalizeRelease', () => {
  it('maps legacy BUG issues to fixes', () => {
    const legacy: LegacyRelease = {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [
        {
          key: 'EPMCDME-11111',
          title: 'Fix A',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-11111',
          type: 'BUG',
        },
      ],
    }

    const release = normalizeRelease(legacy)

    const fixes = release.sections.find((s) => s.code === SectionCode.Fixes)!
    expect(fixes.items).toHaveLength(1)
    expect(fixes.items[0].issues[0].key).toBe('EPMCDME-11111')
    expect(fixes.items[0].issues[0].type).toBe('BUG')
  })

  it('maps legacy STORY issues to features', () => {
    const legacy: LegacyRelease = {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [
        {
          key: 'EPMCDME-22222',
          title: 'New feature',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-22222',
          type: 'STORY',
        },
      ],
    }

    const release = normalizeRelease(legacy)

    const features = release.sections.find((s) => s.code === SectionCode.Features)!
    expect(features.items).toHaveLength(1)
    expect(features.items[0].issues[0].key).toBe('EPMCDME-22222')
  })

  it('maps legacy TASK and IMPROVEMENT issues to features', () => {
    const legacy: LegacyRelease = {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [
        {
          key: 'EPMCDME-33333',
          title: 'Task item',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-33333',
          type: 'TASK',
        },
        {
          key: 'EPMCDME-44444',
          title: 'Improvement item',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-44444',
          type: 'IMPROVEMENT',
        },
      ],
    }

    const release = normalizeRelease(legacy)

    const features = release.sections.find((s) => s.code === SectionCode.Features)!
    expect(features.items).toHaveLength(2)
    expect(features.items[0].issues[0].key).toBe('EPMCDME-33333')
    expect(features.items[1].issues[0].key).toBe('EPMCDME-44444')
  })

  it('maps mixed legacy issue types across sections', () => {
    const legacy: LegacyRelease = {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [
        {
          key: 'EPMCDME-11111',
          title: 'Fix A',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-11111',
          type: 'BUG',
        },
        {
          key: 'EPMCDME-22222',
          title: 'New feature',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-22222',
          type: 'STORY',
        },
        {
          key: 'EPMCDME-33333',
          title: 'Task item',
          link: 'https://jiraeu.epam.com/browse/EPMCDME-33333',
          type: 'TASK',
        },
      ],
    }

    const release = normalizeRelease(legacy)

    expect(release.sections.find((s) => s.code === SectionCode.Highlights)!.items).toHaveLength(0)
    expect(release.sections.find((s) => s.code === SectionCode.Features)!.items).toHaveLength(2)
    expect(release.sections.find((s) => s.code === SectionCode.Fixes)!.items).toHaveLength(1)
  })

  it('passes sectioned releases through unchanged', () => {
    const sectioned: SectionedRelease = {
      version: '2.44.0',
      date: '2026-08-19',
      sections: [
        {
          code: SectionCode.Highlights,
          items: [
            {
              title: 'Highlight item',
              description: 'A highlight.',
              issues: [
                {
                  key: 'EPMCDME-55555',
                  type: 'STORY',
                  link: 'https://jiraeu.epam.com/browse/EPMCDME-55555',
                },
              ],
            },
          ],
        },
        { code: SectionCode.Features, items: [] },
        { code: SectionCode.Fixes, items: [] },
      ],
    }

    const release = normalizeRelease(sectioned)

    expect(release).toBe(sectioned)
    expect(release.sections[0].items[0].title).toBe('Highlight item')
  })

  it('produces three empty sections for empty legacy release', () => {
    const legacy: LegacyRelease = {
      version: '2.43.0',
      date: '2026-08-01',
      issues: [],
    }

    const release = normalizeRelease(legacy)

    expect(release.sections).toHaveLength(3)
    release.sections.forEach((section) => {
      expect(section.items).toHaveLength(0)
    })
  })
})
