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

import { useCallback, useEffect, useRef, useState } from 'react'
import { UseFormSetValue } from 'react-hook-form'

import { SHAREPOINT_AUTH_TYPES } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DeviceCodeState, OAuthStatus } from '@/types/entity/dataSource'

import { FormValues } from './useEditPopupForm'

interface UseSharePointOAuthProps {
  projectName?: string
  setValue: UseFormSetValue<FormValues>
  initialAuthType?: string
  authType?: string
}

export interface UseSharePointOAuthReturn {
  oauthStatus: OAuthStatus
  oauthUsername: string
  oauthError: string
  deviceCode: DeviceCodeState | null
  handleSignIn: (customClientId?: string, tenantId?: string) => Promise<void>
  stopPolling: () => void
  onAuthMethodChange: (outgoingMethod: string, incomingMethod: string) => void
  initForEditMode: (authType: string) => void
}

const POLL_INTERVAL_MS = 2000

export const useSharePointOAuth = ({
  projectName: _projectName,
  setValue,
  initialAuthType = SHAREPOINT_AUTH_TYPES.INTEGRATION,
  authType,
}: UseSharePointOAuthProps): UseSharePointOAuthReturn => {
  const initialStatus: OAuthStatus =
    initialAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION ? OAuthStatus.SUCCESS : OAuthStatus.IDLE

  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>(initialStatus)
  const [oauthUsername, setOauthUsername] = useState('')
  const [oauthError, setOauthError] = useState('')
  const [deviceCode, setDeviceCode] = useState<DeviceCodeState | null>(null)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAliasRef = useRef<string>('')
  const popupRef = useRef<Window | null>(null)
  const currentMethodRef = useRef<string>(initialAuthType)
  const savedStatusRef = useRef<Record<string, OAuthStatus>>(
    initialAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION
      ? { [initialAuthType]: OAuthStatus.SUCCESS }
      : {}
  )
  const savedUsernameRef = useRef<Record<string, string>>({})

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

  useEffect(() => () => stopPolling(), [stopPolling])

  const pollDeviceCode = useCallback(
    (
      dc: DeviceCodeState,
      alias: string,
      intervalSecs: number,
      customClientId?: string,
      tenantId?: string
    ) => {
      const attempt = async () => {
        if (pollAliasRef.current !== alias) return
        try {
          const data = await dataSourceStore.pollSharePointDeviceCode(
            dc.deviceCode,
            customClientId,
            tenantId
          )
          if (data.status === OAuthStatus.SUCCESS) {
            stopPolling()
            const username = data.username ?? ''
            setOauthStatus(OAuthStatus.SUCCESS)
            setOauthUsername(username)
            setValue('sharepointAccessToken', data.access_token ?? '')
            savedStatusRef.current[currentMethodRef.current] = OAuthStatus.SUCCESS
            savedUsernameRef.current[currentMethodRef.current] = username
            return
          }
          if (data.status === OAuthStatus.ERROR) {
            stopPolling()
            setOauthStatus(OAuthStatus.ERROR)
            setOauthError(data.message ?? 'Authentication failed or expired.')
            return
          }
          const nextInterval = data.slow_down ? intervalSecs + 5 : intervalSecs
          pollTimerRef.current = setTimeout(attempt, nextInterval * 1000)
        } catch {
          stopPolling()
          setOauthStatus(OAuthStatus.ERROR)
          setOauthError('Polling failed. Please try again.')
        }
      }
      pollTimerRef.current = setTimeout(attempt, intervalSecs * 1000)
    },
    [setValue, stopPolling]
  )

  const handleCustomSignIn = useCallback(
    async (customClientId?: string, tenantId?: string, alias?: string) => {
      try {
        const data = await dataSourceStore.initiateSharePointDeviceCode(customClientId, tenantId)
        const dc: DeviceCodeState = {
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          deviceCode: data.device_code,
          interval: data.interval ?? 5,
          message: data.message ?? '',
        }
        setDeviceCode(dc)
        setOauthStatus(OAuthStatus.WAITING)
        pollDeviceCode(dc, alias ?? '', dc.interval, customClientId, tenantId)
      } catch {
        setOauthStatus(OAuthStatus.ERROR)
        setOauthError('Failed to initiate authentication. Please try again.')
      }
    },
    [pollDeviceCode]
  )

  const handleCodemieSignIn = useCallback(
    async (customClientId?: string, tenantId?: string, alias?: string) => {
      try {
        const data = await dataSourceStore.initiateSharePointOAuth(customClientId, tenantId)

        const popup = window.open(data.auth_url, '_blank', 'width=600,height=700')
        popupRef.current = popup
        setOauthStatus(OAuthStatus.WAITING)

        pollIntervalRef.current = setInterval(async () => {
          if (pollAliasRef.current !== alias) return

          try {
            const result = await dataSourceStore.getSharePointOAuthStatus(data.state)

            if (result.status === OAuthStatus.SUCCESS) {
              stopPolling()
              const username = result.username ?? ''
              setOauthStatus(OAuthStatus.SUCCESS)
              setOauthUsername(username)
              setValue('sharepointAccessToken', result.access_token ?? '')
              savedStatusRef.current[currentMethodRef.current] = OAuthStatus.SUCCESS
              savedUsernameRef.current[currentMethodRef.current] = username
              return
            }

            if (result.status === OAuthStatus.ERROR) {
              stopPolling()
              setOauthStatus(OAuthStatus.ERROR)
              setOauthError(result.message ?? 'Authentication failed.')
              return
            }

            // pending — error only if popup was closed without completing
            if (popupRef.current?.closed) {
              stopPolling()
              setOauthStatus(OAuthStatus.ERROR)
              setOauthError('Sign-in window was closed. Click Sign in to try again.')
            }
          } catch {
            stopPolling()
            setOauthStatus(OAuthStatus.ERROR)
            setOauthError('Polling failed. Please try again.')
          }
        }, POLL_INTERVAL_MS)
      } catch {
        setOauthStatus(OAuthStatus.ERROR)
        setOauthError('Failed to initiate authentication. Please try again.')
      }
    },
    [setValue, stopPolling]
  )

  const handleSignIn = useCallback(
    async (customClientId?: string, tenantId?: string) => {
      stopPolling()
      setOauthStatus(OAuthStatus.IDLE)
      setOauthError('')
      setDeviceCode(null)

      const alias = `sharepoint-oauth-${Date.now()}`
      pollAliasRef.current = alias

      const currentAuthType = authType ?? currentMethodRef.current

      if (currentAuthType === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM) {
        return handleCustomSignIn(customClientId, tenantId, alias)
      }
      return handleCodemieSignIn(customClientId, tenantId, alias)
    },
    [authType, handleCustomSignIn, handleCodemieSignIn, stopPolling]
  )

  const onAuthMethodChange = useCallback(
    (outgoingMethod: string, incomingMethod: string) => {
      stopPolling()
      savedStatusRef.current[outgoingMethod] = oauthStatus
      savedUsernameRef.current[outgoingMethod] = oauthUsername
      currentMethodRef.current = incomingMethod
      setOauthError('')
      setDeviceCode(null)
      setValue('sharepointAccessToken', '')
      setOauthStatus(savedStatusRef.current[incomingMethod] ?? OAuthStatus.IDLE)
      setOauthUsername(savedUsernameRef.current[incomingMethod] ?? '')
    },
    [oauthStatus, oauthUsername, stopPolling, setValue]
  )

  const initForEditMode = useCallback((authType: string) => {
    currentMethodRef.current = authType
    if (authType !== SHAREPOINT_AUTH_TYPES.INTEGRATION) {
      setOauthStatus(OAuthStatus.SUCCESS)
      savedStatusRef.current[authType] = OAuthStatus.SUCCESS
      savedUsernameRef.current[authType] ??= ''
    }
  }, [])

  return {
    oauthStatus,
    oauthUsername,
    oauthError,
    deviceCode,
    handleSignIn,
    stopPolling,
    onAuthMethodChange,
    initForEditMode,
  }
}
