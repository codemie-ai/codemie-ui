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

import { FC } from 'react'

import CopyLinkSvg from '@/assets/icons/copy-link.svg?react'
import Button from '@/components/Button'
import Tooltip from '@/components/Tooltip'
import { getRootPath, copyToClipboard } from '@/utils/utils'

import { VERSION_PARAM } from '../types'

interface CopyReleaseLinkButtonProps {
  version: string
  scope: 'header' | 'sidebar'
  className?: string
}

export const CopyReleaseLinkButton: FC<CopyReleaseLinkButtonProps> = ({
  version,
  scope,
  className,
}) => {
  const targetId = `copy-release-link-${scope}-${version.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const releaseLink = `${getRootPath()}/release-notes?${VERSION_PARAM}=${encodeURIComponent(
    version
  )}`

  return (
    <>
      <Tooltip
        target={`#${targetId}`}
        appendTo={() => document.body}
        position="top"
        showDelay={100}
      />
      <Button
        id={targetId}
        type="tertiary"
        size="small"
        className={`h-6 w-6 shrink-0 self-center p-0 text-text-quaternary hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent ${
          className ?? ''
        }`}
        data-pr-tooltip="Copy link"
        aria-label={`Copy link to release ${version}`}
        onClick={(event) => {
          event.stopPropagation()
          copyToClipboard(releaseLink, 'Link copied')
        }}
      >
        <CopyLinkSvg className="h-4 w-4" aria-hidden="true" />
      </Button>
    </>
  )
}
