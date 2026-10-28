export function isAdminProfile(userProfile) {
  const roles = [
    userProfile?.role,
    userProfile?.roles?.nameRole,
    ...(Array.isArray(userProfile?.roles) ? userProfile.roles.map((role) => role?.nameRole) : []),
  ];
  return roles.some((role) => /ADMIN|ADMINISTRATEUR/i.test(String(role ?? '')));
}

function flattenRecord(record, prefix = '', flattened = {}) {
  Object.entries(record ?? {}).forEach(([key, value]) => {
    const column = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      flattenRecord(value, column, flattened);
    } else if (value instanceof Date) {
      flattened[column] = value.toISOString();
    } else if (Array.isArray(value)) {
      flattened[column] = JSON.stringify(value);
    } else {
      flattened[column] = value;
    }
  });
  return flattened;
}

export function buildObjectRows(records) {
  const flattenedRecords = (records ?? []).map((record) => flattenRecord(record));
  const columns = [...new Set(flattenedRecords.flatMap((record) => Object.keys(record)))];
  return [columns, ...flattenedRecords.map((record) => columns.map((column) => record[column] ?? ''))];
}

export function buildExcelXml(rows, sheetName = 'Rapport') {
  const escapeXml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
  const title = escapeXml(sheetName.slice(0, 31));
  const worksheetRows = rows.map((row, rowIndex) => `<Row>${row.map((cell) => {
    const isNumber = typeof cell === 'number' && Number.isFinite(cell);
    return `<Cell${rowIndex === 0 ? ' ss:StyleID="Header"' : ''}><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(cell)}</Data></Cell>`;
  }).join('')}</Row>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="${title}"><Table>${worksheetRows}</Table></Worksheet></Workbook>`;
}

export function buildPrintableHtml(rows, title = 'Export') {
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const [headers = [], ...dataRows] = rows ?? [];
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyHtml = dataRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');

  const columnWidths = headers.map((header) => {
    const label = String(header).toLowerCase();
    if (label.includes('action proposée') || label.includes('commentaire')) return 22;
    if (label.includes('médecin')) return 16;
    if (label.includes('organisme') || label.includes('spécialité')) return 13;
    if (label.includes('commercial')) return 11;
    if (label.includes('qualification') || label.includes('urgence') || label.includes('décision')) return 9;
    return 8;
  });
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) || 1;
  const colgroup = columnWidths.map((width) => `<col style="width:${(width / totalWidth) * 100}%">`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0}h1{font-size:14pt;margin:0 0 8px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:7pt}th,td{border:1px solid #94a3b8;padding:3px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:normal}th{background:#e2e8f0;font-weight:700}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>${escapeHtml(title)}</h1><table><colgroup>${colgroup}</colgroup><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`;
}

export function printObjectRows(rows, title = 'Export') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(buildPrintableHtml(rows, title));
  printWindow.document.close();
  printWindow.onafterprint = () => printWindow.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

export function downloadExcelXml(rows, filename, sheetName = 'Rapport') {
  const blob = new Blob([`\uFEFF${buildExcelXml(rows, sheetName)}`], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
