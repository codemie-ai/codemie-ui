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

import {
  isValidCronExpression,
  isMoreFrequentThanHourly,
  validateCronExpression,
  getCronDescription,
} from '@/utils/cronValidator'

describe('isValidCronExpression', () => {
  describe('empty / whitespace inputs', () => {
    // The guard `!cronExpression` treats '' as falsy and returns false before
    // the trimmed === '' early-return, so empty string yields false.
    it('should return false for an empty string (falsy guard fires first)', () => {
      expect(isValidCronExpression('')).toBe(false)
    })

    // A non-empty whitespace string passes the falsy guard, is trimmed to '',
    // and the trimmed === '' branch returns true.
    it('should return true for a whitespace-only string', () => {
      expect(isValidCronExpression('   ')).toBe(true)
    })
  })

  describe('non-string / falsy inputs', () => {
    it('should return false for null', () => {
      expect(isValidCronExpression(null as unknown as string)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidCronExpression(undefined as unknown as string)).toBe(false)
    })

    it('should return false for a number', () => {
      expect(isValidCronExpression(42 as unknown as string)).toBe(false)
    })

    it('should return false for an object', () => {
      expect(isValidCronExpression({} as unknown as string)).toBe(false)
    })
  })

  describe('wrong number of fields', () => {
    it('should return false for 4 fields', () => {
      expect(isValidCronExpression('* * * *')).toBe(false)
    })

    it('should return false for 6 fields', () => {
      expect(isValidCronExpression('0 0 * * * *')).toBe(false)
    })
  })

  describe('valid wildcard expressions', () => {
    it('should return true for "* * * * *"', () => {
      expect(isValidCronExpression('* * * * *')).toBe(true)
    })

    it('should return true for "0 0 * * *"', () => {
      expect(isValidCronExpression('0 0 * * *')).toBe(true)
    })
  })

  describe('step values', () => {
    it('should return true for "*/5 * * * *"', () => {
      expect(isValidCronExpression('*/5 * * * *')).toBe(true)
    })

    it('should return true for "0/15 * * * *"', () => {
      expect(isValidCronExpression('0/15 * * * *')).toBe(true)
    })

    it('should return false for "*/0 * * * *" (step of 0 is invalid)', () => {
      expect(isValidCronExpression('*/0 * * * *')).toBe(false)
    })
  })

  describe('range values', () => {
    it('should return true for "0-30 * * * *"', () => {
      expect(isValidCronExpression('0-30 * * * *')).toBe(true)
    })

    it('should return true for "1-12 * * 1-12 *"', () => {
      expect(isValidCronExpression('1-12 * * 1-12 *')).toBe(true)
    })

    it('should return false when range start > end: "30-10 * * * *"', () => {
      expect(isValidCronExpression('30-10 * * * *')).toBe(false)
    })
  })

  describe('comma-separated values', () => {
    it('should return true for "0,15,30 * * * *"', () => {
      expect(isValidCronExpression('0,15,30 * * * *')).toBe(true)
    })
  })

  describe('out-of-range field values', () => {
    it('should return false for minute 60 (max is 59)', () => {
      expect(isValidCronExpression('60 * * * *')).toBe(false)
    })

    it('should return false for hour 24 (max is 23)', () => {
      expect(isValidCronExpression('* 24 * * *')).toBe(false)
    })

    it('should return false for day 0 (min is 1)', () => {
      expect(isValidCronExpression('* * 0 * *')).toBe(false)
    })

    it('should return false for month 0 (min is 1)', () => {
      expect(isValidCronExpression('* * * 0 *')).toBe(false)
    })

    it('should return false for month 13 (max is 12)', () => {
      expect(isValidCronExpression('* * * 13 *')).toBe(false)
    })
  })
})

describe('isMoreFrequentThanHourly', () => {
  describe('empty / falsy inputs', () => {
    it('should return false for an empty string', () => {
      expect(isMoreFrequentThanHourly('')).toBe(false)
    })

    it('should return false for a whitespace-only string', () => {
      expect(isMoreFrequentThanHourly('   ')).toBe(false)
    })
  })

  describe('wrong number of fields', () => {
    it('should return false for 4 fields', () => {
      expect(isMoreFrequentThanHourly('* * * *')).toBe(false)
    })

    it('should return false for 6 fields', () => {
      expect(isMoreFrequentThanHourly('0 0 * * * *')).toBe(false)
    })
  })

  describe('wildcard minute field', () => {
    it('should return true for "* * * * *" (minute is *)', () => {
      expect(isMoreFrequentThanHourly('* * * * *')).toBe(true)
    })
  })

  describe('step-based minute field', () => {
    it('should return true for "*/30 * * * *" (step 30 < 60)', () => {
      expect(isMoreFrequentThanHourly('*/30 * * * *')).toBe(true)
    })

    it('should return true for "0/15 * * * *" (step 15 < 60)', () => {
      expect(isMoreFrequentThanHourly('0/15 * * * *')).toBe(true)
    })
  })

  describe('comma-separated minute values', () => {
    it('should return true for "0,15,30 * * * *" (multiple minutes per hour)', () => {
      expect(isMoreFrequentThanHourly('0,15,30 * * * *')).toBe(true)
    })
  })

  describe('single-minute expressions (not more frequent than hourly)', () => {
    it('should return false for "0 * * * *" (single fixed minute)', () => {
      expect(isMoreFrequentThanHourly('0 * * * *')).toBe(false)
    })

    it('should return false for "0 0 * * *"', () => {
      expect(isMoreFrequentThanHourly('0 0 * * *')).toBe(false)
    })

    it('should return false for "30 6 * * *" (single fixed minute)', () => {
      expect(isMoreFrequentThanHourly('30 6 * * *')).toBe(false)
    })
  })
})

