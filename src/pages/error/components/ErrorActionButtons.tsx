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

import { cn } from '@/utils/utils'

interface ErrorActionButtonsProps {
  onGoHome: () => void
}

const ErrorActionButtons: FC<ErrorActionButtonsProps> = ({ onGoHome }) => {
  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={() => {
          window.location.href = 'mailto:AskCodeMie@epam.com'
        }}
        className={cn(
          'h-10',
          'flex items-center justify-center gap-2',
          'px-4 py-3',
          'rounded-lg border',
          'text-sm font-semibold leading-6',
          'bg-surface-base-secondary border-border-quaternary text-text-accent',
          'hover:bg-surface-interactive-hover hover:border-border-accent hover:text-accent-hover',
          'transition-colors'
        )}
      >
        Report a Problem
      </button>

      <button
        onClick={onGoHome}
        className={cn(
          'h-10',
          'flex items-center justify-center gap-2',
          'px-4 py-3',
          'rounded-lg',
          'text-sm font-semibold leading-6',
          'bg-button-primary-bg text-text-accent',
          'hover:bg-button-primary-bg-hover',
          'transition-colors'
        )}
      >
        Back to Home Page
      </button>
    </div>
  )
}

export default ErrorActionButtons
