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

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { BLOCKED_IMAGE_BADGE_CLASS } from '@/components/BlockedImageBadge/BlockedImageBadge'
import { CONFIG_KEYS } from '@/constants/configKeys'
import { appInfoStore } from '@/store/appInfo'
import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'

import ThoughtMessage from '../ThoughtMessage'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ default: mockApi }))

function setAllowedImageDomains(value: string) {
  appInfoStore.configs = [
    { id: CONFIG_KEYS.ALLOWED_IMAGE_DOMAINS, settings: { enabled: true, value } },
  ]
}

function makeImageThought(url: string): Thought {
  return {
    id: 'thought-1',
    author_name: 'Test Tool',
    author_type: ThoughtAuthorType.Tool,
    message: JSON.stringify([{ type: 'image_url', image_url: { url } }]),
    in_progress: false,
  }
}

beforeEach(() => {
  mockApi.BASE_URL = 'https://api.example.com'
  appInfoStore.configs = []
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThoughtMessage — image allow-list', () => {
  it('renders BlockedImageBadge when the image URL is not on the allow-list', () => {
    render(<ThoughtMessage thought={makeImageThought('https://evil.com/img.png')} />)
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders <img> when the image URL is on the allow-list', () => {
    setAllowedImageDomains('cdn.trusted.com')
    render(<ThoughtMessage thought={makeImageThought('https://cdn.trusted.com/img.png')} />)
    expect(document.querySelector('img')).toBeInTheDocument()
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).not.toBeInTheDocument()
  })

  it('renders <img> for a same-origin image', () => {
    render(
      <ThoughtMessage thought={makeImageThought('https://production.example.com/files/img.png')} />
    )
    expect(document.querySelector('img')).toBeInTheDocument()
    expect(document.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).not.toBeInTheDocument()
  })
})
