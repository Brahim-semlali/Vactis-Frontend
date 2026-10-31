import { API_BASE } from './config.js';

export async function validateExcelFile(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/admin/excel/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? 'Le fichier Excel est invalide.');
  }
  return payload;
}

export async function importExcelFile(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/admin/excel/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? 'L’import Excel a échoué.');
  }
  return payload;
}

export async function getExcelImportRows(token, params = {}) {
  const query = new URLSearchParams();
  if (params.year != null && params.year !== '') query.set('year', String(params.year));
  if (params.month != null && params.month !== '') query.set('month', String(params.month));
  if (params.search) query.set('search', params.search);
  if (params.page != null) query.set('page', String(params.page));
  if (params.size != null) query.set('size', String(params.size));

  const response = await fetch(`${API_BASE}/api/admin/excel/rows?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? 'Impossible de charger les données importées.');
  }
  return {
    rows: Array.isArray(payload?.content) ? payload.content : Array.isArray(payload) ? payload : [],
    totalElements: Number(payload?.totalElements ?? payload?.length ?? 0),
    totalPages: Number(payload?.totalPages ?? 1),
    page: Number(payload?.number ?? 0),
  };
}

export async function getExcelImportFilters(token) {
  const response = await fetch(`${API_BASE}/api/admin/excel/filters`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({ years: [], months: [] }));
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? 'Impossible de charger les filtres.');
  }
  return payload;
}

export async function exportExcelRows(token, params = {}) {
  const query = new URLSearchParams();
  if (params.year != null && params.year !== '') query.set('year', String(params.year));
  if (params.month != null && params.month !== '') query.set('month', String(params.month));
  if (params.search) query.set('search', params.search);

  const response = await fetch(`${API_BASE}/api/admin/excel/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message ?? payload?.error ?? 'L’export Excel a échoué.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'Vactis_Export.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
