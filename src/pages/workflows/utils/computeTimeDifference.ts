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

import { DateTime } from 'luxon'

/**
 * Computes meaningful time difference with adaptive precision
 * Shows 2 units for larger times, maintaining readability:
 * - Days → show days + hours
 * - Hours → show hours + minutes
 * - Minutes → show minutes + seconds
 * - Seconds → show seconds + milliseconds
 * - Milliseconds → show milliseconds only
 *
 * @param {string} startISO - Start time in ISO format
 * @param {string} endISO - End time in ISO format
 * @returns {string} Time difference (e.g., "20h 13min", "5min 30s", "123ms")
 */
export function computeTimeDifference(startISO: string, endISO: string): string {
  const start = DateTime.fromISO(startISO)
  const end = DateTime.fromISO(endISO)

  const diff = end.diff(start, ['days', 'hours', 'minutes', 'seconds', 'milliseconds']).toObject()

  const days = Math.floor(diff.days || 0)
  const hours = Math.floor(diff.hours || 0)
  const minutes = Math.floor(diff.minutes || 0)
  const seconds = Math.floor(diff.seconds || 0)
  const ms = Math.floor(diff.milliseconds || 0)

  // Adaptive granularity: show appropriate precision based on magnitude
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`
  }

  if (seconds > 0) {
    return ms > 0 ? `${seconds}s ${ms}ms` : `${seconds}s`
  }

  return `${ms}ms`
}
