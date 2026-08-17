import { cn } from '../../lib/utils.js';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200/60', className)}
      {...props}
    />
  );
}

export { Skeleton };
