import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Building2,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Layers,
  AlertCircle,
  Eye,
  EyeOff,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getMedecinsGeolocalises,
  getMedecinsSansLocalisation,
  updateMedecinLocalisation,
  getAgencesConcurrentes,
  createAgenceConcurrente,
  updateAgenceConcurrente,
  deleteAgenceConcurrente,
} from '../../api/zoneIntelligence.js';

// Centrage précis et limitation stricte à la ville de Marrakech et ses quartiers
const MARRAKECH_CENTER = [31.6320, -8.0020];
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

// Bounding box stricte de Marrakech (bords sud M'hamid / nord Palmeraie / ouest Targa / est Sidi Youssef)
const MARRAKECH_BOUNDS = [
  [31.5450, -8.0950], // Sud-Ouest
  [31.7050, -7.9150], // Nord-Est
];

// Principaux quartiers de Marrakech avec leurs coordonnées géographiques
const MARRAKECH_QUARTIERS = [
  { id: 'gueliz', name: 'Guéliz', coords: [31.6346, -8.0139] },
  { id: 'medina', name: 'Médina', coords: [31.6258, -7.9891] },
  { id: 'hivernage', name: 'Hivernage', coords: [31.6214, -8.0125] },
  { id: 'majorelle', name: 'Majorelle', coords: [31.6420, -8.0035] },
  { id: 'semlalia', name: 'Semlalia', coords: [31.6480, -8.0190] },
  { id: 'daoudiate', name: 'Daoudiate', coords: [31.6540, -7.9920] },
  { id: 'targa', name: 'Targa', coords: [31.6510, -8.0520] },
  { id: 'sidi_youssef', name: 'Sidi Youssef Ben Ali', coords: [31.6050, -7.9750] },
  { id: 'mhamid', name: 'M’hamid', coords: [31.5950, -8.0380] },
  { id: 'palmeraie', name: 'Palmeraie', coords: [31.6680, -7.9550] },
  { id: 'agdal', name: 'Agdal', coords: [31.6010, -7.9950] },
];

// Couleurs par Segment (cohérentes avec le design system VACTIS)
const SEGMENT_COLORS = {
  A: '#10b981', // Emerald / Vert
  B: '#0284c7', // Sky / Bleu
  C: '#f59e0b', // Amber / Orange
  D: '#f43f5e', // Rose / Rouge
};

// Couleurs par Statut
const STATUT_COLORS = {
  PROGRESSION: '#10b981',
  ACTIF_STABLE: '#0ea5e9',
  ONBOARDING: '#8b5cf6',
  SURVEILLANCE: '#f59e0b',
  RETENTION: '#f43f5e',
  SILENCE_CRITIQUE: '#e11d48',
  A_REACTIVER: '#d97706',
  INACTIF: '#64748b',
};

// Couleur Agences concurrentes : Violet / Indigo foncé
const CONCURRENCE_COLOR = '#7c3aed';

