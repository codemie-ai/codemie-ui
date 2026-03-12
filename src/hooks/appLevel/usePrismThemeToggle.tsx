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

import { useEffect } from 'react'

import { useTheme } from '../useTheme'

const usePrismThemeToggle = () => {
  const { isDark } = useTheme()

  const togglePrismTheme = async (isDarkMode: boolean) => {
    try {
      const themeModule = isDarkMode
        ? // eslint-disable-next-line import/no-unresolved
          await import('prismjs/themes/prism-tomorrow.css?inline')
        : // eslint-disable-next-line import/no-unresolved
          await import('prismjs/themes/prism.css?inline')

      const styleEl = document.createElement('style')
      styleEl.id = 'prism-theme'
      styleEl.textContent = themeModule.default

      const oldStyleEl = document.head.querySelector('#prism-theme')

      if (oldStyleEl) {
        document.head.replaceChild(styleEl, oldStyleEl)
      } else {
        document.head.appendChild(styleEl)
      }
    } catch (error) {
      console.error('Error loading Prism theme:', error)
    }
  }

  useEffect(() => {
    togglePrismTheme(isDark)
  }, [isDark])
}

export default usePrismThemeToggle
