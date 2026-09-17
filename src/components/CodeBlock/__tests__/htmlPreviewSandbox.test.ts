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

import { HTML_PREVIEW_SANDBOX } from '../htmlPreviewSandbox'

const FORBIDDEN_TOKENS = [
  'allow-same-origin',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-modals',
  'allow-downloads',
]

describe('HTML_PREVIEW_SANDBOX', () => {
  it('is exactly allow-scripts', () => {
    expect(HTML_PREVIEW_SANDBOX).toBe('allow-scripts')
  })

  it('excludes every forbidden token', () => {
    const tokens = HTML_PREVIEW_SANDBOX.split(/\s+/)
    FORBIDDEN_TOKENS.forEach((forbidden) => expect(tokens).not.toContain(forbidden))
  })
})
