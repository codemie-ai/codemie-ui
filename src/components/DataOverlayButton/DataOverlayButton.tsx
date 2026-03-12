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

import { OverlayPanel } from 'primereact/overlaypanel'
import { MouseEvent, useEffect, useRef, useState } from 'react'

import InfoSvg from '@/assets/icons/info.svg?react'

import Button from '../Button'

export interface DataOverlayButtonProps<T = unknown> {
  title?: string
  subtitle?: string
  data: () => Promise<T>
  render: (data: T) => Record<string, number | string>
}

const DataOverlayButton = <T,>({ title, subtitle, data, render }: DataOverlayButtonProps<T>) => {
  const ref = useRef<OverlayPanel>(null)
  const [resolvedData, setResolvedData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSeeUsageDetails = async (e: MouseEvent<HTMLButtonElement>) => {
    ref.current?.toggle(e)
    if (ref.current?.isVisible()) return

    setIsLoading(true)
    try {
      const result = await data()
      setResolvedData(result)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    ref.current?.align()
  }, [resolvedData])

  const content = resolvedData ? render(resolvedData) : null

  return (
    <>
      <Button
        type="secondary"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Usage Details"
        aria-label="Usage details"
        onClick={handleSeeUsageDetails}
      >
        <InfoSvg />
      </Button>
      <OverlayPanel
        ref={ref}
        className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural shadow-xl"
      >
        {isLoading ? (
          <div className="text-text-primary text-sm">Loading...</div>
        ) : (
          <>
            {title && <div className="font-semibold text-sm mb-2">{title}</div>}
            {subtitle && <div className="mb-3 text-text-quaternary text-xs">{subtitle}</div>}

            {content && (
              <div className="flex flex-col gap-2">
                {Object.keys(content).map((key) => (
                  <div
                    key={key}
                    className="flex gap-2 justify-between items-center text-text-quaternary text-xs"
                  >
                    <span>{key}:</span>
                    <div className="rounded-lg border border-border-structural border-solid px-2 py-1">
                      <span className="font-semibold text-text-primary">{content[key] ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </OverlayPanel>
    </>
  )
}

export default DataOverlayButton
