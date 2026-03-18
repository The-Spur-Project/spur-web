import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes; later args override earlier (tailwind-merge). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
