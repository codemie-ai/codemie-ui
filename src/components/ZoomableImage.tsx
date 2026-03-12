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

import { FC, ReactNode } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'

import CollapseSvg from '@/assets/icons/collapse.svg?react'

type ZoomableImageProps = {
  children: ReactNode
}

const ZoomableImage: FC<ZoomableImageProps> = ({ children }) => {
  return (
    <div className="relative min-w-full min-h-[500px]">
      <TransformWrapper
        wheel={{ step: 0.3 }}
        maxScale={8}
        minScale={0.2}
        centerOnInit
        limitToBounds={false}
      >
        <TransformComponent wrapperClass="cursor-grab min-w-full">{children}</TransformComponent>
        <ZoomControls />
      </TransformWrapper>
    </div>
  )
}

export default ZoomableImage

const ZoomControls: FC = () => {
  const { zoomIn, zoomOut, centerView } = useControls()

  return (
    <div className="absolute bottom-0 right-0 bg-surface-base-secondary border border-border-primary rounded-lg shadow-sm z-10">
      <button
        className="flex justify-center items-center size-12 hover:bg-surface-base-primary transition-colors rounded-t-lg"
        onClick={() => {
          centerView(1)
        }}
        aria-label="Reset zoom"
      >
        <CollapseSvg className="size-6" />
      </button>
      <button
        className="flex justify-center items-center size-12 hover:bg-surface-base-primary text-2xl transition-colors"
        onClick={() => zoomIn()}
        aria-label="Zoom in"
      >
        +
      </button>

      <button
        className="flex justify-center items-center size-12 hover:bg-surface-base-primary text-2xl transition-colors rounded-b-lg"
        onClick={() => zoomOut()}
        aria-label="Zoom out"
      >
        -
      </button>
    </div>
  )
}
