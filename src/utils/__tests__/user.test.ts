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

import { formatUserOptions } from '../user'

describe('formatUserOptions', () => {
  it('preserves email when present on user object', () => {
    const users = [{ id: 'u1', name: 'Alice', email: 'alice@example.com' }]
    const result = formatUserOptions(users)
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@example.com')
  })

  it('omits email key when email is null', () => {
    const users = [{ id: 'u1', name: 'Alice', email: null }]
    const result = formatUserOptions(users)
    expect(result[0].email).toBeUndefined()
  })

  it('omits email key when email is undefined', () => {
    const users = [{ id: 'u1', name: 'Alice' }]
    const result = formatUserOptions(users)
    expect(result[0].email).toBeUndefined()
  })

  it('picks email from first grouped entry that has one', () => {
    // Two rows for the same user id — first has no email, second does
    const users = [
      { id: 'u1', name: 'Alice A', email: null },
      { id: 'u1', name: 'alice', email: 'alice@example.com' },
    ]
    const result = formatUserOptions(users)
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@example.com')
  })

  it('still returns label and value correctly when email is present', () => {
    const users = [{ id: 'u1', name: 'Alice', email: 'alice@example.com' }]
    const result = formatUserOptions(users)
    expect(result[0].label).toBe('Alice')
    expect(result[0].value).toBe('u1')
  })
})
