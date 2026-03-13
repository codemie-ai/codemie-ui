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

import React, { useRef, useState, useEffect, useCallback } from 'react'

import FileSvg from '@/assets/icons/file.svg?react'
import ViewSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock/CodeBlock'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import ZoomableImage from '@/components/ZoomableImage'
import { ButtonType, ButtonSize } from '@/constants'
import { filesStore } from '@/store/files'
import { unSanitizeMessage } from '@/utils/messageHelpers'

import MermaidCodePopup from './MermaidCodePopup'

type MermaidDiagramProps = {
  code: string
}

// Function to clean mermaid code by removing surrounding markers if present
const cleanMermaidCode = (code: string): string => {
  let cleanedCode = code.trim()

  // Remove ```mermaid at the beginning if present
  const mermaidStart = /^```mermaid\n?/m
  cleanedCode = cleanedCode.replace(mermaidStart, '')

  // Remove ``` at the end if present
  const mermaidEnd = /\n?```$/m
  cleanedCode = cleanedCode.replace(mermaidEnd, '')

  cleanedCode = unSanitizeMessage(cleanedCode)
  return cleanedCode.trim()
}

// Function to get SVG dimensions with consistent handling
const getSvgDimensions = (svgElement: SVGSVGElement) => {
  const bbox = svgElement.getBBox()
  let width = svgElement.width?.baseVal?.value || bbox.width || 800
  let height = svgElement.height?.baseVal?.value || bbox.height || 600

  // Check if viewBox exists and use its dimensions if they're larger
  const viewBox = svgElement.getAttribute('viewBox')
  if (viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number)
    if (vbWidth && vbHeight) {
      width = Math.max(width, vbWidth)
      height = Math.max(height, vbHeight)
    }
  }

  return { width, height }
}

// Function to generate consistent filenames for exports
const generateExportFilename = (code: string, format: string) => {
  const firstLine = code
    .split('\n')[0]
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 30)
  return `diagram-${firstLine}-${Date.now()}.${format}`
}

// Generic function to trigger file download
const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)

  // Create a download link
  const link = document.createElement('a')
  link.download = filename
  link.href = url

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  window.URL.revokeObjectURL(url)
}

// Function to create and prepare SVG for export
const prepareSvgForExport = (svgElement: SVGSVGElement) => {
  const svgCopy = svgElement.cloneNode(true) as SVGSVGElement
  const { width, height } = getSvgDimensions(svgElement)

  // Ensure SVG has proper dimensions
  svgCopy.setAttribute('width', String(width))
  svgCopy.setAttribute('height', String(height))

  return { svgCopy, width, height }
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const diagramContainerRef = useRef<HTMLDivElement | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [renderedSvg, setRenderedSvg] = useState('')
  const [showCodePopup, setShowCodePopup] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const renderDiagram = useCallback(async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setIsLoading(true)
    setHasError(false)

    // Debounce the rendering
    timeoutRef.current = setTimeout(async () => {
      try {
        // Make sure code is sanitized and non-empty
        if (!code || !code.trim()) {
          throw new Error('Empty diagram code')
        }

        // Clean the code before rendering
        const cleanedCode = cleanMermaidCode(code)

        const svg = await filesStore.getMermaidFile(cleanedCode)
        setRenderedSvg(svg)
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }, [code])

  useEffect(() => {
    renderDiagram()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [renderDiagram])

  // Export to SVG
  const exportAsSvg = () => {
    if (!diagramContainerRef.current) return

    const svgElement = diagramContainerRef.current.querySelector('svg')
    if (!svgElement) return

    const { svgCopy } = prepareSvgForExport(svgElement)
    const svgData = new XMLSerializer().serializeToString(svgCopy)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const filename = generateExportFilename(code, 'svg')

    downloadFile(svgBlob, filename)
  }

  // Export to PNG
  const exportAsPng = () => {
    if (!diagramContainerRef.current) return

    const svgElement = diagramContainerRef.current.querySelector('svg')
    if (!svgElement) return

    const { svgCopy, width, height } = prepareSvgForExport(svgElement)
    const scaleFactor = 2 // Higher scale factor for better quality

    // Create a canvas with scaled dimensions for higher resolution
    const canvas = document.createElement('canvas')
    canvas.width = width * scaleFactor
    canvas.height = height * scaleFactor

    // Draw a white background
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Scale the context to increase resolution
    ctx.scale(scaleFactor, scaleFactor)

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgCopy)
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)

    // Draw the SVG on the canvas
    const img = new Image()
    img.onload = function () {
      ctx.drawImage(img, 0, 0)

      // Convert canvas to PNG with higher quality
      try {
        canvas.toBlob(
          function (blob) {
            if (blob) {
              const filename = generateExportFilename(code, 'png')
              downloadFile(blob, filename)
            }
          },
          'image/png',
          1.0
        ) // Use highest quality (1.0)
      } catch (e) {
        console.error('Canvas export error:', e)
      }
    }
    img.src = svgDataUrl
  }

  const exportMenuItems: NavigationItem[] = [
    {
      title: 'Export to PNG',
      onClick: exportAsPng,
      icon: <FileSvg className="w-[18px] h-[18px]" />,
    },
    {
      title: 'Export to SVG',
      onClick: exportAsSvg,
      icon: <FileSvg className="w-[18px] h-[18px]" />,
    },
  ]

  if (hasError) {
    return (
      <div className="mermaid-diagram flex my-4 w-full overflow-x-auto relative">
        <CodeBlock language="mermaid" text={cleanMermaidCode(code)} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mermaid-diagram flex my-4 w-full overflow-x-auto relative min-h-[500px]">
        <div className="text-text-quaternary p-4 flex justify-center items-center w-full italic">
          Loading diagram...
        </div>
      </div>
    )
  }

  return (
    <div className="mermaid-diagram flex my-4 w-full overflow-x-auto relative">
      <div
        ref={diagramContainerRef}
        className="flex-grow border-b border-border-specific-panel-outline pb-4"
      >
        <ZoomableImage>
          <div
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
            className="min-w-full [&>svg]:max-h-[500px] [&>svg]:min-h-[500px] [&>svg]:min-w-full [&>svg]:max-w-full"
          />
        </ZoomableImage>
      </div>

      <div className="absolute top-0 right-0 z-10 flex items-center">
        <Button
          variant={ButtonType.TERTIARY}
          size={ButtonSize.MEDIUM}
          className="bg-surface-base-primary mr-1 hover:bg-surface-specific-dropdown-hover"
          onClick={() => setShowCodePopup(true)}
        >
          <ViewSvg className="h-4 w-4" />
        </Button>
        <NavigationMore
          hideOnClickInside
          items={exportMenuItems}
          buttonClassName="bg-surface-base-primary"
          className="bg-transparent"
        />
      </div>

      <MermaidCodePopup
        visible={showCodePopup}
        onClose={() => setShowCodePopup(false)}
        code={cleanMermaidCode(code)}
      />
    </div>
  )
}

export default MermaidDiagram
