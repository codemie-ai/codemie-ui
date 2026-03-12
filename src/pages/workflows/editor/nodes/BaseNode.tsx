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

import { cn } from '@/utils/utils'

export interface BaseNodeProps {
  children: React.ReactNode
  classNames?: string
  selected?: boolean
  hasError?: boolean
  isConnected?: boolean
}

const BaseNode: React.FC<BaseNodeProps> = ({
  children,
  classNames = '',
  isConnected,
  selected = false,
  hasError = false,
}) => {
  return (
    <div
      className={cn(
        'bg-surface-base-chat w-64 rounded-xl shadow-md border-[1.5px] relative',
        'border-border-specific-node-border text-xs transition-all',
        {
          'border-border-specific-node-border-focus': selected,
          'outline outline-offset-2 outline-failed-secondary': hasError,
        },
        classNames
      )}
    >
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
    </div>
  )
}

export default BaseNode
