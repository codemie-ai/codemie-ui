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

import Input from '@/components/form/Input/Input'
import Switch from '@/components/form/Switch/Switch'
import { useCustomAppearance } from '@/hooks/useCustomAppearance'
import { CustomAppearance } from '@/utils/themeService'

interface ColorControl {
  label: string
  name: keyof Pick<
    CustomAppearance,
    | 'accentColor'
    | 'gradientFrom'
    | 'gradientTo'
    | 'pageBackground'
    | 'navigationBackground'
    | 'navigationTextColor'
    | 'navigationSelectedTextColor'
    | 'navigationSelectedBackground'
    | 'sidebarColor'
    | 'cardBackground'
    | 'primaryTextColor'
    | 'secondaryText'
    | 'navigationBadgeBackground'
    | 'primaryButtonBackground'
    | 'dropdownHoverBackground'
  >
}

const customColorControlsBeforeToggle: ColorControl[] = [
  { label: 'Accent / heading (links, icons)', name: 'accentColor' },
  { label: 'Primary text', name: 'primaryTextColor' },
  { label: 'Secondary text', name: 'secondaryText' },
  { label: 'Page', name: 'pageBackground' },
  { label: 'Cards', name: 'cardBackground' },
]

const buttonControls: ColorControl[] = [
  { label: 'Gradient start (CTA & magical)', name: 'gradientFrom' },
  { label: 'Gradient end (CTA & magical)', name: 'gradientTo' },
  { label: 'Primary/CTA background', name: 'primaryButtonBackground' },
]

const menuHighlightControls: ColorControl[] = [
  { label: 'Highlight color (hover & selected)', name: 'dropdownHoverBackground' },
]

const navigationControls: ColorControl[] = [
  { label: 'Background', name: 'navigationBackground' },
  { label: 'Text Color', name: 'navigationTextColor' },
  { label: 'Selected Text Color', name: 'navigationSelectedTextColor' },
  { label: 'Selected item background', name: 'navigationSelectedBackground' },
  { label: 'Badge background', name: 'navigationBadgeBackground' },
]

const sidebarControls: ColorControl[] = [{ label: 'Background', name: 'sidebarColor' }]

const ColorsSection = () => {
  const { appearance, setAppearance } = useCustomAppearance()

  const handleAppearanceChange = (
    field: keyof CustomAppearance,
    value: string | boolean | number
  ) => {
    setAppearance({ [field]: value } as Partial<CustomAppearance>)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3">
          {customColorControlsBeforeToggle.map((control) => (
            <Input
              key={control.name}
              type="color"
              label={control.label}
              value={appearance[control.name]}
              onChange={(event) => handleAppearanceChange(control.name, event.target.value)}
              inputClass="h-8 p-1 cursor-pointer"
            />
          ))}
        </div>
        <Switch
          label="Page Header Background (matches Card)"
          value={appearance.pageHeaderElevated}
          onChange={(event) => handleAppearanceChange('pageHeaderElevated', event.target.checked)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-quaternary">
          Buttons
        </h4>
        <div className="grid gap-3 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3">
          {buttonControls.map((control) => (
            <Input
              key={control.name}
              type="color"
              label={control.label}
              value={appearance[control.name]}
              onChange={(event) => handleAppearanceChange(control.name, event.target.value)}
              inputClass="h-8 p-1 cursor-pointer"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-quaternary">
          Menu highlights
        </h4>
        <div className="grid gap-3 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3">
          {menuHighlightControls.map((control) => (
            <Input
              key={control.name}
              type="color"
              label={control.label}
              value={appearance[control.name]}
              onChange={(event) => handleAppearanceChange(control.name, event.target.value)}
              inputClass="h-8 p-1 cursor-pointer"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-quaternary">
          Navigation
        </h4>
        <div className="flex flex-col gap-3">
          <Switch
            label="Show navigation border"
            value={appearance.navigationBorder}
            onChange={(event) => handleAppearanceChange('navigationBorder', event.target.checked)}
          />
        </div>
        <div className="grid gap-3 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3">
          {navigationControls.map((control) => (
            <div key={control.name} className="flex flex-col gap-2">
              <Input
                type="color"
                label={control.label}
                value={appearance[control.name]}
                onChange={(event) => handleAppearanceChange(control.name, event.target.value)}
                inputClass="h-8 p-1 cursor-pointer"
              />
              {control.name === 'navigationTextColor' && (
                <Switch
                  label="Fade Text"
                  value={appearance.navigationFadeText}
                  onChange={(event) =>
                    handleAppearanceChange('navigationFadeText', event.target.checked)
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-quaternary">
          Sidebar
        </h4>
        <div className="grid gap-3 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3">
          {sidebarControls.map((control) => (
            <Input
              key={control.name}
              type="color"
              label={control.label}
              value={appearance[control.name]}
              onChange={(event) => handleAppearanceChange(control.name, event.target.value)}
              inputClass="h-8 p-1 cursor-pointer"
            />
          ))}
        </div>
        <Switch
          label="Match toggle button color to sidebar background"
          value={appearance.sidebarToggleMatchesBackground}
          onChange={(event) =>
            handleAppearanceChange('sidebarToggleMatchesBackground', event.target.checked)
          }
        />
      </div>
    </div>
  )
}

export default ColorsSection
