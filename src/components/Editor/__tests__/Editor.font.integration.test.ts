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

describe('Editor.scss .ql-editor font-family wiring', () => {
  let scssContent: string

  beforeAll(() => {
    scssContent = readFileSync(resolve(__dirname, '../Editor.scss'), 'utf-8')
  })

  it('.ql-editor rule does not use @apply font-geist-mono', () => {
    expect(scssContent).not.toMatch(/@apply[^;]*font-geist-mono/)
  })

  it('.ql-editor rule uses --font-family-body CSS variable', () => {
    expect(scssContent).toContain('font-family: var(--font-family-body')
  })

  it('falls back to GeistMono when --font-family-body is unset', () => {
    const decls = scssContent.match(/font-family: var\(--font-family-body[^)]*\)/g)
    expect(decls).not.toBeNull()
    decls?.forEach((d) => expect(d).toContain('GeistMono'))
  })
})
