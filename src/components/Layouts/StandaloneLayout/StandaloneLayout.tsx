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

import React, { ReactNode } from 'react'

import MoonSvg from '@/assets/icons/moon.svg?react'
import SunSvg from '@/assets/icons/sun.svg?react'
import bottomGradientImg from '@/assets/images/auth-gradients/bottom-gradient.png'
import leftGradientImg from '@/assets/images/auth-gradients/left-gradient.png'
import rightGradientImg from '@/assets/images/auth-gradients/right-gradient.png'
import LogoFullDarkSvg from '@/assets/images/logo-full-dark.svg?react'
import LogoFullLightSvg from '@/assets/images/logo-full-light.svg?react'
import { DARK_THEME_KEY, LIGHT_THEME_KEY } from '@/constants'
import { useTheme } from '@/hooks/useTheme'

interface StandaloneLayoutProps {
  children: ReactNode
  headerContent?: ReactNode
}

const StandaloneLayout: React.FC<StandaloneLayoutProps> = ({ children, headerContent }) => {
  const { isDark, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? LIGHT_THEME_KEY : DARK_THEME_KEY)
  }

  return (
    <div className="relative min-h-screen bg-surface-base-primary overflow-hidden">
      {/* Top-left gradient */}
      <img
        src={leftGradientImg}
        alt=""
        className="absolute pointer-events-none"
        style={{ top: '0', left: '-5vw', width: '40vw', opacity: 0.5 }}
      />

      {/* Top-right gradient */}
      <img
        src={rightGradientImg}
        alt=""
        className="absolute pointer-events-none"
        style={{ top: '-1vh', right: '-1vw', width: '50vw', opacity: 0.5 }}
      />

      {/* Bottom gradient */}
      <img
        src={bottomGradientImg}
        alt=""
        className="absolute pointer-events-none"
        style={{
          bottom: '10vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '35vw',
          opacity: 0.5,
        }}
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-8 top-8 z-30 flex h-8 w-8 items-center justify-center rounded-full text-text-quaternary transition-colors hover:bg-text-primary/10 hover:text-text-primary"
        aria-label="Toggle theme"
      >
        {isDark ? <MoonSvg className="h-5 w-5" /> : <SunSvg className="h-5 w-5" />}
      </button>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 pt-20">
        {/* Logo */}
        <div className="absolute left-[112px] top-[76px] h-[48px] w-[192px]">
          {isDark ? (
            <LogoFullDarkSvg width={192} height={48} />
          ) : (
            <LogoFullLightSvg width={192} height={48} />
          )}
        </div>

        {/* Header content (e.g., Sign In/Sign Up buttons) */}
        <div className="ml-auto">{headerContent}</div>
      </header>

      {/* Content - centered on full screen */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">{children}</div>
    </div>
  )
}

export default StandaloneLayout
