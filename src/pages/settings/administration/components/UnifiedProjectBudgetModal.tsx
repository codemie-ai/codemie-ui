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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select/Select'
import Textarea from '@/components/form/Textarea/Textarea'
import Popup from '@/components/Popup'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { BudgetCategory } from '@/types/entity/budget'
import { CategoryBudgetSpec, ProjectBudgetGroup } from '@/types/entity/projectBudgetGroup'
import toaster from '@/utils/toaster'

import BudgetCategoryTable from './BudgetCategoryTable'
import UnifiedBudgetDragBar, { PctMap } from './UnifiedBudgetDragBar'

const CATS: BudgetCategory[] = ['platform', 'cli', 'premium_models']

const DURATION_OPTIONS = [
  { label: 'Daily (1d)', value: '1d' },
  { label: 'Weekly (7d)', value: '7d' },
  { label: 'Monthly (30d)', value: '30d' },
]

const DEFAULT_PCTS: PctMap = { platform: 30, cli: 60, premium_models: 10 }
const ZERO_PCTS: PctMap = { platform: 0, cli: 0, premium_models: 0 }
const PLATFORM_MIN_PCT = 1

const roundToStep = (v: number, step: number) => Math.round(v / step) * step
const pickSoftStep = (v: number): number => {
  if (v >= 1000) return 10
  if (v >= 100) return 5
  return 1
}

interface FormValues {
  name: string
  budget_duration: string
  total_budget: number
  description: string
}

const schema = Yup.object({
  name: Yup.string().trim().required('Name is required').max(100),
  budget_duration: Yup.string().required('Duration is required'),
  total_budget: Yup.number()
    .typeError('Must be a number')
    .positive('Must be greater than 0')
    .required('Total budget is required'),
  description: Yup.string().trim().required('Description is required'),
})

export interface UnifiedProjectBudgetModalProps {
  visible: boolean
  onHide: () => void
  projectName: string
  onSaved?: () => void
  forceCreate?: boolean
}

