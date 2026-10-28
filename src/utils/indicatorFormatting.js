export function formatNumber(value, maximumFractionDigits = 2) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const precision = Math.max(0, Math.min(20, maximumFractionDigits));
  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: Math.min(2, precision),
    maximumFractionDigits: precision,
  });
}

export function formatSignedPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const number = Number(value);
  const sign = number > 0 ? '+' : number < 0 ? '−' : '';
  return `${sign}${formatNumber(Math.abs(number))} %`;
}

export function formatPercent(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value)} %`;
}

export function formatMad(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value)} MAD`;
}
