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

// Rules mirror custom-appearance/CURRENT-RULES.md 1:1. Each rule reads from
// AppearanceInputs and returns a partial CSS-var overrides map. The engine
// folds all rule outputs into a single map.

import {
  blendColors,
  deriveAlternateOklchLightness,
  deriveContrastGray,
  hexToRgbValue,
  isDarkColor,
} from './colorUtils'

import type { AppearanceInputs, CssVar, CssVarOverrides, Rule } from './schema'

// WCAG contrast ratios used in deriveContrastGray
const SIDEBAR_TOGGLE_CONTRAST = 1.6
const BORDER_CONTRAST = 1.5

// OKLCH lightness thresholds and shift amounts used in deriveAlternateOklchLightness
const ACCENT_HOVER_L_THRESHOLD = 0.5
const ACCENT_HOVER_L_AMOUNT = 0.1
const PRIMARY_BTN_HOVER_L_THRESHOLD = 0.9
const PRIMARY_BTN_HOVER_L_AMOUNT = 0.06
const SECONDARY_BTN_HOVER_L_THRESHOLD = 0.9
const SECONDARY_BTN_HOVER_L_AMOUNT = 0.03
const NAV_FADE_L_THRESHOLD = 0.5
const NAV_FADE_L_AMOUNT = 0.08
const ACTION_BTN_HOVER_L_THRESHOLD = 0.9
const ACTION_BTN_HOVER_L_AMOUNT = 0.05

// sRGB pre-blend alpha for bottom navigation label
const BOTTOM_NAV_LABEL_ALPHA = 0.8

const FONT_STACKS: Record<string, string> = {
  geist: '"GeistMono", monospace',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sans: 'Inter, "Segoe UI", Ubuntu, "Helvetica Neue", Arial, sans-serif',
  serif: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
}

// Map rule: input field → many CSS vars (RGB channels), always written.
const mapRule = (field: keyof AppearanceInputs, cssVars: CssVar[]): Rule => ({
  apply: (inputs) => {
    const value = hexToRgbValue(inputs[field] as string)

    return cssVars.reduce<CssVarOverrides>((acc, cssVar) => {
      acc[cssVar] = value

      return acc
    }, {})
  },
})

