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

import { getCronDescription, isValidCronExpression } from '@/utils/cronValidator'

const getScheduleDescription = (cron: string, backendDescription: string): string => {
  if (backendDescription && backendDescription !== cron) return backendDescription
  if (isValidCronExpression(cron)) return getCronDescription(cron)
  return cron
}

describe('getScheduleDescription', () => {
  it('returns backend description when it differs from cron', () => {
    expect(getScheduleDescription('0 * * * *', 'Every hour')).toBe('Every hour')
  })

  it('falls back to getCronDescription when backend description equals cron', () => {
    expect(getScheduleDescription('0 * * * *', '0 * * * *')).toBe('Every hour')
  })

  it('falls back to getCronDescription when backend description is empty', () => {
    expect(getScheduleDescription('0 * * * *', '')).toBe('Every hour')
  })

  it('returns raw cron string for invalid cron when no backend description', () => {
    expect(getScheduleDescription('not-valid', 'not-valid')).toBe('not-valid')
  })
})
