import { describe, expect, it } from 'vitest';
import { buildExcelXml, buildObjectRows, buildPrintableHtml, isAdminProfile } from './adminExports.js';

describe('admin export helpers', () => {
  it('recognizes administrator roles from supported profile shapes', () => {
    expect(isAdminProfile({ role: 'ADMIN' })).toBe(true);
    expect(isAdminProfile({ roles: [{ nameRole: 'ADMINISTRATEUR' }] })).toBe(true);
    expect(isAdminProfile({ role: 'USER' })).toBe(false);
    expect(isAdminProfile(null)).toBe(false);
  });

  it('creates Excel SpreadsheetML and escapes cell content', () => {
    const xml = buildExcelXml([['Médecin', 'CA'], ['A < B', 1250]], 'Rapport');

    expect(xml).toContain('progid="Excel.Sheet"');
    expect(xml).toContain('ss:Name="Rapport"');
    expect(xml).toContain('A &lt; B');
    expect(xml).toContain('<Data ss:Type="Number">1250</Data>');
    expect(xml).toContain('<Data ss:Type="String">CA</Data>');
  });

  it('exports all top-level and nested API fields to both tabular formats', () => {
    const rows = buildObjectRows([
      { id: 1, commentaire: null, medecin: { nom: 'Mehdi', scoreRisque: 7.2414 } },
      { id: 2, dateVisite: '2026-10-25', medecin: { nom: 'Nora', scoreRisque: null } },
    ]);
    const [headers, firstRow, secondRow] = rows;
    const printable = buildPrintableHtml(rows, 'Actions');

    expect(headers).toEqual(['id', 'commentaire', 'medecin.nom', 'medecin.scoreRisque', 'dateVisite']);
    expect(firstRow).toEqual([1, '', 'Mehdi', 7.2414, '']);
    expect(secondRow).toEqual([2, '', 'Nora', '', '2026-10-25']);
    expect(printable).toContain('<th>medecin.scoreRisque</th>');
    expect(printable).toContain('<td>7.2414</td>');
    expect(printable).toContain('@page{size:A4 landscape;margin:8mm}');
    expect(printable).toContain('table-layout:fixed');
    expect(printable).toContain('display:table-header-group');
  });
});