export const RULES: Rule[] = [
  // §1 — Map rules (one input → many CSS vars, RGB channels)
  mapRule('accentColor', [
    '--colors-border-accent',
    '--colors-border-tertiary',
    '--colors-border-quaternary',
    '--colors-border-specific-button-secondary-hover',
    '--colors-icon-accent',
    '--colors-in-progress-primary',
    '--colors-in-progress-secondary',
    '--colors-in-progress-tertiary',
    '--colors-text-accent',
    '--colors-text-accent-status',
    '--colors-text-heading',
  ]),
  mapRule('pageBackground', ['--colors-surface-base-primary', '--colors-surface-base-content']),
  mapRule('navigationBackground', [
    '--colors-surface-base-navigation',
    '--colors-text-specific-navigation-badge',
  ]),
  mapRule('navigationTextColor', [
    '--colors-text-specific-navigation-icon',
    '--colors-text-specific-navigation-link',
  ]),
  mapRule('navigationSelectedTextColor', [
    '--colors-text-specific-navigation-icon-hover',
    '--colors-text-specific-navigation-link-hover',
  ]),
  mapRule('navigationSelectedBackground', ['--colors-surface-specific-navigation-link']),
  mapRule('sidebarColor', ['--colors-surface-base-sidebar']),
  {
    apply: (inputs) => {
      if (!inputs.sidebarToggleMatchesBackground)
        return {
          '--colors-surface-specific-sidebar-toggle': deriveContrastGray(
            inputs.cardBackground,
            SIDEBAR_TOGGLE_CONTRAST
          ),
        }

      return {
        '--colors-surface-specific-sidebar-toggle': hexToRgbValue(inputs.sidebarColor),
      }
    },
  },
  mapRule('cardBackground', [
    '--colors-surface-base-chat',
    '--colors-surface-elevated',
    '--colors-surface-specific-card',
    '--colors-surface-specific-page-header',
    '--colors-surface-base-secondary',
  ]),
  mapRule('dropdownHoverBackground', [
    '--colors-surface-specific-dropdown-hover',
    '--colors-surface-interactive-hover',
    '--colors-surface-interactive-active',
    '--colors-surface-specific-table-header',
  ]),
  mapRule('primaryButtonBackground', ['--colors-surface-specific-primary-button']),
  mapRule('primaryTextColor', [
    '--colors-text-primary',
    '--colors-text-secondary',
    '--colors-icon-primary',
    '--colors-icon-secondary',
  ]),
  mapRule('secondaryText', [
    '--colors-text-tertiary',
    '--colors-text-quaternary',
    '--colors-icon-tertiary',
  ]),
  mapRule('navigationBadgeBackground', ['--colors-surface-specific-navigation-badge']),

  // §2 — Derive rules (OKLCH lightness shift)
  {
    apply: (inputs) => {
      const value = hexToRgbValue(
        deriveAlternateOklchLightness(
          inputs.accentColor,
          ACCENT_HOVER_L_THRESHOLD,
          ACCENT_HOVER_L_AMOUNT
        )
      )

      return {
        '--colors-text-accent-hover': value,
        '--colors-text-accent-status-hover': value,
      }
    },
  },
  {
    apply: (inputs) => ({
      '--colors-surface-specific-primary-button-hover': hexToRgbValue(
        deriveAlternateOklchLightness(
          inputs.primaryButtonBackground,
          PRIMARY_BTN_HOVER_L_THRESHOLD,
          PRIMARY_BTN_HOVER_L_AMOUNT
        )
      ),
    }),
  },
  {
    // Pushes toward high lightness to produce a light chromatic tint suitable
    // for ghost-button hover without coupling to pageBackground.
    apply: (inputs) => ({
      '--colors-surface-specific-secondary-button-hover': hexToRgbValue(
        deriveAlternateOklchLightness(
          inputs.primaryButtonBackground,
          SECONDARY_BTN_HOVER_L_THRESHOLD,
          SECONDARY_BTN_HOVER_L_AMOUNT
        )
      ),
    }),
  },
  {
    apply: (inputs) => {
      if (!inputs.navigationFadeText) return {}

      return {
        '--colors-text-specific-navigation-link': hexToRgbValue(
          deriveAlternateOklchLightness(
            inputs.navigationTextColor,
            NAV_FADE_L_THRESHOLD,
            NAV_FADE_L_AMOUNT
          )
        ),
      }
    },
  },

  // §3 — Opacity-blend rules (sRGB pre-blend; tailwindcss-themer consumes vars as
  // `rgb(var(--x) / <alpha-value>)` so emitting "R G B / 0.8" would produce invalid CSS.
  // Pre-blending against the known background and emitting plain "R G B" is the workaround.)
  {
    apply: (inputs) => ({
      '--colors-text-specific-bottom-navigation-label': blendColors(
        inputs.navigationTextColor,
        inputs.navigationBackground,
        BOTTOM_NAV_LABEL_ALPHA
      ),
    }),
  },
  {
    apply: (inputs) => ({
      '--colors-surface-specific-bottom-navigation-label': isDarkColor(inputs.navigationBackground)
        ? '255 255 255'
        : '0 0 0',
    }),
  },

  // §4 — Font stack rule
  {
    apply: (inputs) => ({
      '--font-family-body': FONT_STACKS[inputs.fontStack] ?? FONT_STACKS.geist,
    }),
  },

  // §5 — Gradient block (single condition gates 11 vars / 9 distinct values)
  {
    apply: (inputs) => {
      const gradientFromRgb = hexToRgbValue(inputs.gradientFrom)
      const gradientToRgb = hexToRgbValue(inputs.gradientTo)
      const accentRgb = hexToRgbValue(inputs.accentColor)
      const gradient2 = `linear-gradient(152deg, ${inputs.gradientFrom} 8.13%, ${inputs.accentColor} 59.98%, ${inputs.gradientTo} 91.87%)`
      const magicalButton = `linear-gradient(90deg, ${inputs.gradientFrom} 0%, ${inputs.gradientTo} 100%)`

      return {
        '--colors-border-specific-primary-button-from': accentRgb,
        '--colors-border-specific-primary-button-to': accentRgb,
        '--colors-border-specific-cta-button-from': accentRgb,
        '--colors-border-specific-cta-button-to': accentRgb,
        '--colors-surface-specific-button-tertiary-from': gradientFromRgb,
        '--colors-surface-specific-button-tertiary-to': gradientToRgb,
        '--backgroundImage-gradient-switch-on': `linear-gradient(to right, ${inputs.gradientFrom}, ${inputs.gradientTo})`,
        '--backgroundImage-gradient2': gradient2,
        '--backgroundImage-gradient3': gradient2,
        '--backgroundImage-magical-button': magicalButton,
        '--backgroundImage-purple-radial-hover': magicalButton,
      }
    },
  },

  // §6 — Button background gradient rules
  {
    apply: (inputs) => {
      const bg = inputs.primaryButtonBackground

      return { '--backgroundImage-action-accent-btn': `linear-gradient(${bg}, ${bg})` }
    },
  },
  {
    apply: (inputs) => {
      const hoverBg = deriveAlternateOklchLightness(
        inputs.primaryButtonBackground,
        ACTION_BTN_HOVER_L_THRESHOLD,
        ACTION_BTN_HOVER_L_AMOUNT
      )

      return {
        '--backgroundImage-action-accent-hover': `linear-gradient(${hoverBg}, ${hoverBg})`,
      }
    },
  },

  // §7 — Contrast-derive border rules
  {
    apply: (inputs) => {
      const value = deriveContrastGray(inputs.cardBackground, BORDER_CONTRAST)

      return {
        '--colors-border-structural': value,
        '--colors-border-primary': value,
        '--colors-border-specific-panel-outline': value,
      }
    },
  },
]
