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

import { OverlayPanel } from 'primereact/overlaypanel'
import React, { FC, useRef } from 'react'
import { useSnapshot } from 'valtio'

import SettingsSvg from '@/assets/icons/configuration.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import LogoutSvg from '@/assets/icons/logout.svg?react'
import avatarDefault from '@/assets/images/avatar.jpg'
import { APP_VERSION } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { authStore } from '@/store/auth'
import { userStore } from '@/store/user'
import { cn, copyToClipboard } from '@/utils/utils'

interface NavigationProfileProps {
  isExpanded: boolean
}

const NavigationProfile: FC<NavigationProfileProps> = ({ isExpanded }) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const { apiVersion } = useSnapshot(appInfoStore)
  const panelRef = useRef<OverlayPanel>(null)

  const VITE_APP_VERSION = (window as any)?._env_?.VITE_APP_VERSION ?? APP_VERSION

  const toggle = (event: React.MouseEvent) => {
    if (user) panelRef.current?.toggle(event)
  }

  const copyUserID = () => {
    copyToClipboard(user?.userId ?? '', 'User ID copied to clipboard')
  }

  const copyUserName = () => {
    copyToClipboard(user?.name ?? '', 'Username copied to clipboard')
  }

  const navigateToProfile = () => {
    router.push({ name: 'settings' })
    panelRef.current?.hide()
  }

  const handleLogout = () => {
    authStore.logout()
  }

  const avatarSrc = user?.picture || avatarDefault

  return (
    <div className="flex ml-2 relative">
      <button
        type="button"
        className={cn(
          'flex w-full group relative cursor-pointer text-sm gap-1.5 duration-150 h-9 items-start overflow-hidden',
          'text-nowrap text-text-quaternary'
        )}
        onClick={toggle}
        data-tooltip-id={!isExpanded ? 'react-tooltip' : undefined}
        data-tooltip-content={!isExpanded ? 'Profile' : undefined}
        data-tooltip-place="right"
      >
        <img
          src={avatarSrc}
          alt="User profile"
          className="h-9 w-9 min-w-9 flex-shrink-0 rounded-full border-transparent transition group-hover:brightness-105"
        />

        <div
          className={cn(
            'grow text-left text-text-specific-navigation-label rounded-lg mr-2 px-1.5 py-2 transition-all duration-200 ease-in-out transform-gpu group-hover:bg-white/15',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          Profile
        </div>
      </button>

      <OverlayPanel
        ref={panelRef}
        className="before:hidden after:hidden"
        pt={{
          content: {
            className:
              'bg-surface-base-secondary text-text-primary border border-border-structural p-0 rounded-lg shadow-xl',
          },
          root: {
            className: 'bg-none',
          },
        }}
      >
        <div className="flex flex-col w-[262px]">
          <div className="flex items-center w-full p-4">
            <img
              src={avatarSrc}
              alt="User profile"
              className="h-8 w-8 rounded-full border-transparent mr-3"
            />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  {user?.name}
                </span>
                <button
                  className="ml-1 text-text-primary hover:opacity-80"
                  title="Copy username"
                  onClick={copyUserName}
                >
                  <CopySvg className="w-3" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-text-quaternary overflow-hidden text-ellipsis whitespace-nowrap">
                  ID: {user?.userId}
                </span>
                <button
                  className="ml-1 text-text-primary hover:opacity-80"
                  title="Copy user ID"
                  onClick={copyUserID}
                >
                  <CopySvg className="w-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border-structural" />

          <div className="w-full my-1 text-text-quaternary">
            <div className="my-2 text-xs pl-3">
              <p className="mb-2">UI Version: {VITE_APP_VERSION}</p>
              <p>API Version: {apiVersion}</p>
            </div>
          </div>

          <div className="h-px bg-border-structural" />

          <div className="flex flex-col py-1 text-text-primary">
            <button
              className="flex items-center px-4 py-2 hover:bg-surface-specific-dropdown-hover text-left"
              onClick={navigateToProfile}
            >
              <SettingsSvg className="mr-3" />
              <span className="text-sm font-normal">Settings</span>
            </button>

            <button
              className="flex items-center px-4 py-2 hover:bg-surface-specific-dropdown-hover text-left"
              onClick={handleLogout}
            >
              <LogoutSvg className="mr-3" />
              <span className="text-sm font-normal">Log out</span>
            </button>
          </div>
        </div>
      </OverlayPanel>
    </div>
  )
}

export default NavigationProfile
