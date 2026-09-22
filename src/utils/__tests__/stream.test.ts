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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Stream, {
  DEFAULT_STREAM_CHUNK_SIZE,
  FAST_DRAIN_BUFFER_THRESHOLD,
  FAST_DRAIN_CHUNK_SIZE,
  MEDIUM_DRAIN_BUFFER_THRESHOLD,
  MEDIUM_DRAIN_CHUNK_SIZE,
  streamChunkToObject,
} from '../stream'

describe('Stream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it(`drains large backlogs in chunks of ${FAST_DRAIN_CHUNK_SIZE} (>${FAST_DRAIN_BUFFER_THRESHOLD} chars)`, () => {
    const stream = new Stream()
    stream.start()
    const text = 'A'.repeat(FAST_DRAIN_BUFFER_THRESHOLD + 50)
    stream.push(text)

    stream.run()
    expect(stream.stream.length).toBe(FAST_DRAIN_CHUNK_SIZE)
    expect(stream.streamBuffer.length).toBe(
      FAST_DRAIN_BUFFER_THRESHOLD + 50 - FAST_DRAIN_CHUNK_SIZE
    )
  })

  it(`drains medium backlogs in chunks of ${MEDIUM_DRAIN_CHUNK_SIZE} (${
    MEDIUM_DRAIN_BUFFER_THRESHOLD + 1
  }-${FAST_DRAIN_BUFFER_THRESHOLD} chars)`, () => {
    const stream = new Stream()
    stream.start()
    const text = 'B'.repeat(100)
    stream.push(text)

    stream.run()
    expect(stream.stream.length).toBe(MEDIUM_DRAIN_CHUNK_SIZE)
    expect(stream.streamBuffer.length).toBe(100 - MEDIUM_DRAIN_CHUNK_SIZE)
  })

  it(`drains small backlogs ${DEFAULT_STREAM_CHUNK_SIZE} char at a time (<=${MEDIUM_DRAIN_BUFFER_THRESHOLD} chars)`, () => {
    const stream = new Stream()
    stream.start()
    const text = 'Hello'
    stream.push(text)

    stream.run()
    expect(stream.stream).toBe('H')
    expect(stream.stream.length).toBe(DEFAULT_STREAM_CHUNK_SIZE)
    expect(stream.streamBuffer).toBe('ello')
  })

  it('closes unclosed markdown code blocks on getStream', () => {
    const stream = new Stream()
    stream.start()
    stream.push('```ts\nconst x = 1;')
    while (stream.streamBuffer.length > 0) {
      stream.run()
    }
    expect(stream.getStream().endsWith('```')).toBe(true)
  })

  it('correctly parses multiple ndjson chunks in streamChunkToObject', () => {
    const chunk1 = '{"generated_chunk": "Hello"}{"generated_chunk": " world", "last": true}'
    const result = streamChunkToObject(chunk1)
    expect(result.chunkObjects).toHaveLength(2)
    expect(result.chunkObjects[0].generated_chunk).toBe('Hello')
    expect(result.chunkObjects[1].last).toBe(true)
    expect(result.incompleteChunk).toBeNull()
  })
})