// Création d'icônes SVG via L.divIcon pour un affichage net et indépendant des assets PNG Leaflet
function createDoctorPinIcon(color, label = '', isDraggable = false) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M16 2 C8.268 2 2 8.268 2 16 C2 26 16 42 16 42 C16 42 30 26 30 16 C30 8.268 23.732 2 16 2 Z"
            fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)" />
      <circle cx="16" cy="16" r="7" fill="#ffffff" />
      <text x="16" y="19" text-anchor="middle" font-size="8" font-family="system-ui, sans-serif" font-weight="900" fill="${color}">${label || 'M'}</text>
    </svg>
  `;

  return L.divIcon({
    className: `custom-div-icon ${isDraggable ? 'cursor-grab' : ''}`,
    html: svg,
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

function createCompetitorPinIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 46" width="34" height="46">
      <defs>
        <filter id="cshadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M17 2 C8.716 2 2 8.716 2 17 C2 27.5 17 44 17 44 C17 44 32 27.5 32 17 C32 8.716 25.284 2 17 2 Z"
            fill="${CONCURRENCE_COLOR}" stroke="#ffffff" stroke-width="2" filter="url(#cshadow)" />
      <circle cx="17" cy="17" r="8" fill="#ffffff" />
      <!-- Petite icône bâtiment -->
      <path d="M13 13 h8 v8 h-8 z M15 15 h1 v1 h-1 z M18 15 h1 v1 h-1 z M15 18 h1 v1 h-1 z M18 18 h1 v1 h-1 z"
            fill="${CONCURRENCE_COLOR}" />
    </svg>
  `;

  return L.divIcon({
    className: 'custom-div-icon competitor-pin',
    html: svg,
    iconSize: [34, 46],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

// Création d'étiquette visuelle pour les quartiers de Marrakech
function createQuartierLabelIcon(name) {
  return L.divIcon({
    className: 'custom-quartier-label',
    html: `<div class="px-2 py-0.5 rounded-full bg-slate-900/60 dark:bg-slate-800/80 backdrop-blur text-white text-[10px] font-black border border-white/20 whitespace-nowrap shadow-xs pointer-events-none tracking-tight">${name}</div>`,
    iconSize: [80, 20],
    iconAnchor: [40, 10],
  });
}

// Contrôleur de carte pour animer et centrer sur un quartier choisi
function MapController({ targetCenter, targetZoom }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, targetZoom || 14, { duration: 0.8 });
    }
  }, [targetCenter, targetZoom, map]);
  return null;
}

