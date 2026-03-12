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

import React from 'react'

import InfoSvg from '@/assets/icons/info.svg?react'
import Tooltip from '@/components/Tooltip'
import { cn } from '@/utils/utils'

interface HintProps {
  id?: string
  showDelay?: number
  position?: 'right' | 'top' | 'bottom' | 'left' | 'mouse'
  hint?: string | null
}

const Hint: React.FC<HintProps> = ({ id, showDelay, position, hint }) => {
  if (!hint) return null

  return (
    <>
      <Tooltip target={`#${id}`} showDelay={showDelay} position={position}>
        {hint}
      </Tooltip>
      <div
        id={id}
        className={cn(
          'question-mark text-lg align-middle inline-block ml-1 leading-none',
          'font-semibold cursor-pointer hover:text-text-accent-hover'
        )}
      >
        <InfoSvg className="w-4 h-4 text-text-quaternary cursor-pointer" />
      </div>
    </>
  )
}

export default Hint
