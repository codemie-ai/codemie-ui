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

import { FC, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import StatusFailedSvg from '@/assets/icons/status-failed.svg?react'
import StandaloneLayout from '@/components/Layouts/StandaloneLayout'
import { cn } from '@/utils/utils'

import ErrorActionButtons from './ErrorActionButtons'
import ErrorFooter from './ErrorFooter'

interface RuntimeErrorProps {
  errorDetails?: string
  onGoHome: () => void
}

const RuntimeError: FC<RuntimeErrorProps> = ({ errorDetails, onGoHome }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  return (
    <StandaloneLayout>
      <div className="flex flex-col items-center justify-between min-h-screen px-4">
        <div
          className={cn(
            'flex-1 flex justify-center',
            isDetailsOpen ? 'items-start pt-24' : 'items-center'
          )}
        >
          <div className="text-center w-[692px] max-w-full mt-[60px]">
            <div className="mb-2">
              <StatusFailedSvg className="w-24 h-24 mx-auto" />
            </div>

            <h1 className="text-4xl font-semibold leading-9 text-text-main mb-4">
              An unexpected error has occurred
            </h1>

            <div className="text-sm font-normal leading-5 text-text-main mb-4">
              <p>Please try again later or contact support if the issue persists.</p>
            </div>

            {errorDetails && import.meta.env.DEV && (
              <div className="mb-4 border border-border-secondary rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className={cn(
                    'w-full h-[55px] flex items-center justify-between',
                    'px-4',
                    'text-sm font-medium text-text-main',
                    'bg-surface-base-secondary',
                    'hover:bg-surface-interactive-hover',
                    'transition-colors'
                  )}
                >
                  <span>Technical Details</span>
                  <ChevronDownSvg
                    className={cn('w-4 h-4 transition-transform', {
                      'rotate-180': isDetailsOpen,
                    })}
                  />
                </button>

                {isDetailsOpen && (
                  <div className="bg-surface-base-secondary p-4 text-left border-t border-border-secondary">
                    <div className="overflow-auto max-h-64 pr-2 show-scroll">
                      <pre className="font-geist-mono font-medium text-sm leading-3.5 text-text-main whitespace-pre-wrap break-words m-0">
                        {errorDetails}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ErrorActionButtons onGoHome={onGoHome} />
          </div>
        </div>

        <ErrorFooter />
      </div>
    </StandaloneLayout>
  )
}

export default RuntimeError
