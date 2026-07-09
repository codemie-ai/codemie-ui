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

import { generateProjectName, getProjectDisplayName } from '@/utils/projectDisplayName'

describe('getProjectDisplayName', () => {
  it('returns display_name when it is a non-empty string', () => {
    expect(getProjectDisplayName({ name: 'my-project', display_name: 'My Project' })).toBe(
      'My Project'
    )
  })

  it('falls back to name when display_name is null', () => {
    expect(getProjectDisplayName({ name: 'my-project', display_name: null })).toBe('my-project')
  })

  it('falls back to name when display_name is undefined', () => {
    expect(getProjectDisplayName({ name: 'my-project' })).toBe('my-project')
  })

  it('falls back to name when display_name is an empty string', () => {
    expect(getProjectDisplayName({ name: 'my-project', display_name: '' })).toBe('my-project')
  })

  it('falls back to name when display_name is whitespace only', () => {
    expect(getProjectDisplayName({ name: 'my-project', display_name: '   ' })).toBe('my-project')
  })

  it('trims whitespace from display_name before returning', () => {
    expect(getProjectDisplayName({ name: 'my-project', display_name: '  My Project  ' })).toBe(
      'My Project'
    )
  })
})

describe('generateProjectName', () => {
  it('lowercases the input', () => {
    expect(generateProjectName('MyTeam')).toBe('myteam')
  })

  it('converts spaces to dashes', () => {
    expect(generateProjectName('My Team')).toBe('my-team')
  })

  it('collapses multiple spaces into one dash', () => {
    expect(generateProjectName('My  Team')).toBe('my-team')
  })

  it('strips characters that are not a-z, 0-9, dash, or underscore', () => {
    expect(generateProjectName('My Team!')).toBe('my-team')
    expect(generateProjectName('Team (Alpha)')).toBe('team-alpha')
  })

  it('allows underscores', () => {
    expect(generateProjectName('my_team')).toBe('my_team')
  })

  it('collapses multiple consecutive dashes', () => {
    expect(generateProjectName('My--Team')).toBe('my-team')
  })

  it('trims leading dashes', () => {
    expect(generateProjectName('-My Team')).toBe('my-team')
  })

  it('trims trailing dashes', () => {
    expect(generateProjectName('My Team-')).toBe('my-team')
  })

  it('returns empty string for empty input', () => {
    expect(generateProjectName('')).toBe('')
  })

  it('handles a typical display name end-to-end', () => {
    expect(generateProjectName('My Team Project')).toBe('my-team-project')
  })

  it('handles digits correctly', () => {
    expect(generateProjectName('Team 42')).toBe('team-42')
  })
})