// Composant interne pour intercepter les clics sur la carte (pour ajout agence ou positionnement médecin)
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function ZoneIntelligencePage({ navigate }) {
  const { token, userProfile } = useAuth();

  const roleName = useMemo(() => {
    const value = userProfile?.role ?? userProfile?.roles?.nameRole ?? userProfile?.roles?.[0]?.nameRole ?? '';
    return String(value ?? '').trim().toUpperCase();
  }, [userProfile]);

  const isAdmin = useMemo(
    () => roleName.includes('ADMIN') || roleName.includes('ADMINISTRATEUR'),
    [roleName]
  );

  // Données
  const [medecins, setMedecins] = useState([]);
  const [agences, setAgences] = useState([]);
  const [medecinsSansCoords, setMedecinsSansCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filtres
  const [selectedSegments, setSelectedSegments] = useState(['A', 'B', 'C', 'D']);
  const [selectedStatut, setSelectedStatut] = useState('ALL');
  const [showAgences, setShowAgences] = useState(true);
  const [colorCriterion, setColorCriterion] = useState('segment'); // 'segment' | 'statut'

  // Quartier actif & cible de navigation cartographique
  const [activeQuartier, setActiveQuartier] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

  // État du panneau latéral "Médecins sans localisation"
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchSansCoords, setSearchSansCoords] = useState('');

  // Mode ciblage positionnement médecin : { id, nom, prenom } | null
  const [positioningDoctor, setPositioningDoctor] = useState(null);

  // Formulaire d'ajout / modification d'agence concurrente
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState(null);
  const [agencyForm, setAgencyForm] = useState({
    nom: '',
    enseigne: '',
    adresse: '',
    notes: '',
    latitude: '',
    longitude: '',
  });
  const [agencyClickPlacementActive, setAgencyClickPlacementActive] = useState(false);
  const [submittingAgency, setSubmittingAgency] = useState(false);
  const [agencyError, setAgencyError] = useState(null);

  // Boîte de dialogue de confirmation de suppression
  const [deleteConfirmAgency, setDeleteConfirmAgency] = useState(null);

  // Affiche un toast temporaire
  const showToast = useCallback((msg, duration = 3500) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, duration);
  }, []);

  // Chargement initial des données
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [docsGeo, listAgences, docsSansLoc] = await Promise.all([
        getMedecinsGeolocalises(token),
        getAgencesConcurrentes(token),
        isAdmin ? getMedecinsSansLocalisation(token) : Promise.resolve([]),
      ]);

      setMedecins(docsGeo || []);
      setAgences(listAgences || []);
      setMedecinsSansCoords(docsSansLoc || []);
    } catch (err) {
      setError(err.message || 'Impossible de charger les données cartographiques');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clic sur la carte
  const handleMapClick = useCallback(
    async (latlng) => {
      const { lat, lng } = latlng;
      const formattedLat = parseFloat(lat.toFixed(6));
      const formattedLng = parseFloat(lng.toFixed(6));

      // Cas 1 : Mode positionnement d'un médecin depuis le panneau latéral
      if (positioningDoctor) {
        try {
          const docId = positioningDoctor.id;
          const updated = await updateMedecinLocalisation(token, docId, {
            latitude: formattedLat,
            longitude: formattedLng,
          });

          // Retirer de la liste sans coordonnées
          setMedecinsSansCoords((prev) => prev.filter((d) => d.id !== docId));
          // Ajouter ou mettre à jour dans la liste géolocalisée
          setMedecins((prev) => {
            const filtered = prev.filter((d) => d.id !== docId);
            return [...filtered, updated];
          });

          showToast(`Dr. ${positioningDoctor.nom} positionné avec succès sur la carte.`);
        } catch (err) {
          showToast(`Erreur lors du positionnement : ${err.message}`, 4000);
        } finally {
          setPositioningDoctor(null);
        }
        return;
      }

      // Cas 2 : Mode placement direct par clic pour le formulaire d'agence
      if (agencyModalOpen && agencyClickPlacementActive) {
        setAgencyForm((prev) => ({
          ...prev,
          latitude: formattedLat,
          longitude: formattedLng,
        }));
        setAgencyClickPlacementActive(false);
        showToast('Coordonnées capturées depuis la carte.');
      }
    },
    [positioningDoctor, agencyModalOpen, agencyClickPlacementActive, token, showToast]
  );

  // Déplacement d'un marqueur médecin (dragend)
  const handleDoctorDragEnd = useCallback(
    async (medecin, event) => {
      if (!isAdmin) return;
      const marker = event.target;
      const newPos = marker.getLatLng();
      const newLat = parseFloat(newPos.lat.toFixed(6));
      const newLng = parseFloat(newPos.lng.toFixed(6));

      try {
        const updated = await updateMedecinLocalisation(token, medecin.id, {
          latitude: newLat,
          longitude: newLng,
        });

        setMedecins((prev) => prev.map((d) => (d.id === medecin.id ? updated : d)));
        showToast(`Position de Dr. ${medecin.nom} mise à jour.`);
      } catch (err) {
        showToast(`Erreur lors du déplacement : ${err.message}`, 4000);
        loadData(); // Recharger pour remettre à l'état précédent
      }
    },
    [isAdmin, token, showToast, loadData]
  );

  // Navigation vers la fiche complète du médecin
  const handleOpenFiche = useCallback(
    (medecin) => {
      if (medecin?.id) {
        sessionStorage.setItem('vactis_selected_medecin_id', String(medecin.id));
      }
      if (typeof navigate === 'function') {
        navigate('/medecins');
      } else {
        window.location.href = '/medecins';
      }
    },
    [navigate]
  );

  // Gestion formulaire agence
  const openNewAgencyModal = () => {
    setEditingAgencyId(null);
    setAgencyForm({
      nom: '',
      enseigne: '',
      adresse: '',
      notes: '',
      latitude: '',
      longitude: '',
    });
    setAgencyError(null);
    setAgencyClickPlacementActive(true);
    setAgencyModalOpen(true);
  };

  const openEditAgencyModal = (agency) => {
    setEditingAgencyId(agency.id);
    setAgencyForm({
      nom: agency.nom || '',
      enseigne: agency.enseigne || '',
      adresse: agency.adresse || '',
      notes: agency.notes || '',
      latitude: agency.latitude ?? '',
      longitude: agency.longitude ?? '',
    });
    setAgencyError(null);
    setAgencyClickPlacementActive(false);
    setAgencyModalOpen(true);
  };

  const handleSaveAgency = async (e) => {
    e.preventDefault();
    if (!agencyForm.nom.trim()) {
      setAgencyError("Le nom de l'agence est obligatoire.");
      return;
    }
    const lat = parseFloat(agencyForm.latitude);
    const lng = parseFloat(agencyForm.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setAgencyError('Veuillez saisir une latitude valide entre -90 et 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setAgencyError('Veuillez saisir une longitude valide entre -180 et 180.');
      return;
    }

    setSubmittingAgency(true);
    setAgencyError(null);

    const payload = {
      nom: agencyForm.nom.trim(),
      enseigne: agencyForm.enseigne.trim() || null,
      adresse: agencyForm.adresse.trim() || null,
      notes: agencyForm.notes.trim() || null,
      latitude: lat,
      longitude: lng,
    };

    try {
      if (editingAgencyId) {
        const updated = await updateAgenceConcurrente(token, editingAgencyId, payload);
        setAgences((prev) => prev.map((a) => (a.id === editingAgencyId ? updated : a)));
        showToast('Agence concurrente modifiée avec succès.');
      } else {
        const created = await createAgenceConcurrente(token, payload);
        setAgences((prev) => [...prev, created]);
        showToast('Agence concurrente ajoutée sur la carte.');
      }
      setAgencyModalOpen(false);
    } catch (err) {
      setAgencyError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmittingAgency(false);
    }
  };

  const handleDeleteAgency = async () => {
    if (!deleteConfirmAgency) return;
    try {
      await deleteAgenceConcurrente(token, deleteConfirmAgency.id);
      setAgences((prev) => prev.filter((a) => a.id !== deleteConfirmAgency.id));
      showToast(`Agence « ${deleteConfirmAgency.nom} » supprimée.`);
    } catch (err) {
      showToast(`Erreur suppression : ${err.message}`, 4000);
    } finally {
      setDeleteConfirmAgency(null);
    }
  };

  // Filtrage des médecins géolocalisés
  const filteredMedecins = useMemo(() => {
    return medecins.filter((doc) => {
      // Filtre segment
      const seg = (doc.segment || 'D').toUpperCase();
      if (!selectedSegments.includes(seg)) return false;

      // Filtre statut
      if (selectedStatut !== 'ALL') {
        const docStatut = (doc.statut || '').toUpperCase();
        if (docStatut !== selectedStatut) return false;
      }

      return true;
    });
  }, [medecins, selectedSegments, selectedStatut]);

  // Liste filtrée des médecins sans coordonnées pour la recherche
  const filteredSansCoords = useMemo(() => {
    if (!searchSansCoords.trim()) return medecinsSansCoords;
    const q = searchSansCoords.toLowerCase();
    return medecinsSansCoords.filter((doc) => {
      const nom = `${doc.prenom || ''} ${doc.nom || ''}`.toLowerCase();
      const spec = (doc.specialite || '').toLowerCase();
      const org = (doc.organisme || '').toLowerCase();
      const ville = (doc.ville || '').toLowerCase();
      return nom.includes(q) || spec.includes(q) || org.includes(q) || ville.includes(q);
    });
  }, [medecinsSansCoords, searchSansCoords]);

  const toggleSegmentFilter = (seg) => {
    setSelectedSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const resetFilters = () => {
    setSelectedSegments(['A', 'B', 'C', 'D']);
    setSelectedStatut('ALL');
    setShowAgences(true);
  };

  // Détermination de la couleur d'un médecin selon le critère choisi
  const getDoctorPinColor = (medecin) => {
    if (colorCriterion === 'statut') {
      const st = (medecin.statut || 'ACTIF_STABLE').toUpperCase();
      return STATUT_COLORS[st] || '#64748b';
    }
    const seg = (medecin.segment || 'D').toUpperCase();
    return SEGMENT_COLORS[seg] || '#64748b';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Toast de notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-slate-900/90 text-white px-4 py-2 rounded-xl shadow-lg text-sm flex items-center gap-2 backdrop-blur border border-slate-700 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bannière Mode Positionnement Médecin */}
      {positioningDoctor && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1500] bg-sky-600 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-4 text-sm animate-pulse border-2 border-white">
          <Navigation className="w-5 h-5 text-sky-200 animate-spin" />
          <span>
            <strong>Mode positionnement :</strong> Cliquez sur la carte pour placer{' '}
            <strong>Dr. {positioningDoctor.prenom} {positioningDoctor.nom}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPositioningDoctor(null)}
            className="ml-2 px-2.5 py-1 bg-sky-800 hover:bg-sky-900 rounded-lg text-xs font-semibold"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Barre supérieure : Titre + Filtres + Actions Admin */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0 shadow-2xs z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Titre & Compteur */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/40">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Zone Intelligence
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                  Marrakech
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredMedecins.length} médecin{filteredMedecins.length > 1 ? 's' : ''} affiché{filteredMedecins.length > 1 ? 's' : ''} sur {medecins.length} géolocalisé{medecins.length > 1 ? 's' : ''}
                {showAgences && ` · ${agences.length} agence${agences.length > 1 ? 's' : ''} concurrente${agences.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Bascule de coloration : Segment vs Statut */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setColorCriterion('segment')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  colorCriterion === 'segment'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Par Segment
              </button>
              <button
                type="button"
                onClick={() => setColorCriterion('statut')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  colorCriterion === 'statut'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Par Statut
              </button>
            </div>

            {/* Filtres par segment A / B / C / D */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {['A', 'B', 'C', 'D'].map((seg) => {
                const active = selectedSegments.includes(seg);
                const color = SEGMENT_COLORS[seg];
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegmentFilter(seg)}
                    className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-white dark:bg-slate-700 shadow-2xs text-slate-900 dark:text-white'
                        : 'opacity-40 hover:opacity-75 text-slate-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {seg}
                  </button>
                );
              })}
            </div>

            {/* Filtre Statut */}
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PROGRESSION">Progression</option>
              <option value="ACTIF_STABLE">Actif stable</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="SURVEILLANCE">Surveillance</option>
              <option value="RETENTION">Rétention</option>
              <option value="SILENCE_CRITIQUE">Silence critique</option>
              <option value="A_REACTIVER">À réactiver</option>
            </select>

            {/* Toggle Afficher / Masquer Agences */}
            <button
              type="button"
              onClick={() => setShowAgences((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                showAgences
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showAgences ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Agences ({agences.length})</span>
            </button>

            {/* Reset filtres */}
            {(selectedSegments.length < 4 || selectedStatut !== 'ALL' || !showAgences) && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Réinitialiser les filtres"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions Admin */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Sans localisation</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-black">
                  {medecinsSansCoords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={openNewAgencyModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter agence</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barre de navigation rapide par quartier de Marrakech */}
      <div className="bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 scrollbar-thin">
        <span className="font-extrabold text-[11px] text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Navigation className="w-3 h-3 text-teal-600" />
          Quartiers :
        </span>
        <button
          type="button"
          onClick={() => {
            setActiveQuartier(null);
            setMapTarget({ center: MARRAKECH_CENTER, zoom: DEFAULT_ZOOM, id: Date.now() });
          }}
          className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors text-[11px] ${
            !activeQuartier
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Vue d'ensemble
        </button>
        {MARRAKECH_QUARTIERS.map((q) => {
          const isSelected = activeQuartier === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setActiveQuartier(q.id);
                setMapTarget({ center: q.coords, zoom: 14.5, id: Date.now() });
              }}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors text-[11px] ${
                isSelected
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {q.name}
            </button>
          );
        })}
      </div>

      {/* Conteneur Cartographique Principal */}
      <div className="flex-1 relative w-full h-full">
        {loading ? (
          <div className="absolute inset-0 z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Chargement de la carte et des points d'intérêt...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xl max-w-md text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Erreur de chargement</h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        {/* État vide si aucun médecin géolocalisé */}
        {!loading && medecins.length === 0 && (
          <div className="absolute top-6 left-6 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xl max-w-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Aucun médecin géolocalisé
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Les médecins de votre portefeuille n'ont pas encore de coordonnées GPS enregistrées.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Positionner des médecins ({medecinsSansCoords.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={MARRAKECH_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          maxBounds={MARRAKECH_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            bounds={MARRAKECH_BOUNDS}
          />

          {/* Contrôleur de centrage fluide */}
          <MapController targetCenter={mapTarget?.center} targetZoom={mapTarget?.zoom} />

          {/* Gestionnaire d'événements de clic */}
          <MapEventsHandler onMapClick={handleMapClick} />

          {/* Étiquettes repères des quartiers de Marrakech */}
          {MARRAKECH_QUARTIERS.map((q) => (
            <Marker
              key={`quartier-${q.id}`}
              position={q.coords}
              icon={createQuartierLabelIcon(q.name)}
              interactive={false}
            />
          ))}

          {/* Marqueurs des Médecins */}
          {filteredMedecins.map((medecin) => {
            if (medecin.latitude == null || medecin.longitude == null) return null;
            const pinColor = getDoctorPinColor(medecin);
            const label = medecin.segment || 'M';
            const icon = createDoctorPinIcon(pinColor, label, isAdmin);

            return (
              <Marker
                key={`medecin-${medecin.id}`}
                position={[medecin.latitude, medecin.longitude]}
                icon={icon}
                draggable={isAdmin}
                eventHandlers={{
                  dragend: (e) => handleDoctorDragEnd(medecin, e),
                }}
              >
                <Popup className="vactis-map-popup">
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                      <div className="font-black text-slate-900 text-sm">
                        Dr. {medecin.prenom} {medecin.nom}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: SEGMENT_COLORS[(medecin.segment || 'D').toUpperCase()] || '#64748b' }}
                      >
                        SEGMENT {medecin.segment || '—'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <p>
                        <strong className="text-slate-800">Spécialité :</strong> {medecin.specialite || 'Non renseignée'}
                      </p>
                      <p>
                        <strong className="text-slate-800">Établissement :</strong> {medecin.organisme || 'Non renseigné'}
                      </p>
                      <p>
                        <strong className="text-slate-800">Statut :</strong>{' '}
                        <span className="font-semibold text-sky-700">{medecin.statut || '—'}</span>
                      </p>
                      <p>
                        <strong className="text-slate-800">CA mobile :</strong>{' '}
                        <span className="font-black text-emerald-700">
                          {medecin.caMobile != null ? `${medecin.caMobile.toLocaleString()} MAD` : '0 MAD'}
                        </span>
                      </p>
                    </div>

                    {isAdmin && (
                      <p className="text-[10px] text-slate-400 italic mb-2">
                        💡 Astuce admin : vous pouvez faire glisser ce marqueur pour ajuster sa position.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenFiche(medecin)}
                      className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir la fiche complète</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Marqueurs des Agences Concurrentes */}
          {showAgences &&
            agences.map((agency) => {
              if (agency.latitude == null || agency.longitude == null) return null;
              const icon = createCompetitorPinIcon();

              return (
                <Marker
                  key={`agence-${agency.id}`}
                  position={[agency.latitude, agency.longitude]}
                  icon={icon}
                >
                  <Popup className="vactis-map-popup">
                    <div className="p-1 min-w-[220px]">
                      <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2 mb-2">
                        <div className="font-black text-purple-950 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          <span>{agency.nom}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                          Concurrent
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 mb-3">
                        {agency.enseigne && (
                          <p>
                            <strong className="text-slate-800">Enseigne :</strong> {agency.enseigne}
                          </p>
                        )}
                        {agency.adresse && (
                          <p>
                            <strong className="text-slate-800">Adresse :</strong> {agency.adresse}
                          </p>
                        )}
                        {agency.notes && (
                          <p className="p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-700">
                            {agency.notes}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => openEditAgencyModal(agency)}
                            className="flex-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmAgency(agency)}
                            className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                            title="Supprimer cette agence"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </div>

      {/* Panneau latéral : Médecins sans localisation (Admin) */}
      {isAdmin && drawerOpen && (
        <aside className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[1600] flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                Médecins sans localisation ({medecinsSansCoords.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher nom, spécialité, ville..."
                value={searchSansCoords}
                onChange={(e) => setSearchSansCoords(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Cliquez sur <strong>Positionner</strong> puis cliquez à l'endroit désiré sur la carte de Marrakech.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSansCoords.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {medecinsSansCoords.length === 0
                  ? '🎉 Tous les médecins ont été géolocalisés !'
                  : 'Aucun médecin correspondant à la recherche.'}
              </div>
            ) : (
              filteredSansCoords.map((doc) => {
                const isSelected = positioningDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                          Dr. {doc.prenom} {doc.nom}
                        </h5>
                        <p className="text-[11px] text-slate-500">{doc.specialite || 'Spécialité —'}</p>
                        {doc.organisme && (
                          <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                            📍 {doc.organisme} {doc.ville ? `(${doc.ville})` : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-black text-white shrink-0"
                        style={{ backgroundColor: SEGMENT_COLORS[(doc.segment || 'D').toUpperCase()] || '#64748b' }}
                      >
                        {doc.segment || '—'}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      {isSelected ? (
                        <span className="text-[11px] font-bold text-sky-600 animate-pulse">
                          Cliquez sur la carte...
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPositioningDoctor(doc);
                            setDrawerOpen(false);
                            showToast(`Cliquez sur la carte pour définir la position de Dr. ${doc.nom}`);
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Positionner sur la carte</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Modal Ajout / Modification d'agence concurrente */}
      {agencyModalOpen && (
        <div className="fixed inset-0 z-[2500] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>{editingAgencyId ? "Modifier l'agence concurrente" : 'Ajouter une agence concurrente'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAgencyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} className="p-6 space-y-4">
              {agencyError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {agencyError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de l'agence *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex. Laboratoire Al Menara"
                  value={agencyForm.nom}
                  onChange={(e) => setAgencyForm({ ...agencyForm, nom: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enseigne / Réseau (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex. Groupe Bioclinic"
                  value={agencyForm.enseigne}
                  onChange={(e) => setAgencyForm({ ...agencyForm, enseigne: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ex. 31.6295"
                    value={agencyForm.latitude}
                    onChange={(e) => setAgencyForm({ ...agencyForm, latitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ex. -7.9811"
                    value={agencyForm.longitude}
                    onChange={(e) => setAgencyForm({ ...agencyForm, longitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <span>
                  {agencyForm.latitude && agencyForm.longitude
                    ? `📍 Coordonnées définies (${agencyForm.latitude}, ${agencyForm.longitude})`
                    : '💡 Cliquez sur la carte en arrière-plan pour capturer les coordonnées'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAgencyClickPlacementActive(true);
                    showToast('Cliquez maintenant sur la carte pour placer le point.');
                  }}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px]"
                >
                  Placer via clic
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse lisible (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex. 45 Avenue Mohammed VI, Guéliz"
                  value={agencyForm.adresse}
                  onChange={(e) => setAgencyForm({ ...agencyForm, adresse: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Observations de l'admin (optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex. Partenariat agressif sur les analyses spécialisées..."
                  value={agencyForm.notes}
                  onChange={(e) => setAgencyForm({ ...agencyForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAgencyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAgency}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingAgency ? 'Enregistrement...' : editingAgencyId ? 'Mettre à jour' : 'Ajouter l’agence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boîte de confirmation de suppression d'agence */}
      {deleteConfirmAgency && (
        <div className="fixed inset-0 z-[2600] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-base mb-1">
              Supprimer cette agence ?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Êtes-vous sûr de vouloir supprimer définitivement l'agence concurrente «{' '}
              <strong>{deleteConfirmAgency.nom}</strong> » de la carte ?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgency(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAgency}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
