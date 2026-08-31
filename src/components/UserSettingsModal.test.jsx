// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserSettingsModal from './UserSettingsModal.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';

describe('UserSettingsModal', () => {
  it('renders correctly with tabs and user profile info', () => {
    const onClose = vi.fn();
    render(
      <ThemeProvider>
        <AuthProvider>
          <UserSettingsModal onClose={onClose} />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Paramètres & Profil')).toBeTruthy();
    expect(screen.getByText('Mon Profil')).toBeTruthy();
    expect(screen.getByText('Mot de passe')).toBeTruthy();
    expect(screen.getByText('Apparence & Thème')).toBeTruthy();
    expect(screen.getByText('Photo de profil')).toBeTruthy();
  });
});
