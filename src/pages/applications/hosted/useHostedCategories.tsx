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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { assistantsStore } from '@/store/assistants'

export type HostedCategoriesStatus = 'loading' | 'ready' | 'failed'

// Shared by every mounted consumer so they make one request; cleared on failure so Retry can start over.
let request: Promise<void> | null = null

const load = (): Promise<void> => {
  request ??= assistantsStore.getAssistantCategories({ skipErrorHandling: true }).catch((error) => {
    request = null
    throw error
  })
  return request!
}

/** Test-only: forget the shared request. */
export const resetHostedCategoriesRequest = () => {
  request = null
}

export const useHostedCategories = () => {
  const { assistantCategories } = useSnapshot(assistantsStore)
  const [outcome, setOutcome] = useState<'pending' | 'loaded' | 'failed'>('pending')
  const hasCategories = assistantCategories.length > 0

  const start = useCallback(() => {
    setOutcome('pending')
    load().then(
      () => setOutcome('loaded'),
      () => setOutcome('failed')
    )
  }, [])

  useEffect(() => {
    if (!assistantsStore.assistantCategories.length) start()
  }, [start])

  let status: HostedCategoriesStatus = 'loading'
  if (hasCategories || outcome === 'loaded') status = 'ready'
  else if (outcome === 'failed') status = 'failed'

  return { categories: assistantCategories, status, retry: start }
}

interface HostedCategoriesNoticeProps {
  status: HostedCategoriesStatus
  retry: () => void
}

export const HostedCategoriesNotice = ({ status, retry }: HostedCategoriesNoticeProps) => {
  if (status !== 'failed') return null
  return (
    <div role="alert" className="flex items-center gap-2 text-xs text-text-quaternary">
      <span>Categories could not be loaded</span>
      <Button type={ButtonType.SECONDARY} onClick={retry}>
        Retry
      </Button>
    </div>
  )
}
