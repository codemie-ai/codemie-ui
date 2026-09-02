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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconApi } from '@/a2ui/config'
import {
  AudioPlayerRenderer,
  IconRenderer,
  ImageRenderer,
  VideoRenderer,
} from '@/a2ui/renderers'

/**
 * Media and icon renderers receive agent-authored (untrusted) props. These
 * tests pin the privacy attributes of the media elements and assert that every
 * icon name the catalog advertises to the model resolves to a real glyph.
 */

const noRest = {} as Record<string, unknown>

/** The full `Icon.name` enum the backend advertises to models, read from the catalog schema. */
function catalogIconNames(): string[] {
  const nameSchema = (
    IconApi.schema as unknown as { shape: Record<string, { _def: { options: unknown[] } }> }
  ).shape.name
  const enumOption = nameSchema._def.options.find(
    (option) => (option as { _def: { typeName?: string } })._def.typeName === 'ZodEnum'
  ) as { _def: { values: string[] } } | undefined
  return enumOption?._def.values ?? []
}

describe('media renderers privacy attributes', () => {
  it('renders images without a referrer', () => {
    const { container } = render(
      <ImageRenderer url="https://cdn.example.com/a.png" rest={{ description: 'A picture' }} />
    )
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('renders video without a referrer and defers its request', () => {
    const { container } = render(<VideoRenderer url="https://cdn.example.com/a.mp4" rest={noRest} />)
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(video).toHaveAttribute('preload', 'none')
  })

  it('renders audio without a referrer and defers its request', () => {
    const { container } = render(
      <AudioPlayerRenderer url="https://cdn.example.com/a.mp3" rest={noRest} />
    )
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(audio).toHaveAttribute('preload', 'none')
  })

  it('shows an explanation when the image fails to load', () => {
    // Agent-authored URLs are frequently wrong — the one observed live was a 404 the
    // model had invented. A bare broken-image icon tells the user nothing.
    const { container } = render(
      <ImageRenderer url="https://cdn.example.com/gone.png" rest={{ description: 'A picture' }} />
    )
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    fireEvent.error(image!)
    expect(screen.getByTestId('a2ui-media-placeholder')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows an explanation when the video source cannot play', () => {
    // Seen live: the model passed a YouTube watch page, which a plain <video> can never
    // play. Without a failure state that is an empty player and no hint why.
    const { container } = render(
      <VideoRenderer url="https://www.youtube.com/watch?v=abc" rest={noRest} />
    )
    const video = container.querySelector('video')
    fireEvent.error(video!)
    expect(screen.getByTestId('a2ui-media-placeholder')).toBeInTheDocument()
    expect(container.querySelector('video')).toBeNull()
  })

  it('shows an explanation when the audio source cannot play', () => {
    const { container } = render(
      <AudioPlayerRenderer url="https://cdn.example.com/gone.mp3" rest={noRest} />
    )
    fireEvent.error(container.querySelector('audio')!)
    expect(screen.getByTestId('a2ui-media-placeholder')).toBeInTheDocument()
    expect(container.querySelector('audio')).toBeNull()
  })

  it('does not force a CORS-mode fetch, which would break non-CORS media hosts', () => {
    const { container } = render(
      <ImageRenderer url="https://cdn.example.com/a.png" rest={{ description: 'A picture' }} />
    )
    expect(container.querySelector('img')).not.toHaveAttribute('crossorigin')
  })
})

describe('IconRenderer', () => {
  it('reads a non-empty icon enum from the catalog schema', () => {
    expect(catalogIconNames().length).toBeGreaterThan(50)
  })

  it.each(catalogIconNames())('renders a real glyph for the catalog icon "%s"', (name) => {
    const { container } = render(<IconRenderer props={{ name }} />)
    const svg = container.querySelector('svg')
    expect(svg, `icon "${name}" rendered no svg`).not.toBeNull()
    expect(svg?.querySelector('path, circle, rect, g, polygon, line')).not.toBeNull()
  })

  it('falls back to a real glyph for an unknown icon name', () => {
    const { container } = render(<IconRenderer props={{ name: 'totallyUnknownIcon' }} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.querySelector('path, circle, rect, g, polygon, line')).not.toBeNull()
    // Decorative: the icon does not announce its own name — the text beside it carries the
    // meaning, and an agent that wants it announced sets `accessibility.label` instead.
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to a real glyph when the name is a custom svgPath object', () => {
    const { container } = render(<IconRenderer props={{ name: { svgPath: 'M0 0' } }} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
