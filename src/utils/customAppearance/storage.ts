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

import { boolean, object, string } from 'yup'

import { APPEARANCE_KEY, DARK_THEME_KEY, LIGHT_THEME_KEY } from '@/constants'

import { COLOR_FIELDS } from './schema'

import type { BuiltinPreset, Preset, UserPreset } from './presets'

const hexColor = string()
  .matches(/^#[0-9a-fA-F]{6}$/)
  .required()

const presetValuesSchema = object({
  ...Object.fromEntries(COLOR_FIELDS.map((f) => [f, hexColor])),
  baseTheme: string().oneOf([DARK_THEME_KEY, LIGHT_THEME_KEY]).required(),
  fontStack: string().oneOf(['geist', 'system', 'sans', 'serif']).required(),
  codeBlockFontStack: string()
    .oneOf(['geist-mono', 'jetbrains-mono', 'ibm-plex-mono'])
    .default('geist-mono'),
  logoMode: string().oneOf(['codemie', 'custom']).required(),
  navigationFadeText: boolean().required(),
  gradients: boolean().required(),
  navigationBorder: boolean().required(),
  pageHeaderElevated: boolean().required(),
  sidebarToggleMatchesBackground: boolean().required(),
  rectangularLogo: string().defined().max(500_000),
  squareLogo: string().defined().max(500_000),
})

const builtinRefSchema = object({
  type: string().oneOf(['builtin']).required(),
  name: string().required(),
})

const userPresetSchema = object({
  type: string().oneOf(['user']).required(),
  name: string().required(),
  parentPreset: string().required(),
  values: presetValuesSchema.required(),
})

type StoredBuiltinRef = Pick<BuiltinPreset, 'type' | 'name'>

export const getStoredPreset = (): StoredBuiltinRef | UserPreset | null => {
  let raw: string | null
  try {
    raw = localStorage.getItem(APPEARANCE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const type = (parsed as Record<string, unknown>)?.type
    if (type === 'builtin') {
      return builtinRefSchema.validateSync(parsed) as StoredBuiltinRef
    }
    return userPresetSchema.validateSync(parsed) as UserPreset
  } catch (err) {
    console.error('Failed to restore saved appearance; falling back to default preset.', err)
    return null
  }
}

export const persistPreset = (preset: Preset): void => {
  const stored = preset.type === 'builtin' ? { type: 'builtin', name: preset.name } : preset
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage may be unavailable
  }
}

export const validateImportedPreset = (raw: unknown): UserPreset =>
  userPresetSchema.validateSync(raw) as UserPreset
