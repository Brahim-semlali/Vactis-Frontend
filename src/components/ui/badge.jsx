import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white hover:bg-primary-hover',
        secondary: 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200',
        outline: 'border border-slate-200 text-slate-700 bg-transparent',
        // Segments
        'segment-a': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        'segment-b': 'bg-blue-100 text-blue-800 border border-blue-200',
        'segment-c': 'bg-amber-100 text-amber-800 border border-amber-200',
        'segment-d': 'bg-slate-100 text-slate-700 border border-slate-200',
        // Statuts VACTIS
        actif: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        progression: 'bg-teal-50 text-teal-700 border border-teal-200/60',
        surveillance: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        onboarding: 'bg-sky-50 text-sky-700 border border-sky-200/60',
        silence: 'bg-rose-50 text-rose-700 border border-rose-200/60',
        urgent: 'bg-red-100 text-red-800 border border-red-200',
        muted: 'bg-slate-100 text-slate-600 border border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
