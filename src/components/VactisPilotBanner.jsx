import React from 'react';
import { API_BASE } from '../api/config.js';

export default function VactisPilotBanner({ profil = "Laboratoire d'anatomopathologie — CA et cas" }) {
  const cleanApiUrl = API_BASE ? API_BASE.replace(/^https?:\/\//, '') : '127.0.0.1:8082';

  return (
    <div className="mb-6 space-y-3 font-sans">
      {/* Barre supérieure : Identité du pilote & Statut API */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="tracking-wide">VACTIS PILOT-AMANA — LABORATOIRE ANAPAT AMANA</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] tracking-wider uppercase border border-slate-200 dark:border-slate-700">
            Produit local
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>API PRÊTE</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>{cleanApiUrl}</span>
          </div>
          <span className="p-1 rounded-full text-amber-500 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800" title="Synchronisation active">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Bandeau profil actif */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-50/70 via-sky-50/50 to-indigo-50/40 dark:from-slate-900/60 dark:to-slate-850/60 border border-cyan-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs shadow-xs">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 shrink-0">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="font-semibold text-slate-600 dark:text-slate-400">Profil actif :</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{profil}</span>
      </div>
    </div>
  );
}
