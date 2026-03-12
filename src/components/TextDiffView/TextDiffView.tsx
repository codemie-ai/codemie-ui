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

import * as Diff from 'diff'
import React, { useMemo } from 'react'

import { cn } from '@/utils/utils'

import { TextDiffViewProps, SyncedLine, WordDiffInfo } from './types'

const TextDiffView: React.FC<TextDiffViewProps> = ({
  oldText,
  newText,
  showLineNumbers = true,
  oldLabel = 'Original',
  newLabel = 'Modified',
  className,
}) => {
  const trimNewlines = (str: string): string => {
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

  const diffResult = useMemo(() => {
    const oldLines = trimNewlines(oldText || '').split('\n')
    const newLines = trimNewlines(newText || '').split('\n')
    return Diff.diffArrays(oldLines, newLines)
  }, [oldText, newText])

  const processPairedChange = (
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

  const processRemoved = (lines: string[], oldLineNum: number, result: SyncedLine[]): number => {
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

  const processAdded = (lines: string[], newLineNum: number, result: SyncedLine[]): number => {
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

  const processUnchanged = (
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

  const { syncedLines, wordDiffMap } = useMemo(() => {
    const result: SyncedLine[] = []
    let oldLineNum = 0
    let newLineNum = 0
    let i = 0

    while (i < diffResult.length) {
      const part = diffResult[i]
      const lines = Array.isArray(part.value) ? part.value : [part.value]

      if (part.removed && i + 1 < diffResult.length && diffResult[i + 1].added) {
        const nextPart = diffResult[i + 1]
        const nextLines = Array.isArray(nextPart.value) ? nextPart.value : [nextPart.value]
        const updated = processPairedChange(lines, nextLines, oldLineNum, newLineNum, result)
        oldLineNum = updated.oldLineNum
        newLineNum = updated.newLineNum
        i += 2
      } else if (part.removed) {
        oldLineNum = processRemoved(lines, oldLineNum, result)
        i += 1
      } else if (part.added) {
        newLineNum = processAdded(lines, newLineNum, result)
        i += 1
      } else {
        const updated = processUnchanged(lines, oldLineNum, newLineNum, result)
        oldLineNum = updated.oldLineNum
        newLineNum = updated.newLineNum
        i += 1
      }
    }

    const wordDiffMap = new Map<number, WordDiffInfo>()
    result.forEach((line, idx) => {
      // Paired line = has both old and new lines with line numbers and they are different
      if (
        line.oldLine &&
        line.newLine &&
        line.oldLineNumber !== null &&
        line.newLineNumber !== null &&
        line.oldLine !== line.newLine
      ) {
        wordDiffMap.set(idx, {
          oldLine: line.oldLine,
          newLine: line.newLine,
          wordDiff: Diff.diffWordsWithSpace(line.oldLine, line.newLine),
        })
      }
    })

    return { syncedLines: result, wordDiffMap }
  }, [diffResult])

  const renderInlineDiff = (lineIndex: number, isRemoved: boolean) => {
    const diffInfo = wordDiffMap.get(lineIndex)
    if (!diffInfo) return null

    return diffInfo.wordDiff
      .filter((chunk) => (isRemoved ? !chunk.added : !chunk.removed))
      .map((chunk, i) => {
        const isHighlighted = (isRemoved && chunk.removed) || (!isRemoved && chunk.added)
        const highlightClass = isRemoved
          ? 'bg-surface-specific-diff-highlight-remove'
          : 'bg-surface-specific-diff-highlight-add'

        return (
          <span key={i} className={isHighlighted ? `font-semibold ${highlightClass}` : ''}>
            {chunk.value}
          </span>
        )
      })
  }

  const getBackgroundClasses = (
    isChanged: boolean,
    isEmpty: boolean,
    isOld: boolean,
    otherSideChanged: boolean
  ) => {
    return cn({
      'bg-surface-specific-diff-linebg-remove': isChanged && !isEmpty && isOld,
      'bg-surface-specific-diff-linebg-add': isChanged && !isEmpty && !isOld,
      'bg-surface-specific-diff-emptyline-remove': isEmpty && otherSideChanged && isOld,
      'bg-surface-specific-diff-emptyline-add': isEmpty && otherSideChanged && !isOld,
    })
  }

  const getLineNumberClasses = (isChanged: boolean, isEmpty: boolean, isOld: boolean) => {
    return cn(
      'min-w-12 px-2 py-1 text-xs text-text-tertiary text-right select-none border-r border-border-structural flex items-center justify-end',
      {
        'bg-surface-specific-diff-linenumber-remove': isChanged && !isEmpty && isOld,
        'bg-surface-specific-diff-linenumber-add': isChanged && !isEmpty && !isOld,
        'bg-surface-elevated': !isChanged || isEmpty,
      }
    )
  }

  const renderLineContent = (
    isEmpty: boolean,
    isChanged: boolean,
    isOld: boolean,
    hasWordDiff: boolean,
    index: number,
    line: string | null
  ) => {
    if (isEmpty) return null

    return (
      <>
        {isChanged ? (
          <span
            className={cn(
              'mr-2 select-none font-bold',
              isOld ? 'text-failed-secondary' : 'text-success-primary'
            )}
          >
            {isOld ? '-' : '+'}
          </span>
        ) : (
          <span className="mr-2 select-none opacity-30"> </span>
        )}
        <span
          className={cn('whitespace-pre-wrap', {
            'text-text-secondary': !isChanged && isOld,
            'text-text-primary': !isChanged && !isOld,
          })}
        >
          {hasWordDiff ? renderInlineDiff(index, isOld) : line}
        </span>
      </>
    )
  }

  const renderDiffRow = (lineData: SyncedLine, index: number) => {
    const isFirst = index === 0
    const isLast = index === syncedLines.length - 1

    const renderSide = (isOld: boolean) => {
      const line = isOld ? lineData.oldLine : lineData.newLine
      const lineNumber = isOld ? lineData.oldLineNumber : lineData.newLineNumber
      const isEmpty = line === null
      const isChanged = isOld ? lineData.isRemoved : lineData.isAdded
      const hasWordDiff = wordDiffMap.has(index)
      const otherSideChanged = isOld ? lineData.isAdded : lineData.isRemoved

      const contentBgClass = getBackgroundClasses(isChanged, isEmpty, isOld, otherSideChanged)
      const roundedClass = cn({
        'rounded-tl-lg rounded-tr-lg': isFirst,
        'rounded-bl-lg rounded-br-lg': isLast,
      })
      const lineNumberBgClass = getLineNumberClasses(isChanged, isEmpty, isOld)

      return (
        <div className={cn('flex leading-6 h-full', contentBgClass, roundedClass)}>
          {showLineNumbers && <div className={lineNumberBgClass}>{isEmpty ? '' : lineNumber}</div>}
          <div className="flex px-3 py-1 flex-1 min-h-[24px]">
            {renderLineContent(isEmpty, isChanged, isOld, hasWordDiff, index, line)}
          </div>
        </div>
      )
    }

    const columnClasses = cn('border-l border-r border-border-structural overflow-hidden', {
      'border-t rounded-tl-lg rounded-tr-lg': isFirst,
      'border-b rounded-bl-lg rounded-br-lg': isLast,
    })

    return (
      <div key={index} className="grid grid-cols-2 gap-4">
        <div className={columnClasses}>{renderSide(true)}</div>
        <div className={columnClasses}>{renderSide(false)}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4 mb-2">
        <h5 className="text-xs font-normal text-text-tertiary">{oldLabel}:</h5>
        <h5 className="text-xs font-normal text-text-accent-status">{newLabel}:</h5>
      </div>
      <div>
        <div className="font-mono text-xs">
          {syncedLines.map((lineData, index) => renderDiffRow(lineData, index))}
        </div>
      </div>
    </div>
  )
}

export default TextDiffView
