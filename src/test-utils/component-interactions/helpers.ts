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

import type { ComponentIdentifier } from './types'

/**
 * Matches text against an identifier (string or regex)
 *
 * @param text - The text to match against
 * @param identifier - String (exact or substring match) or RegExp pattern
 * @returns true if the text matches the identifier
 *
 * @example
 * matchesIdentifier('Save Changes', 'Save') // true
 * matchesIdentifier('Save Changes', /save/i) // true
 * matchesIdentifier('Delete', 'Save') // false
 */
export function matchesIdentifier(text: string, identifier: ComponentIdentifier): boolean {
  if (typeof identifier === 'string') {
    return text === identifier || text.includes(identifier)
  }
  return identifier.test(text)
}
