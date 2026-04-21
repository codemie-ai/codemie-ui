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

import { NodeResizeControl } from '@xyflow/react'

import ExpandSVG from '@/assets/icons/expand.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import NodeIteratorBorderSvg from '@/assets/images/node-iterator-border.svg?react'
import { cn } from '@/utils/utils'
import {
  ITERATOR_NODE_DEFAULT_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
} from '@/utils/workflowEditor/constants'

import { CommonNodeProps } from './common'

export const IteratorNode = ({ data, selected, id }: CommonNodeProps) => {
  const state = data.findState(id)
  const { highlighted, isFullscreen } = data
  const iterKey = state?._meta?.data?.next?.iter_key

  return (
    <div
      className={cn(
        'relative w-full h-full rounded-lg',
        data.hasError && 'outline outline-offset-2 outline-failed-secondary'
      )}
    >
      <NodeIteratorBorderSvg
        className={cn(
          'absolute inset-0 w-full h-full pointer-events-none transition-all rounded-[8px]',
          {
            'text-border-specific-node-border-iter-focus': selected,
            'text-border-specific-node-border-iter': !selected,
          }
        )}
      />
      <div
        className={cn('relative w-full h-full shadow-md p-5', {
          'bg-surface-interactive-hover': highlighted,
        })}
      >
        {isFullscreen && (
          <NodeResizeControl
            className="!border-none !bg-transparent"
            minWidth={ITERATOR_NODE_DEFAULT_WIDTH}
            minHeight={ITERATOR_NODE_DEFAULT_HEIGHT}
            autoScale={false}
          >
            <ExpandSVG className="rotate-90 absolute bottom-2 right-2 w-4 h-4" />
          </NodeResizeControl>
        )}

        <div className="flex gap-2 items-center">
          <RefreshSvg className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
          <span className="text-sm"> Iterator </span>

          {iterKey && (
            <div className="text-xs font-semibold border-1 border-border-structural bg-surface-interactive-hover rounded-lg px-2 py-1 ml-2">
              {iterKey}
            </div>
          )}
        </div>

        {data.totalItems && (
          <div className="text-xs absolute -bottom-2 left-1/2 -translate-x-1/2 bg-surface-base-primary px-2">
            {data.totalItems} items total
          </div>
        )}
      </div>
    </div>
  )
}
