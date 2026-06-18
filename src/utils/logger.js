const isDev = process.env.NODE_ENV !== 'production';

function formatArgs(args) {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return { message: arg.message, stack: isDev ? arg.stack : undefined };
    }
    return arg;
  });
}

export const logger = {
  info(...args) {
    console.info('[Vactis]', ...formatArgs(args));
  },
  warn(...args) {
    console.warn('[Vactis]', ...formatArgs(args));
  },
  error(...args) {
    console.error('[Vactis]', ...formatArgs(args));
  },
  debug(...args) {
    if (isDev) {
      console.debug('[Vactis]', ...formatArgs(args));
    }
  },
};

export function formatLockedUntil(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
