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

import AppearanceSvg from '@/assets/icons/appearance.svg?react'
import DarkCard from '@/assets/images/dark-theme-card.svg?react'
import LightCard from '@/assets/images/light-theme-card.svg?react'
import { RadioButton } from '@/components/form/RadioButton'
import { CUSTOM_THEME_KEY, DARK_THEME_KEY, LIGHT_THEME_KEY, THEME_KEY } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import CustomAppearance from '@/pages/settings/components/CustomAppearance'
import InfoCard from '@/pages/settings/components/InfoCard'

interface ThemeOption {
  label: string
  value: string
  card: ReactNode
}

const themeOptions: ThemeOption[] = [
  { label: 'Dark', value: DARK_THEME_KEY, card: <DarkCard /> },
  { label: 'Light', value: LIGHT_THEME_KEY, card: <LightCard /> },
  {
    label: 'Custom',
    value: CUSTOM_THEME_KEY,
    card: (
      <div className="h-[101px] w-[154px] overflow-hidden">
        <div className="scale-50 origin-top-left">
          <div className="h-[202px] w-[308px] overflow-hidden rounded-lg bg-surface-base-primary border border-border-primary">
            <div className="flex h-full">
              <div className="w-[76px] bg-surface-base-navigation px-3 py-4">
                <div className="mb-4 h-2 w-8 rounded bg-text-accent" />
                <div className="space-y-2">
                  <div className="h-1.5 w-10 rounded bg-border-primary" />
                  <div className="h-1.5 w-8 rounded bg-border-primary" />
                  <div className="h-1.5 w-10 rounded bg-border-primary" />
                  <div className="h-1.5 w-7 rounded bg-border-primary" />
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
                <div className="h-7 w-7 rounded-full bg-gradient2" />
                <div className="w-full space-y-2">
                  <div className="h-3 rounded bg-border-primary" />
                  <div className="h-3 w-2/3 rounded bg-border-primary" />
                </div>
                <div className="h-9 w-full rounded bg-magical-button" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  return (
    <InfoCard heading="Appearance" icon={AppearanceSvg} data-onboarding="theme-toggle">
      <div className="flex flex-col gap-6">
        <div className="flex flex-row flex-wrap gap-6">
          {themeOptions.map((option, index) => (
            <button
              type="button"
              onClick={() => setTheme(option.value)}
              key={`${THEME_KEY}-${index}`}
              className="flex flex-col gap-3 items-center"
            >
              <div className="[&>svg]:overflow-visible">{option.card}</div>
              <RadioButton
                inputId={`${THEME_KEY}-${index}`}
                name={THEME_KEY}
                value={option.value}
                label={option.label}
                checked={theme === option.value}
              />
            </button>
          ))}
        </div>

        {theme === CUSTOM_THEME_KEY && <CustomAppearance />}
      </div>
    </InfoCard>
  )
}

export default ThemeToggle
