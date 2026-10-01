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
  subtitle?: string
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
  subtitle,
  onBack,
  showBack,
  rightContent,
  limitWidth,
  childrenClassName,
  centerTitle = false,
  isLoading,
}: LayoutProps) => {
  const { isDark, appearance } = useTheme()

  const isContentGradientEnabled = appearance?.gradients ?? true
  const isPageHeaderElevated = appearance?.pageHeaderElevated ?? false
  // Without a title the header holds only its actions; on phones they take the whole row.
  const hasTitleBlock = !!(title || subtitle || showBack || onBack)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <main
      id="main-content"
      className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
      style={{
        backgroundImage: !isDark && isContentGradientEnabled ? `url(${contentGradient})` : 'none',
      }}
    >
      <div className="flex flex-col flex-1 min-w-0">
        {(title || onBack || rightContent || renderHeader) && (
          <div
            className={cn(
              'min-h-layout-header h-layout-header border-b border-border-specific-panel-outline p-3 px-6 flex items-center justify-between',
              // Actions that do not fit next to the title move to their own line on small screens.
              'max-lg:h-auto max-lg:flex-wrap max-lg:px-4 max-lg:gap-3',
              isPageHeaderElevated ? 'bg-surface-specific-page-header' : ''
            )}
          >
            {renderHeader || (
              <>
                <div
                  className={cn(
                    'flex items-center gap-6 flex-1 min-w-0 max-lg:flex-auto max-lg:gap-3',
                    !hasTitleBlock && 'max-sm:hidden'
                  )}
                >
                  {(showBack || onBack) && (
                    <Button
                      variant="secondary"
                      onClick={handleBack}
                      className="flex items-center gap-2 max-lg:shrink-0"
                      aria-label="Back"
                    >
                      <ArrowLeftIcon />
                    </Button>
                  )}
                  <div
                    className={cn('flex-1 min-w-0', {
                      'text-center': centerTitle,
                    })}
                  >
                    {title && (
                      <h1 className="text-lg text-text-primary font-semibold max-lg:text-base max-lg:truncate">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <div className="text-xs text-text-quaternary whitespace-nowrap overflow-hidden text-ellipsis">
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>
                {rightContent && (
                  <div
                    className={cn(
                      'max-lg:max-w-full max-lg:[&>*]:flex-wrap',
                      !hasTitleBlock && 'max-sm:flex max-sm:w-full max-sm:justify-end'
                    )}
                  >
                    {rightContent}
                  </div>
                )}
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
