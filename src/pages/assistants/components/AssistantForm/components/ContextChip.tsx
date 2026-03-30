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

import CloudDataSvg from '@/assets/icons/cloud-data.svg?react'
import FolderSvg from '@/assets/icons/folder.svg?react'
import TerminalSvg from '@/assets/icons/terminal.svg?react'
import { ContextType } from '@/types/entity/assistant'

import type { AssistantContextOption } from './ContextSelector'

const getIconByContextType = (contextType?: string) => {
  const iconClassName = 'w-[18px] h-[18px] shrink-0'

  switch (contextType) {
    case ContextType.KNOWLEDGE_BASE:
      return <FolderSvg className={iconClassName} />
    case ContextType.CODE:
      return <TerminalSvg className={iconClassName} />
    case ContextType.PROVIDER:
      return <CloudDataSvg className={iconClassName} />
    default:
      return <FolderSvg className={iconClassName} />
  }
}

export const createContextChipRenderer =
  (selectedItems: AssistantContextOption[]) => (optionValue: any) => {
    if (!optionValue) return null

    const fullOption = selectedItems.find(
      (item) => item.name === optionValue || item.id === optionValue
    )

    return (
      <>
        {getIconByContextType(fullOption?.context_type)}
        <span>{optionValue}</span>
      </>
    )
  }
