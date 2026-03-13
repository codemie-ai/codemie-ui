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

import { useReactFlow, XYPosition } from '@xyflow/react'
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'

export type OnDropAction = ({ position }: { position: XYPosition }) => void

interface DnDContextType {
  isDragging: boolean
  setIsDragging: Dispatch<SetStateAction<boolean>>
  dropAction: OnDropAction | null
  setDropAction: Dispatch<SetStateAction<OnDropAction | null>>
}

interface DnDProviderProps {
  children: React.ReactNode
}

export const NODES_PANEL_SELECTOR = '#nodes-sidebar'
export const CANVAS_SELECTOR = '.react-flow__pane'
export const DEFAULT_POSITION = { X: 300, Y: 100 }
export const SIDEBAR_WIDTH_OFFSET = 308
export const NAVIGATION_EXPANDED_WIDTH_OFFSET = 124

const DnDContext = createContext<DnDContextType | null>(null)

// The DnDProvider is used to provide the context for the DnD functionality.
// This allows you to wrap your `ReactFlow` component instance in the `DnDProvider`,
// You can just use the `useDnD` hook in your components that need to start dragging a new node into the flow.
export function DnDProvider({ children }: Readonly<DnDProviderProps>) {
  const [isDragging, setIsDragging] = useState(false)
  const [dropAction, setDropAction] = useState<OnDropAction | null>(null)

  const value = useMemo(() => {
    return {
      isDragging,
      setIsDragging,
      dropAction,
      setDropAction: (action) => setDropAction(() => action),
    }
  }, [isDragging])

  return <DnDContext.Provider value={value}>{children}</DnDContext.Provider>
}

export default DnDContext

/**
 * Checks if coordinates overlap with a DOM element
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param element - DOM element to check overlap with
 * @param overlapCoefficient - Percentage of area required for overlap (0-1). Default 1.0 means full area.
 * @returns true if coordinates overlap with the effective area
 */
const isOverlapping = (
  x: number,
  y: number,
  element: Element,
  overlapCoefficient: number = 1
): boolean => {
  const rect = element.getBoundingClientRect()

  // Calculate the reduced hit area based on overlap coefficient
  const widthReduction = (rect.width * (1 - overlapCoefficient)) / 2
  const heightReduction = (rect.height * (1 - overlapCoefficient)) / 2

  const effectiveLeft = rect.left + widthReduction
  const effectiveRight = rect.right - widthReduction
  const effectiveTop = rect.top + heightReduction
  const effectiveBottom = rect.bottom - heightReduction

  return x >= effectiveLeft && x <= effectiveRight && y >= effectiveTop && y <= effectiveBottom
}

export const useDnD = () => {
  const { screenToFlowPosition } = useReactFlow()
  const { sidebarExpanded: appSidebarExpanded, navigationExpanded } = useSnapshot(appInfoStore)

  const context = useContext(DnDContext)

  if (!context) {
    throw new Error('useDnD must be used within a DnDProvider')
  }

  const { isDragging, setIsDragging, setDropAction, dropAction } = context

  // This callback will be returned by the `useDnD` hook, and can be used in your UI,
  // when you want to start dragging a node into the flow.
  const onDragStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, onDrop: OnDropAction) => {
      event.preventDefault()
      ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
      setIsDragging(true)
      setDropAction(onDrop)
    },
    [setIsDragging, setDropAction]
  )

  const onDragEnd = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) {
        setIsDragging(false)
        return
      }

      ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
      setIsDragging(false)
      event.preventDefault()

      const canvas = document.querySelectorAll(CANVAS_SELECTOR)[0]
      if (!canvas) {
        console.warn(`Canvas ${CANVAS_SELECTOR} not found`)
        return
      }

      const sidebar = document.querySelector(NODES_PANEL_SELECTOR)

      if (!sidebar) {
        console.warn(`Sidebar ${NODES_PANEL_SELECTOR} not found`)
        return
      }

      const isOverCanvas = isOverlapping(event.clientX, event.clientY, canvas)
      const isOverSidebar = isOverlapping(event.clientX, event.clientY, sidebar, 0.9)

      let flowPosition

      if (isOverCanvas && !isOverSidebar) {
        flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      } else {
        let adjustedX = DEFAULT_POSITION.X

        // Add offset for expanded sidebar
        if (appSidebarExpanded) {
          adjustedX += SIDEBAR_WIDTH_OFFSET
        }

        // Add offset for expanded navigation menu
        if (navigationExpanded) {
          adjustedX += NAVIGATION_EXPANDED_WIDTH_OFFSET
        }

        flowPosition = screenToFlowPosition({ x: adjustedX, y: DEFAULT_POSITION.Y })
      }

      dropAction?.({ position: flowPosition })
    },

    [
      screenToFlowPosition,
      setIsDragging,
      dropAction,
      isDragging,
      appSidebarExpanded,
      navigationExpanded,
    ]
  )

  // Add global touch event listeners
  useEffect(() => {
    if (!isDragging) return () => {}

    document.addEventListener('pointerup', onDragEnd)

    return () => {
      document.removeEventListener('pointerup', onDragEnd)
    }
  }, [onDragEnd, isDragging])

  return {
    isDragging,
    onDragStart,
  }
}

export const useDnDPosition = () => {
  const [position, setPosition] = useState<XYPosition | undefined>(undefined)

  // By default, the pointer move event sets the position of the dragged element in the context.
  // This will be used to display the `DragGhost` component.
  const onDrag = useCallback((event: PointerEvent) => {
    event.preventDefault()
    setPosition({ x: event.clientX, y: event.clientY })
  }, [])

  useEffect(() => {
    document.addEventListener('pointermove', onDrag)

    return () => {
      document.removeEventListener('pointermove', onDrag)
    }
  }, [onDrag])

  return { position }
}
