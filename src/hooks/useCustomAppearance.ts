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

import { useEffect, useState } from 'react'

import type { CustomAppearance } from '@/utils/themeService'
import { themeService } from '@/utils/themeService'

const setAppearance = (partial: Partial<CustomAppearance>) => themeService.setAppearance(partial)
const selectPreset = (name: string) => themeService.selectPreset(name)
const resetActivePreset = () => themeService.resetActivePreset()
const importPreset = (preset: unknown) => themeService.importPreset(preset)

export const useCustomAppearance = () => {
  const [presets, setPresets] = useState(themeService.getPresets())
  const [activePreset, setActivePreset] = useState(themeService.getActivePreset())

  useEffect(() => {
    return themeService.subscribe((_newTheme, newActivePreset) => {
      setActivePreset(newActivePreset)
      setPresets([...themeService.getPresets()])
    })
  }, [])

  return {
    presets,
    activePreset,
    appearance: activePreset.values,
    setAppearance,
    selectPreset,
    resetActivePreset,
    importPreset,
  }
}
