import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conflict resolution.
 * Convention shadcn/ui — utilisé dans tous les composants UI.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
