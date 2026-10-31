import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, Search, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { exportExcelRows, getExcelImportFilters, getExcelImportRows, importExcelFile, validateExcelFile } from '../../api/excel.js';
import { publishImportedDatasetChanged } from '../../lib/importRefresh.js';

const DEFAULT_FILTERS = { year: '', month: '', search: '' };
const PAGE_SIZE = 50;

function formatAmount(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(numeric) + ' MAD';
}

export default function ImportExportExcelPage() {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [availableFilters, setAvailableFilters] = useState({ years: [], months: [] });

  const loadFilters = async () => {
    try {
      const data = await getExcelImportFilters(token);
      setAvailableFilters({ years: data.years ?? [], months: data.months ?? [] });
    } catch {
      setAvailableFilters({ years: [], months: [] });
    }
  };

  const loadRows = async (nextFilters = filters, requestedPage = page) => {
    if (!token) return;
    try {
      const data = await getExcelImportRows(token, { ...nextFilters, page: requestedPage, size: PAGE_SIZE });
      setRows(data.rows);
      setTotalRows(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message ?? 'Impossible de charger les données importées.');
    }
  };

  useEffect(() => {
    if (!token) return;
    loadFilters();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadRows(filters, page);
  }, [filters.year, filters.month, filters.search, page, token]);

  const updateFilter = (key, value) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const onFileSelected = async (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidation(null);
    setMessage('');
    setError('');

    if (!file) return;

    setLoading(true);
    try {
      const payload = await validateExcelFile(token, file);
      setValidation(payload);
      if (payload.status === 'READY') {
        setMessage('Le fichier est valide et prêt à être importé.');
      } else {
        setError(`Validation refusée : ${payload.errorRows ?? 0} ligne(s) à corriger.`);
      }
    } catch (err) {
      setError(err.message ?? 'Le fichier est invalide.');
    } finally {
      setLoading(false);
    }
  };

  const onImport = async () => {
    if (!selectedFile || validation?.status !== 'READY') {
      setError('Sélectionnez et validez un fichier Excel avant l’import.');
      return;
    }

    setImporting(true);
    setError('');
    setMessage('');
    try {
      const result = await importExcelFile(token, selectedFile);
      publishImportedDatasetChanged(result);
      setMessage(`Remplacement complet terminé : ${result.deletedRows ?? 0} anciens dossiers supprimés, ${result.importedRows ?? 0} lignes du fichier enregistrées (${result.periodFrom ?? '—'} au ${result.periodTo ?? '—'}).`);
      setValidation(null);
      setSelectedFile(null);
      setFilters(DEFAULT_FILTERS);
      setPage(0);
      await loadFilters();
      await loadRows(DEFAULT_FILTERS, 0);
    } catch (err) {
      setError(err.message ?? 'L’import a échoué.');
    } finally {
      setImporting(false);
      const input = document.getElementById('excel-import-file');
      if (input) input.value = '';
    }
  };

  const onExport = async () => {
    try {
      await exportExcelRows(token, filters);
      setMessage('Export Excel généré avec les filtres actuels.');
    } catch (err) {
      setError(err.message ?? 'L’export a échoué.');
    }
  };

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + Number(row.prixAPayer ?? row['Prix à payer'] ?? 0), 0), [rows]);

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-7 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Administration</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Importation et exportation Excel</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Importez des historiques Excel, vérifiez les données et exportez les données filtrées dans un nouveau classeur.</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-right">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Base active</span>
          <span className="mt-1 block text-xs font-semibold text-teal-900">{totalRows} lignes filtrées</span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <UploadCloud className="h-4 w-4 text-teal-700" />
            Import du fichier Excel
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-teal-400 hover:bg-teal-50/40">
            <FileSpreadsheet className="h-10 w-10 text-slate-400" />
            <div>
              <div className="text-sm font-bold text-slate-700">Choisir un fichier .xlsx ou .xls</div>
              <div className="mt-1 text-xs text-slate-500">Fichier de référence ou données mensuelles</div>
            </div>
            <input id="excel-import-file" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelected} />
          </label>

          {selectedFile && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Fichier sélectionné</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedFile || validation?.status !== 'READY' || loading || importing}
            onClick={onImport}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {importing ? 'Importation en cours...' : 'Importer le fichier'}
          </button>

          {loading && (
            <div className="mt-5">
              <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-teal-500" />
              </div>
              <p className="text-xs text-slate-500">Validation du fichier en cours...</p>
            </div>
          )}

          {!!message && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <span>{message}</span>
            </div>
          )}

          {!!error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {validation && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">Aperçu</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{validation.status}</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><dt className="font-semibold text-slate-500">Feuille</dt><dd>{validation.sheetName}</dd></div>
                <div><dt className="font-semibold text-slate-500">Lignes</dt><dd>{validation.totalRows}</dd></div>
                <div><dt className="font-semibold text-slate-500">Valides</dt><dd>{validation.validRows}</dd></div>
                <div><dt className="font-semibold text-slate-500">Erreurs</dt><dd>{validation.errorRows}</dd></div>
                <div className="col-span-2"><dt className="font-semibold text-slate-500">Période</dt><dd>{validation.fromDate ?? '—'} → {validation.toDate ?? '—'}</dd></div>
              </dl>
              {validation.issues?.length > 0 && (
                <ul className="mt-3 max-h-36 space-y-1 overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {validation.issues.slice(0, 100).map((issue, idx) => <li key={`${idx}-${issue}`}>{issue}</li>)}
                  {validation.issues.length > 100 && <li>... et {validation.issues.length - 100} autre(s) erreur(s).</li>}
                </ul>
              )}
              {validation.previewRows?.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-2 py-2">Médecin</th>
                        <th className="px-2 py-2">Spécialité</th>
                        <th className="px-2 py-2">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.previewRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-200">
                          <td className="px-2 py-2">{row['Médecin']}</td>
                          <td className="px-2 py-2">{row['Specialite']}</td>
                          <td className="px-2 py-2">{formatAmount(row['Prix à payer'])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)]">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Données importées</h2>
              <p className="text-sm text-slate-500">Consultez, filtrez et exportez les lignes enregistrées.</p>
            </div>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" /> Exporter vers Excel
            </button>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(160px,180px)_minmax(160px,180px)_minmax(0,1fr)]">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Année</span>
              <select value={filters.year} onChange={(event) => updateFilter('year', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                <option value="">Toutes</option>
                {(availableFilters.years ?? []).map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Mois</span>
              <select value={filters.month} onChange={(event) => updateFilter('month', event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                <option value="">Tous</option>
                {(availableFilters.months ?? []).map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Recherche</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Rechercher un médecin, lieu..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900"
                />
              </div>
            </label>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Lignes</div>
              <div className="mt-2 text-xl font-black text-slate-900">{totalRows}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Montant de la page</div>
              <div className="mt-2 text-xl font-black text-slate-900">{formatAmount(totalAmount)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Période</div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {(rows[0]?.dateReception ? new Date(rows[0].dateReception).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'Aucune donnée')}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Aucune donnée disponible pour le moment. Importez un fichier Excel pour alimenter cette vue.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[500px] overflow-auto">
                <table className="min-w-full table-auto border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-bold">Date</th>
                      <th className="px-3 py-2 font-bold">Médecin</th>
                      <th className="px-3 py-2 font-bold">Spécialité</th>
                      <th className="px-3 py-2 font-bold">Organisme</th>
                      <th className="px-3 py-2 font-bold">Montant</th>
                      <th className="px-3 py-2 font-bold">Urgent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={`${row.id ?? idx}-${row.dateReception ?? idx}`} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{row.dateReception ? new Date(row.dateReception).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{row.medecin?.nom ?? row.medecin ?? row['Médecin'] ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{row.typeAnalyse ?? row['Specialite'] ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{row.organisme ?? row['Organisme'] ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{formatAmount(row.prixAPayer ?? row['Prix à payer'])}</td>
                        <td className="px-3 py-2 text-slate-700">{row.urgent ? 'Oui' : 'Non'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-xs font-semibold text-slate-500">Page {page + 1} sur {totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  aria-label="Page précédente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  aria-label="Page suivante"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
