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

import { FC, useCallback, useEffect, useRef, useState } from 'react'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { SHAREPOINT_AUTH_TYPES } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DeviceCodeState, OAuthStatus } from '@/types/entity/dataSource'

import SharePointDeviceCodeInstructions from './SharePointDeviceCodeInstructions'

interface SharePointItemData {
  sharepoint?: {
    auth_type?: string
    oauth_client_id?: string
    oauth_tenant_id?: string
  }
}

interface Props {
  item: SharePointItemData
  visible: boolean
  onHide: () => void
  onSuccess: (accessToken: string) => void
}

const SharePointReindexAuthPopup: FC<Props> = ({ item, visible, onHide, onSuccess }) => {
  const [status, setStatus] = useState<OAuthStatus>('idle')
  const [deviceCode, setDeviceCode] = useState<DeviceCodeState | null>(null)
  const [error, setError] = useState('')

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAliasRef = useRef<string>('')

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopPolling()
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    onHide()
  }, [stopPolling, onHide])

  useEffect(
    () => () => {
      stopPolling()
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    [stopPolling]
  )

  const startAuth = useCallback(async () => {
    const customClientId =
      item.sharepoint?.auth_type === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
        ? item.sharepoint?.oauth_client_id || undefined
        : undefined
    const customTenantId =
      item.sharepoint?.auth_type === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
        ? item.sharepoint?.oauth_tenant_id || undefined
        : undefined

    stopPolling()
    setStatus('idle')
    setError('')
    setDeviceCode(null)

    const alias = `sharepoint-reindex-${Date.now()}`
    pollAliasRef.current = alias

    try {
      const data = await dataSourceStore.initiateSharePointOAuth(customClientId, customTenantId)

      const dc: DeviceCodeState = {
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        deviceCode: data.device_code,
        interval: data.interval ?? 5,
        message: data.message ?? '',
      }

      setDeviceCode(dc)
      setStatus('waiting')

      const pollAttempt = async (currentInterval: number) => {
        if (pollAliasRef.current !== alias) return
        try {
          const pollData = await dataSourceStore.pollSharePointOAuth(
            dc.deviceCode,
            customClientId,
            customTenantId
          )

          if (pollData.status === 'success') {
            stopPolling()
            setStatus('success')
            onSuccess(pollData.access_token ?? '')
            closeTimerRef.current = setTimeout(onHide, 1500)
            return
          }

          if (pollData.status === 'error') {
            stopPolling()
            setStatus('error')
            setError(pollData.message ?? 'Authentication failed or expired')
            return
          }

          const nextInterval = pollData.slow_down ? currentInterval + 5 : currentInterval
          pollTimerRef.current = setTimeout(() => pollAttempt(nextInterval), nextInterval * 1000)
        } catch {
          stopPolling()
          setStatus('error')
          setError('Polling failed. Please try again.')
        }
      }

      pollTimerRef.current = setTimeout(() => pollAttempt(dc.interval), dc.interval * 1000)
    } catch {
      setStatus('error')
      setError('Failed to initiate authentication. Please try again.')
    }
  }, [item, stopPolling, onSuccess, onHide])

  // Start auth flow each time the popup opens
  useEffect(() => {
    if (visible) startAuth()
    // startAuth is intentionally excluded: we only want to trigger on popup open, not on every item change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header="Sign in with Microsoft to Reindex"
      limitWidth
      footerContent={
        <div className="flex justify-end">
          <Button type={ButtonType.BASE} size={ButtonSize.SMALL} onClick={handleClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 p-1">
        {status === 'success' && (
          <p className="text-sm text-text-success">Authentication successful. Starting reindex…</p>
        )}

        {status === 'waiting' && deviceCode && (
          <div className="flex flex-col gap-2 text-sm">
            <SharePointDeviceCodeInstructions deviceCode={deviceCode} />
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-error">{error}</p>
            <Button type="primary" size={ButtonSize.SMALL} onClick={startAuth} className="w-fit">
              Try Again
            </Button>
          </div>
        )}

        {status === 'idle' && (
          <p className="text-sm text-text-secondary">Initiating Microsoft sign-in…</p>
        )}
      </div>
    </Popup>
  )
}

export default SharePointReindexAuthPopup
