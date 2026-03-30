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

import isEqual from 'lodash/isEqual'
import { Primitive } from 'react-hook-form'

/**
 * Type guard to check if a value is a primitive type.
 *
 * Primitives: string, number, boolean, null, undefined, symbol, bigint.
 *
 * @param value - The value to check
 * @returns True if the value is primitive, false otherwise
 */
export const isPrimitive = (value: unknown): value is Primitive => {
  return (typeof value !== 'object' && typeof value !== 'function') || value === null
}

/**
 * Retrieves a value from an object using a path string.
 *
 * Supports dot notation (`"user.name"`) and array indices (`"items[0].name"`).
 * Returns `undefined` if the path does not exist or encounters null/undefined.
 *
 * @param obj - The object to traverse
 * @param pathStr - The path string (e.g., `"user.profile.name"`, `"items[0].id"`)
 * @returns The value at the path, or `undefined` if not found
 */
export const getValueAtPath = (obj: object, pathStr: string): unknown => {
  const parts = pathStr
    .replace(/\[(\d+)\]/g, '.$1') // Convert array[0] to array.0
    .split('.')
    .filter(Boolean)

  let current: any = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }

  // eslint-disable-next-line consistent-return
  return current
}

/**
 * Checks if a value at a specific path has changed between two objects.
 *
 * Uses deep equality (lodash `isEqual`) to compare values, so objects/arrays
 * are compared by content, not reference.
 *
 * @param newState - The new state object
 * @param oldState - The previous state object
 * @param path - The path to compare (supports dot notation and array indices)
 * @returns True if the value has changed, false otherwise
 */
export const hasPathChanged = (newState: object, oldState: object, path: string): boolean => {
  const newValue = getValueAtPath(newState, path)
  const oldValue = getValueAtPath(oldState, path)

  return !isEqual(newValue, oldValue)
}
