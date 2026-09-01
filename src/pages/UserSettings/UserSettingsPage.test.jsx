// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserSettingsPage from './UserSettingsPage.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

describe('UserSettingsPage', () => {
  it('renders page in consultation mode and allows toggling edit mode', async () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <UserSettingsPage />
        </AuthProvider>
      </ThemeProvider>
    );

    // Header & page title
    expect(screen.getByText('Paramètres du compte')).toBeTruthy();
    expect(screen.getByText('Informations du profil')).toBeTruthy();
    expect(screen.getByText('Sécurité & Mot de passe')).toBeTruthy();
    expect(screen.getByText('Thème & Apparence')).toBeTruthy();

    // In view mode, "Modifier mes informations" button is visible
    const editBtn = screen.getByText('Modifier mes informations');
    expect(editBtn).toBeTruthy();

    // Click edit
    fireEvent.click(editBtn);

    // In edit mode, save and cancel buttons appear
    expect(screen.getByText('Enregistrer les modifications')).toBeTruthy();
    expect(screen.getAllByText('Annuler').length).toBeGreaterThan(0);
  });
});
