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

import { FC } from 'react'

import File from '@/components/File'
import { getArtifactFile } from '@/components/markdown/artifactLink'
import { resolveSharedFileToken } from '@/utils/sharedFileGrants'

// `[name](sandbox:/v1/files/<token>)` in the answer: the markdown renderer already shows these as
// a chip inline. A backticked URL is not a link, so it does not match and its file is listed here.
const INLINE_ARTIFACT_LINK = /\]\(sandbox:\/v1\/files\/([^\s)?]+)/g

interface ChatAiGeneratedFilesProps {
  /** Encoded tokens of the files the turn published (the assistant message's `file_names`) */
  fileNames?: string[]
  /** The answer text, to skip a file whose link is already rendered inline */
  content?: string
}

const ChatAiGeneratedFiles: FC<ChatAiGeneratedFilesProps> = ({ fileNames, content = '' }) => {
  if (!fileNames?.length) return null

  const inlineTokens = new Set(Array.from(content.matchAll(INLINE_ARTIFACT_LINK), (m) => m[1]))
  const files = Array.from(new Set(fileNames))
    .filter((token) => !inlineTokens.has(token))
    .flatMap((token) => getArtifactFile(resolveSharedFileToken(token)) ?? [])

  if (!files.length) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3" data-testid="generated-files">
      {files.map((file) => (
        <File key={file.fileId} file={file} withDownload />
      ))}
    </div>
  )
}

export default ChatAiGeneratedFiles
