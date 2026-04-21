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

import { useState } from 'react'

import ExpandSvg from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock'
import Popup from '@/components/Popup'
import { cn } from '@/utils/utils'

interface WorkflowStateInputProps {
  text: string
  className?: string
}

const WorkflowStateInput = ({ text, className }: WorkflowStateInputProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const expandButton = (
    <Button
      variant="secondary"
      className="!px-2"
      data-tooltip-id="react-tooltip"
      data-tooltip-content="Expand"
      onClick={handleExpand}
    >
      <ExpandSvg className="size-4 test2" />
    </Button>
  )

  return (
    <div className={cn('overflow-y-auto min-h-0 hide-scrollbar w-full', className)}>
      <CodeBlock
        title="Input"
        language="txt"
        downloadFilename="prompt"
        text={text}
        headerActionsLast
        headerActionsTemplate={expandButton}
      />

      <Popup
        header="Input"
        visible={isExpanded}
        onHide={handleExpand}
        cancelText="Close"
        withBorder={false}
        className="max-w-3xl w-full"
        hideFooter
        bodyClassName="pt-1 pb-4"
      >
        <CodeBlock title="Input" language="txt" downloadFilename="prompt" text={text} />
      </Popup>
    </div>
  )
}

export default WorkflowStateInput
