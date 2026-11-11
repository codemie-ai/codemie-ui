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

import { getValidationSchema } from '../CustomNodeForm'

describe('CustomNodeForm validation schema — required list arguments', () => {
  it.each([[[]], [['']], [['  ', '']]])(
    'blocks save when a required list argument is empty or blank: %j',
    async (items) => {
      const schema = getValidationSchema(['items'])
      await expect(schema.validate({ custom_node_id: 'node', config: { items } })).rejects.toThrow(
        /Required fields/
      )
    }
  )

  it('allows save when the required list argument has a value', async () => {
    const schema = getValidationSchema(['items'])
    await expect(
      schema.validate({ custom_node_id: 'node', config: { items: ['a', ''] } })
    ).resolves.toBeTruthy()
  })
})
