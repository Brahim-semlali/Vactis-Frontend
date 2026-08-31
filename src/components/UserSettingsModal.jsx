import { useEffect, useMemo, useRef, useState } from 'react';
import { changePassword, getPasswordPolicy } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

function PasswordRequirements({ password, policy }) {
  const requirements = [
    [`Au moins ${policy.mdpLongueurMinimale} caractères`, password.length >= policy.mdpLongueurMinimale],
    ...(policy.mdpExigeMajuscule ? [['Une majuscule', /[A-Z]/.test(password)]] : []),
    ...(policy.mdpExigeChiffre ? [['Un chiffre', /\d/.test(password)]] : []),
    ...(policy.mdpExigeCaractereSpecial ? [['Un caractère spécial', /[^a-zA-Z0-9]/.test(password)]] : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-[11px] font-medium border border-slate-200/70 dark:border-slate-700/60">
      {requirements.map(([label, valid]) => (
        <span key={label} className={`flex items-center gap-1.5 ${valid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
            {valid ? '✓' : '•'}
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

// Compresses and scales image down to keep lightweight Base64 string (~30-50KB)
async function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez sélectionner un fichier image valide.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Impossible de lire cette image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erreur lors du chargement du fichier.'));
    reader.readAsDataURL(file);
  });
}

export default function UserSettingsModal({ onClose, initialTab = 'profile' }) {
  const { token, username, userProfile, updateUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(initialTab);
  const fileInputRef = useRef(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    avatar: userProfile?.avatar || '',
  });

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        avatar: userProfile.avatar || '',
      });
    }
  }, [userProfile]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmation: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [policy, setPolicy] = useState({
    mdpLongueurMinimale: 8,
    mdpExigeMajuscule: false,
    mdpExigeChiffre: false,
    mdpExigeCaractereSpecial: false,
  });

  useEffect(() => {
    if (token) {
      getPasswordPolicy(token).then(setPolicy).catch(() => {});
    }
  }, [token]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Avatar Change
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError('');
    try {
      const dataUrl = await processImageFile(file);
      setProfileForm((prev) => ({ ...prev, avatar: dataUrl }));
    } catch (err) {
      setProfileError(err.message || 'Erreur lors du traitement de la photo.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    setProfileForm((prev) => ({ ...prev, avatar: '' }));
  };

  // Submit Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileSaving(true);

    try {
      await updateUserProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        avatar: profileForm.avatar,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err) {
      setProfileError(err.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Submit Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (
      passwordForm.newPassword.length < policy.mdpLongueurMinimale ||
      (policy.mdpExigeMajuscule && !/[A-Z]/.test(passwordForm.newPassword)) ||
      (policy.mdpExigeChiffre && !/\d/.test(passwordForm.newPassword)) ||
      (policy.mdpExigeCaractereSpecial && !/[^a-zA-Z0-9]/.test(passwordForm.newPassword))
    ) {
      setPasswordError('Le nouveau mot de passe ne respecte pas la politique de sécurité.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmation) {
      setPasswordError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(token, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmation: '' });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = useMemo(() => {
    const first = (profileForm.firstName || username || 'U')[0] || 'U';
    const last = (profileForm.lastName || '')[0] || '';
    return (first + last).toUpperCase();
  }, [profileForm.firstName, profileForm.lastName, username]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <section className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden transition-all my-8 animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-5 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h2 id="settings-title" className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Paramètres & Profil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gérez vos informations personnelles, votre sécurité et l'apparence de l'application
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/40 dark:bg-slate-900/30 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mon Profil
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'password'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Mot de passe
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'appearance'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            Apparence & Thème
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: Mon Profil */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-black text-2xl border-2 border-white dark:border-slate-800">
                    {profileForm.avatar ? (
                      <img
                        src={profileForm.avatar}
                        alt="Photo de profil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Photo de profil
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 uppercase tracking-wider">
                      {userProfile?.role || 'Utilisateur'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formats acceptés : JPG, PNG, WEBP. Redimensionnement automatique.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800 cursor-pointer transition-colors shadow-xs"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      Changer la photo
                    </label>

                    {profileForm.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Ex: Jean"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Ex: Dupont"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nom d'utilisateur (Identifiant)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={username || ''}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">🔒 Fixe</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Ex: 06 12 34 56 78"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="nom@domaine.fr"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>

              {profileSuccess && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fade-in">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Vos modifications ont été enregistrées avec succès !
                </div>
              )}

              {profileError && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-fade-in">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {profileError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20"
                >
                  {profileSaving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    'Enregistrer le profil'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Sécurité & Mot de passe */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={policy.mdpLongueurMinimale}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <PasswordRequirements password={passwordForm.newPassword} policy={policy} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirmation du nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmation}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmation: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {passwordForm.confirmation && passwordForm.newPassword !== passwordForm.confirmation && (
                  <p className="text-[11px] font-semibold text-rose-500">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}
              </div>

              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fade-in">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Votre mot de passe a été modifié avec succès !
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-fade-in">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {passwordError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20"
                >
                  {passwordSaving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Modification…
                    </>
                  ) : (
                    'Modifier le mot de passe'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Apparence & Thème */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Thème d'affichage
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Personnalisez l'ambiance visuelle de votre espace de travail. Le thème choisi sera conservé lors de vos prochaines visites.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`group relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
                    theme === 'light'
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-slate-800/80 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 font-bold">
                        ☀️
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Mode Clair
                      </span>
                    </div>
                    {theme === 'light' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-black">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Visual mockup light */}
                  <div className="w-full h-24 rounded-xl bg-slate-100 p-2.5 border border-slate-200 flex flex-col gap-1.5 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-10 bg-teal-600 rounded-sm" />
                      <div className="h-2 w-16 bg-slate-300 rounded-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <div className="h-10 rounded bg-white shadow-xs border border-slate-200/80 p-1">
                        <div className="h-1.5 w-6 bg-slate-300 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-teal-500 rounded-xs" />
                      </div>
                      <div className="h-10 rounded bg-white shadow-xs border border-slate-200/80 p-1">
                        <div className="h-1.5 w-6 bg-slate-300 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-blue-500 rounded-xs" />
                      </div>
                      <div className="h-10 rounded bg-white shadow-xs border border-slate-200/80 p-1">
                        <div className="h-1.5 w-6 bg-slate-300 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-emerald-500 rounded-xs" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Interface lumineuse optimale pour les environnements éclairés.
                  </p>
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`group relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
                    theme === 'dark'
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-slate-800/90 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 font-bold">
                        🌙
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Mode Sombre
                      </span>
                    </div>
                    {theme === 'dark' && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-black">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Visual mockup dark */}
                  <div className="w-full h-24 rounded-xl bg-slate-950 p-2.5 border border-slate-800 flex flex-col gap-1.5 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-10 bg-teal-500 rounded-sm" />
                      <div className="h-2 w-16 bg-slate-700 rounded-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <div className="h-10 rounded bg-slate-900 shadow-xs border border-slate-800 p-1">
                        <div className="h-1.5 w-6 bg-slate-700 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-teal-400 rounded-xs" />
                      </div>
                      <div className="h-10 rounded bg-slate-900 shadow-xs border border-slate-800 p-1">
                        <div className="h-1.5 w-6 bg-slate-700 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-blue-400 rounded-xs" />
                      </div>
                      <div className="h-10 rounded bg-slate-900 shadow-xs border border-slate-800 p-1">
                        <div className="h-1.5 w-6 bg-slate-700 rounded-xs mb-1" />
                        <div className="h-2.5 w-8 bg-emerald-400 rounded-xs" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Interface sombre reposante, idéale en basse luminosité.
                  </p>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/20"
                >
                  Terminer
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
