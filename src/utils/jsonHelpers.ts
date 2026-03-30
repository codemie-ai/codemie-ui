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
 * JSON parsing and validation utilities
 */

/**
 * Checks if a value is a plain object (not null, array, or primitive)
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks if a parsed JSON value is an object or array (not a primitive)
 * Used to distinguish between:
 * - Valid: JSON.parse('{}') => {}, JSON.parse('[]') => []
 * - Invalid: JSON.parse('2') => 2, JSON.parse('"text"') => 'text', JSON.parse('true') => true
 */
export const isJsonObjectOrArray = (value: unknown): boolean => {
  return Array.isArray(value) || isPlainObject(value)
}

type JsonValue = Record<string, unknown> | Array<unknown>

/**
 * Safely parses JSON string and validates it's an object or array
 * Returns null if parsing fails or result is a primitive
 */
export const tryParseJsonObjectOrArray = (text: string): JsonValue | null => {
  try {
    const parsed = JSON.parse(text)
    return isJsonObjectOrArray(parsed) ? (parsed as JsonValue) : null
  } catch {
    return null
  }
}
