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

export interface AppearanceInputs {
  baseTheme: typeof DARK_THEME_KEY | typeof LIGHT_THEME_KEY
  accentColor: string
  dropdownHoverBackground: string
  gradientFrom: string
  gradientTo: string
  pageBackground: string
  navigationBackground: string
  navigationTextColor: string
  navigationSelectedTextColor: string
  navigationSelectedBackground: string
  navigationFadeText: boolean
  sidebarColor: string
  cardBackground: string
  primaryButtonBackground: string
  primaryTextColor: string
  secondaryText: string
  navigationBadgeBackground: string
  gradients: boolean
  navigationBorder: boolean
  pageHeaderElevated: boolean
  sidebarToggleMatchesBackground: boolean
  fontStack: 'geist' | 'system' | 'sans' | 'serif'
  logoMode: 'codemie' | 'custom'
  rectangularLogo: string
  squareLogo: string
}

// The full surface of CSS variables the engine may write — must stay in sync with
// CURRENT-RULES.md §8. apply.ts clears these on every apply; any var not re-set
// by a rule falls back to its base-theme class value.
export type CssVar =
  // border
  | '--colors-border-primary'
  | '--colors-border-structural'
  | '--colors-border-specific-panel-outline'
  | '--colors-border-accent'
  | '--colors-border-quaternary'
  | '--colors-border-specific-cta-button-from'
  | '--colors-border-specific-cta-button-to'
  | '--colors-border-specific-primary-button-from'
  | '--colors-border-specific-primary-button-to'
  | '--colors-border-specific-button-secondary-hover'
  | '--colors-border-tertiary'
  // surface
  | '--colors-surface-base-chat'
  | '--colors-surface-base-navigation'
  | '--colors-surface-base-primary'
  | '--colors-surface-base-sidebar'
  | '--colors-surface-elevated'
  | '--colors-surface-interactive-hover'
  | '--colors-surface-interactive-active'
  | '--colors-surface-specific-bottom-navigation-label'
  | '--colors-surface-specific-button-tertiary-from'
  | '--colors-surface-specific-button-tertiary-to'
  | '--colors-surface-specific-card'
  | '--colors-surface-base-secondary'
  | '--colors-surface-base-content'
  | '--colors-surface-specific-dropdown-hover'
  | '--colors-surface-specific-navigation-badge'
  | '--colors-surface-specific-navigation-link'
  | '--colors-surface-specific-primary-button'
  | '--colors-surface-specific-primary-button-hover'
  | '--colors-surface-specific-secondary-button-hover'
  | '--colors-surface-specific-sidebar-toggle'
  | '--colors-surface-specific-table-header'
  | '--colors-surface-specific-page-header'
  // icon
  | '--colors-icon-accent'
  | '--colors-icon-primary'
  | '--colors-icon-secondary'
  | '--colors-icon-tertiary'
  // in-progress (accent-driven group)
  | '--colors-in-progress-primary'
  | '--colors-in-progress-secondary'
  | '--colors-in-progress-tertiary'
  // text
  | '--colors-text-accent'
  | '--colors-text-accent-hover'
  | '--colors-text-accent-status'
  | '--colors-text-accent-status-hover'
  | '--colors-text-heading'
  | '--colors-text-primary'
  | '--colors-text-secondary'
  | '--colors-text-tertiary'
  | '--colors-text-quaternary'
  | '--colors-text-specific-bottom-navigation-label'
  | '--colors-text-specific-navigation-badge'
  | '--colors-text-specific-navigation-icon'
  | '--colors-text-specific-navigation-icon-hover'
  | '--colors-text-specific-navigation-link'
  | '--colors-text-specific-navigation-link-hover'
  // font
  | '--font-family-body'
  // backgroundImage
  | '--backgroundImage-action-accent-btn'
  | '--backgroundImage-action-accent-hover'
  | '--backgroundImage-gradient-switch-on'
  | '--backgroundImage-gradient2'
  | '--backgroundImage-gradient3'
  | '--backgroundImage-magical-button'
  | '--backgroundImage-purple-radial-hover'

export type CssVarOverrides = Partial<Record<CssVar, string>>

export interface Rule {
  apply: (inputs: AppearanceInputs) => CssVarOverrides
}

// Color fields exposed to the form — every preset must specify all of these.
export type AppearanceColors = Pick<
  AppearanceInputs,
  | 'accentColor'
  | 'dropdownHoverBackground'
  | 'gradientFrom'
  | 'gradientTo'
  | 'pageBackground'
  | 'navigationBackground'
  | 'navigationTextColor'
  | 'navigationSelectedTextColor'
  | 'navigationSelectedBackground'
  | 'sidebarColor'
  | 'cardBackground'
  | 'primaryButtonBackground'
  | 'primaryTextColor'
  | 'secondaryText'
  | 'navigationBadgeBackground'
>

export const COLOR_FIELDS: Array<keyof AppearanceColors> = [
  'accentColor',
  'dropdownHoverBackground',
  'gradientFrom',
  'gradientTo',
  'pageBackground',
  'navigationBackground',
  'navigationTextColor',
  'navigationSelectedTextColor',
  'navigationSelectedBackground',
  'sidebarColor',
  'cardBackground',
  'primaryButtonBackground',
  'primaryTextColor',
  'secondaryText',
  'navigationBadgeBackground',
]

export type PresetValues = AppearanceInputs
