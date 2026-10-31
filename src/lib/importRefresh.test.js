// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IMPORTED_DATASET_CHANGED_EVENT, publishImportedDatasetChanged } from './importRefresh.js';

describe('publishImportedDatasetChanged', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches the import result to application listeners', () => {
    const listener = vi.fn();
    const result = { deletedRows: 100, importedRows: 250, periodFrom: '2025-01-01' };
    window.addEventListener(IMPORTED_DATASET_CHANGED_EVENT, listener);

    publishImportedDatasetChanged(result);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual(result);
    window.removeEventListener(IMPORTED_DATASET_CHANGED_EVENT, listener);
  });
});