const UnifiedProjectBudgetModal: FC<UnifiedProjectBudgetModalProps> = ({
  visible,
  onHide,
  projectName,
  onSaved,
  forceCreate = false,
}) => {
  const [pcts, setPcts] = useState<PctMap>({ ...DEFAULT_PCTS })
  const [softs, setSofts] = useState<PctMap>({ ...ZERO_PCTS })
  const [existingGroup, setExistingGroup] = useState<ProjectBudgetGroup | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Snapshot of soft/hard amounts captured at the start of an interaction
  // (drag, typed change, button press) so soft scaling stays exact.
  const interactionInitRef = useRef<{ softs: PctMap; hards: PctMap } | null>(null)

  // Track previous hard amounts so any change to a category's hard (drag,
  // direct typing, or cascade from another typed category) can be detected
  // and used as the denominator for soft scaling.
  const prevHardsRef = useRef<PctMap>({ ...ZERO_PCTS })

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { name: '', budget_duration: '30d', total_budget: 1000, description: '' },
  })

  const totalBudget = Number(watch('total_budget')) || 0

  const hardVals = useMemo<PctMap>(() => {
    const result = { ...ZERO_PCTS }
    CATS.forEach((cat) => {
      result[cat] = (totalBudget * pcts[cat]) / 100
    })
    return result
  }, [totalBudget, pcts])

  const platformPctError = pcts.platform <= 0

  const softErrors = useMemo<Record<BudgetCategory, boolean>>(
    () => ({
      platform: softs.platform > Math.round(hardVals.platform),
      cli: softs.cli > Math.round(hardVals.cli),
      premium_models: softs.premium_models > Math.round(hardVals.premium_models),
    }),
    [softs, hardVals]
  )

  const hasSoftError = Object.values(softErrors).some(Boolean)

  const sumPctError =
    Math.abs(round2(pcts.platform) + round2(pcts.cli) + round2(pcts.premium_models) - 100) > 0.5

  const populateFromGroup = useCallback(
    (plan: ProjectBudgetGroup) => {
      const total = plan.total_amount ?? 0
      const nextPcts: PctMap = { ...ZERO_PCTS }
      const nextSofts: PctMap = { ...ZERO_PCTS }
      const nextHards: PctMap = { ...ZERO_PCTS }
      plan.categories.forEach((c) => {
        const cat = c.category
        if (cat === 'platform' || cat === 'cli' || cat === 'premium_models') {
          nextPcts[cat] = total > 0 ? (c.max_budget / total) * 100 : 0
          nextSofts[cat] = c.soft_budget
          nextHards[cat] = c.max_budget
        }
      })
      // Normalize for rounding
      const sum = CATS.reduce((s, c) => s + nextPcts[c], 0)
      if (sum > 0 && Math.abs(sum - 100) > 0.01) {
        CATS.forEach((c) => {
          nextPcts[c] = (nextPcts[c] / sum) * 100
        })
      }
      // Pre-set prevHardsRef to the loaded hards. The [totalBudget, pcts]
      // effect about to fire (because we're queueing setPcts) will see
      // nextHards == prevHardsRef.current per category, so the no-op guard
      // fires and the loaded softs are not spuriously rescaled. Without this,
      // prevHardsRef would still hold the DEFAULT_PCTS-derived hards from
      // the initial useEffect, producing a diff and silently corrupting the
      // displayed softs (and the next Update payload).
      prevHardsRef.current = nextHards
      setPcts(nextPcts)
      setSofts(nextSofts)
      reset({
        name: plan.name ?? '',
        budget_duration: plan.budget_duration ?? '30d',
        total_budget: total ?? 1000,
        description: plan.description ?? '',
      })
      setExistingGroup(plan)
    },
    [reset]
  )

  useEffect(() => {
    if (!visible) return
    setPcts({ ...DEFAULT_PCTS })
    setSofts({ ...ZERO_PCTS })
    setExistingGroup(null)
    reset({ name: '', budget_duration: '30d', total_budget: 1000, description: '' })
    if (!projectName || forceCreate) return
    projectBudgetsStore
      .listProjectBudgetGroups(projectName)
      .then((plans) => {
        const active = plans.find((p) => !p.deleted_at) ?? plans[0]
        if (!active) return null
        // The list endpoint returns a minimal payload (total_amount: 0, categories: []).
        // Fetch the full plan to get categories and total_amount populated.
        return projectBudgetsStore.getProjectBudgetGroup(active.group_id)
      })
      .then((plan) => {
        if (plan) populateFromGroup(plan)
      })
      .catch(() => {
        /* error already toasted by store */
      })
  }, [visible, projectName, forceCreate, populateFromGroup, reset])

  useEffect(() => {
    const nextHards: PctMap = {
      platform: (totalBudget * pcts.platform) / 100,
      cli: (totalBudget * pcts.cli) / 100,
      premium_models: (totalBudget * pcts.premium_models) / 100,
    }
    const init = interactionInitRef.current
    // CRITICAL: snapshot prevHardsRef BEFORE setSofts. The setSofts callback
    // runs asynchronously when React processes it; by that time the assignment
    // `prevHardsRef.current = nextHards` below has already overwritten the
    // ref, making `prevHardsRef.current[cat] === nextHards[cat]` and silently
    // killing the prev-based soft scaling (the no-op guard would always fire).
    const prevHardsSnapshot = { ...prevHardsRef.current }
    setSofts((prev) => {
      const next = { ...prev }
      CATS.forEach((cat) => {
        // init-branch: sustained interaction (drag, Total typing) uses the
        // snapshot captured at interaction start as the stable reference.
        // prev-branch: discrete events use the value from the prior render.
        const softRef = init ? init.softs[cat] : prev[cat]
        const hardRef = init ? init.hards[cat] : prevHardsSnapshot[cat]
        if (softRef <= 0 || hardRef <= 0) return
        // No-op guard: if this cat's hard didn't change, don't touch its soft.
        // Prevents ghost-value resurgence after the user types 0.
        if (Math.abs(nextHards[cat] - hardRef) < 0.01) return
        const raw = (softRef * nextHards[cat]) / hardRef
        const step = pickSoftStep(raw)
        const rounded = roundToStep(raw, step)
        next[cat] = Math.max(0, Math.min(rounded, Math.round(nextHards[cat])))
      })
      return next
    })
    prevHardsRef.current = nextHards
  }, [totalBudget, pcts])

  const captureInteractionStart = useCallback(() => {
    if (interactionInitRef.current) return
    interactionInitRef.current = {
      softs: { ...softs },
      hards: { ...prevHardsRef.current },
    }
  }, [softs])

  const releaseInteraction = useCallback(() => {
    interactionInitRef.current = null
  }, [])

  const onSliderChange = useCallback((next: PctMap) => {
    setPcts(next)
  }, [])

  const onHardInputChange = useCallback(
    (cat: BudgetCategory, val: number) => {
      if (totalBudget <= 0) return
      const requestedPct = (val / totalBudget) * 100
      // Cascade: editing one Hard adjusts CLI for Platform/Premium edits,
      // adjusts Premium for CLI edits — matches the v3-mockup intent.
      // Soft scaling is handled by the [totalBudget, pcts] effect, which
      // applies the proportional rule to every cat whose hard changes —
      // including cascade-affected peers, not just the typed cat.
      setPcts((prev) => {
        const next = { ...prev }
        if (cat === 'platform') {
          next.platform = round2(clamp(requestedPct, PLATFORM_MIN_PCT, 100 - prev.premium_models))
          next.cli = round2(Math.max(0, 100 - next.platform - prev.premium_models))
        } else if (cat === 'cli') {
          next.cli = round2(clamp(requestedPct, 0, 100 - prev.platform))
          next.premium_models = round2(Math.max(0, 100 - prev.platform - next.cli))
        } else {
          next.premium_models = round2(clamp(requestedPct, 0, 100 - prev.platform))
          next.cli = round2(Math.max(0, 100 - prev.platform - next.premium_models))
        }
        return next
      })
    },
    [totalBudget]
  )

  const onSoftInputChange = useCallback((cat: BudgetCategory, val: number) => {
    setSofts((prev) => ({ ...prev, [cat]: Math.max(0, val) }))
  }, [])

  const handleDefaultDistribution = useCallback(() => {
    // Reset distribution only; softs stay as the user typed them. We avoid
    // touching interactionInitRef so the [totalBudget, pcts] effect won't
    // rescale softs based on a stale snapshot.
    setPcts({ ...DEFAULT_PCTS })
  }, [])

  const onFormSubmit: SubmitHandler<FormValues> = async (data) => {
    if (hasSoftError || sumPctError) return
    setSubmitting(true)
    try {
      const categories: Record<BudgetCategory, CategoryBudgetSpec> = {
        platform: { pct: round2(pcts.platform), soft_budget: Math.round(softs.platform) },
        cli: { pct: round2(pcts.cli), soft_budget: Math.round(softs.cli) },
        premium_models: {
          pct: round2(pcts.premium_models),
          soft_budget: Math.round(softs.premium_models),
        },
      }

      if (existingGroup) {
        await projectBudgetsStore.updateProjectBudgetGroup(existingGroup.group_id, {
          name: data.name,
          total_amount: data.total_budget,
          budget_duration: data.budget_duration,
          description: data.description,
          categories,
        })
        toaster.info('Project budget saved')
      } else {
        await projectBudgetsStore.createProjectBudgetGroup({
          project_name: projectName,
          name: data.name,
          total_amount: data.total_budget,
          budget_duration: data.budget_duration,
          description: data.description,
          categories,
        })
        toaster.info('Project budget created')
      }
      onSaved?.()
      onHide()
    } catch {
      /* error already toasted */
    } finally {
      setSubmitting(false)
    }
  }

  // Track sustained interactions tied to typing in the total budget field
  const onTotalFocus = useCallback(() => captureInteractionStart(), [captureInteractionStart])
  const onTotalBlur = useCallback(() => releaseInteraction(), [releaseInteraction])

  const headerContent = (
    <h4 className="text-base font-semibold m-0">
      {existingGroup ? 'Update Budget' : 'Create Budget'}
    </h4>
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      headerContent={headerContent}
      onSubmit={handleSubmit(onFormSubmit)}
      submitText={existingGroup ? 'Update Budget' : 'Create Budget'}
      submitDisabled={submitting || hasSoftError || platformPctError || sumPctError}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="name"
                label="Name"
                required
                placeholder="Budget name"
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            name="budget_duration"
            control={control}
            render={({ field }) => (
              <Select
                id="budget_duration"
                label="Reset Period"
                required
                value={field.value}
                options={DURATION_OPTIONS}
                onChangeValue={(value) => field.onChange(value)}
                error={errors.budget_duration?.message}
              />
            )}
          />
        </div>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="description"
              label="Description"
              required
              placeholder="What this budget is used for"
              error={errors.description?.message}
              rows={3}
            />
          )}
        />

        <Controller
          name="total_budget"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="total_budget"
              label="Total Budget ($)"
              required
              type="number"
              min="0"
              step="any"
              onFocus={onTotalFocus}
              onBlur={() => {
                field.onBlur()
                onTotalBlur()
              }}
              error={errors.total_budget?.message}
            />
          )}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-quaternary uppercase tracking-wide">
              Distribution
            </span>
            <Button type="secondary" onClick={handleDefaultDistribution}>
              Reset to Default
            </Button>
          </div>
          <UnifiedBudgetDragBar
            pcts={pcts}
            totalBudget={totalBudget}
            platformMinPct={PLATFORM_MIN_PCT}
            onChange={onSliderChange}
            onDragStart={captureInteractionStart}
            onDragEnd={releaseInteraction}
          />
          {platformPctError && (
            <p className="text-xs text-failed-secondary mt-2">
              Platform allocation must be greater than 0%
            </p>
          )}
          {sumPctError && (
            <p className="text-xs text-failed-secondary mt-2">
              Distribution must sum to 100% (currently{' '}
              {Math.round(pcts.platform + pcts.cli + pcts.premium_models)}%)
            </p>
          )}
        </div>

        <BudgetCategoryTable
          hardVals={hardVals}
          softs={softs}
          softErrors={softErrors}
          onHardInputChange={onHardInputChange}
          onSoftInputChange={onSoftInputChange}
        />
      </form>
    </Popup>
  )
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

export default UnifiedProjectBudgetModal
