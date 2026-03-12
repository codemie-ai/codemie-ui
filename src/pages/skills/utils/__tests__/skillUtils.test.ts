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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Skill, SkillVisibility } from '@/types/entity/skill'

import {
  downloadSkillAsMarkdown,
  downloadSkillExample,
  getVisibilityLabel,
  parseSkillMarkdownFile,
} from '../skillUtils'

describe('skillUtils', () => {
  describe('downloadSkillExample', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn<[Blob | MediaSource], string>>
    let revokeObjectURLMock: ReturnType<typeof vi.fn>
    let clickSpy: ReturnType<typeof vi.fn>
    let linkEl: { href: string; download: string; click: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      createObjectURLMock = vi.fn<[Blob | MediaSource], string>().mockReturnValue('blob:test-url')
      revokeObjectURLMock = vi.fn()
      URL.createObjectURL = createObjectURLMock
      URL.revokeObjectURL = revokeObjectURLMock

      vi.spyOn(document.body, 'appendChild').mockReturnValue(null as unknown as Node)
      vi.spyOn(document.body, 'removeChild').mockReturnValue(null as unknown as Node)

      clickSpy = vi.fn()
      linkEl = { href: '', download: '', click: clickSpy }
      vi.spyOn(document, 'createElement').mockReturnValue(linkEl as unknown as HTMLAnchorElement)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('creates a blob with markdown type', () => {
      downloadSkillExample()

      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob))
      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      expect(blob.type).toBe('text/markdown')
    })

    it('downloads file as example-skill.md', () => {
      downloadSkillExample()

      expect(linkEl.download).toBe('example-skill.md')
    })

    it('triggers click and cleans up blob URL', () => {
      downloadSkillExample()

      expect(clickSpy).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url')
    })
  })

  describe('downloadSkillAsMarkdown', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn<[Blob | MediaSource], string>>
    let linkEl: { href: string; download: string; click: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      createObjectURLMock = vi.fn<[Blob | MediaSource], string>().mockReturnValue('blob:test-url')
      URL.createObjectURL = createObjectURLMock
      URL.revokeObjectURL = vi.fn()

      vi.spyOn(document.body, 'appendChild').mockReturnValue(null as unknown as Node)
      vi.spyOn(document.body, 'removeChild').mockReturnValue(null as unknown as Node)

      linkEl = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(linkEl as unknown as HTMLAnchorElement)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('uses skill name for filename', () => {
      const skill = { name: 'my-custom-skill' } as Skill

      downloadSkillAsMarkdown(skill, '# Content')

      expect(linkEl.download).toBe('my-custom-skill.md')
    })

    it('creates blob with markdown type', () => {
      const skill = { name: 'test' } as Skill

      downloadSkillAsMarkdown(skill, '# My Skill\n\nSome content here.')

      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob))
      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      expect(blob.type).toBe('text/markdown')
    })
  })

  describe('parseSkillMarkdownFile', () => {
    it('parses valid skill markdown file', async () => {
      const content = `---
name: test-skill
description: A test skill
---
# Test Content

This is the skill content.`

      const file = {
        text: async () => content,
      } as File

      const result = await parseSkillMarkdownFile(file)

      expect(result.name).toBe('test-skill')
      expect(result.description).toBe('A test skill')
      expect(result.content).toContain('# Test Content')
    })

    it('parses multiline description with >- (folded block)', async () => {
      const content = `---
name: meeting-summary
description: >-
  Generate comprehensive, structured meeting summaries with participant analysis,
  sentiment evaluation, action items, and effectiveness ratings. Use when user asks
  to "summarize a meeting", "create meeting notes", or "analyze meeting".
---
# Meeting Summary Skill

Content here.`

      const file = {
        text: async () => content,
      } as File

      const result = await parseSkillMarkdownFile(file)

      expect(result.name).toBe('meeting-summary')
      expect(result.description).toBe(
        'Generate comprehensive, structured meeting summaries with participant analysis, sentiment evaluation, action items, and effectiveness ratings. Use when user asks to "summarize a meeting", "create meeting notes", or "analyze meeting".'
      )
      expect(result.content).toContain('# Meeting Summary Skill')
    })

    it('parses multiline description with > (folded block without strip)', async () => {
      const content = `---
name: test-skill
description: >
  This is a multiline
  description that should
  be joined with spaces.
---
# Test`

      const file = {
        text: async () => content,
      } as File

      const result = await parseSkillMarkdownFile(file)

      expect(result.description).toBe(
        'This is a multiline description that should be joined with spaces.'
      )
    })

    it('parses multiline description with |- (literal block)', async () => {
      const content = `---
name: test-skill
description: |-
  Line one
  Line two
  Line three
---
# Test`

      const file = {
        text: async () => content,
      } as File

      const result = await parseSkillMarkdownFile(file)

      expect(result.description).toBe('Line one\nLine two\nLine three')
    })

    it('throws error for missing frontmatter', async () => {
      const content = `# Test Content

This is the skill content.`

      const file = {
        text: async () => content,
      } as File

      await expect(parseSkillMarkdownFile(file)).rejects.toThrow(
        'Invalid skill file format. Missing YAML frontmatter.'
      )
    })

    it('throws error for missing name in frontmatter', async () => {
      const content = `---
description: A test skill
---
# Test Content`

      const file = {
        text: async () => content,
      } as File

      await expect(parseSkillMarkdownFile(file)).rejects.toThrow(
        'Invalid skill file. Missing name or description in frontmatter.'
      )
    })

    it('throws error for missing description in frontmatter', async () => {
      const content = `---
name: test-skill
---
# Test Content`

      const file = {
        text: async () => content,
      } as File

      await expect(parseSkillMarkdownFile(file)).rejects.toThrow(
        'Invalid skill file. Missing name or description in frontmatter.'
      )
    })

    it('throws error for incomplete frontmatter', async () => {
      const content = `---
name: test-skill
description: Test`

      const file = {
        text: async () => content,
      } as File

      await expect(parseSkillMarkdownFile(file)).rejects.toThrow(
        'Invalid skill file format. Missing YAML frontmatter.'
      )
    })
  })

  describe('getVisibilityLabel', () => {
    it('returns Private for PRIVATE visibility', () => {
      expect(getVisibilityLabel(SkillVisibility.PRIVATE)).toBe('Private')
    })

    it('returns Project for PROJECT visibility', () => {
      expect(getVisibilityLabel(SkillVisibility.PROJECT)).toBe('Project')
    })

    it('returns Public for PUBLIC visibility', () => {
      expect(getVisibilityLabel(SkillVisibility.PUBLIC)).toBe('Public')
    })

    it('returns input value for unknown visibility', () => {
      expect(getVisibilityLabel('unknown' as SkillVisibility)).toBe('unknown')
    })
  })
})
