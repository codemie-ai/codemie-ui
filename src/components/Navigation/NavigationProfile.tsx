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
import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import SettingsSvg from '@/assets/icons/configuration.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import LogoutSvg from '@/assets/icons/logout.svg?react'
import avatarDefault from '@/assets/images/avatar.jpg'
import { APP_VERSION } from '@/constants'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { FOCUSABLE_SELECTOR, useFocusTrap } from '@/hooks/useFocusTrap'
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
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelContentRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(false)
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  // Separate from `isVisible` so aria-expanded stays accurate during the exit animation.
  const [isTrapActive, setIsTrapActive] = useState(false)

  useFocusTrap(panelContentRef, isTrapActive)
  const handleEscape = useCallback(() => panelRef.current?.hide(), [])
  useEscapeKey(handleEscape, isTrapActive)

  useEffect(() => {
    const handleResize = () => {
      if (isVisibleRef.current && buttonRef.current) {
        panelRef.current?.hide()
        requestAnimationFrame(() => {
          panelRef.current?.show(
            { currentTarget: buttonRef.current } as unknown as React.SyntheticEvent,
            buttonRef.current
          )
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
        ref={buttonRef}
        onClick={toggle}
        aria-expanded={isVisible}
        aria-haspopup="dialog"
        aria-controls="nav-profile-dialog"
        data-tooltip-id={!isExpanded ? 'react-tooltip' : undefined}
        data-tooltip-content={!isExpanded ? 'Profile' : undefined}
        data-tooltip-place="right"
        data-onboarding="profile-button"
      >
        <img
          src={avatarSrc}
          alt="User profile"
          className="h-9 w-9 min-w-9 flex-shrink-0 rounded-full border-transparent transition group-hover:brightness-105"
        />

        <div
          className={cn(
            'grow text-left text-text-specific-bottom-navigation-label rounded-lg mr-2 px-1.5 py-2 transition-all duration-200 ease-in-out transform-gpu group-hover:bg-surface-specific-bottom-navigation-label',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          Profile
        </div>
      </button>

      <OverlayPanel
        ref={panelRef}
        onShow={() => {
          isVisibleRef.current = true
          setIsVisible(true)
          setIsTrapActive(true)
          showTimeoutRef.current = setTimeout(() => {
            const firstFocusable =
              panelContentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
            firstFocusable?.focus()
            // Hide the rest of the app from the a11y tree only after focus has
            // moved into the panel, so no currently-focused element is aria-hidden.
            document.getElementById('app')?.setAttribute('aria-hidden', 'true')
          }, 0)
        }}
        onHide={() => {
          isVisibleRef.current = false
          setIsVisible(false)
          setIsTrapActive(false)
          // Fallback for onExit below, in case it doesn't fire before this.
          document.getElementById('app')?.removeAttribute('aria-hidden')
          setTimeout(() => buttonRef.current?.focus(), 0)
        }}
        // onExit fires at close-start, ~100ms before onHide -- deactivate the
        // trap and un-hide #app here so Tab can't escape into a hidden subtree
        // during the exit animation. Also cancels onShow's timeout so a rapid
        // open/close can't re-hide #app after this runs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transitionOptions={
          {
            onExit: () => {
              isVisibleRef.current = false
              setIsTrapActive(false)
              if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
              document.getElementById('app')?.removeAttribute('aria-hidden')
            },
          } as any
        }
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
        <div // NOSONAR: native <dialog> needs showModal() for real AT semantics; role on a div avoids that without PrimeReact portal issues.
          id="nav-profile-dialog"
          ref={panelContentRef}
          className="static m-0 flex w-[262px] flex-col border-0 bg-transparent p-0 text-inherit"
          role="dialog"
          aria-modal="true"
          aria-label="User profile"
          data-onboarding="profile-expand-content"
        >
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
                  aria-label="Copy username"
                  className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] ml-1 text-text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm"
                  title="Copy username"
                  type="button"
                  onClick={copyUserName}
                >
                  <CopySvg className="w-3" aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-text-quaternary overflow-hidden text-ellipsis whitespace-nowrap">
                  ID: {user?.userId}
                </span>
                <button
                  aria-label="Copy user ID"
                  className="inline-flex items-center justify-center min-w-[24px] min-h-[24px] ml-1 text-text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-sm"
                  title="Copy user ID"
                  type="button"
                  onClick={copyUserID}
                >
                  <CopySvg className="w-3" aria-hidden="true" />
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
              <SettingsSvg className="mr-3" aria-hidden="true" />
              <span className="text-sm font-normal">Settings</span>
            </button>

            <button
              className="flex items-center px-4 py-2 hover:bg-surface-specific-dropdown-hover text-left"
              onClick={handleLogout}
            >
              <LogoutSvg className="mr-3" aria-hidden="true" />
              <span className="text-sm font-normal">Log out</span>
            </button>
          </div>
        </div>
      </OverlayPanel>
    </div>
  )
}

export default NavigationProfile
