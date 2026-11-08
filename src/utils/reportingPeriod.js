export function getLatestAvailableMonth(periods) {
  const availablePeriods = [...new Set((Array.isArray(periods) ? periods : [])
    .filter((period) => /^\d{4}-\d{2}$/.test(period)))].sort();

  return availablePeriods.at(-1) || '';
}

export function getLatestCompletedMonth(periods, _referenceDate = new Date()) {
  return getLatestAvailableMonth(periods);
}

export function getPeriodsThroughSelection(periods, selectedPeriod) {
  const availablePeriods = [...new Set((Array.isArray(periods) ? periods : [])
    .filter((period) => /^\d{4}-\d{2}$/.test(period)))].sort();

  return selectedPeriod
    ? availablePeriods.filter((period) => period <= selectedPeriod)
    : availablePeriods;
}