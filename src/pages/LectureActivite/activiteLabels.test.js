import { describe, expect, it } from 'vitest';
import {
  getEvolutionMeta,
  getQualificationMeta,
  getTypeActionMeta,
  getVactisStatutMeta,
} from './activiteLabels.js';

describe('activite labels', () => {
  it('returns the correct VACTIS status metadata', () => {
    expect(getVactisStatutMeta('silence_critique')).toMatchObject({
      label: 'Silence critique',
      tone: 'red',
    });
  });

  it('normalizes accented and spaced values', () => {
    expect(getQualificationMeta('  Favorable ')).toMatchObject({
      label: 'Favorable',
      tone: 'green',
    });
  });

  it('detects the action type before using the fallback', () => {
    expect(getTypeActionMeta('visite_urgence_silence', null)).toMatchObject({
      label: 'Urgence silence',
      tone: 'red',
    });
  });

  it('returns a useful fallback for unknown evolution values', () => {
    expect(getEvolutionMeta('nouvelle_valeur')).toMatchObject({
      label: 'Nouvelle Valeur',
      tone: 'gray',
    });
  });
});
