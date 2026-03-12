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

interface TextSegment {
  type: 'text'
  text: string
}

interface ImageUrlSegment {
  type: 'image_url'
  image_url: {
    url: string
  }
}

type MessageSegment = TextSegment | ImageUrlSegment

export const isValidMessageArray = (array: any): array is MessageSegment[] => {
  if (!Array.isArray(array) || array.length === 0) {
    return false
  }

  return array.every((segment) => {
    if (!segment || typeof segment !== 'object') {
      return false
    }

    if (segment.type === 'text') {
      return 'text' in segment && typeof segment.text === 'string'
    }

    if (segment.type === 'image_url') {
      return (
        segment.image_url &&
        typeof segment.image_url === 'object' &&
        typeof segment.image_url.url === 'string'
      )
    }

    return false
  })
}

interface ParsedTextSegment {
  type: 'text'
  content: string
}

interface ParsedImageSegment {
  type: 'image'
  url: string
  alt: string
}

type ParsedSegment = ParsedTextSegment | ParsedImageSegment

export const parseValidatedMessageArray = (array: MessageSegment[]): ParsedSegment[] => {
  return array.map((segment) => {
    if (segment.type === 'text') {
      return { type: 'text', content: segment.text }
    }

    if (segment.type === 'image_url') {
      return {
        type: 'image',
        url: segment.image_url.url,
        alt: 'Generated image',
      }
    }

    return { type: 'text', content: '' }
  })
}