describe('validateCronExpression', () => {
  describe('empty / falsy inputs', () => {
    it('should return undefined for an empty string', () => {
      expect(validateCronExpression('')).toBeUndefined()
    })

    it('should return undefined for a whitespace-only string', () => {
      expect(validateCronExpression('   ')).toBeUndefined()
    })
  })

  describe('invalid expressions', () => {
    it('should return an error message for an expression with wrong field count', () => {
      const result = validateCronExpression('* * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toBeTruthy()
    })

    it('should return an error message for an out-of-range minute value', () => {
      const result = validateCronExpression('60 * * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toBeTruthy()
    })

    it('should return an error message for an invalid step value', () => {
      const result = validateCronExpression('*/0 * * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toBeTruthy()
    })
  })

  describe('expressions more frequent than hourly', () => {
    it('should return an error message for "* * * * *"', () => {
      const result = validateCronExpression('* * * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toContain('hourly')
    })

    it('should return an error message for "*/30 * * * *"', () => {
      const result = validateCronExpression('*/30 * * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toContain('hourly')
    })

    it('should return an error message for "0,30 * * * *"', () => {
      const result = validateCronExpression('0,30 * * * *')
      expect(result).toBeTypeOf('string')
      expect(result).toContain('hourly')
    })
  })

  describe('valid expressions running at most hourly', () => {
    it('should return undefined for "0 * * * *" (every hour)', () => {
      expect(validateCronExpression('0 * * * *')).toBeUndefined()
    })

    it('should return undefined for "0 0 * * *" (daily at midnight)', () => {
      expect(validateCronExpression('0 0 * * *')).toBeUndefined()
    })

    it('should return undefined for "0 0 * * 0" (weekly on Sunday)', () => {
      expect(validateCronExpression('0 0 * * 0')).toBeUndefined()
    })

    it('should return undefined for "0 0 1 * *" (monthly on 1st)', () => {
      expect(validateCronExpression('0 0 1 * *')).toBeUndefined()
    })
  })
})

describe('getCronDescription', () => {
  describe('empty / falsy inputs', () => {
    it('should return "No schedule set" for an empty string', () => {
      expect(getCronDescription('')).toBe('No schedule set')
    })

    it('should return "No schedule set" for a whitespace-only string', () => {
      expect(getCronDescription('   ')).toBe('No schedule set')
    })
  })

  describe('invalid expressions', () => {
    it('should return "Invalid cron expression" for a 4-field expression', () => {
      expect(getCronDescription('* * * *')).toBe('Invalid cron expression')
    })

    it('should return "Invalid cron expression" for an out-of-range value', () => {
      expect(getCronDescription('60 * * * *')).toBe('Invalid cron expression')
    })

    it('should return "Invalid cron expression" for random text', () => {
      expect(getCronDescription('not a cron')).toBe('Invalid cron expression')
    })
  })

  describe('known preset expressions', () => {
    it('should return "Every hour" for "0 * * * *"', () => {
      expect(getCronDescription('0 * * * *')).toBe('Every hour')
    })

    it('should return "Daily at midnight" for "0 0 * * *"', () => {
      expect(getCronDescription('0 0 * * *')).toBe('Daily at midnight')
    })

    it('should return "Weekly on Sunday at midnight" for "0 0 * * 0"', () => {
      expect(getCronDescription('0 0 * * 0')).toBe('Weekly on Sunday at midnight')
    })

    it('should return "Monthly on the 1st at midnight" for "0 0 1 * *"', () => {
      expect(getCronDescription('0 0 1 * *')).toBe('Monthly on the 1st at midnight')
    })
  })

  describe('unknown valid expressions', () => {
    it('should return "Custom schedule" for a valid but unrecognised expression', () => {
      expect(getCronDescription('5 4 * * 1')).toBe('Custom schedule')
    })

    it('should return "Custom schedule" for "0 3 * * 1-5"', () => {
      expect(getCronDescription('0 3 * * 1-5')).toBe('Custom schedule')
    })
  })
})
