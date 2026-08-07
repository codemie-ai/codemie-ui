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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, it, expect, beforeAll } from 'vitest'

const COMPONENT_SCSS_PATHS = [
  '../../../components/Thought/ThoughtDocument.scss',
  '../../../components/markdown/Markdown.scss',
  '../../../pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.scss',
  '../../../pages/chat/components/ChatHistory/ChatAiMessage/ThinkingLoader.scss',
]

describe('--font-family-body-sans single source of truth', () => {
  let componentScssContents: string[]

  beforeAll(() => {
    componentScssContents = COMPONENT_SCSS_PATHS.map((path) =>
      readFileSync(resolve(__dirname, path), 'utf-8')
    )
  })

  it('every chat prose component references the shared custom property instead of a local fallback list', () => {
    componentScssContents.forEach((content) => {
      expect(content).toContain('font-family: var(--font-family-body-sans)')
      expect(content).not.toContain('Geist, Arial, Helvetica, sans-serif')
    })
  })
})
