import { useCallback, useState } from 'react';
import AuthLayout from '../../components/AuthLayout.jsx';
import AuthFormSwitcher from '../../components/auth/AuthFormSwitcher.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';

/**
 * Page d'authentification : la mise en page reste en place et seul le
 * formulaire bascule (Connexion ↔ Inscription) avec une transition animée.
 */
export default function AuthPage({ initialView = 'login' }) {
  const [vue, setVue] = useState({ nom: initialView, direction: 1 });

  const afficherInscription = useCallback(() => setVue({ nom: 'register', direction: 1 }), []);
  const afficherConnexion = useCallback(() => setVue({ nom: 'login', direction: -1 }), []);

  return (
    <AuthLayout mode={vue.nom}>
      <AuthFormSwitcher viewKey={vue.nom} direction={vue.direction}>
        {vue.nom === 'register' ? (
          <Register onShowLogin={afficherConnexion} />
        ) : (
          <Login onShowRegister={afficherInscription} />
        )}
      </AuthFormSwitcher>
    </AuthLayout>
  );
}
