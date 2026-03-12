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

/**
 * Validates a cron expression format
 *
 * Supports standard 5-field cron format: minute hour day month weekday
 *
 * @param cronExpression - The cron expression to validate
 * @returns true if valid, false otherwise
 */
export const isValidCronExpression = (cronExpression: string): boolean => {
  if (!cronExpression || typeof cronExpression !== 'string') {
    return false
  }

  const trimmed = cronExpression.trim()

  if (trimmed === '') {
    return true
  }

  const parts = trimmed.split(/\s+/)

  if (parts.length !== 5) {
    return false
  }

  const [minute, hour, day, month, weekday] = parts

  const isValidField = (value: string, min: number, max: number): boolean => {
    if (value === '*') return true

    if (value.includes('/')) {
      const [range, step] = value.split('/')
      if (range !== '*' && !isValidField(range, min, max)) return false
      const stepNum = parseInt(step, 10)
      return !Number.isNaN(stepNum) && stepNum > 0
    }

    if (value.includes('-')) {
      const [start, end] = value.split('-').map((v) => parseInt(v, 10))
      return (
        !Number.isNaN(start) && !Number.isNaN(end) && start >= min && end <= max && start <= end
      )
    }

    if (value.includes(',')) {
      return value.split(',').every((v) => isValidField(v.trim(), min, max))
    }

    const num = parseInt(value, 10)
    return !Number.isNaN(num) && num >= min && num <= max
  }

  return (
    isValidField(minute, 0, 59) &&
    isValidField(hour, 0, 23) &&
    isValidField(day, 1, 31) &&
    isValidField(month, 1, 12) &&
    isValidField(weekday, 0, 7)
  )
}

/**
 * Checks if a cron expression runs more frequently than hourly
 * @param cronExpression - The cron expression to check
 * @returns true if the expression runs more frequently than hourly
 */
export const isMoreFrequentThanHourly = (cronExpression: string): boolean => {
  if (!cronExpression || cronExpression.trim() === '') {
    return false
  }

  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return false
  }

  const [minute] = parts

  // If minute field is * or contains */N where N < 60, it runs more frequently than hourly
  if (minute === '*') {
    return true
  }

  // Check for step values (e.g., */30 or 0/15)
  if (minute.includes('/')) {
    const [, step] = minute.split('/')
    const stepNum = parseInt(step, 10)
    // Any step in minutes less than 60 means it runs more than once per hour
    if (!Number.isNaN(stepNum) && stepNum < 60) {
      return true
    }
  }

  // Check for multiple specific minutes (e.g., 0,15,30,45)
  if (minute.includes(',')) {
    const values = minute.split(',')
    // More than one specific minute means multiple times per hour
    if (values.length > 1) {
      return true
    }
  }

  return false
}

/**
 * Validates cron expression and returns error message if invalid
 *
 * @param cronExpression - The cron expression to validate
 * @returns Error message string if invalid, undefined if valid
 */
// eslint-disable-next-line consistent-return
export const validateCronExpression = (cronExpression: string): string | undefined => {
  if (!cronExpression || cronExpression.trim() === '') {
    return undefined
  }

  if (!isValidCronExpression(cronExpression)) {
    // eslint-disable-next-line consistent-return
    return 'Invalid cron expression. Expected format: minute hour day month weekday (e.g., "0 0 * * *")'
  }

  if (isMoreFrequentThanHourly(cronExpression)) {
    // eslint-disable-next-line consistent-return
    return 'Schedule must run at most hourly. Expressions running more frequently than once per hour are not allowed.'
  }

  return undefined
}

/**
 * Gets a human-readable description of a cron expression
 * Returns the preset label if it matches a known preset, otherwise returns "Custom schedule"
 *
 * @param cronExpression - The cron expression to describe
 * @returns Human-readable description
 */
export const getCronDescription = (cronExpression: string): string => {
  if (!cronExpression || cronExpression.trim() === '') {
    return 'No schedule set'
  }

  if (!isValidCronExpression(cronExpression)) {
    return 'Invalid cron expression'
  }

  // Check against known presets
  const presetDescriptions: Record<string, string> = {
    '0 * * * *': 'Every hour',
    '0 0 * * *': 'Daily at midnight',
    '0 0 * * 0': 'Weekly on Sunday at midnight',
    '0 0 1 * *': 'Monthly on the 1st at midnight',
    '0 */2 * * *': 'Every 2 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *': 'Every 12 hours',
    '0 2 * * *': 'Every day at 2:00 AM',
  }

  return presetDescriptions[cronExpression.trim()] || 'Custom schedule'
}
