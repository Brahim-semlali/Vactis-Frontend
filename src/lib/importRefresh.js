export const IMPORTED_DATASET_CHANGED_EVENT = 'vactis:imported-dataset-changed';

export function publishImportedDatasetChanged(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(IMPORTED_DATASET_CHANGED_EVENT, { detail }));
}