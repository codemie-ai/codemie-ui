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
 * Extracts the base state name from a name that may contain iteration count
 * Pattern: "state_name X of Y" -> "state_name"
 */
export function extractStateName(name: string): string {
  const iterationPattern = /\s\d+\sof\s\d+$/
  return name.replace(iterationPattern, '').trim()
}
