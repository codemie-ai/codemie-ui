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

export const useSharePointOAuth = ({
  projectName: _projectName,
  setValue,
  initialAuthType = SHAREPOINT_AUTH_TYPES.INTEGRATION,
}: UseSharePointOAuthProps): UseSharePointOAuthReturn => {
  const initialStatus: OAuthStatus =
    initialAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION ? 'success' : 'idle'

  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>(initialStatus)
  const [oauthUsername, setOauthUsername] = useState('')
  const [oauthError, setOauthError] = useState('')
  const [deviceCode, setDeviceCode] = useState<DeviceCodeState | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAliasRef = useRef<string>('')
  const currentMethodRef = useRef<string>(initialAuthType)
  const savedStatusRef = useRef<Record<string, OAuthStatus>>(
    initialAuthType !== SHAREPOINT_AUTH_TYPES.INTEGRATION
      ? { [initialAuthType]: 'success' }
      : {}
  )
  const savedUsernameRef = useRef<Record<string, string>>({})

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const pollForToken = useCallback(
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
          const data = await dataSourceStore.pollSharePointOAuth(
            dc.deviceCode,
            customClientId,
            tenantId
          )

          if (data.status === 'success') {
            stopPolling()
            const username = data.username ?? ''
            setOauthStatus('success')
            setOauthUsername(username)
            setValue('sharepointAccessToken', data.access_token ?? '')
            savedStatusRef.current[currentMethodRef.current] = 'success'
            savedUsernameRef.current[currentMethodRef.current] = username
            return
          }

          if (data.status === 'error') {
            stopPolling()
            setOauthStatus('error')
            setOauthError(data.message ?? 'Authentication failed or expired')
            return
          }

          // pending or slow_down — keep polling
          const nextInterval = data.slow_down ? intervalSecs + 5 : intervalSecs
          pollTimerRef.current = setTimeout(attempt, nextInterval * 1000)
        } catch {
          stopPolling()
          setOauthStatus('error')
          setOauthError('Polling failed. Please try again.')
        }
      }

      pollTimerRef.current = setTimeout(attempt, intervalSecs * 1000)
    },
    [setValue, stopPolling]
  )

  const handleSignIn = useCallback(
    async (customClientId?: string, tenantId?: string) => {
      stopPolling()
      setOauthStatus('idle')
      setOauthError('')
      setDeviceCode(null)

      const alias = `sharepoint-oauth-${Date.now()}`
      pollAliasRef.current = alias

      try {
        const data = await dataSourceStore.initiateSharePointOAuth(customClientId, tenantId)

        const dc: DeviceCodeState = {
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          deviceCode: data.device_code,
          interval: data.interval ?? 5,
          message: data.message ?? '',
        }

        setDeviceCode(dc)
        setOauthStatus('waiting')
        pollForToken(dc, alias, dc.interval, customClientId, tenantId)
      } catch {
        setOauthStatus('error')
        setOauthError('Failed to initiate authentication. Please try again.')
      }
    },
    [pollForToken, stopPolling]
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
      setOauthStatus(savedStatusRef.current[incomingMethod] ?? 'idle')
      setOauthUsername(savedUsernameRef.current[incomingMethod] ?? '')
    },
    [oauthStatus, oauthUsername, stopPolling, setValue]
  )

  const initForEditMode = useCallback((authType: string) => {
    currentMethodRef.current = authType
    if (authType !== SHAREPOINT_AUTH_TYPES.INTEGRATION) {
      setOauthStatus('success')
      savedStatusRef.current[authType] = 'success'
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
