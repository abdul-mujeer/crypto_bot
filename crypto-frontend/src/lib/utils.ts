import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  } else if (price >= 0.01) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  } else if (price >= 0.0001) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 10 })
  }
}
