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

import { converter, formatHex, interpolate, wcagLuminance } from 'culori'

const toOklch = converter('oklch')
const toRgb = converter('rgb')

const hexToOklch = (hex: string): [number, number, number] => {
  const result = toOklch(hex)

  return [result?.l ?? 0, result?.c ?? 0, result?.h ?? 0]
}

const oklchToHex = (l: number, c: number, h: number): string =>
  formatHex({ mode: 'oklch', l, c, h }) ?? '#000000'

const toRgb255 = (r: number, g: number, b: number): string =>
  `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}`

export const hexToRgbValue = (hex: string): string => {
  const rgb = toRgb(hex)

  return toRgb255(rgb?.r ?? 0, rgb?.g ?? 0, rgb?.b ?? 0)
}

// Alpha-blends fg over bg at the given opacity and returns "r g b" channel string.
export const blendColors = (fg: string, bg: string, alpha: number): string => {
  const rgb = toRgb(interpolate([bg, fg], 'rgb')(alpha))

  return toRgb255(rgb?.r ?? 0, rgb?.g ?? 0, rgb?.b ?? 0)
}

// Darkens if L > threshold, lightens otherwise, by amount in oklch lightness.
export const deriveAlternateOklchLightness = (
  hex: string,
  threshold: number,
  amount: number
): string => {
  const [l, c, h] = hexToOklch(hex)
  const newL = l > threshold ? Math.max(0, l - amount) : Math.min(1, l + amount)

  return oklchToHex(newL, c, h)
}

export const isDarkColor = (hex: string): boolean => {
  const [L] = hexToOklch(hex)

  return L <= 0.5
}

// Below this relative luminance the equidistant-contrast point flips direction
// (border lightens instead of darkens).
const DARK_BG_LUMINANCE_THRESHOLD = 0.18
// WCAG relative luminance formula offset added to each luminance value before computing ratio.
const WCAG_LUMINANCE_OFFSET = 0.05

// Returns a "r g b" channel string for a neutral gray that achieves
// `contrastTarget` (WCAG ratio) against the given background.
// Below the equidistant-contrast point (~0.18) the border is made lighter;
// above it the border is made darker, so direction is always automatic.
export const deriveContrastGray = (backgroundHex: string, contrastTarget: number): string => {
  const lBg = wcagLuminance(backgroundHex) ?? 0

  const lTarget =
    lBg < DARK_BG_LUMINANCE_THRESHOLD
      ? contrastTarget * (lBg + WCAG_LUMINANCE_OFFSET) - WCAG_LUMINANCE_OFFSET
      : (lBg + WCAG_LUMINANCE_OFFSET) / contrastTarget - WCAG_LUMINANCE_OFFSET

  const clamped = Math.min(1, Math.max(0, lTarget))
  // For a neutral gray, all linear channels are equal (Y = R_lin = G_lin = B_lin).
  // Convert from linear-light RGB back to gamma-corrected sRGB to get the channel value.
  const channel = Math.round(
    (toRgb({ mode: 'lrgb', r: clamped, g: clamped, b: clamped })?.r ?? 0) * 255
  )

  return `${channel} ${channel} ${channel}`
}
