import { getTailwindColor } from '@/utils/tailwindColors'

export const calculatePercentage = (current: number, limit: number): number => {
  if (Number.isNaN(current) || Number.isNaN(limit) || limit === 0) return 0
  return Math.min((current / limit) * 100, 100)
}

export const getStatusColor = (
  percentage: number,
  dangerThreshold: number,
  warningThreshold: number
): string => {
  if (percentage > dangerThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-red')
  }
  if (percentage > warningThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-yellow')
  }
  return getTailwindColor('--colors-surface-specific-charts-green')
}

export const getStatusColorWithOpacity = (
  percentage: number,
  dangerThreshold: number,
  warningThreshold: number
): string => {
  if (percentage > dangerThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-red', undefined, 0.2)
  }
  if (percentage > warningThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-yellow', undefined, 0.2)
  }
  return getTailwindColor('--colors-surface-specific-charts-green', undefined, 0.2)
}
