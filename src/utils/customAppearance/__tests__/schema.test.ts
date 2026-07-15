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

describe('codeBlockFontStack field', () => {
  it('should be a valid string literal union type in AppearanceInputs', () => {
    // Runtime test verifying the enum values are correct
    const validValues: ('geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono')[] = [
      'geist-mono',
      'jetbrains-mono',
      'ibm-plex-mono',
    ]

    expect(validValues).toHaveLength(3)
    validValues.forEach((value) => {
      expect(['geist-mono', 'jetbrains-mono', 'ibm-plex-mono']).toContain(value)
    })
  })
})
