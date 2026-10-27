// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModalSaisieRetour from './ModalSaisieRetour.jsx';

const action = { actionRecommandee: 'visite diagnostic', medecin: { nom: 'Amrani', prenom: 'Nadia' } };

function renderModal(onSubmit = vi.fn(), props = {}) {
  const rendered = render(<ModalSaisieRetour action={action} isOpen onClose={vi.fn()} onSubmit={onSubmit} isSubmitting={false} {...props} />);
  return { onSubmit, container: rendered.container };
}

afterEach(cleanup);

describe('ModalSaisieRetour conditional requirements', () => {
  it('requires a comment for an unfavorable qualification', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEFAVORABLE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));

    expect(document.body.textContent).toContain('Le commentaire est obligatoire pour une qualification défavorable.');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Saisissez vos observations terrain...'), { target: { value: 'Tarif trop élevé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ qualification: 'DEFAVORABLE', commentaire: 'Tarif trop élevé' }));
  });

  it('requires departure and a return or review date for leave', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'CONGE_ABSENCE' } });
    fireEvent.submit(document.body.querySelector('form'));
    expect(document.body.textContent).toContain('Saisissez le départ et une date de retour prévue ou une date de revue postérieure.');
    expect(onSubmit).not.toHaveBeenCalled();

    const dateInputs = document.body.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: '2026-10-20' } });
    fireEvent.change(dateInputs[3], { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dateDepart: '2026-10-20', dateRevue: '2026-11-20' }));
  });

  it('requires a comment for a complaint', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'RECLAMATION' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));
    expect(document.body.textContent).toContain('Le commentaire est obligatoire en cas de réclamation.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a documented non-realization reason', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'NON' } });
    fireEvent.submit(document.body.querySelector('form'));
    expect(document.body.textContent).toContain('Le motif de non-réalisation est obligatoire.');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'MEDECIN_ABSENT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le retour' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ actionRealisee: false, motifNonRealisation: 'MEDECIN_ABSENT' }));
  });

  it('shows server submission errors inside the modal and clears them when the user edits the form', () => {
    const onClearError = vi.fn();
    renderModal(vi.fn(), { errorMessage: 'La note terrain est requise.', onClearError });

    expect(screen.getByRole('alert').textContent).toBe('La note terrain est requise.');
    fireEvent.change(screen.getByPlaceholderText('Saisissez vos observations terrain...'), { target: { value: 'Ajout de précisions' } });
    expect(onClearError).toHaveBeenCalled();
  });
});