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

import XMarkSvg from '@/assets/icons/cross.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'

type Props = {
  fileName: string
  // Distinguishes the two sections of the list so that an already-uploaded file and a
  // newly selected one sharing a name still get distinct accessible names — removing them
  // has materially different consequences.
  fileKind?: 'uploaded' | 'selected'
  onRemove: () => void
}

const FileListItem: FC<Props> = ({ fileName, fileKind = 'selected', onRemove }) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-base-content rounded-lg border border-border-primary">
      <div className="flex items-center gap-2 min-w-0">
        <FileSvg aria-hidden="true" className="size-4 flex-shrink-0 text-text-quaternary" />
        <span className="text-sm text-text-primary truncate">{fileName}</span>
      </div>
      <button
        type="button"
        aria-label={`Delete ${fileKind} file ${fileName}`}
        className="cursor-pointer flex-shrink-0 text-text-quaternary hover:text-text-primary rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgb(var(--colors-border-accent))]"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <XMarkSvg aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

export default FileListItem
