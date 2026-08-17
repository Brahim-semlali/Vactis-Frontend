import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

function Sheet({ open, onOpenChange, children }) {
  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onOpenChange?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => onOpenChange?.(false)}
          />

          {children}
        </div>
      )}
    </AnimatePresence>
  );
}

const SheetContent = React.forwardRef(
  ({ className, children, onClose, side = 'right', ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={cn(
          'relative z-50 h-full w-full max-w-[560px] bg-white shadow-2xl flex flex-col border-l border-slate-200/90 overflow-hidden',
          className
        )}
        {...props}
      >
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">FICHE CONTEXTUELLE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 active:scale-95 shadow-2xs"
            aria-label="Fermer"
          >
            <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Inner Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
          {children}
        </div>
      </motion.div>
    );
  }
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 pb-3 border-b border-slate-100', className)} {...props} />
);

const SheetFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-slate-100 pt-4 mt-6', className)} {...props} />
);

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-xl font-black text-slate-900 tracking-tight leading-tight', className)} {...props} />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs font-medium text-slate-500', className)} {...props} />
));
SheetDescription.displayName = 'SheetDescription';

export { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
