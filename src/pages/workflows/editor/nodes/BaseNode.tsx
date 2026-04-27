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

import React, { useContext } from 'react'

import Check18Svg from '@/assets/icons/check-18.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import StatusBadge from '@/components/StatusBadge'
import WorkflowExecutionStateControls from '@/pages/workflows/details/states/WorkflowExecutionStateControls'
import { WorkflowExecutionStatus } from '@/types/entity'
import { cn } from '@/utils/utils'

import { getStatusBorderClass } from './common'
import { ExecutionContext } from '../../details/hooks/useExecutionsContext'

export interface BaseNodeProps {
  children: React.ReactNode
  classNames?: string
  selected?: boolean
  hasError?: boolean
  isConnected?: boolean
  status?: WorkflowExecutionStatus
  success?: number
  failures?: number
  active?: boolean
}

const BaseNode: React.FC<BaseNodeProps> = ({
  children,
  classNames = '',
  isConnected,
  selected = false,
  hasError = false,
  status,
  success,
  failures,
  active = true,
}) => {
  const ctx = useContext(ExecutionContext)

  const isIteratorNode = success !== undefined || failures !== undefined

  return (
    <div
      className={cn(
        'bg-surface-base-chat group/base-node w-64 rounded-xl shadow-md border-[1.5px] relative ',
        'border-border-specific-node-border text-xs transition-all',
        {
          'border-border-specific-node-border-focus': selected,
          'outline outline-offset-2 outline-failed-secondary': hasError,
          'border-transparent': status,
          '!pointer-events-auto cursor-grab': isIteratorNode,
        },
        getStatusBorderClass(status),
        classNames
      )}
    >
      <div
        className={cn(
          'bg-surface-elevated/50 border border-border-secondary absolute -inset-2 rounded-2xl -z-10 opacity-0 transition',
          active && 'opacity-100'
        )}
      />

      {isConnected !== undefined && (
        <div
          className={cn(
            'connection-ind',
            'absolute top-2 right-2 w-2 h-2 rounded-full opacity-70',
            isConnected ? 'bg-success-primary' : 'bg-failed-secondary'
          )}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      )}

      {children}

      {isIteratorNode ? (
        <div
          className={cn(
            'flex gap-6 absolute -bottom-6 left-5',
            status === 'Interrupted' && 'group-hover/base-node:opacity-0'
          )}
        >
          {(success ?? 0) > 0 ? (
            <div className="flex gap-1 text-success-primary">
              <Check18Svg className="size-4" /> {success}
            </div>
          ) : null}
          {(failures ?? 0) > 0 ? (
            <div className="flex gap-1 text-failed-primary">
              <CrossSvg className="size-4" /> {failures}
            </div>
          ) : null}
        </div>
      ) : null}

      {isIteratorNode && status === 'Interrupted' && ctx?.interruptedStateId && (
        <div className="flex gap-6 absolute -bottom-6 right-0">
          <StatusBadge status="pending" text="Action required" />
        </div>
      )}

      {status === 'Interrupted' && ctx?.interruptedStateId && (
        <div
          className={cn(
            'absolute top-full left-0 pointer-events-auto',
            isIteratorNode &&
              'flex items-end opacity-0 h-0 overflow-hidden group-hover/base-node:h-auto pointer-events-none group-hover/base-node:opacity-100 group-hover/base-node:pointer-events-auto hover:pointer-events-auto'
          )}
        >
          <WorkflowExecutionStateControls
            small
            stateId={ctx?.interruptedStateId}
            className="mt-2.5"
          />
        </div>
      )}
    </div>
  )
}

export default BaseNode
