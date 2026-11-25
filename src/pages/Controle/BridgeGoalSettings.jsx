import { useEffect, useState } from 'react';
import { getSettings, updateBridgeGoalTarget } from '../../api/settings.js';
import { getMoisDisponibles } from '../../api/activite.js';
import { getBridgeGoalMonthlyTarget, saveBridgeGoalMonthlyTarget } from '../../api/vactis.js';
import { getLatestCompletedMonth } from '../../utils/reportingPeriod.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Card } from '../../components/ui/card.jsx';

const FIELD_CLASS =
  'h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';
const LABEL_CLASS = 'grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500';

const formatMad = (value) => `${Number(value || 0).toLocaleString('fr-FR')} MAD`;

/**
 * Réglage des objectifs Bridge to Goal (annuel + mensuel), affiché dans la table Contrôle.
 * Objectif annuel : PUT /api/admin/settings/bridge-goal-target ; mensuel : /api/bridge-to-goal/target.
 */
export default function BridgeGoalSettings() {
  const { token } = useAuth();

  // Objectif annuel
  const [loading, setLoading] = useState(true);
  const [annualMethod, setAnnualMethod] = useState('DIRECT');
  const [annualInput, setAnnualInput] = useState('');
  const [annualTarget, setAnnualTarget] = useState(0);
  const [referenceRevenue, setReferenceRevenue] = useState(0);
  const [annualSaving, setAnnualSaving] = useState(false);
  const [annualMessage, setAnnualMessage] = useState('');
  const [annualError, setAnnualError] = useState('');

  // Objectif mensuel
  const [monthlyPeriods, setMonthlyPeriods] = useState([]);
  const [monthlyPeriod, setMonthlyPeriod] = useState('');
  const [monthlyMethod, setMonthlyMethod] = useState('DIRECT');
  const [monthlyValue, setMonthlyValue] = useState('');
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0);
  const [monthlySaving, setMonthlySaving] = useState(false);
  const [monthlyMessage, setMonthlyMessage] = useState('');
  const [monthlyError, setMonthlyError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSettings(token)
      .then((settings) => {
        if (cancelled) return;
        setAnnualMethod(settings.bridgeGoalMethod ?? 'DIRECT');
        setAnnualInput(String(settings.bridgeGoalInputValue ?? settings.bridgeGoalTarget ?? ''));
        setAnnualTarget(Number(settings.bridgeGoalTarget ?? 0));
        setReferenceRevenue(Number(settings.bridgeGoalReferenceRevenue ?? 0));
      })
      .catch((err) => !cancelled && setAnnualError(err.message ?? 'Impossible de charger l’objectif annuel.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const currentPeriod = new Date().toISOString().slice(0, 7);
    getMoisDisponibles(token)
      .then((periods) => {
        if (cancelled) return;
        const availablePeriods = Array.isArray(periods) ? periods : [];
        setMonthlyPeriods([...new Set([...availablePeriods, currentPeriod])].sort());
        setMonthlyPeriod((selected) =>
          selected && availablePeriods.includes(selected)
            ? selected
            : getLatestCompletedMonth(availablePeriods) || currentPeriod,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMonthlyPeriods([currentPeriod]);
        setMonthlyPeriod((selected) => selected || currentPeriod);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!monthlyPeriod) return undefined;
    let cancelled = false;
    getBridgeGoalMonthlyTarget(token, monthlyPeriod)
      .then((target) => {
        if (cancelled) return;
        setMonthlyMethod(target?.method ?? 'DIRECT');
        setMonthlyValue(
          target?.value == null
            ? String(target?.targetAmount ?? Math.round(annualTarget / 12))
            : String(target.value),
        );
        setPreviousMonthRevenue(Number(target?.previousMonthRevenue ?? 0));
        setMonthlyMessage('');
        setMonthlyError('');
      })
      .catch((err) => {
        if (!cancelled) setMonthlyError(err.message ?? 'Impossible de charger l’objectif mensuel.');
      });
    return () => {
      cancelled = true;
    };
  }, [annualTarget, monthlyPeriod, token]);

  const annualInputValue = Number(annualInput);
  const annualPreview =
    annualMethod === 'PERCENTAGE'
      ? Math.round(referenceRevenue * (1 + (annualInputValue || 0) / 100))
      : Math.round(annualInputValue || 0);
  const monthlyInputValue = Number(monthlyValue);
  const monthlyGoalPreview =
    monthlyMethod === 'PERCENTAGE'
      ? Math.round(previousMonthRevenue * (1 + (monthlyInputValue || 0) / 100))
      : Math.round(monthlyInputValue || 0);

  const handleSaveAnnual = async (event) => {
    event.preventDefault();
    setAnnualError('');
    setAnnualMessage('');
    if (
      annualInput === '' ||
      !Number.isFinite(annualInputValue) ||
      annualInputValue < 0 ||
      (annualMethod === 'DIRECT' && annualInputValue <= 0) ||
      (annualMethod === 'PERCENTAGE' && referenceRevenue <= 0) ||
      annualPreview <= 0
    ) {
      setAnnualError('L’objectif direct doit être positif ; le mode pourcentage nécessite un CA antérieur positif.');
      return;
    }
    if (!window.confirm('Ce nouvel objectif annuel s’appliquera à tous les utilisateurs. Confirmer ?')) return;

    setAnnualSaving(true);
    try {
      const savedTarget = await updateBridgeGoalTarget(token, annualInputValue, annualMethod);
      const saved = Number(savedTarget ?? annualPreview);
      setAnnualTarget(saved);
      setAnnualMessage(`Objectif annuel enregistré : ${formatMad(saved)}. Il est maintenant actif dans Bridge to Goal.`);
    } catch (err) {
      setAnnualError(err.message ?? 'Impossible d’enregistrer l’objectif annuel.');
    } finally {
      setAnnualSaving(false);
    }
  };

  const handleSaveMonthlyTarget = async () => {
    setMonthlyError('');
    setMonthlyMessage('');
    if (
      !monthlyPeriod ||
      !Number.isFinite(monthlyInputValue) ||
      (monthlyMethod === 'DIRECT' && monthlyInputValue <= 0) ||
      (monthlyMethod === 'PERCENTAGE' && (monthlyInputValue < 0 || previousMonthRevenue <= 0)) ||
      monthlyGoalPreview <= 0
    ) {
      setMonthlyError(
        'Saisissez un objectif mensuel positif. Le mode pourcentage nécessite un CA positif le mois précédent.',
      );
      return;
    }

    setMonthlySaving(true);
    try {
      const saved = await saveBridgeGoalMonthlyTarget(token, {
        mois: monthlyPeriod,
        method: monthlyMethod,
        value: monthlyInputValue,
      });
      setMonthlyValue(String(saved.value));
      setPreviousMonthRevenue(Number(saved.previousMonthRevenue ?? 0));
      setMonthlyMessage(
        `Objectif de ${monthlyPeriod} enregistré : ${Number(saved.targetAmount ?? monthlyGoalPreview).toLocaleString('fr-FR')} MAD.`,
      );
    } catch (err) {
      setMonthlyError(err.message ?? 'Impossible d’enregistrer l’objectif mensuel.');
    } finally {
      setMonthlySaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Objectif annuel */}
      <Card className="p-5 bg-white border border-slate-200 shadow-xs">
        <form onSubmit={handleSaveAnnual} className="grid gap-4" aria-label="Objectif annuel Bridge to Goal">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Objectif annuel</h3>
            <p className="text-xs text-slate-500">
              Objectif de CA de l’année, en montant direct ou en augmentation du CA réel de l’année précédente.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Chargement de l’objectif…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(15rem,1fr)]">
                <label className={LABEL_CLASS}>
                  <span>Méthode de définition</span>
                  <select
                    aria-label="Méthode de définition de l’objectif annuel"
                    value={annualMethod}
                    onChange={(event) => {
                      setAnnualMethod(event.target.value);
                      setAnnualInput('');
                    }}
                    className={FIELD_CLASS}
                  >
                    <option value="DIRECT">Montant direct</option>
                    <option value="PERCENTAGE">Augmentation par pourcentage</option>
                  </select>
                </label>
                <label className={LABEL_CLASS}>
                  <span>{annualMethod === 'DIRECT' ? 'Objectif annuel en MAD' : 'Pourcentage d’augmentation annuel'}</span>
                  <input
                    aria-label={annualMethod === 'DIRECT' ? 'Objectif annuel en MAD' : 'Pourcentage annuel'}
                    type="number"
                    min={annualMethod === 'DIRECT' ? '1' : '0'}
                    step={annualMethod === 'DIRECT' ? '1000' : '0.1'}
                    value={annualInput}
                    required
                    onChange={(event) => setAnnualInput(event.target.value)}
                    className={FIELD_CLASS}
                  />
                </label>
              </div>

              <div role="status" className="rounded-lg border border-teal-100 bg-teal-50/40 px-4 py-3 text-sm text-slate-700">
                {annualMethod === 'PERCENTAGE'
                  ? `CA réel de l’année précédente : ${formatMad(referenceRevenue)} · objectif annuel calculé : ${formatMad(annualPreview)}`
                  : `Objectif annuel : ${formatMad(annualPreview)}`}
              </div>
              <p className="text-xs text-slate-500">
                Objectif mensuel de référence : {formatMad(Math.round(annualPreview / 12))} (objectif annuel ÷ 12). Un
                objectif spécifique peut être défini pour chaque mois ci-dessous.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={annualSaving}
                  className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
                >
                  {annualSaving ? 'Enregistrement…' : 'Enregistrer l’objectif annuel'}
                </button>
                {annualMessage && <p role="status" className="text-sm text-emerald-700">{annualMessage}</p>}
              </div>
            </>
          )}
          {annualError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{annualError}</p>}
        </form>
      </Card>

      {/* Objectif mensuel */}
      <Card className="p-5 bg-white border border-slate-200 shadow-xs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="font-bold text-slate-900 text-base">Objectif mensuel</h3>
            <p className="text-xs text-slate-500">Remplace le prorata annuel ÷ 12 pour le mois choisi.</p>
          </div>
          <label className={LABEL_CLASS}>
            <span>Mois concerné</span>
            <select
              aria-label="Mois de l’objectif mensuel"
              value={monthlyPeriod}
              onChange={(event) => setMonthlyPeriod(event.target.value)}
              className={FIELD_CLASS}
            >
              {monthlyPeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLASS}>
            <span>Méthode de définition mensuelle</span>
            <select
              aria-label="Méthode de définition mensuelle"
              value={monthlyMethod}
              onChange={(event) => setMonthlyMethod(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="DIRECT">Montant direct</option>
              <option value="PERCENTAGE">Augmentation par pourcentage</option>
            </select>
          </label>
          <label className={`${LABEL_CLASS} sm:col-span-2`}>
            <span>{monthlyMethod === 'DIRECT' ? 'Objectif du mois en MAD' : 'Pourcentage d’augmentation mensuel'}</span>
            <input
              aria-label={monthlyMethod === 'DIRECT' ? 'Objectif du mois en MAD' : 'Pourcentage mensuel'}
              type="number"
              min={monthlyMethod === 'DIRECT' ? '1' : '0'}
              step={monthlyMethod === 'DIRECT' ? '1' : '0.1'}
              value={monthlyValue}
              onChange={(event) => setMonthlyValue(event.target.value)}
              placeholder={monthlyMethod === 'DIRECT' ? 'Objectif MAD' : 'Augmentation %'}
              className={FIELD_CLASS}
            />
          </label>
          <div role="status" className="rounded-lg border border-teal-100 bg-teal-50/40 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
            {monthlyMethod === 'PERCENTAGE'
              ? `CA du mois précédent : ${formatMad(previousMonthRevenue)} · objectif calculé : ${formatMad(monthlyGoalPreview)}`
              : `Objectif du mois ${monthlyPeriod || 'sélectionné'} : ${formatMad(monthlyGoalPreview)}`}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={handleSaveMonthlyTarget}
              disabled={monthlySaving || !monthlyPeriod}
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {monthlySaving ? 'Enregistrement…' : 'Enregistrer l’objectif mensuel'}
            </button>
            {monthlyMessage && <p role="status" className="text-sm text-emerald-700">{monthlyMessage}</p>}
            {monthlyError && <p role="alert" className="text-sm text-rose-700">{monthlyError}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
