import React from 'react';
import { formatHeures } from '../../lib/format';

interface JourDetailProps {
  date: string;
  heuresTotal: number;
  capacite: number;
  heuresTaches: number;
  heuresBlocages: number;
  couleur: string; // libre | presque-plein | plein
}

const couleurClasses: Record<string, string> = {
  'libre': 'capacite-libre',
  'presque-plein': 'capacite-presque',
  'plein': 'capacite-plein'
};

export const JourDetail: React.FC<JourDetailProps> = ({ date, heuresTotal, capacite, heuresTaches, heuresBlocages, couleur }) => {
  const ratio = Math.min(capacite === 0 ? 0 : heuresTotal / capacite, 1);
  const percent = Math.round(ratio * 100);
  const widthClass = percent >= 100 ? 'w-full' : percent >= 75 ? 'w-3/4' : percent >= 50 ? 'w-1/2' : percent >= 25 ? 'w-1/4' : percent > 0 ? 'w-[10%]' : 'w-0';
  return (
    <div className="flex flex-col gap-1 p-2 border border-border rounded-md bg-white" aria-label={`Détails du ${date}`}>      
      <div className="flex items-center justify-between" aria-hidden>
        <span className="text-xs font-medium">{date.slice(5)}</span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${couleurClasses[couleur]}`}>{couleur}</span>
      </div>
      <div
        className="relative h-2 rounded bg-slate-200 overflow-hidden"
        aria-label={`Charge ${percent}% (${formatHeures(heuresTotal)} / ${formatHeures(capacite)} h)`}
      >
        <div className={`h-full ${couleurClasses[couleur]} transition-all ${widthClass}`} />
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]" aria-label="Répartition des heures">
        <div><dt className="text-muted">Tâches</dt><dd className="font-medium">{formatHeures(heuresTaches)} h</dd></div>
        <div><dt className="text-muted">Blocages</dt><dd className="font-medium">{formatHeures(heuresBlocages)} h</dd></div>
        <div><dt className="text-muted">Total</dt><dd className="font-medium">{formatHeures(heuresTotal)} h</dd></div>
        <div><dt className="text-muted">Libre</dt><dd className="font-medium">{formatHeures(Math.max(capacite - heuresTotal,0))} h</dd></div>
      </dl>
    </div>
  );
};
