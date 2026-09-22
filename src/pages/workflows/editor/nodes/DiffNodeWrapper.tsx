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

import { useUpdateNodeInternals } from '@xyflow/react'
import React, { useLayoutEffect, useMemo } from 'react'

import { cn } from '@/utils/utils'
import type { DiffStatus } from '@/utils/workflowEditor/diffWorkflowGraphs'

import {
  DIFF_BADGE_LABEL,
  DIFF_BG_CLASS,
  NODE_RENDER_MODE,
  NodeRenderContext,
} from './diffChromeContext'

import type { NodeProps } from '@xyflow/react'

export interface DiffNodeWrapperData {
  diffStatus?: DiffStatus
  OriginalComponent: React.ComponentType<NodeProps>
  [key: string]: unknown
}

interface DiffNodeChromeProps {
  id: string
  diffStatus: DiffStatus
  OriginalComponent: React.ComponentType<NodeProps>
  originalData: Omit<DiffNodeWrapperData, 'diffStatus' | 'OriginalComponent'>
  rest: Omit<NodeProps, 'data' | 'id'>
  className?: string
}

const DiffNodeChrome: React.FC<DiffNodeChromeProps> = ({
  id,
  diffStatus,
  OriginalComponent,
  originalData,
  rest,
  className,
}) => {
  const updateNodeInternals = useUpdateNodeInternals()

  useLayoutEffect(() => {
    updateNodeInternals(id)
  }, [diffStatus, id, updateNodeInternals])

  return (
    <div
      className={cn('relative overflow-visible rounded-xl w-full h-full', className)}
      data-testid="diff-chrome-root"
    >
      <span
        className={cn(
          'absolute z-30 px-1.5 py-0.5 text-xs font-bold leading-none top-0 right-3 -translate-y-full rounded-t text-text-inverse',
          DIFF_BG_CLASS[diffStatus]
        )}
      >
        {DIFF_BADGE_LABEL[diffStatus]}
      </span>

      <div
        className={cn(
          'w-full h-full pointer-events-none',
          diffStatus === 'removed' && '[&_.workflow-base-node_*]:line-through'
        )}
      >
        <OriginalComponent
          {...rest}
          id={id}
          data={{ ...originalData, active: false } as NodeProps['data']}
        />
      </div>
    </div>
  )
}

export interface DiffNodeWrapperProps extends Omit<NodeProps, 'data'> {
  data: DiffNodeWrapperData
  className?: string
}

export const DiffNodeWrapper: React.FC<DiffNodeWrapperProps> = (props) => {
  const { data, id, className, ...rest } = props
  const { diffStatus, OriginalComponent, ...originalData } = data

  const node = !diffStatus ? (
    <div className={cn('w-full h-full pointer-events-none', className)}>
      <OriginalComponent {...rest} id={id} data={originalData as NodeProps['data']} />
    </div>
  ) : (
    <DiffNodeChrome
      id={id}
      diffStatus={diffStatus}
      OriginalComponent={OriginalComponent}
      originalData={originalData}
      rest={rest}
      className={className}
    />
  )

  const contextValue = useMemo(
    () => ({ mode: NODE_RENDER_MODE.VISUAL_DIFF, diffStatus }),
    [diffStatus]
  )

  return <NodeRenderContext.Provider value={contextValue}>{node}</NodeRenderContext.Provider>
}

export default DiffNodeWrapper
