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

import { ChangeEvent, useRef, useState } from 'react'

import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'
import { useCustomAppearance } from '@/hooks/useCustomAppearance'
import { CustomAppearance } from '@/utils/themeService'
import { cn } from '@/utils/utils'

type LogoShape = 'rectangular' | 'square'

const MAX_LOGO_SIZE_BYTES = 500 * 1024
const MAX_LOGO_SIZE_LABEL = '500KB'
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

const validateLogoDimensions = (dataUrl: string, shape: LogoShape): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      if (shape === 'square' && image.naturalWidth !== image.naturalHeight) {
        reject(new Error('Upload a square logo with a 1:1 ratio.'))
        return
      }

      if (shape === 'rectangular' && image.naturalWidth <= image.naturalHeight) {
        reject(new Error('Upload a rectangular logo that is wider than it is tall.'))
        return
      }

      resolve()
    }

    image.onerror = () => reject(new Error('The logo could not be read. Try another image.'))
    image.src = dataUrl
  })

const readLogoFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('The logo could not be read. Try another image.'))
    }

    reader.onerror = () => reject(new Error('The logo could not be read. Try another image.'))
    reader.readAsDataURL(file)
  })

const LogoSection = () => {
  const { appearance, setAppearance } = useCustomAppearance()
  const [logoError, setLogoError] = useState<string>('')
  const rectangularLogoInputRef = useRef<HTMLInputElement>(null)
  const squareLogoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>, shape: LogoShape) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoError('Upload a PNG, JPG, WEBP, or SVG logo.')
      return
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError(`Logo size must be ${MAX_LOGO_SIZE_LABEL} or less.`)
      return
    }

    try {
      const dataUrl = await readLogoFile(file)
      await validateLogoDimensions(dataUrl, shape)
      setAppearance({
        logoMode: 'custom',
        [shape === 'rectangular' ? 'rectangularLogo' : 'squareLogo']: dataUrl,
      } as Partial<CustomAppearance>)
      setLogoError('')
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'The logo could not be uploaded.')
    }
  }

  const handleCodemieLogo = () => {
    setAppearance({ logoMode: 'codemie', rectangularLogo: '', squareLogo: '' })
    setLogoError('')
  }

  const handleCustomLogo = () => {
    setAppearance({ logoMode: 'custom' })
  }

  const hasCustomLogo = Boolean(appearance.rectangularLogo || appearance.squareLogo)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-quaternary">
          Upload one rectangular logo for expanded navigation and one square logo for collapsed
          navigation. This stays in your browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type={ButtonType.SECONDARY} size={ButtonSize.SMALL} onClick={handleCodemieLogo}>
            Use CodeMie logo
          </Button>
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={handleCustomLogo}
            disabled={!hasCustomLogo}
          >
            Use custom logo
          </Button>
        </div>
      </div>

      <div className="grid gap-3 card-grid-2:grid-cols-2">
        <div className="rounded-lg border border-border-primary bg-surface-base-content p-3">
          <div className="mb-3 flex h-16 items-center justify-center rounded-lg border border-border-primary bg-surface-base-primary">
            {appearance.rectangularLogo ? (
              <img
                src={appearance.rectangularLogo}
                alt="Custom rectangular logo preview"
                className="max-h-12 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-text-quaternary">Rectangular logo</span>
            )}
          </div>
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={() => rectangularLogoInputRef.current?.click()}
            className="w-full"
          >
            Upload rectangular
          </Button>
          <input
            ref={rectangularLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => handleLogoUpload(event, 'rectangular')}
          />
        </div>

        <div className="rounded-lg border border-border-primary bg-surface-base-content p-3">
          <div className="mb-3 flex h-16 items-center justify-center rounded-lg border border-border-primary bg-surface-base-primary">
            {appearance.squareLogo ? (
              <img
                src={appearance.squareLogo}
                alt="Custom square logo preview"
                className="max-h-12 max-w-12 object-contain"
              />
            ) : (
              <span className="text-xs text-text-quaternary">Square logo</span>
            )}
          </div>
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={() => squareLogoInputRef.current?.click()}
            className="w-full"
          >
            Upload square
          </Button>
          <input
            ref={squareLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => handleLogoUpload(event, 'square')}
          />
        </div>
      </div>

      <p className={cn('text-xs', logoError ? 'text-text-error' : 'text-text-quaternary')}>
        {logoError || 'Use compact files so the local browser setting can be restored on startup.'}
      </p>
    </div>
  )
}

export default LogoSection
