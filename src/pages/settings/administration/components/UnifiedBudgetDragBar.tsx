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

import {
  FC,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

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

type LabelVariant = 'full' | 'short' | 'none'

// Worst-case label text per category. If "Name 100%" fits unwrapped in the
// segment, every smaller percent fits (wrapped, with room to spare).
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

const formatPctLabel = (v: number): string => {
  const r = Math.round(v * 10) / 10
  return r === Math.round(r) ? `${Math.round(r)}%` : `${r.toFixed(1)}%`
}

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

  // Live segment widths, populated by a ResizeObserver on the colored bands.
  const platformBandRef = useRef<HTMLDivElement>(null)
  const cliBandRef = useRef<HTMLDivElement>(null)
  const premiumBandRef = useRef<HTMLDivElement>(null)
  const [segWidths, setSegWidths] = useState<Record<BudgetCategory, number>>({
    platform: 0,
    cli: 0,
    premium_models: 0,
  })

  // Intrinsic widths of label text, measured off-screen. Seeded with sensible
  // px estimates so labels render on first paint; refined live by
  // ResizeObserver so they self-correct when fonts load or theme changes.
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

  useLayoutEffect(() => {
    const bands: Array<[BudgetCategory, RefObject<HTMLDivElement | null>]> = [
      ['platform', platformBandRef],
      ['cli', cliBandRef],
      ['premium_models', premiumBandRef],
    ]
    // Initial synchronous measurement so the first paint already has correct
    // segment widths — ResizeObserver fires asynchronously and would leave a
    // blank-label frame otherwise.
    const initial: Record<BudgetCategory, number> = {
      platform: platformBandRef.current?.getBoundingClientRect().width ?? 0,
      cli: cliBandRef.current?.getBoundingClientRect().width ?? 0,
      premium_models: premiumBandRef.current?.getBoundingClientRect().width ?? 0,
    }
    setSegWidths(initial)
    const obs = new ResizeObserver((entries) => {
      setSegWidths((prev) => {
        let changed = false
        const next = { ...prev }
        for (const e of entries) {
          for (const [cat, ref] of bands) {
            if (e.target === ref.current) {
              const w = e.contentRect.width
              if (w !== next[cat]) {
                next[cat] = w
                changed = true
              }
            }
          }
        }
        return changed ? next : prev
      })
    })
    for (const [, ref] of bands) {
      if (ref.current) obs.observe(ref.current)
    }
    return () => obs.disconnect()
  }, [])

  useLayoutEffect(() => {
    const fullRefs: Array<[BudgetCategory, RefObject<HTMLSpanElement | null>]> = [
      ['platform', platformFullRef],
      ['cli', cliFullRef],
      ['premium_models', premiumFullRef],
    ]
    const initialFull: Record<BudgetCategory, number> = {
      platform: platformFullRef.current?.getBoundingClientRect().width ?? 78,
      cli: cliFullRef.current?.getBoundingClientRect().width ?? 50,
      premium_models: premiumFullRef.current?.getBoundingClientRect().width ?? 72,
    }
    const initialShort = shortLabelRef.current?.getBoundingClientRect().width ?? 28
    setFullLabelWidths(initialFull)
    setShortLabelWidth(initialShort)
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === shortLabelRef.current) {
          setShortLabelWidth((prev) => {
            const w = e.contentRect.width
            return w === prev ? prev : w
          })
          continue
        }
        for (const [cat, ref] of fullRefs) {
          if (e.target === ref.current) {
            setFullLabelWidths((prev) => {
              const w = e.contentRect.width
              return w === prev[cat] ? prev : { ...prev, [cat]: w }
            })
          }
        }
      }
    })
    for (const [, ref] of fullRefs) {
      if (ref.current) obs.observe(ref.current)
    }
    if (shortLabelRef.current) obs.observe(shortLabelRef.current)
    return () => obs.disconnect()
  }, [])

  const platformVariant = pickVariant(
    segWidths.platform,
    fullLabelWidths.platform,
    shortLabelWidth
  )
  const cliVariant = pickVariant(segWidths.cli, fullLabelWidths.cli, shortLabelWidth)
  const premiumVariant = pickVariant(
    segWidths.premium_models,
    fullLabelWidths.premium_models,
    shortLabelWidth
  )

  // h1 is the platform/cli boundary, h2 is the cli/premium boundary
  const h1Left = pcts.platform
  const h2Left = pcts.platform + pcts.cli

  const handleMouseDown = useCallback(
    (handle: 1 | 2) => (e: React.MouseEvent) => {
      e.preventDefault()
      lastMouseXRef.current = null
      lastTsRef.current = null
      lastSnapPctRef.current = null
      setDragging(handle)
      onDragStart?.()
    },
    [onDragStart]
  )

  // Keyboard control: arrow keys nudge by 1%, Shift+arrow by 5%, Home/End jump to bounds.
  const handleKeyDown = useCallback(
    (handle: 1 | 2) => (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1
      let delta = 0
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step
      else if (e.key === 'Home') delta = -100
      else if (e.key === 'End') delta = 100
      else return
      e.preventDefault()
      const { current } = pctsRef
      if (handle === 1) {
        const newPlatform = clamp(
          current.platform + delta,
          platformMinPct,
          100 - current.premium_models
        )
        const newCli = Math.max(0, 100 - newPlatform - current.premium_models)
        onChange({
          platform: newPlatform,
          cli: newCli,
          premium_models: current.premium_models,
        })
      } else {
        const boundary = clamp(current.platform + current.cli + delta, current.platform, 100)
        const newCli = Math.max(0, boundary - current.platform)
        const newPremium = Math.max(0, 100 - current.platform - newCli)
        onChange({
          platform: current.platform,
          cli: newCli,
          premium_models: newPremium,
        })
      }
    },
    [platformMinPct, onChange]
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const handle = draggingRef.current
      if (!handle) return
      const host = hostRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      const safeTotal = totalBudget > 0 ? totalBudget : 1
      const magneticPctStep = (pickMagneticDollarStep(safeTotal) / safeTotal) * 100
      const finePctStep = (pickFineDollarStep(safeTotal) / safeTotal) * 100
      const rawPctRaw = ((e.clientX - rect.left) / rect.width) * 100
      // Quantize to the fine-dollar grid so every slider position is a round
      // dollar amount. The magnetic snap (computeSnap) operates on top.
      const rawPct = Math.round(rawPctRaw / finePctStep) * finePctStep
      const ts = e.timeStamp
      const lastX = lastMouseXRef.current
      const lastTs = lastTsRef.current
      let velocityPctPerMs = 0
      if (lastX !== null && lastTs !== null && ts > lastTs) {
        velocityPctPerMs = (Math.abs(e.clientX - lastX) / rect.width) * 100 / (ts - lastTs)
      }
      lastMouseXRef.current = e.clientX
      lastTsRef.current = ts
      const snap = computeSnap(rawPct, velocityPctPerMs, lastSnapPctRef.current, magneticPctStep)
      lastSnapPctRef.current = snap.held
      const snappedPct = snap.pct
      const pct = clamp(snappedPct, 0, 100)
      const { current } = pctsRef

      if (handle === 1) {
        // Move platform/cli boundary; premium stays fixed
        const newPlatform = clamp(pct, platformMinPct, 100 - current.premium_models)
        const newCli = Math.max(0, 100 - newPlatform - current.premium_models)
        onChange({
          platform: newPlatform,
          cli: newCli,
          premium_models: current.premium_models,
        })
      } else {
        // Move cli/premium boundary; platform stays fixed
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

    const onUp = () => {
      if (draggingRef.current) {
        setDragging(0)
        onDragEnd?.()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [platformMinPct, totalBudget, onChange, onDragEnd])

  return (
    <div
      ref={hostRef}
      className={cn(
        'relative h-12 rounded-md select-none',
        'border border-border-structural overflow-hidden'
      )}
    >
      <div className="flex h-full">
        <div
          ref={platformBandRef}
          className="flex items-center justify-center bg-indigo-600 text-white overflow-hidden"
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
          className="flex items-center justify-center bg-sky-700 text-white overflow-hidden"
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
          className="flex items-center justify-center bg-violet-600 text-white overflow-hidden"
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

      {/* Off-screen measurers: provide truth-driven label widths for variant gating. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] top-0 invisible pointer-events-none whitespace-nowrap"
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

      <div
        data-handle="1"
        role="slider"
        tabIndex={0}
        aria-label="Platform vs CLI allocation"
        aria-valuemin={platformMinPct}
        aria-valuemax={100 - pcts.premium_models}
        aria-valuenow={Math.round(h1Left)}
        aria-valuetext={`${Math.round(h1Left)}%`}
        onMouseDown={handleMouseDown(1)}
        onKeyDown={handleKeyDown(1)}
        className={cn(
          'absolute top-0 h-full w-4 -translate-x-1/2 flex items-center justify-center cursor-col-resize z-10',
          dragging === 1 && 'z-20'
        )}
        style={{ left: `${h1Left}%` }}
      >
        <div className="w-1 h-7 rounded bg-text-primary shadow-md" />
      </div>

      <div
        data-handle="2"
        role="slider"
        tabIndex={0}
        aria-label="CLI vs Premium Models allocation"
        aria-valuemin={pcts.platform}
        aria-valuemax={100}
        aria-valuenow={Math.round(h2Left)}
        aria-valuetext={`${Math.round(h2Left)}%`}
        onMouseDown={handleMouseDown(2)}
        onKeyDown={handleKeyDown(2)}
        className={cn(
          'absolute top-0 h-full w-4 -translate-x-1/2 flex items-center justify-center cursor-col-resize z-10',
          dragging === 2 && 'z-20'
        )}
        style={{ left: `${h2Left}%` }}
      >
        <div className="w-1 h-7 rounded bg-text-primary shadow-md" />
      </div>
    </div>
  )
}

export default UnifiedBudgetDragBar
