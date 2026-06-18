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
    console.info('[StageLabo]', ...formatArgs(args));
  },
  warn(...args) {
    console.warn('[StageLabo]', ...formatArgs(args));
  },
  error(...args) {
    console.error('[StageLabo]', ...formatArgs(args));
  },
  debug(...args) {
    if (isDev) {
      console.debug('[StageLabo]', ...formatArgs(args));
    }
  },
};

export function formatLockedUntil(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
