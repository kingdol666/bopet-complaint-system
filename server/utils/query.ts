import { z } from 'zod'

export const booleanQueryParam = z.preprocess((value) => {
  const normalized = Array.isArray(value) ? value[0] : value

  if (normalized === undefined || normalized === null || normalized === '') {
    return undefined
  }

  if (typeof normalized === 'boolean') {
    return normalized
  }

  if (typeof normalized === 'string') {
    const lowerValue = normalized.toLowerCase()

    if (lowerValue === 'true' || lowerValue === '1') {
      return true
    }

    if (lowerValue === 'false' || lowerValue === '0') {
      return false
    }
  }

  return normalized
}, z.boolean().optional())
