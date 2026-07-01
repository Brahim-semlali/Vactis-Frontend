import { useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Authentification/Login.jsx';
import Register from './pages/Authentification/Register.jsx';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('login');

  if (isAuthenticated) {
    return <Home />;
  }

  if (view === 'register') {
    return <Register onShowLogin={() => setView('login')} />;
  }

  return <Login onShowRegister={() => setView('register')} />;
}
