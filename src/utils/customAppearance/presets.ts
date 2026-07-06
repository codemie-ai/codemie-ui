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

import { DARK_THEME_KEY, LIGHT_THEME_KEY } from '@/constants'

import type { PresetValues } from './schema'

export interface BuiltinPreset {
  type: 'builtin'
  name: string
  values: PresetValues
}

export interface UserPreset {
  type: 'user'
  name: string
  parentPreset: string
  values: PresetValues
}

export type Preset = BuiltinPreset | UserPreset

// Clean White — fully monochromatic light: white surfaces separated by borders,
// distinctive medium-grey accent.
const cleanWhiteValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#525252',
  dropdownHoverBackground: '#F5F5F5',
  gradientFrom: '#525252',
  gradientTo: '#A3A3A3',
  pageBackground: '#FFFFFF',
  navigationBackground: '#FFFFFF',
  navigationTextColor: '#525252',
  navigationSelectedTextColor: '#171717',
  navigationSelectedBackground: '#F5F5F5',
  navigationFadeText: false,
  sidebarColor: '#FFFFFF',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#F5F5F5',
  primaryTextColor: '#171717',
  secondaryText: '#525252',
  navigationBadgeBackground: '#171717',
  gradients: false,
  navigationBorder: true,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Clean Black — fully monochromatic dark: pure-black surfaces separated by borders,
