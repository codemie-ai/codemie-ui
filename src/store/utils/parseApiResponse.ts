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
 * Looks for the first key in `keys` whose value is an array within the given object.
 */
function findArrayByKeys<T>(obj: Record<string, unknown>, keys: string[]): T[] | null {
  for (const key of keys) {
    if (Array.isArray(obj[key])) {
      return obj[key] as T[]
    }
  }
  return null
}

/**
 * Extracts an array from various API response formats.
 * Handles: direct array, { data: [...] }, { [key]: [...] }, { data: { [key]: [...] } }
 */
export function extractArrayFromResponse<T>(result: unknown, keys: string[]): T[] {
  if (Array.isArray(result)) {
    return result
  }

  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>

    const found = findArrayByKeys<T>(obj, keys)
    if (found) {
      return found
    }

    if (obj.data && typeof obj.data === 'object') {
      const nested = findArrayByKeys<T>(obj.data as Record<string, unknown>, keys)
      if (nested) {
        return nested
      }
    }
  }

  return []
}
