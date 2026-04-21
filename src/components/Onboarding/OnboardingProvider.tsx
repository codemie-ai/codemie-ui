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

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { onboardingStore } from '@/store/onboarding'

import { OnboardingOverlay } from './OnboardingOverlay'

interface OnboardingProviderProps {
  children: React.ReactNode
}

export const OnboardingProvider = ({ children }: OnboardingProviderProps) => {
  const { isActive } = useSnapshot(onboardingStore)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onboardingStore.skipFlow()
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          onboardingStore.nextStep()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          if (onboardingStore.currentStepIndex > 0) {
            onboardingStore.prevStep()
          }
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return (
    <>
      {children}
      {isActive && <OnboardingOverlay />}
    </>
  )
}
