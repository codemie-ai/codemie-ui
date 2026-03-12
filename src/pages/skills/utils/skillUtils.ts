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

import { SKILL_EXAMPLE_TEMPLATE } from '@/constants/skills'
import { Skill, SkillVisibility } from '@/types/entity/skill'

function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadSkillExample(): void {
  downloadMarkdownFile(SKILL_EXAMPLE_TEMPLATE, 'example-skill.md')
}

export function downloadSkillAsMarkdown(skill: Skill, content: string): void {
  downloadMarkdownFile(content, `${skill.name}.md`)
}

function parseMultilineBlock(lines: string[], startIndex: number, blockType: string): string {
  const multilineValue: string[] = []

  // Collect all indented lines following the block scalar indicator
  for (let j = startIndex + 1; j < lines.length; j += 1) {
    const nextLine = lines[j]
    // Stop if we hit a non-indented line (new key)
    if (nextLine && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
      break
    }
    // Add the line, removing leading whitespace
    if (nextLine.trim()) {
      multilineValue.push(nextLine.trim())
    }
  }

  // For folded blocks (>-, >), join with spaces; for literal blocks (|-, |), join with newlines
  const isFolded = blockType.startsWith('>')
  return isFolded ? multilineValue.join(' ') : multilineValue.join('\n')
}

function isMultilineBlockScalar(value: string): boolean {
  return value === '>-' || value === '>' || value === '|-' || value === '|'
}

function extractFrontmatterField(lines: string[], key: string): string | null {
  const prefix = `${key}:`

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.startsWith(prefix)) {
      const value = line.slice(prefix.length).trim()

      // Check if it's a multiline block scalar (>-, >, |-, |)
      if (isMultilineBlockScalar(value)) {
        return parseMultilineBlock(lines, i, value)
      }

      // Single-line value
      return value || null
    }
  }
  return null
}

export async function parseSkillMarkdownFile(
  file: File
): Promise<{ name: string; description: string; content: string }> {
  const text = await file.text()

  // Parse YAML frontmatter using string operations (no regex backtracking)
  if (!text.startsWith('---')) {
    throw new Error('Invalid skill file format. Missing YAML frontmatter.')
  }

  const firstNewline = text.indexOf('\n')
  if (firstNewline === -1) {
    throw new Error('Invalid skill file format. Missing YAML frontmatter.')
  }

  const closingIndex = text.indexOf('\n---', firstNewline)
  if (closingIndex === -1) {
    throw new Error('Invalid skill file format. Missing YAML frontmatter.')
  }

  const frontmatter = text.slice(firstNewline + 1, closingIndex)
  const contentStart = text.indexOf('\n', closingIndex + 1)
  const content = contentStart === -1 ? '' : text.slice(contentStart + 1)

  // Extract name and description from frontmatter lines
  const frontmatterLines = frontmatter.split('\n')
  const name = extractFrontmatterField(frontmatterLines, 'name')
  const description = extractFrontmatterField(frontmatterLines, 'description')

  if (!name || !description) {
    throw new Error('Invalid skill file. Missing name or description in frontmatter.')
  }

  return {
    name,
    description,
    content: content.trim(),
  }
}

export function getVisibilityLabel(visibility: SkillVisibility): string {
  switch (visibility) {
    case SkillVisibility.PRIVATE:
      return 'Private'
    case SkillVisibility.PROJECT:
      return 'Project'
    case SkillVisibility.PUBLIC:
      return 'Public'
    default:
      return visibility
  }
}
