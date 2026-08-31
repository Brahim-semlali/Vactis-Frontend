import { useEffect, useMemo, useRef, useState } from 'react';
import { changePassword, getPasswordPolicy } from '../../api/auth.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

function PasswordRequirements({ password, policy }) {
  const requirements = [
    [`Au moins ${policy.mdpLongueurMinimale} caractères`, password.length >= policy.mdpLongueurMinimale],
    ...(policy.mdpExigeMajuscule ? [['Une majuscule', /[A-Z]/.test(password)]] : []),
    ...(policy.mdpExigeChiffre ? [['Un chiffre', /\d/.test(password)]] : []),
    ...(policy.mdpExigeCaractereSpecial ? [['Un caractère spécial', /[^a-zA-Z0-9]/.test(password)]] : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-medium border border-slate-200/80 dark:border-slate-700">
      {requirements.map(([label, valid]) => (
        <span
          key={label}
          className={`flex items-center gap-2 ${
            valid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              valid
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
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

export default function UserSettingsPage() {
  const { token, username, userProfile, updateUserProfile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password' | 'appearance'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  const cancelProfileEdit = () => {
    if (userProfile) {
      setProfileForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        avatar: userProfile.avatar || '',
      });
    }
    setProfileError('');
    setIsEditingProfile(false);
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
      setIsEditingProfile(false);
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
      setIsChangingPassword(false);
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : (username ?? 'Utilisateur');

  const initials = useMemo(() => {
    const first = (userProfile?.firstName || username || 'U')[0] || 'U';
    const last = (userProfile?.lastName || '')[0] || '';
    return (first + last).toUpperCase();
  }, [userProfile?.firstName, userProfile?.lastName, username]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12 transition-colors">
      {/* Page Header */}
      <header className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Espace Personnel
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
            Paramètres du compte
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Consultez et modifiez vos informations de profil, sécurisez votre compte et personnalisez votre thème d'affichage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Compte Actif
          </span>
        </div>
      </header>

      {/* Hero Profile Overview Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Display */}
          <div className="relative group shrink-0">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-black text-3xl sm:text-4xl border-4 border-white dark:border-slate-800 ring-2 ring-teal-500/20">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {isEditingProfile && (
              <div className="absolute -bottom-2 -right-2 flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="page-avatar-upload"
                />
                <label
                  htmlFor="page-avatar-upload"
                  title="Changer la photo"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </label>
                {profileForm.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    title="Supprimer la photo"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Bio and Meta */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50">
                {displayName}
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 uppercase tracking-wider shadow-xs">
                {userProfile?.role || 'Directeur'}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Identifiant : <span className="font-bold text-slate-700 dark:text-slate-200">@{username}</span>
              {userProfile?.email && (
                <>
                  {' '}• Email : <span className="font-semibold text-slate-700 dark:text-slate-200">{userProfile.email}</span>
                </>
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    setActiveTab('profile');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Modifier mes informations
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800">
                    ✍️ Mode modification activé
                  </span>
                  <button
                    type="button"
                    onClick={cancelProfileEdit}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {profileSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold animate-fade-in shadow-xs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Vos informations de profil ont été mises à jour avec succès !
        </div>
      )}

      {profileError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-sm font-semibold animate-fade-in shadow-xs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {profileError}
        </div>
      )}

      {passwordSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold animate-fade-in shadow-xs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Votre mot de passe a été modifié avec succès !
        </div>
      )}

      {passwordError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-sm font-semibold animate-fade-in shadow-xs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {passwordError}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Informations du profil
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'password'
              ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Sécurité & Mot de passe
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'appearance'
              ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          Thème & Apparence
        </button>
      </div>

      {/* TAB 1: INFORMATIONS DU PROFIL */}
      {activeTab === 'profile' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          {!isEditingProfile ? (
            /* CONSULTATION (READ-ONLY) VIEW */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Coordonnées & Informations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Informations personnelles enregistrées dans le système
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Modifier
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Prénom
                  </span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {userProfile?.firstName || <span className="italic text-slate-400 font-normal">Non renseigné</span>}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Nom de famille
                  </span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {userProfile?.lastName || <span className="italic text-slate-400 font-normal">Non renseigné</span>}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Nom d'utilisateur (Identifiant)
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {username}
                    </p>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Fixe
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Rôle & Profil d'accès
                  </span>
                  <p className="text-base font-bold text-teal-700 dark:text-teal-400">
                    {userProfile?.role || 'Directeur'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Adresse Email
                  </span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {userProfile?.email || <span className="italic text-slate-400 font-normal">Non renseignée</span>}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Numéro de Téléphone
                  </span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {userProfile?.phone || <span className="italic text-slate-400 font-normal">Non renseigné</span>}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* MODIFICATION (EDIT) FORM */
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Modifier mes informations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mettez à jour vos coordonnées personnelles ci-dessous
                  </p>
                </div>
              </div>

              {/* Avatar Selection in Edit Mode */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-black text-xl border-2 border-white dark:border-slate-800 shrink-0">
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

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Photo de profil
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sélectionnez une nouvelle photo (JPG, PNG, WEBP).
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="edit-form-avatar-upload"
                    />
                    <label
                      htmlFor="edit-form-avatar-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800 cursor-pointer transition-colors shadow-xs"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      Sélectionner une photo
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
                        Supprimer la photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Ex: Jean"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Nom de famille
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Ex: Dupont"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="nom@domaine.fr"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Ex: 06 12 34 56 78"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={cancelProfileEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  {profileSaving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    'Enregistrer les modifications'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: SÉCURITÉ & MOT DE PASSE */}
      {activeTab === 'password' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          {!isChangingPassword ? (
            /* Password status card */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Sécurité du compte
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gérez la confidentialité et le mot de passe de votre compte
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Mot de passe du compte
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Protégé par le système d'authentification VACTIS
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChangingPassword(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Modifier le mot de passe
                </button>
              </div>

              {/* Policy info */}
              <div className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Politique de sécurité configurée
                </h4>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    Longueur minimum : <strong>{policy.mdpLongueurMinimale} caractères</strong>
                  </span>
                  {policy.mdpExigeMajuscule && (
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Majuscule requise
                    </span>
                  )}
                  {policy.mdpExigeChiffre && (
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Chiffre requis
                    </span>
                  )}
                  {policy.mdpExigeCaractereSpecial && (
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      Caractère spécial requis
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Change password form */
            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Changement de mot de passe
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Veuillez saisir votre mot de passe actuel puis définir votre nouveau mot de passe
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <PasswordRequirements password={passwordForm.newPassword} policy={policy} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirmation du nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmation}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmation: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 pr-10 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Afficher le mot de passe"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {passwordForm.confirmation && passwordForm.newPassword !== passwordForm.confirmation && (
                  <p className="text-xs font-semibold text-rose-500">
                    Les deux mots de passe ne correspondent pas.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordError('');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmation: '' });
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  {passwordSaving ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Modification en cours…
                    </>
                  ) : (
                    'Confirmer la modification'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: THÈME & APPARENCE */}
      {activeTab === 'appearance' && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Personnalisation de l'affichage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choisissez l'ambiance lumineuse ou sombre selon votre préférence visuelle
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Light Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`group relative flex flex-col p-5 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-teal-500 bg-teal-50/40 dark:bg-slate-800/80 shadow-md ring-4 ring-teal-500/10'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 text-xl font-bold">
                    ☀️
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Mode Clair
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Ambiance lumineuse
                    </span>
                  </div>
                </div>
                {theme === 'light' && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-black shadow-xs">
                    ✓
                  </span>
                )}
              </div>

              {/* Visual mockup light */}
              <div className="w-full h-32 rounded-2xl bg-slate-100 p-3 border border-slate-200 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-12 bg-teal-600 rounded-sm" />
                  <div className="h-2.5 w-20 bg-slate-300 rounded-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1 flex-1">
                  <div className="rounded-xl bg-white shadow-xs border border-slate-200/80 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-300 rounded-xs" />
                    <div className="h-3 w-10 bg-teal-500 rounded-xs" />
                  </div>
                  <div className="rounded-xl bg-white shadow-xs border border-slate-200/80 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-300 rounded-xs" />
                    <div className="h-3 w-10 bg-blue-500 rounded-xs" />
                  </div>
                  <div className="rounded-xl bg-white shadow-xs border border-slate-200/80 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-300 rounded-xs" />
                    <div className="h-3 w-10 bg-emerald-500 rounded-xs" />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Idéal pour les environnements de travail bien éclairés et un contraste net.
              </p>
            </button>

            {/* Dark Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`group relative flex flex-col p-5 rounded-3xl border-2 text-left transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-teal-500 bg-teal-50/40 dark:bg-slate-800/90 shadow-md ring-4 ring-teal-500/10'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 text-xl font-bold">
                    🌙
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Mode Sombre
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Ambiance reposante
                    </span>
                  </div>
                </div>
                {theme === 'dark' && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-black shadow-xs">
                    ✓
                  </span>
                )}
              </div>

              {/* Visual mockup dark */}
              <div className="w-full h-32 rounded-2xl bg-slate-950 p-3 border border-slate-800 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-12 bg-teal-500 rounded-sm" />
                  <div className="h-2.5 w-20 bg-slate-700 rounded-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1 flex-1">
                  <div className="rounded-xl bg-slate-900 shadow-xs border border-slate-800 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-700 rounded-xs" />
                    <div className="h-3 w-10 bg-teal-400 rounded-xs" />
                  </div>
                  <div className="rounded-xl bg-slate-900 shadow-xs border border-slate-800 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-700 rounded-xs" />
                    <div className="h-3 w-10 bg-blue-400 rounded-xs" />
                  </div>
                  <div className="rounded-xl bg-slate-900 shadow-xs border border-slate-800 p-2 flex flex-col justify-between">
                    <div className="h-2 w-8 bg-slate-700 rounded-xs" />
                    <div className="h-3 w-10 bg-emerald-400 rounded-xs" />
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Réduit la fatigue oculaire lors des sessions prolongées ou en faible éclairage.
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
