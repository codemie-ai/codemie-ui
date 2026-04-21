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

/* eslint-disable consistent-return */
import { useEffect, useState } from 'react'

import { ElementPosition } from '@/types/onboarding'
import { getElementPosition } from '@/utils/onboarding'
import { getTailwindColor } from '@/utils/tailwindColors'

interface OnboardingSpotlightProps {
  target?: string | (() => HTMLElement | null)
  padding?: number
}

const DEFAULT_PADDING = 8

export const OnboardingSpotlight = ({
  target,
  padding = DEFAULT_PADDING,
}: OnboardingSpotlightProps) => {
  const [position, setPosition] = useState<ElementPosition | null>(null)

  useEffect(() => {
    if (!target) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const elementPosition = getElementPosition(target)
      // Only update when the element is actually found — avoids clearing the backdrop
      // when the element is momentarily absent (e.g. between step transitions)
      if (elementPosition) {
        setPosition(elementPosition)
      }
    }

    updatePosition()

    // Re-check after short delays to account for animated overlays
    // that may not have reached their final position on the first frame
    const t1 = setTimeout(updatePosition, 100)
    const t2 = setTimeout(updatePosition, 300)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [target])

  if (!position) return null

  return (
    <div
      className="absolute rounded-xl transition-all duration-300 ease-in-out z-[101] pointer-events-none"
      style={{
        top: `${position.top - padding}px`,
        left: `${position.left - padding}px`,
        width: `${position.width + padding * 2}px`,
        height: `${position.height + padding * 2}px`,
        boxShadow: `0 0 0 1px ${getTailwindColor(
          '--colors-onboarding-highlight',
          '#9E00FF'
        )}, 0 0 0 9999px rgba(0, 0, 0, 0.5)`,
      }}
    />
  )
}
