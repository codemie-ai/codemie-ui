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

const POLL_INTERVAL_MS = 2000

const getSharePointOAuthCredentials = (
  item: SharePointItemData,
  authType: string | undefined
): { clientId: string | undefined; tenantId: string | undefined } => {
  const isCustom = authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
  return {
    clientId: isCustom ? item.sharepoint?.oauth_client_id || undefined : undefined,
    tenantId: isCustom ? item.sharepoint?.oauth_tenant_id || undefined : undefined,
  }
}

const SharePointReindexAuthPopup: FC<Props> = ({ item, visible, onHide, onSuccess }) => {
  const [status, setStatus] = useState<OAuthStatus>(OAuthStatus.IDLE)
  const [error, setError] = useState('')
  const [deviceCode, setDeviceCode] = useState<DeviceCodeState | null>(null)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAliasRef = useRef<string>('')
  const popupRef = useRef<Window | null>(null)

  const authType = item.sharepoint?.auth_type
  const isDeviceCodeFlow = authType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
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

  const { clientId: customClientId, tenantId: customTenantId } = getSharePointOAuthCredentials(
    item,
    authType
  )

  const startDeviceCodeAuth = useCallback(async () => {
    stopPolling()
    setStatus(OAuthStatus.IDLE)
    setError('')
    setDeviceCode(null)

    const alias = `sharepoint-reindex-dc-${Date.now()}`
    pollAliasRef.current = alias

    try {
      const data = await dataSourceStore.initiateSharePointDeviceCode(
        customClientId,
        customTenantId
      )
      const dc: DeviceCodeState = {
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        deviceCode: data.device_code,
        interval: data.interval ?? 5,
        message: data.message ?? '',
      }
      setDeviceCode(dc)
      setStatus(OAuthStatus.WAITING)

      const attempt = async () => {
        if (pollAliasRef.current !== alias) return
        try {
          const result = await dataSourceStore.pollSharePointDeviceCode(
            dc.deviceCode,
            customClientId,
            customTenantId
          )
          if (result.status === OAuthStatus.SUCCESS) {
            stopPolling()
            setStatus(OAuthStatus.SUCCESS)
            onSuccess(result.access_token ?? '')
            closeTimerRef.current = setTimeout(onHide, 1500)
            return
          }
          if (result.status === OAuthStatus.ERROR) {
            stopPolling()
            setStatus(OAuthStatus.ERROR)
            setError(result.message ?? 'Authentication failed or expired.')
            return
          }
          const nextInterval = result.slow_down ? dc.interval + 5 : dc.interval
          pollTimerRef.current = setTimeout(attempt, nextInterval * 1000)
        } catch {
          stopPolling()
          setStatus(OAuthStatus.ERROR)
          setError('Polling failed. Please try again.')
        }
      }
      pollTimerRef.current = setTimeout(attempt, dc.interval * 1000)
    } catch {
      setStatus(OAuthStatus.ERROR)
      setError('Failed to initiate authentication. Please try again.')
    }
  }, [customClientId, customTenantId, stopPolling, onSuccess, onHide])

  const startPKCEAuth = useCallback(async () => {
    stopPolling()
    setStatus(OAuthStatus.IDLE)
    setError('')
    setDeviceCode(null)

    const alias = `sharepoint-reindex-pkce-${Date.now()}`
    pollAliasRef.current = alias

    const { clientId: pkceClientId, tenantId: pkceTenantId } = getSharePointOAuthCredentials(
      item,
      authType
    )

    try {
      const data = await dataSourceStore.initiateSharePointOAuth(pkceClientId, pkceTenantId)

      const popup = window.open(data.auth_url, '_blank', 'width=600,height=700')
      popupRef.current = popup
      setStatus(OAuthStatus.WAITING)

      pollIntervalRef.current = setInterval(async () => {
        if (pollAliasRef.current !== alias) return

        if (popupRef.current?.closed) {
          stopPolling()
          setStatus(OAuthStatus.ERROR)
          setError('Sign-in window was closed. Click Sign in to try again.')
          return
        }

        try {
          const result = await dataSourceStore.getSharePointOAuthStatus(data.state)

          if (result.status === OAuthStatus.SUCCESS) {
            stopPolling()
            setStatus(OAuthStatus.SUCCESS)
            onSuccess(result.access_token ?? '')
            closeTimerRef.current = setTimeout(onHide, 1500)
            return
          }

          if (result.status === OAuthStatus.ERROR) {
            stopPolling()
            setStatus(OAuthStatus.ERROR)
            setError(result.message ?? 'Authentication failed.')
          }

          // pending — keep polling
        } catch {
          stopPolling()
          setStatus(OAuthStatus.ERROR)
          setError('Polling failed. Please try again.')
        }
      }, POLL_INTERVAL_MS)
    } catch {
      setStatus(OAuthStatus.ERROR)
      setError('Failed to initiate authentication. Please try again.')
    }
  }, [authType, item, stopPolling, onSuccess, onHide])

  const startAuth = isDeviceCodeFlow ? startDeviceCodeAuth : startPKCEAuth
  const retryAuth = isDeviceCodeFlow ? startDeviceCodeAuth : startPKCEAuth

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
        {status === OAuthStatus.SUCCESS && (
          <p className="text-sm text-text-success">Authentication successful. Starting reindex…</p>
        )}

        {status === OAuthStatus.WAITING && !isDeviceCodeFlow && (
          <p className="text-sm text-text-secondary">
            Sign-in window opened — complete authentication in the browser.
          </p>
        )}

        {status === OAuthStatus.WAITING && isDeviceCodeFlow && deviceCode && (
          <SharePointDeviceCodeInstructions deviceCode={deviceCode} />
        )}

        {status === OAuthStatus.WAITING && isDeviceCodeFlow && !deviceCode && (
          <p className="text-sm text-text-secondary">Initiating Microsoft sign-in…</p>
        )}

        {status === OAuthStatus.ERROR && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-error">{error}</p>
            <Button type="primary" size={ButtonSize.SMALL} onClick={retryAuth} className="w-fit">
              Try Again
            </Button>
          </div>
        )}

        {status === OAuthStatus.IDLE && (
          <p className="text-sm text-text-secondary">Initiating Microsoft sign-in…</p>
        )}
      </div>
    </Popup>
  )
}

export default SharePointReindexAuthPopup
