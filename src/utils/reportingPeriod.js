export function getLatestCompletedMonth(periods, referenceDate = new Date()) {
  const currentPeriod = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  const availablePeriods = [...new Set((Array.isArray(periods) ? periods : [])
    .filter((period) => /^\d{4}-\d{2}$/.test(period)))].sort();
  const completedPeriods = availablePeriods.filter((period) => period < currentPeriod);

  return completedPeriods.at(-1) || availablePeriods.at(-1) || '';
}

export function getPeriodsThroughSelection(periods, selectedPeriod) {
  const availablePeriods = [...new Set((Array.isArray(periods) ? periods : [])
    .filter((period) => /^\d{4}-\d{2}$/.test(period)))].sort();

  return selectedPeriod
    ? availablePeriods.filter((period) => period <= selectedPeriod)
    : availablePeriods;
}