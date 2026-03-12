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

const TIMEOUT = 10

/**
 * Helps to "print" text to the screen fluidly
 * Buffers incoming characters and on timeout adds them to the stream
 */
export default class Stream {
  stream: string = ''

  streamBuffer: string = ''

  isStreaming: boolean = false

  start(): void {
    this.isStreaming = true
    this.run()
  }

  finish(): void {
    this.isStreaming = false
    this.stream = ''
    this.streamBuffer = ''
  }

  push(chunk: string): void {
    this.streamBuffer += chunk
  }

  run(): void {
    if (!this.isStreaming) return

    if (this.streamBuffer.length) {
      this.stream += this.streamBuffer[0]
      this.streamBuffer = this.streamBuffer.slice(1)
    }

    setTimeout(() => this.run(), TIMEOUT)
  }

  getStream(): string {
    // If the stream has md code block (```<code>```) finished,
    // add a closing ``` to the end
    const count = (this.stream.match(/```/g) || []).length

    if (count % 2 === 1) {
      return this.stream + '```'
    }
    return this.stream
  }
}

interface StreamChunkResult {
  chunkObjects: any[]
  incompleteChunk: string | null
}

/**
 * Stream object can return multiple JSON objects at once
 * e.g. {"generated_chunk": "Hello", "last": false}\n{"generated_chunk": "World", "last": true}
 * This function converts the string to an array of JSON objects
 */
export const streamChunkToObject = (chunk: string): StreamChunkResult => {
  const splitChunks = chunk.split(/}\s*{/)

  const stringChunks = splitChunks.map((string, index, array) => {
    if (index !== 0) string = '{' + string
    if (index !== array.length - 1) string += '}'

    return string
  })

  const chunkObjects: any[] = []
  let incompleteChunk: string | null = null

  const parseChunks = (stringChunkArray: string[]): void => {
    // eslint-disable-next-line array-callback-return,consistent-return
    stringChunkArray.some((chunkString, index) => {
      try {
        chunkObjects.push(JSON.parse(chunkString))
      } catch (e) {
        // If we can't parse the last object it means the string is not parseable
        // So set incompleteChunk, so it can be cached and processed later
        if (index === stringChunkArray.length - 1) {
          incompleteChunk = chunkString
          return true
        }
        // If not able to parse - join this item with next and try again
        const remainingItemsLength = stringChunkArray.length - index - 2
        parseChunks([
          [stringChunkArray[index], stringChunkArray[index + 1]].join(''),
          ...(remainingItemsLength ? stringChunkArray.slice(-remainingItemsLength) : []),
        ])
        return true // stop parsing remaining items - they will be parsed in the call above
      }
    })
  }

  parseChunks(stringChunks)

  return { chunkObjects, incompleteChunk }
}
