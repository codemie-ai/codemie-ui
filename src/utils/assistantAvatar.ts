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

import aiAvatarImage from '@/assets/images/ai-avatar.png'

import { getTailwindColor } from './tailwindColors'

// Colors are defined in tailwind.config.ts `c.avatar` tokens and exposed as
// --colors-avatar-{n} CSS custom properties via tailwindcss-themer.
const AVATAR_COLOR_COUNT = 21

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 999983
  }
  return hash
}

export function getAssistantInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const words = trimmed.split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function getAssistantAvatarColor(name: string): string {
  const index = hashString(name) % AVATAR_COLOR_COUNT
  return getTailwindColor(`--colors-avatar-${index}`)
}

export function generateAssistantAvatarDataUrl(name: string): string {
  const initials = getAssistantInitials(name)
  const color = getAssistantAvatarColor(name)
  const fontSize = initials.length > 1 ? '38' : '44'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/><text x="50" y="50" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${fontSize}" font-family="system-ui,-apple-system,sans-serif" font-weight="600">${initials}</text></svg>`

  try {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  } catch {
    // Fallback to default avatar if encoding fails
    return aiAvatarImage
  }
}
