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

import { ReactNode } from 'react'

import ArrowLeftIcon from '@/assets/icons/arrow-left.svg?react'
import contentGradient from '@/assets/images/content-gradient.png'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

interface LayoutProps {
  children?: ReactNode
  renderHeader?: ReactNode
  title?: string
  onBack?: () => void
  showBack?: boolean
  rightContent?: ReactNode
  limitWidth?: boolean
  centerTitle?: boolean
  childrenClassName?: string
  isLoading?: boolean
}

const PageLayout = ({
  children,
  renderHeader,
  title,
  onBack,
  showBack,
  rightContent,
  limitWidth,
  childrenClassName,
  centerTitle = false,
  isLoading,
}: LayoutProps) => {
  const { isDark } = useTheme()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <main
      className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
      style={{ backgroundImage: !isDark ? `url(${contentGradient})` : 'none' }}
    >
      <div className="flex flex-col flex-1 min-w-0">
        {(title || onBack || rightContent || renderHeader) && (
          <div className="min-h-layout-header h-layout-header border-b border-border-specific-panel-outline p-3 px-6 flex items-center justify-between">
            {renderHeader || (
              <>
                <div className="flex items-center gap-6 flex-1">
                  {(showBack || onBack) && (
                    <Button
                      variant="secondary"
                      onClick={handleBack}
                      className="flex items-center gap-2"
                      aria-label="Back"
                    >
                      <ArrowLeftIcon />
                    </Button>
                  )}
                  <div
                    className={cn('flex-1', {
                      'text-center': centerTitle,
                    })}
                  >
                    {title && <h1 className="text-lg text-text-primary font-semibold">{title}</h1>}
                  </div>
                </div>
                {rightContent && <div>{rightContent}</div>}
              </>
            )}
          </div>
        )}
        <div
          className={cn(
            'flex-grow overflow-y-auto show-scroll h-full w-full px-6',
            childrenClassName
          )}
        >
          {isLoading ? (
            <Spinner rootClassName="min-h-full" />
          ) : (
            <div
              className={cn('h-full', {
                'mx-auto max-w-5xl w-full': limitWidth,
                'w-full': !limitWidth,
              })}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default PageLayout
