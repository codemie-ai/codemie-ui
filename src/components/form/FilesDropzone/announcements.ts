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

export const MAX_ANNOUNCED_FILE_NAMES = 3

const namesOnlyIn = (source: string[], other: string[]): string[] => {
  const remaining = new Map<string, number>()

  other.forEach((name) => remaining.set(name, (remaining.get(name) ?? 0) + 1))

  return source.filter((name) => {
    const left = remaining.get(name) ?? 0

    if (left === 0) return true

    remaining.set(name, left - 1)

    return false
  })
}

const describeNames = (names: string[], verb: 'added' | 'removed'): string => {
  if (names.length === 1) return `${names[0]} ${verb}`

  const shown = names.slice(0, MAX_ANNOUNCED_FILE_NAMES)
  const rest = names.length - shown.length
  const list = rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ')

  return `${names.length} files ${verb}: ${list}`
}

/**
 * Turns a change of the selected file list into the messages a live region should read out.
 *
 * The diff is a multiset diff over file names, so replacing a file with another one of the same
 * name count is still announced. Several files added at once are aggregated into a single message:
 * the announcement queue plays messages a second apart, so one message per file would lag badly.
 */
export const buildFileAnnouncements = (
  previousNames: string[],
  currentNames: string[],
  maxFiles: number
): string[] => {
  const added = namesOnlyIn(currentNames, previousNames)
  const removed = namesOnlyIn(previousNames, currentNames)

  if (added.length === 0 && removed.length === 0) return []

  const total =
    currentNames.length === 0
      ? 'No files selected'
      : `${currentNames.length} of ${maxFiles} files selected`

  return [
    ...(added.length > 0 ? [`${describeNames(added, 'added')}. ${total}`] : []),
    ...(removed.length > 0 ? [`${describeNames(removed, 'removed')}. ${total}`] : []),
  ]
}
