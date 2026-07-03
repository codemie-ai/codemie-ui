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

import Select from '@/components/form/Select/Select'
import { useCustomAppearance } from '@/hooks/useCustomAppearance'
import { FilterOption } from '@/types/filters'
import { CustomAppearance } from '@/utils/themeService'

const FONT_OPTIONS: FilterOption[] = [
  { label: 'Default (Geist)', value: 'geist' },
  { label: 'System fonts', value: 'system' },
  { label: 'Sans-serif (Inter / Segoe UI)', value: 'sans' },
  { label: 'Serif (Palatino / Georgia)', value: 'serif' },
]

const FontSection = () => {
  const { appearance, setAppearance } = useCustomAppearance()

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Font stack"
        value={appearance.fontStack}
        options={FONT_OPTIONS}
        onChange={(event) =>
          setAppearance({ fontStack: event.value as CustomAppearance['fontStack'] })
        }
      />
    </div>
  )
}

export default FontSection
