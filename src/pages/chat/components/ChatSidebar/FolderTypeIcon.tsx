// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import ChatImportSvg from '@/assets/icons/chat-import.svg?react'
import FolderStarSvg from '@/assets/icons/folder-star.svg?react'
import FolderSvg from '@/assets/icons/folder.svg?react'
import { cn } from '@/utils/utils'

import { FolderKind } from './ChatSidebarLists/chatSidebarListsHelpers'

interface FolderTypeIconProps {
  kind: FolderKind | 'assistant'
  className?: string
}

const FolderTypeIcon = ({ kind, className }: FolderTypeIconProps) => {
  if (kind === 'import' || kind === 'legacy-import') {
    return (
      <ChatImportSvg
        aria-hidden="true"
        className={cn('size-4 shrink-0 text-icon-secondary', className)}
      />
    )
  }

  if (kind === 'custom') {
    return (
      <FolderStarSvg
        aria-hidden="true"
        className={cn('size-4 shrink-0 text-icon-secondary', className)}
      />
    )
  }

  return (
    <FolderSvg
      aria-hidden="true"
      className={cn('size-4 shrink-0 text-icon-secondary', className)}
    />
  )
}

export default FolderTypeIcon
