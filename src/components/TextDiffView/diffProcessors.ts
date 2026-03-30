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

import { SyncedLine } from './types'

/**
 * Trims leading and trailing newlines from a string
 */
export const trimNewlines = (str: string): string => {
  let start = 0
  let end = str.length

  while (start < end && str[start] === '\n') {
    start += 1
  }
  while (end > start && str[end - 1] === '\n') {
    end -= 1
  }

  return str.slice(start, end)
}

/**
 * Processes a paired change (removed and added lines at the same position)
 */
export const processPairedChange = (
  lines: string[],
  nextLines: string[],
  oldLineNum: number,
  newLineNum: number,
  result: SyncedLine[]
): { oldLineNum: number; newLineNum: number } => {
  const maxLines = Math.max(lines.length, nextLines.length)
  let updatedOldLineNum = oldLineNum
  let updatedNewLineNum = newLineNum

  for (let j = 0; j < maxLines; j += 1) {
    const oldLine = lines[j] !== undefined ? lines[j] : null
    const newLine = nextLines[j] !== undefined ? nextLines[j] : null

    updatedOldLineNum += oldLine !== null ? 1 : 0
    updatedNewLineNum += newLine !== null ? 1 : 0

    result.push({
      oldLine,
      newLine,
      oldLineNumber: oldLine !== null ? updatedOldLineNum : null,
      newLineNumber: newLine !== null ? updatedNewLineNum : null,
      isRemoved: oldLine !== null,
      isAdded: newLine !== null,
    })
  }

  return { oldLineNum: updatedOldLineNum, newLineNum: updatedNewLineNum }
}

/**
 * Processes removed lines
 */
export const processRemoved = (
  lines: string[],
  oldLineNum: number,
  result: SyncedLine[]
): number => {
  let updatedOldLineNum = oldLineNum
  for (let j = 0; j < lines.length; j += 1) {
    updatedOldLineNum += 1
    result.push({
      oldLine: lines[j],
      newLine: null,
      oldLineNumber: updatedOldLineNum,
      newLineNumber: null,
      isRemoved: true,
      isAdded: false,
    })
  }
  return updatedOldLineNum
}

/**
 * Processes added lines
 */
export const processAdded = (lines: string[], newLineNum: number, result: SyncedLine[]): number => {
  let updatedNewLineNum = newLineNum
  for (let j = 0; j < lines.length; j += 1) {
    updatedNewLineNum += 1
    result.push({
      oldLine: null,
      newLine: lines[j],
      oldLineNumber: null,
      newLineNumber: updatedNewLineNum,
      isRemoved: false,
      isAdded: true,
    })
  }
  return updatedNewLineNum
}

/**
 * Processes unchanged lines
 */
export const processUnchanged = (
  lines: string[],
  oldLineNum: number,
  newLineNum: number,
  result: SyncedLine[]
): { oldLineNum: number; newLineNum: number } => {
  let updatedOldLineNum = oldLineNum
  let updatedNewLineNum = newLineNum
  for (let j = 0; j < lines.length; j += 1) {
    updatedOldLineNum += 1
    updatedNewLineNum += 1
    result.push({
      oldLine: lines[j],
      newLine: lines[j],
      oldLineNumber: updatedOldLineNum,
      newLineNumber: updatedNewLineNum,
      isRemoved: false,
      isAdded: false,
    })
  }
  return { oldLineNum: updatedOldLineNum, newLineNum: updatedNewLineNum }
}