// distinctive light-grey accent.
const cleanBlackValues: PresetValues = {
  baseTheme: DARK_THEME_KEY,
  accentColor: '#A3A3A3',
  dropdownHoverBackground: '#1F1F1F',
  gradientFrom: '#A3A3A3',
  gradientTo: '#525252',
  pageBackground: '#000000',
  navigationBackground: '#000000',
  navigationTextColor: '#A3A3A3',
  navigationSelectedTextColor: '#FAFAFA',
  navigationSelectedBackground: '#1F1F1F',
  navigationFadeText: false,
  sidebarColor: '#000000',
  cardBackground: '#0A0A0A',
  primaryButtonBackground: '#1F1F1F',
  primaryTextColor: '#FAFAFA',
  secondaryText: '#A3A3A3',
  navigationBadgeBackground: '#FAFAFA',
  gradients: false,
  navigationBorder: true,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Rosé Pine Dawn — warm rose + iris on cream.
const rosePineDawnValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#B4637A',
  dropdownHoverBackground: '#F2E9E1',
  gradientFrom: '#B4637A',
  gradientTo: '#907AA9',
  pageBackground: '#FAF4ED',
  navigationBackground: '#FFFAF3',
  navigationTextColor: '#575279',
  navigationSelectedTextColor: '#B4637A',
  navigationSelectedBackground: '#F2E9E1',
  navigationFadeText: false,
  sidebarColor: '#FFFAF3',
  cardBackground: '#FFFAF3',
  primaryButtonBackground: '#F2E9E1',
  primaryTextColor: '#575279',
  secondaryText: '#797593',
  navigationBadgeBackground: '#EA9D34',
  gradients: false,
  navigationBorder: true,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'sans',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Sage Forest — calming green/sage palette on off-white.
const sageForestValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#2D6A4F',
  dropdownHoverBackground: '#D8E2DC',
  gradientFrom: '#2D6A4F',
  gradientTo: '#74C69D',
  pageBackground: '#F7F9F6',
  navigationBackground: '#E8EFE9',
  navigationTextColor: '#2D3A2E',
  navigationSelectedTextColor: '#2D6A4F',
  navigationSelectedBackground: '#FFFFFF',
  navigationFadeText: false,
  sidebarColor: '#E8EFE9',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#D8E2DC',
  primaryTextColor: '#1B2D20',
  secondaryText: '#4E5D54',
  navigationBadgeBackground: '#DDA15E',
  gradients: false,
  navigationBorder: true,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Dracula — popular dark theme: purple + pink on deep blue-gray.
const draculaValues: PresetValues = {
  baseTheme: DARK_THEME_KEY,
  accentColor: '#BD93F9',
  dropdownHoverBackground: '#44475A',
  gradientFrom: '#BD93F9',
  gradientTo: '#FF79C6',
  pageBackground: '#282A36',
  navigationBackground: '#1E1F29',
  navigationTextColor: '#F8F8F2',
  navigationSelectedTextColor: '#BD93F9',
  navigationSelectedBackground: '#44475A',
  navigationFadeText: false,
  sidebarColor: '#1E1F29',
  cardBackground: '#21222C',
  primaryButtonBackground: '#44475A',
  primaryTextColor: '#F8F8F2',
  secondaryText: '#6272A4',
  navigationBadgeBackground: '#FF79C6',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: true,
  sidebarToggleMatchesBackground: false,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Navy & Gold — corporate navy navigation with golden-yellow selection, clean white content.
const navyGoldDarkNavValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#006494',
  dropdownHoverBackground: '#F0F4F7',
  gradientFrom: '#00334E',
  gradientTo: '#006494',
  pageBackground: '#F4F6F8',
  navigationBackground: '#00334E',
  navigationTextColor: '#B0C4D0',
  navigationSelectedTextColor: '#FFD100',
  navigationSelectedBackground: '#004D74',
  navigationFadeText: false,
  sidebarColor: '#F4F6F8',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#F0F4F7',
  primaryTextColor: '#00334E',
  secondaryText: '#5A7080',
  navigationBadgeBackground: '#FFD100',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'sans',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Deep blue navigation with orange gradient accent, light blue-grey content.
const custom1Values: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#0F069F',
  dropdownHoverBackground: '#E6F3FB',
  gradientFrom: '#FF8C18',
  gradientTo: '#CC4B05',
  pageBackground: '#EEF2F4',
  navigationBackground: '#0F069F',
  navigationTextColor: '#FFFFFF',
  navigationSelectedTextColor: '#FFD100',
  navigationSelectedBackground: '#3E38B3',
  navigationFadeText: false,
  sidebarColor: '#BDDEF1',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#E6F3FB',
  primaryTextColor: '#2B2A3E',
  secondaryText: '#555464',
  navigationBadgeBackground: '#FFD100',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: true,
  sidebarToggleMatchesBackground: true,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Bold orange accent on clean white, light navigation.
const custom2Values: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#52519A',
  dropdownHoverBackground: '#FFF0E8',
  gradientFrom: '#FF6200',
  gradientTo: '#FF9633',
  pageBackground: '#FFFFFF',
  navigationBackground: '#FF6200',
  navigationTextColor: '#FFFFFF',
  navigationSelectedTextColor: '#333333',
  navigationSelectedBackground: '#FFFFFF',
  navigationFadeText: false,
  sidebarColor: '#FFFFFF',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#FFF0E8',
  primaryTextColor: '#333333',
  secondaryText: '#696969',
  navigationBadgeBackground: '#FFFFFF',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'sans',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Signature sky-blue accent on a fresh white/light-blue palette.
const custom3Values: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#02ADE6',
  dropdownHoverBackground: '#F3F6F8',
  gradientFrom: '#00ADE6',
  gradientTo: '#0080C0',
  pageBackground: '#F1F1F1',
  navigationBackground: '#E9EBED',
  navigationTextColor: '#333333',
  navigationSelectedTextColor: '#00ADE6',
  navigationSelectedBackground: '#FFFFFF',
  navigationFadeText: false,
  sidebarColor: '#E9EBED',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#F3F6F8',
  primaryTextColor: '#333333',
  secondaryText: '#4A6070',
  navigationBadgeBackground: '#00ADE6',
  gradients: false,
  navigationBorder: true,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: true,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Rosé Pine Dawn — Dark Nav: light cream content, deep purple navigation from Rosé Pine dark.
const rosePineDawnDarkNavValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#B4637A',
  dropdownHoverBackground: '#F2E9E1',
  gradientFrom: '#B4637A',
  gradientTo: '#907AA9',
  pageBackground: '#FAF4ED',
  navigationBackground: '#1F1D2E',
  navigationTextColor: '#E0DEF4',
  navigationSelectedTextColor: '#EBBCBA',
  navigationSelectedBackground: '#403C5C',
  navigationFadeText: false,
  sidebarColor: '#FFFAF3',
  cardBackground: '#FFFAF3',
  primaryButtonBackground: '#F2E9E1',
  primaryTextColor: '#575279',
  secondaryText: '#797593',
  navigationBadgeBackground: '#F6C177',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: true,
  sidebarToggleMatchesBackground: false,
  fontStack: 'sans',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Sage Forest — Dark Nav: light sage content, deep forest-green navigation.
const sageForestDarkNavValues: PresetValues = {
  baseTheme: LIGHT_THEME_KEY,
  accentColor: '#2D6A4F',
  dropdownHoverBackground: '#D8E2DC',
  gradientFrom: '#2D6A4F',
  gradientTo: '#74C69D',
  pageBackground: '#F7F9F6',
  navigationBackground: '#1A2E1C',
  navigationTextColor: '#B7D4BB',
  navigationSelectedTextColor: '#74C69D',
  navigationSelectedBackground: '#335C3A',
  navigationFadeText: false,
  sidebarColor: '#E8EFE9',
  cardBackground: '#FFFFFF',
  primaryButtonBackground: '#D8E2DC',
  primaryTextColor: '#1B2D20',
  secondaryText: '#4E5D54',
  navigationBadgeBackground: '#DDA15E',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: true,
  sidebarToggleMatchesBackground: true,
  fontStack: 'system',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

// Nord — cool blue/teal "frost" palette on polar-night background.
const nordValues: PresetValues = {
  baseTheme: DARK_THEME_KEY,
  accentColor: '#88C0D0',
  dropdownHoverBackground: '#3B4252',
  gradientFrom: '#5E81AC',
  gradientTo: '#88C0D0',
  pageBackground: '#2E3440',
  navigationBackground: '#242933',
  navigationTextColor: '#D8DEE9',
  navigationSelectedTextColor: '#88C0D0',
  navigationSelectedBackground: '#3B4252',
  navigationFadeText: false,
  sidebarColor: '#242933',
  cardBackground: '#3B4252',
  primaryButtonBackground: '#3B4252',
  primaryTextColor: '#ECEFF4',
  secondaryText: '#D8DEE9',
  navigationBadgeBackground: '#BF616A',
  gradients: false,
  navigationBorder: false,
  pageHeaderElevated: false,
  sidebarToggleMatchesBackground: false,
  fontStack: 'sans',
  logoMode: 'codemie',
  rectangularLogo: '',
  squareLogo: '',
}

export const PRESETS: BuiltinPreset[] = [
  {
    type: 'builtin',
    name: 'Clean White',
    values: cleanWhiteValues,
  },
  {
    type: 'builtin',
    name: 'Clean Black',
    values: cleanBlackValues,
  },
  {
    type: 'builtin',
    name: 'Rosé Pine Dawn',
    values: rosePineDawnValues,
  },
  {
    type: 'builtin',
    name: 'Rosé Pine Dawn - Dark Nav',
    values: rosePineDawnDarkNavValues,
  },
  {
    type: 'builtin',
    name: 'Navy & Gold - Dark Nav',
    values: navyGoldDarkNavValues,
  },
  {
    type: 'builtin',
    name: 'Sage Forest',
    values: sageForestValues,
  },
  {
    type: 'builtin',
    name: 'Sage Forest - Dark Nav',
    values: sageForestDarkNavValues,
  },
  {
    type: 'builtin',
    name: 'Dracula',
    values: draculaValues,
  },
  {
    type: 'builtin',
    name: 'Nord',
    values: nordValues,
  },
  {
    type: 'builtin',
    name: 'Custom 1 - Brand Like',
    values: custom1Values,
  },
  {
    type: 'builtin',
    name: 'Custom 2 - Brand Like',
    values: custom2Values,
  },
  {
    type: 'builtin',
    name: 'Custom 3 - Brand Like',
    values: custom3Values,
  },
]

export const [DEFAULT_PRESET] = PRESETS

export const getBuiltinPreset = (name: string): BuiltinPreset | undefined =>
  PRESETS.find((p) => p.name === name)
