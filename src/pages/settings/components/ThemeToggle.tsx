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

import { useState } from 'react'

import AppearanceSvg from '@/assets/icons/appearance.svg?react'
import DarkCard from '@/assets/images/dark-theme-card.svg?react'
import LightCard from '@/assets/images/light-theme-card.svg?react'
import { RadioButton } from '@/components/form/RadioButton'
import { THEME_KEY } from '@/constants'
import { useTheme } from '@/hooks/useTheme'
import InfoCard from '@/pages/settings/components/InfoCard'

const options = [
  { label: 'Dark', value: 'codemieDark', card: <DarkCard /> },
  { label: 'Light', value: 'codemieLight', card: <LightCard /> },
]
const themeKey = THEME_KEY

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()

  const [selectedTheme, setSelectedTheme] = useState(theme ?? null)

  const handleChange = (optionValue) => {
    setSelectedTheme(optionValue)
    setTheme(optionValue)
  }

  return (
    <InfoCard heading="Appearance" icon={AppearanceSvg} data-onboarding="theme-toggle">
      <div className="flex flex-row gap-6">
        {options.map((option, index) => (
          <button
            onClick={() => handleChange(option.value)}
            key={`${themeKey}-${index}`}
            className="flex flex-col gap-3 items-center"
          >
            <div className="[&>svg]:overflow-visible">{option?.card}</div>
            <RadioButton
              inputId={`${themeKey}-${index}`}
              name={themeKey}
              value={option.value}
              label={option.label}
              checked={selectedTheme === option.value}
            />
          </button>
        ))}
      </div>
    </InfoCard>
  )
}

export default ThemeToggle
