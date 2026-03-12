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

import React from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import Link from '@/components/Link'
import InfoMessage from '@/components/Message/Message'

interface MessageType {
  type: string
  title: string
  message: string
  link?: {
    url: string
    text: string
  }
}

interface Props {
  message: MessageType
}

const ExternalMessage: React.FC<Props> = ({ message }) => (
  <InfoMessage>
    <div className="flex justify-between">
      <div className="font-bold">{message.title}</div>
      {message.link && (
        <Link
          variant="dimmed"
          url={message.link.url}
          className="ml-auto font-semibold w-fit flex gap-2 items-center"
        >
          {message.link.text}
          <ExternalSvg className="opacity-60" />
        </Link>
      )}
    </div>
    <div className="mt-2">{message.message}</div>
  </InfoMessage>
)

export default ExternalMessage
