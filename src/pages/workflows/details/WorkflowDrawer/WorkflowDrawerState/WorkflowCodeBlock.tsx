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

interface WorkflowCodeBlockProps {
  title?: string
  downloadFilename?: string
  text: string
}

const WorkflowCodeBlock = ({ title, downloadFilename, text }: WorkflowCodeBlockProps) => {
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
      <ExpandSvg className="size-4" />
    </Button>
  )

  return (
    <>
      <div className="overflow-y-scroll hide-scrollbar py-4 min-h-0">
        <CodeBlock
          title={title}
          language="txt"
          downloadFilename={downloadFilename}
          text={text}
          headerActionsLast
          headerActionsTemplate={expandButton}
        />
      </div>

      <Popup
        hideFooter
        header={title}
        visible={isExpanded}
        onHide={handleExpand}
        cancelText="Close"
        withBorder={false}
        className="max-w-3xl w-full"
        bodyClassName="pt-1 pb-6"
        footerContent={
          <Button variant="secondary" onClick={() => setIsExpanded(false)}>
            Close
          </Button>
        }
      >
        <CodeBlock title={''} language={'txt'} downloadFilename={downloadFilename} text={text} />
      </Popup>
    </>
  )
}

export default WorkflowCodeBlock
