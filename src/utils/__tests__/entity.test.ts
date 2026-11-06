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

import { isOwner, isProjectMember } from '../entity'

describe('isOwner', () => {
  it('should return true when userId matches assistant.created_by.id', () => {
    expect(isOwner({ created_by: { id: 'u1' } }, 'u1')).toBe(true)
  })

  it('should return false when userId does not match assistant.created_by.id', () => {
    expect(isOwner({ created_by: { id: 'u1' } }, 'u2')).toBe(false)
  })

  it('should return false when assistant has no created_by', () => {
    expect(isOwner({}, 'u1')).toBe(false)
  })
})

describe('isProjectMember', () => {
  it('should return true when the viewer belongs to the assistant project', () => {
    expect(isProjectMember({ project: 'proj-a' }, [{ name: 'proj-a' }, { name: 'proj-b' }])).toBe(
      true
    )
  })

  it('should return false when the viewer does not belong to the assistant project', () => {
    expect(isProjectMember({ project: 'proj-a' }, [{ name: 'proj-b' }])).toBe(false)
  })

  it('should return false when the assistant has no project', () => {
    expect(isProjectMember({}, [{ name: 'proj-a' }])).toBe(false)
  })

  it('should return false when the viewer has no projects', () => {
    expect(isProjectMember({ project: 'proj-a' }, undefined)).toBe(false)
  })
})
