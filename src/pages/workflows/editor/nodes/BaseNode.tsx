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
  success = 0,
  failures = 0,
  active = true,
}) => {
  const ctx = useContext(ExecutionContext)

  return (
    <div
      className={cn(
        'bg-surface-base-chat w-64 rounded-xl shadow-md border-[1.5px] relative',
        'border-border-specific-node-border text-xs transition-all',
        {
          'border-border-specific-node-border-focus': selected,
          'outline outline-offset-2 outline-failed-secondary': hasError,
          'border-transparent': status,
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

      {success > 0 || failures > 0 ? (
        <div className="flex gap-6 absolute -bottom-6 left-5">
          {success > 0 ? (
            <div className="flex gap-1 text-success-primary">
              <Check18Svg className="size-4" /> {success}
            </div>
          ) : null}
          {failures > 0 ? (
            <div className="flex gap-1 text-failed-primary">
              <CrossSvg className="size-4" /> {failures}
            </div>
          ) : null}
        </div>
      ) : null}

      {status === 'Interrupted' && ctx?.interruptedStateId && (
        <WorkflowExecutionStateControls
          small
          stateId={ctx?.interruptedStateId}
          className="absolute -bottom-14 left-0 pointer-events-auto"
        />
      )}
    </div>
  )
}

export default BaseNode
