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
import { HEADROOM_BOOLEAN_FIELDS, HEADROOM_KEYS, HEADROOM_STRATEGIES } from './headroomYaml'

import type { Ace } from 'ace-builds'

export interface HeadroomSuggestion {
  caption: string
  value: string
  meta: string
}

const indentOf = (line: string) => line.length - line.trimStart().length

/** Returns the trimmed text of the nearest ancestor line (smaller indent), skipping blanks. */
function ancestorsOf(lines: string[], row: number): string[] {
  const result: string[] = []
  let indent = indentOf(lines[row])
  for (let i = row - 1; i >= 0 && indent > 0; i -= 1) {
    const text = lines[i]
    if (text.trim() && indentOf(text) < indent) {
      result.push(text.trim().replace(/^-\s+/, ''))
      indent = indentOf(text)
    }
  }
  return result
}

/** Pure context-aware suggestions for the workflow YAML `headroom` block (best-effort). */
export function getHeadroomSuggestions(lines: string[], row: number): HeadroomSuggestion[] {
  const line = lines[row] ?? ''
  const trimmed = line.trim().replace(/^-\s+/, '')
  const ancestors = ancestorsOf(lines, row)

  const valueMatch = /^(\w+):\s*\w*$/.exec(trimmed)
  if (valueMatch && ancestors[0]?.startsWith('headroom:')) {
    const key = valueMatch[1]
    if (key === 'strategy') {
      return HEADROOM_STRATEGIES.map((s) => ({ caption: s, value: s, meta: 'strategy' }))
    }
    if ((HEADROOM_BOOLEAN_FIELDS as readonly string[]).includes(key)) {
      return ['true', 'false'].map((v) => ({ caption: v, value: v, meta: key }))
    }
    return []
  }

  if (!/^\w*$/.test(trimmed)) return []

  if (ancestors[0]?.startsWith('headroom:')) {
    return HEADROOM_KEYS.map((k) => ({ caption: k, value: `${k}: `, meta: 'headroom' }))
  }

  const topLevel = indentOf(line) === 0 && !line.trimStart().startsWith('-')
  const inAssistant = ancestors.includes('assistants:')
  if (topLevel || inAssistant) {
    return [{ caption: 'headroom', value: 'headroom:', meta: 'context compression' }]
  }
  return []
}

export const headroomCompleter: Ace.Completer = {
  getCompletions(_editor, session, pos, _prefix, callback) {
    const lines = session.getDocument().getAllLines()
    const suggestions = getHeadroomSuggestions(lines, pos.row)
    callback(
      null,
      suggestions.map((s) => ({ ...s, score: 1000 }))
    )
  },
}
