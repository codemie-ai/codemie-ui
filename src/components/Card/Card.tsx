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

import { classNames } from 'primereact/utils'
import { useRef, useMemo } from 'react'

import CardGradientSvg from '@/assets/images/card-gradient.svg?react'
import WhiteCardGradientSvg from '@/assets/images/white-card-gradient.svg?react'
import Tooltip from '@/components/Tooltip'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { useTheme } from '@/hooks/useTheme'
import { truncateInput } from '@/utils/helpers'

export interface CardProps {
  title: string
  subtitle?: string
  description: string
  label?: string
  avatar: React.ReactNode
  actions?: React.ReactNode
  status?: React.ReactNode
  onClick: (e) => void
  id: string
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  description,
  label = null,
  avatar,
  actions = null,
  status = null,
  id,
  onClick,
}) => {
  const titleEl = useRef<HTMLParagraphElement>(null)
  const descriptionEl = useRef<HTMLParagraphElement>(null)
  const { isDark } = useTheme()

  const isTitleTruncated = useIsTruncated(titleEl)
  const isDescriptionTruncated = useIsTruncated(descriptionEl)

  const tooltipClass = useMemo(() => {
    return 'tooltip-target-' + id
  }, [id])

  return (
    <>
      <Tooltip target={'.' + tooltipClass} position="left" showDelay={100} />
      <div
        onClick={onClick}
        className="h-card rounded-xl flex flex-col w-full bg-surface-specific-card border-border-structural border-1 cursor-pointer transition group"
      >
        <div className="relative">
          <div className="rounded-xl absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition duration-300 overflow-hidden">
            {isDark ? <CardGradientSvg /> : <WhiteCardGradientSvg />}
          </div>
        </div>

        <div className="body h-card flex flex-col justify-between p-4">
          <div className="flex flex-row gap-4 min-h-[88px]">
            {avatar}
            <div className="flex flex-row items-center gap-3 basis-full overflow-hidden">
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="w-full text-base font-semibold mb-0 flex justify-between gap-2">
                  <div
                    ref={titleEl}
                    data-pr-tooltip={isTitleTruncated ? title : ''}
                    data-pr-position="bottom"
                    className={classNames(
                      'font-semibold whitespace-nowrap text-ellipsis truncate z-[1]',
                      tooltipClass
                    )}
                  >
                    {title}
                  </div>

                  {label && (
                    <div className="text-xs font-semibold bg-text-accent-status bg-opacity-card-tag text-text-inverse px-2 py-1 rounded-lg z-[1]">
                      {label}
                    </div>
                  )}
                </h3>

                {subtitle && (
                  <div className="text-xs text-text-quaternary z-[1] whitespace-nowrap overflow-hidden text-ellipsis">
                    {subtitle}
                  </div>
                )}

                <p
                  ref={descriptionEl}
                  data-pr-tooltip={isDescriptionTruncated ? truncateInput(description, 1000) : ''}
                  data-pr-position="left"
                  className={classNames(
                    'z-[1] text-xs mb-0 mt-4 line-clamp-2 text-text-tertiary h-8 overflow-hidden text-ellipsis',
                    tooltipClass
                  )}
                >
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center mt-3 h-7">
            {actions}

            {status && (
              <div className="flex flex-row ml-auto items-center text-xs gap-3">{status}</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Card
