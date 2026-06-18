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

import { FC, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { BudgetCategory } from '@/types/entity/budget'
import { cn } from '@/utils/utils'

export type PctMap = Record<BudgetCategory, number>

interface UnifiedBudgetDragBarProps {
  pcts: PctMap
  totalBudget: number
  platformMinPct: number
  onChange: (next: PctMap) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi)

const SNAP_ENTER_ZONE = 0.2
const SNAP_EXIT_ZONE = 0.4
const SLOW_VELOCITY_PCT_PER_MS = 0.05
const BORDER_WIDTH = 1

type LabelVariant = 'full' | 'short' | 'none'

const FULL_LABEL_SAMPLE: Record<BudgetCategory, string> = {
  platform: 'Platform 100%',
  cli: 'CLI 100%',
  premium_models: 'Premium 100%',
}
const SHORT_LABEL_SAMPLE = '100%'

const pickVariant = (
  segmentPx: number,
  fullLabelPx: number,
  shortLabelPx: number
): LabelVariant => {
  if (fullLabelPx > 0 && segmentPx >= fullLabelPx) return 'full'
  if (shortLabelPx > 0 && segmentPx >= shortLabelPx) return 'short'
  return 'none'
}

const pickMagneticDollarStep = (total: number): number => {
  if (total < 100) return 1
  if (total <= 1000) return 10
  if (total <= 10000) return 100
  if (total <= 100000) return 1000
  return 10000
}
const pickFineDollarStep = (total: number): number => pickMagneticDollarStep(total) / 10

const formatPctLabel = (v: number): string => `${Math.round(v)}%`

const computeSnap = (
  rawPct: number,
  velocity: number,
  held: number | null,
  magneticPctStep: number
): { pct: number; held: number | null } => {
  if (velocity >= SLOW_VELOCITY_PCT_PER_MS) return { pct: rawPct, held: null }
  if (held !== null && Math.abs(rawPct - held) < SNAP_EXIT_ZONE) {
    return { pct: held, held }
  }
  const nearest = Math.round(rawPct / magneticPctStep) * magneticPctStep
  if (Math.abs(rawPct - nearest) < SNAP_ENTER_ZONE) {
    return { pct: nearest, held: nearest }
  }
  return { pct: rawPct, held: null }
}

const UnifiedBudgetDragBar: FC<UnifiedBudgetDragBarProps> = ({
  pcts,
  totalBudget,
  platformMinPct,
  onChange,
  onDragStart,
  onDragEnd,
}) => {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<0 | 1 | 2>(0)
  const pctsRef = useRef(pcts)
  pctsRef.current = pcts
  const draggingRef = useRef(dragging)
  draggingRef.current = dragging
  const lastMouseXRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const lastSnapPctRef = useRef<number | null>(null)
  const dragStartRef = useRef<{ clickPct: number; handlePct: number } | null>(null)

  const platformBandRef = useRef<HTMLDivElement>(null)
  const cliBandRef = useRef<HTMLDivElement>(null)
  const premiumBandRef = useRef<HTMLDivElement>(null)
  const [segWidths, setSegWidths] = useState<Record<BudgetCategory, number>>({
    platform: 0,
    cli: 0,
    premium_models: 0,
  })

  const platformFullRef = useRef<HTMLSpanElement>(null)
  const cliFullRef = useRef<HTMLSpanElement>(null)
  const premiumFullRef = useRef<HTMLSpanElement>(null)
  const shortLabelRef = useRef<HTMLSpanElement>(null)
  const [fullLabelWidths, setFullLabelWidths] = useState<Record<BudgetCategory, number>>({
    platform: 78,
    cli: 50,
    premium_models: 72,
  })
  const [shortLabelWidth, setShortLabelWidth] = useState(28)

  // Single ResizeObserver covers both segment bands and off-screen label measurers.
  useLayoutEffect(() => {
    const bandRefs: Array<[BudgetCategory, RefObject<HTMLDivElement | null>]> = [
      ['platform', platformBandRef],
      ['cli', cliBandRef],
      ['premium_models', premiumBandRef],
    ]
    const fullRefs: Array<[BudgetCategory, RefObject<HTMLSpanElement | null>]> = [
      ['platform', platformFullRef],
      ['cli', cliFullRef],
      ['premium_models', premiumFullRef],
    ]

    setSegWidths({
      platform: platformBandRef.current?.getBoundingClientRect().width ?? 0,
      cli: cliBandRef.current?.getBoundingClientRect().width ?? 0,
      premium_models: premiumBandRef.current?.getBoundingClientRect().width ?? 0,
    })
    setFullLabelWidths({
      platform: platformFullRef.current?.getBoundingClientRect().width ?? 78,
      cli: cliFullRef.current?.getBoundingClientRect().width ?? 50,
      premium_models: premiumFullRef.current?.getBoundingClientRect().width ?? 72,
    })
    setShortLabelWidth(shortLabelRef.current?.getBoundingClientRect().width ?? 28)

    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        for (const [cat, ref] of bandRefs) {
          if (entry.target === ref.current) {
            setSegWidths((prev) => (w === prev[cat] ? prev : { ...prev, [cat]: w }))
          }
        }
        if (entry.target === shortLabelRef.current) {
          setShortLabelWidth((prev) => (w === prev ? prev : w))
          continue
        }
        for (const [cat, ref] of fullRefs) {
          if (entry.target === ref.current) {
            setFullLabelWidths((prev) => (w === prev[cat] ? prev : { ...prev, [cat]: w }))
          }
        }
      }
    })

    const allRefs: Array<RefObject<Element | null>> = [
      ...bandRefs.map(([, r]) => r as RefObject<Element | null>),
      ...fullRefs.map(([, r]) => r as RefObject<Element | null>),
      shortLabelRef as RefObject<Element | null>,
    ]
    for (const ref of allRefs) {
      if (ref.current) obs.observe(ref.current)
    }
    return () => obs.disconnect()
  }, [])

  const platformVariant = pickVariant(segWidths.platform, fullLabelWidths.platform, shortLabelWidth)
  const cliVariant = pickVariant(segWidths.cli, fullLabelWidths.cli, shortLabelWidth)
  const premiumVariant = pickVariant(
    segWidths.premium_models,
    fullLabelWidths.premium_models,
    shortLabelWidth
  )

  const startDrag = useCallback(
    (handle: 1 | 2, clientX: number) => {
      const host = hostRef.current
      if (host) {
        const rect = host.getBoundingClientRect()
        const clickPct =
          ((clientX - rect.left - BORDER_WIDTH) / (rect.width - 2 * BORDER_WIDTH)) * 100
        const { current } = pctsRef
        const handlePct = handle === 1 ? current.platform : current.platform + current.cli
        dragStartRef.current = { clickPct, handlePct }
      }
      lastMouseXRef.current = null
      lastTsRef.current = null
      lastSnapPctRef.current = null
      setDragging(handle)
      document.body.style.cursor = 'col-resize'
      onDragStart?.()
    },
    [onDragStart]
  )

  // Pick the nearest handle to the click/touch point and start dragging it.
  // This lets the user interact with the whole bar, not just the handle pills.
  const pickHandle = useCallback((clientX: number): 1 | 2 => {
    const host = hostRef.current
    if (!host) return 1
    const rect = host.getBoundingClientRect()
    const pct = ((clientX - rect.left - BORDER_WIDTH) / (rect.width - 2 * BORDER_WIDTH)) * 100
    const { current } = pctsRef
    const h1 = current.platform
    const h2 = current.platform + current.cli
    const d1 = Math.abs(pct - h1)
    const d2 = Math.abs(pct - h2)
    if (d1 !== d2) return d1 < d2 ? 1 : 2
    // Handles overlap (CLI=0): pick by position — left of boundary → h1, right → h2
    return pct <= h1 ? 1 : 2
  }, [])

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startDrag(pickHandle(e.clientX), e.clientX)
    },
    [startDrag, pickHandle]
  )

  const handleBarTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      e.preventDefault()
      startDrag(pickHandle(touch.clientX), touch.clientX)
    },
    [startDrag, pickHandle]
  )

  useEffect(() => {
    // Shared move logic for both mouse and touch.
    // Compensates for the 1px border so drag coordinates match band boundaries.
    const processDragMove = (clientX: number, timeStamp: number) => {
      const handle = draggingRef.current
      if (!handle) return
      const host = hostRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      const innerLeft = rect.left + BORDER_WIDTH
      const innerWidth = rect.width - 2 * BORDER_WIDTH
      const safeTotal = totalBudget > 0 ? totalBudget : 1
      const magneticPctStep = (pickMagneticDollarStep(safeTotal) / safeTotal) * 100
      const finePctStep = (pickFineDollarStep(safeTotal) / safeTotal) * 100
      const absPct = ((clientX - innerLeft) / innerWidth) * 100
      // Delta-based: move handle relative to where the drag started so clicking
      // anywhere on the bar doesn't jump the boundary to the click position.
      const ds = dragStartRef.current
      const rawPctRaw = ds !== null ? ds.handlePct + (absPct - ds.clickPct) : absPct
      const rawPct = Math.round(rawPctRaw / finePctStep) * finePctStep
      const lastX = lastMouseXRef.current
      const lastTs = lastTsRef.current
      let velocityPctPerMs = 0
      if (lastX !== null && lastTs !== null && timeStamp > lastTs) {
        velocityPctPerMs = ((Math.abs(clientX - lastX) / innerWidth) * 100) / (timeStamp - lastTs)
      }
      lastMouseXRef.current = clientX
      lastTsRef.current = timeStamp
      const snap = computeSnap(rawPct, velocityPctPerMs, lastSnapPctRef.current, magneticPctStep)
      lastSnapPctRef.current = snap.held
      const pct = clamp(snap.pct, 0, 100)
      const { current } = pctsRef

      if (handle === 1) {
        const newPlatform = clamp(pct, platformMinPct, 100 - current.premium_models)
        const newCli = Math.max(0, 100 - newPlatform - current.premium_models)
        onChange({
          platform: newPlatform,
          cli: newCli,
          premium_models: current.premium_models,
        })
      } else {
        const boundary = clamp(pct, current.platform, 100)
        const newCli = Math.max(0, boundary - current.platform)
        const newPremium = Math.max(0, 100 - current.platform - newCli)
        onChange({
          platform: current.platform,
          cli: newCli,
          premium_models: newPremium,
        })
      }
    }

    const onMove = (e: MouseEvent) => processDragMove(e.clientX, e.timeStamp)

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      e.preventDefault()
      processDragMove(touch.clientX, e.timeStamp)
    }

    const stopDrag = () => {
      if (draggingRef.current) {
        setDragging(0)
        dragStartRef.current = null
        document.body.style.cursor = ''
        onDragEnd?.()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', stopDrag)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stopDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stopDrag)
    }
  }, [platformMinPct, totalBudget, onChange, onDragEnd])

  return (
    <div
      ref={hostRef}
      className={cn(
        'relative h-12 rounded-md select-none touch-none cursor-col-resize',
        'border border-border-structural'
      )}
      onMouseDown={handleBarMouseDown}
      onTouchStart={handleBarTouchStart}
    >
      {/* Band layer in its own overflow-hidden wrapper so handles aren't clipped at edges */}
      <div className="absolute inset-0 flex overflow-hidden rounded-md">
        <div
          ref={platformBandRef}
          className="flex items-center justify-center bg-surface-specific-charts-blue text-white overflow-hidden"
          style={{ flex: pcts.platform > 0 ? pcts.platform : 0.001 }}
        >
          {platformVariant === 'full' && (
            <span className="text-xs font-semibold px-1.5 text-center break-words">
              Platform {formatPctLabel(pcts.platform)}
            </span>
          )}
          {platformVariant === 'short' && (
            <span className="text-xs font-semibold px-1.5">{formatPctLabel(pcts.platform)}</span>
          )}
        </div>
        <div
          ref={cliBandRef}
          className="flex items-center justify-center bg-surface-specific-charts-cyan text-white overflow-hidden"
          style={{ flex: pcts.cli > 0 ? pcts.cli : 0.001 }}
        >
          {cliVariant === 'full' && (
            <span className="text-xs font-semibold px-1.5 text-center break-words">
              CLI {formatPctLabel(pcts.cli)}
            </span>
          )}
          {cliVariant === 'short' && (
            <span className="text-xs font-semibold px-1.5">{formatPctLabel(pcts.cli)}</span>
          )}
        </div>
        <div
          ref={premiumBandRef}
          className="flex items-center justify-center bg-surface-specific-charts-purple text-white overflow-hidden"
          style={{ flex: pcts.premium_models > 0 ? pcts.premium_models : 0.001 }}
        >
          {premiumVariant === 'full' && (
            <span className="text-xs font-semibold px-1.5 text-center break-words">
              Premium {formatPctLabel(pcts.premium_models)}
            </span>
          )}
          {premiumVariant === 'short' && (
            <span className="text-xs font-semibold px-1.5">
              {formatPctLabel(pcts.premium_models)}
            </span>
          )}
        </div>
      </div>

      {/* Off-screen measurers: fixed so they never affect layout or get clipped */}
      <div
        aria-hidden
        className="fixed -left-[9999px] top-0 invisible pointer-events-none whitespace-nowrap"
      >
        <span ref={platformFullRef} className="inline-block text-xs font-semibold px-1.5">
          {FULL_LABEL_SAMPLE.platform}
        </span>
        <span ref={cliFullRef} className="inline-block text-xs font-semibold px-1.5">
          {FULL_LABEL_SAMPLE.cli}
        </span>
        <span ref={premiumFullRef} className="inline-block text-xs font-semibold px-1.5">
          {FULL_LABEL_SAMPLE.premium_models}
        </span>
        <span ref={shortLabelRef} className="inline-block text-xs font-semibold px-1.5">
          {SHORT_LABEL_SAMPLE}
        </span>
      </div>
    </div>
  )
}

export default UnifiedBudgetDragBar
