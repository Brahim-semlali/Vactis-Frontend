// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModalVisiteLibre from './ModalVisiteLibre.jsx';

// Saisie d'une visite libre (hors VACTIS) : règles de validation et contenu envoyé au serveur.

const medecins = [{ id: 7, nom: 'CHRAIBI', prenom: 'Imane', specialite: 'Gynécologie' }];

function ouvrir(props = {}) {
  const onSubmit = vi.fn();
  render(<ModalVisiteLibre isOpen medecinsList={medecins} onClose={vi.fn()} onSubmit={onSubmit} commerciaux={['Commercial 2']} {...props} />);
  return onSubmit;
}

const choisir = (valeurAffichee, valeur) => fireEvent.change(screen.getByDisplayValue(valeurAffichee), { target: { value: valeur } });
const commenter = (texte) => fireEvent.change(screen.getByPlaceholderText(/Remarques et détails/), { target: { value: texte } });
const valider = () => fireEvent.submit(document.querySelector('form'));
const erreur = () => document.querySelector('.bg-rose-50.border-rose-200')?.textContent;

describe('ModalVisiteLibre', () => {
  afterEach(() => cleanup());

  it('ne s’affiche pas fermée', () => {
    render(<ModalVisiteLibre isOpen={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Nouvelle Visite Commerciale Libre')).toBeNull();
  });

  it('exige un médecin du portefeuille ou le nom d’un nouveau médecin', () => {
    const onSubmit = ouvrir();
    valider();
    expect(erreur()).toBe('Veuillez sélectionner un médecin existant.');

    fireEvent.click(screen.getByText('+ Créer Nouveau Médecin'));
    valider();
    expect(erreur()).toBe('Le nom du nouveau médecin est obligatoire.');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Nom du médecin'), { target: { value: 'NOUVEAU' } });
    valider();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ medecinId: null, nomMedecin: 'NOUVEAU', specialite: 'Généraliste' }));
  });

  it('une visite favorable envoie la qualification sans obstacle', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    valider();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      medecinId: 7, qualification: 'FAVORABLE', obstaclePrincipal: null, typePassage: 'COMMERCIAL', commercialAppui: null,
    }));
  });

  it('une visite défavorable exige un commentaire et transmet l’obstacle principal', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    choisir('Favorable', 'DEFAVORABLE');
    valider();
    expect(erreur()).toMatch(/commentaire et l’obstacle principal sont obligatoires/);

    choisir('Prix / tarif', 'DELAI');
    commenter('Délais de rendu trop longs');
    valider();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      qualification: 'DEFAVORABLE', obstaclePrincipal: 'DELAI', commentaire: 'Délais de rendu trop longs',
    }));
  });

  it('une réclamation exige un commentaire', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    choisir('Favorable', 'RECLAMATION');
    valider();
    expect(erreur()).toBe('Le commentaire est obligatoire en cas de réclamation.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('une visite non réalisée exige un motif', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    choisir('Oui', 'NON');
    valider();
    expect(erreur()).toBe('Le motif de non-réalisation est obligatoire.');

    choisir('Choisir un motif', 'MEDECIN_ABSENT');
    valider();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ actionRealisee: false, motifNonRealisation: 'MEDECIN_ABSENT' }));
  });

  it('un congé exige une date de départ et une date de retour ou de revue postérieure', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    choisir('Favorable', 'CONGE_ABSENCE');
    valider();
    expect(erreur()).toMatch(/départ et une date de retour/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('un passage de service n’est pas qualifié et garde le commercial en appui', () => {
    const onSubmit = ouvrir();
    choisir('-- Sélectionner dans le portefeuille --', '7');
    choisir('Échange commercial avec le médecin', 'SERVICE');
    fireEvent.change(screen.getByPlaceholderText('Collègue venu en appui de la visite'), { target: { value: '  Commercial 2 ' } });
    valider();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      typePassage: 'SERVICE', qualification: 'NON_RENSEIGNE', commercialAppui: 'Commercial 2',
    }));
  });
});
