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

import chatImportIcon from '@/assets/icons/chat-import.svg'

export interface ChatImportSource {
  /** Human-readable name shown as the avatar tooltip / fallback label. */
  name: string
  /** Icon rendered instead of the generated "?" avatar. */
  iconUrl: string
}

/**
 * Canonical import source identifiers as received from the backend `import_source` field.
 * Unknown strings received from the API must be normalized to null — never widened to this type.
 */
export type ImportSourceKind =
  | 'claude_desktop'
  | 'claude_cli'
  | 'claude_code'
  | 'codex'
  | 'gemini'
  | 'copilot_cli'
  | 'opencode'
  | 'pi'
  | 'kimi'

const VALID_IMPORT_SOURCES: ReadonlySet<string> = new Set<ImportSourceKind>([
  'claude_desktop',
  'claude_cli',
  'claude_code',
  'codex',
  'gemini',
  'copilot_cli',
  'opencode',
  'pi',
  'kimi',
])

/** Type guard: narrows an unknown value to ImportSourceKind. Unknown strings → false. */
export const isValidImportSourceKind = (value: unknown): value is ImportSourceKind =>
  typeof value === 'string' && VALID_IMPORT_SOURCES.has(value)

/** Display metadata keyed by canonical import source. */
export const IMPORT_SOURCE_DISPLAY: Record<ImportSourceKind, ChatImportSource> = {
  claude_desktop: { name: 'Claude Desktop', iconUrl: chatImportIcon },
  claude_cli: { name: 'Claude CLI', iconUrl: chatImportIcon },
  claude_code: { name: 'Claude Code', iconUrl: chatImportIcon },
  codex: { name: 'Codex', iconUrl: chatImportIcon },
  gemini: { name: 'Gemini', iconUrl: chatImportIcon },
  copilot_cli: { name: 'Copilot CLI', iconUrl: chatImportIcon },
  opencode: { name: 'Opencode', iconUrl: chatImportIcon },
  pi: { name: 'Pi', iconUrl: chatImportIcon },
  kimi: { name: 'Kimi', iconUrl: chatImportIcon },
}

/**
 * Folders created by the CodeMie CLI when it imports conversations from external
 * agents. Such chats reference an assistant that does not exist in the workspace,
 * so without this mapping their messages fall back to a generated "?" avatar.
 *
 * @deprecated Use resolveImportDisplay instead. This function exists for legacy
 * folder-name detection until backend migration is complete.
 */
const CHAT_IMPORT_SOURCES: Record<string, ChatImportSource> = {
  'claude desktop': { name: 'Claude Imports', iconUrl: chatImportIcon },
  'claude imports': { name: 'Claude Imports', iconUrl: chatImportIcon },
  claude: { name: 'Claude Imports', iconUrl: chatImportIcon },
  'codemie-code': { name: 'codemie-code', iconUrl: chatImportIcon },
}

/** @deprecated Use resolveImportDisplay instead. */
export const getChatImportSource = (folder?: string | null): ChatImportSource | undefined =>
  folder ? CHAT_IMPORT_SOURCES[folder.toLowerCase()] : undefined

/** Returns the shared sidebar presentation group for a known legacy import folder. */
export const getLegacyImportGroupName = (folder?: string | null): string | undefined =>
  folder ? getChatImportSource(folder)?.name : undefined

/**
 * Resolves display metadata (icon + label) for a chat.
 * Canonical `importSource` takes priority; falls back to legacy folder-name detection.
 * Display-only — does not determine sidebar grouping placement.
 */
export const resolveImportDisplay = (chat: {
  importSource?: ImportSourceKind | null
  folder?: string | null
}): ChatImportSource | undefined => {
  if (chat.importSource != null) {
    return IMPORT_SOURCE_DISPLAY[chat.importSource]
  }
  return getChatImportSource(chat.folder)
}
