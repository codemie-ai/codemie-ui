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

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { copyToClipboard } from '@/utils/utils'

type TableBlockProps = {
  html: string
  raw: string
}

const TableBlock: FC<TableBlockProps> = ({ html, raw }) => (
  <div className="relative my-1">
    <div dangerouslySetInnerHTML={{ __html: html }} />
    <div className="absolute top-0 right-0 z-10 flex items-center h-9">
      <Button
        variant={ButtonType.SECONDARY}
        className="!px-2 mr-2"
        aria-label="Copy table"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Copy to buffer"
        onClick={() => copyToClipboard(raw.trim(), 'Table copied to clipboard')}
      >
        <CopySvg />
      </Button>
    </div>
  </div>
)

export default TableBlock
