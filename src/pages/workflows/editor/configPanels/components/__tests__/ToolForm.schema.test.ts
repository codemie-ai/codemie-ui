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

import { describe, expect, it } from 'vitest'

import { getValidationSchema } from '../ToolForm'

describe('ToolForm validation schema — required list arguments (AC5)', () => {
  it('blocks save when a required list argument is empty', async () => {
    const schema = getValidationSchema(['to'])
    await expect(
      schema.validate({ toolkits: [], mcpServers: [], tool_args: { to: [] } })
    ).rejects.toThrow(/Required fields/)
  })

  it.each([[['']], [['  ', '']]])(
    'blocks save when a required list argument has only blank rows: %j',
    async (to) => {
      const schema = getValidationSchema(['to'])
      await expect(
        schema.validate({ toolkits: [], mcpServers: [], tool_args: { to } })
      ).rejects.toThrow(/Required fields/)
    }
  )

  it('allows save when a required list argument has a value next to a blank row', async () => {
    const schema = getValidationSchema(['to'])
    await expect(
      schema.validate({ toolkits: [], mcpServers: [], tool_args: { to: ['a@b.com', ''] } })
    ).resolves.toBeTruthy()
  })

  it('allows save when the required list argument is populated', async () => {
    const schema = getValidationSchema(['to'])
    await expect(
      schema.validate({ toolkits: [], mcpServers: [], tool_args: { to: ['a@b.com'] } })
    ).resolves.toBeTruthy()
  })
})
