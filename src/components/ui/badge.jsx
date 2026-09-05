import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white hover:bg-primary-hover',
        secondary: 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100',
        outline: 'border border-slate-200 text-slate-700 bg-transparent dark:border-slate-700 dark:text-slate-200',
        // Segments
        'segment-a': 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-[#0f2e22] dark:text-[#6ee7b7] dark:border-[#195e42]',
        'segment-b': 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-[#10293d] dark:text-[#7dd3fc] dark:border-[#1d4f73]',
        'segment-c': 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-[#382508] dark:text-[#fde047] dark:border-[#6e470d]',
        'segment-d': 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#192736] dark:text-[#cbd5e1] dark:border-[#273d52]',
        // Statuts VACTIS
        actif: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-[#0f2e22] dark:text-[#6ee7b7] dark:border-[#195e42]',
        progression: 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-[#112e2c] dark:text-[#5eead4] dark:border-[#1b5b54]',
        surveillance: 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-[#382508] dark:text-[#fde047] dark:border-[#6e470d]',
        onboarding: 'bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-[#10293d] dark:text-[#7dd3fc] dark:border-[#1d4f73]',
        silence: 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-[#3b141e] dark:text-[#fca5b5] dark:border-[#7a2236]',
        urgent: 'bg-red-100 text-red-800 border border-red-200 dark:bg-[#3b1115] dark:text-[#fca5a5] dark:border-[#7a1d27]',
        muted: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#192736] dark:text-[#cbd5e1] dark:border-[#273d52]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div
      className={cn(badgeVariants({ variant }), variant ? `badge--${variant}` : '', className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
