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
  Cross,
  Compass,
  TrendingUp,
  Activity,
  ChevronRight,
  Sparkles,
  Map as MapIcon,
  Maximize2,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  getMedecinsGeolocalises,
  getMedecinsSansLocalisation,
  updateMedecinLocalisation,
  getAgencesConcurrentes,
  getLaboratoireLocation,
  updateLaboratoireLocation,
  createAgenceConcurrente,
  updateAgenceConcurrente,
  deleteAgenceConcurrente,
} from '../../api/zoneIntelligence.js';

// Centrage précis et limitation stricte à la ville de Marrakech et ses quartiers
const MARRAKECH_CENTER = [31.6320, -8.0020];
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

// Bounding box élargie de l'agglomération de Marrakech (permettant un dézoom fluide sans sortir de Marrakech)
const MARRAKECH_BOUNDS = [
  [31.4800, -8.1800], // Sud-Ouest (M'hamid, Chrifia, Targa, Souihla est)
  [31.7800, -7.8500], // Nord-Est (Palmeraie, Sidi Ghanem, Tamansourt est)
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

const SEGMENT_GRADIENTS = {
  A: ['#10b981', '#047857'],
  B: ['#0284c7', '#0369a1'],
  C: ['#f59e0b', '#b45309'],
  D: ['#f43f5e', '#be123c'],
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

// Couleur Agences concurrentes : Violet / Indigo
const CONCURRENCE_COLOR = '#8b5cf6';

// Fonds de carte fiables, rapides et 100% sans filigrane / sans clé API
const MAP_TILES = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap (Clair)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    isDarkFilter: false,
  },
  dark: {
    id: 'dark',
    name: 'Mode Sombre Cyber',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    isDarkFilter: true,
  },
  esri_streets: {
    id: 'esri_streets',
    name: 'Esri Rues (Précision)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: '',
    isDarkFilter: false,
  },
  esri_sat: {
    id: 'esri_sat',
    name: 'Satellite (Photo)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
    subdomains: '',
    isDarkFilter: false,
  },
};

// Création d'icônes SVG haute définition pour les médecins
function createDoctorPinIcon(color, label = '', isDraggable = false, isTop = false) {
  const pinId = `pin-grad-${label}-${Math.abs(color.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))}`;
  const pulseHalo = isTop
    ? `<circle cx="17" cy="42" r="10" fill="${color}" opacity="0.35" class="vactis-radar-ring" />`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 46" width="34" height="46" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
      <defs>
        <linearGradient id="${pinId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.25" />
        </linearGradient>
      </defs>
      ${pulseHalo}
      <path d="M17 2 C9.268 2 3 8.268 3 16 C3 26.5 17 43 17 43 C17 43 31 26.5 31 16 C31 8.268 24.732 2 17 2 Z"
            fill="${color}" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="17" cy="16" r="7.5" fill="#ffffff" />
      <text x="17" y="19.5" text-anchor="middle" font-size="9" font-family="system-ui, -apple-system, sans-serif" font-weight="900" fill="${color}">${label || 'M'}</text>
    </svg>
  `;

  return L.divIcon({
    className: `custom-div-icon ${isDraggable ? 'cursor-grab' : ''}`,
    html: svg,
    iconSize: [34, 46],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40],
  });
}

// Icône haute définition pour les agences concurrentes
function createCompetitorPinIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48" style="filter: drop-shadow(0 6px 10px rgba(124, 58, 237, 0.4));">
      <defs>
        <linearGradient id="comp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#6b21a8" />
        </linearGradient>
      </defs>
      <path d="M18 2 C9.716 2 3 8.716 3 17 C3 28 18 45 18 45 C18 45 33 28 33 17 C33 8.716 26.284 2 18 2 Z"
            fill="url(#comp-grad)" stroke="#ffffff" stroke-width="2.2" />
      <circle cx="18" cy="17" r="8.5" fill="#ffffff" />
      <path d="M14 13 h8 v8 h-8 z M15.5 15 h1.5 v1.5 h-1.5 z M19 15 h1.5 v1.5 h-1.5 z M15.5 18 h1.5 v1.5 h-1.5 z M19 18 h1.5 v1.5 h-1.5 z"
            fill="#7c3aed" />
    </svg>
  `;

  return L.divIcon({
    className: 'custom-div-icon competitor-pin',
    html: svg,
    iconSize: [36, 48],
    iconAnchor: [18, 45],
    popupAnchor: [0, -42],
  });
}

// Balise radar pour le laboratoire central VACTIS
function createLaboratoryPinIcon() {
  const html = `
    <div class="relative flex items-center justify-center w-12 h-12">
      <span class="absolute w-12 h-12 rounded-full bg-teal-500/35 vactis-radar-ring"></span>
      <span class="absolute w-8 h-8 rounded-full bg-teal-600/40 vactis-beacon-halo"></span>
      <div class="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 border-2 border-white shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon laboratory-pin',
    html: html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22],
  });
}

// Étiquette visuelle moderne pour les quartiers de Marrakech
function createQuartierLabelIcon(name) {
  return L.divIcon({
    className: 'custom-quartier-label',
    html: `<div class="px-2.5 py-0.5 rounded-full bg-slate-900/75 dark:bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black border border-white/20 whitespace-nowrap shadow-lg tracking-tight hover:scale-105 transition-transform">${name}</div>`,
    iconSize: [80, 22],
    iconAnchor: [40, 11],
  });
}

// Contrôleur de carte pour animer et centrer sur un quartier ou une entité choisie
function MapController({ targetCenter, targetZoom, targetMarkerKey, markerRefs, targetTimestamp }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, targetZoom || 15.5, { duration: 0.85, easeLinearity: 0.25 });
      if (targetMarkerKey && markerRefs?.current) {
        const timer = setTimeout(() => {
          const marker = markerRefs.current[targetMarkerKey];
          if (marker && typeof marker.openPopup === 'function') {
            marker.openPopup();
          }
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [targetCenter, targetZoom, targetMarkerKey, markerRefs, targetTimestamp, map]);
  return null;
}

// Intercepteur d'événements de clic sur la carte
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
  const { isDark } = useTheme();

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
  const [laboratoireLocation, setLaboratoireLocation] = useState(null);
  const [medecinsSansCoords, setMedecinsSansCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Style de carte
  const [activeTileKey, setActiveTileKey] = useState(isDark ? 'dark' : 'osm');
  const [layerSelectorOpen, setLayerSelectorOpen] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  // Mise à jour automatique si le thème change et que l'utilisateur n'a pas sélectionné un calque spécial
  useEffect(() => {
    setActiveTileKey(isDark ? 'dark' : 'osm');
  }, [isDark]);

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
  const [laboratoryPlacementActive, setLaboratoryPlacementActive] = useState(false);

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

  // Recherche globale Médecins & Labos / Agences
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const markerRefs = useRef({});

  // Fermeture du dropdown lors d'un clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const [docsGeo, listAgences, docsSansLoc, labLocation] = await Promise.all([
        getMedecinsGeolocalises(token),
        getAgencesConcurrentes(token),
        isAdmin ? getMedecinsSansLocalisation(token) : Promise.resolve([]),
        getLaboratoireLocation(token),
      ]);

      setMedecins(docsGeo || []);
      setAgences(listAgences || []);
      setMedecinsSansCoords(docsSansLoc || []);
      setLaboratoireLocation(labLocation || null);
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

          setMedecinsSansCoords((prev) => prev.filter((d) => d.id !== docId));
          setMedecins((prev) => {
            const filtered = prev.filter((d) => d.id !== docId);
            return [...filtered, updated];
          });

          showToast(`Dr. ${positioningDoctor.nom} positionné avec succès.`);
        } catch (err) {
          showToast(`Erreur lors du positionnement : ${err.message}`, 4000);
        } finally {
          setPositioningDoctor(null);
        }
        return;
      }

      // Cas 2 : Mode placement du laboratoire central
      if (laboratoryPlacementActive && isAdmin) {
        try {
          const location = await updateLaboratoireLocation(token, {
            latitude: formattedLat,
            longitude: formattedLng,
          });
          setLaboratoireLocation(location);
          setLaboratoryPlacementActive(false);
          showToast('Localisation du laboratoire enregistrée.');
        } catch (err) {
          showToast(`Erreur lors de l’enregistrement : ${err.message}`, 4000);
        }
        return;
      }

      // Cas 3 : Mode placement direct par clic pour le formulaire d'agence
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
    [positioningDoctor, laboratoryPlacementActive, isAdmin, agencyModalOpen, agencyClickPlacementActive, token, showToast]
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
        loadData();
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
      const seg = (doc.segment || 'D').toUpperCase();
      if (!selectedSegments.includes(seg)) return false;

      if (selectedStatut !== 'ALL') {
        const docStatut = (doc.statut || '').toUpperCase();
        if (docStatut !== selectedStatut) return false;
      }

      return true;
    });
  }, [medecins, selectedSegments, selectedStatut]);

  // Statistiques calculées pour le panneau HUD
  const totalCaMobile = useMemo(() => {
    return filteredMedecins.reduce((sum, d) => sum + (Number(d.caMobile) || 0), 0);
  }, [filteredMedecins]);

  const countsBySegment = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    medecins.forEach((d) => {
      const seg = (d.segment || 'D').toUpperCase();
      if (counts[seg] !== undefined) counts[seg]++;
      else counts.D++;
    });
    return counts;
  }, [medecins]);

  const totalPortfolioDocs = medecins.length + medecinsSansCoords.length;
  const coveragePct = totalPortfolioDocs > 0 ? Math.round((medecins.length / totalPortfolioDocs) * 100) : 100;

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

  // Résultats de la recherche globale (Médecins, Laboratoire central VACTIS, Agences)
  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return { medecinsGeo: [], agencesList: [], labCentral: null, medecinsNonGeo: [], total: 0 };
    }

    // Médecins géolocalisés
    const matchedDocsGeo = medecins.filter((m) => {
      const full = `${m.nom || ''} ${m.prenom || ''} ${m.specialite || ''} ${m.organisme || ''} ${m.ville || ''}`.toLowerCase();
      return full.includes(q);
    });

    // Agences concurrentes
    const matchedAgences = agences.filter((a) => {
      const full = `${a.nom || ''} ${a.enseigne || ''} ${a.adresse || ''}`.toLowerCase();
      return full.includes(q);
    });

    // Laboratoire Central VACTIS
    let matchedLabCentral = null;
    if (laboratoireLocation) {
      const labText = 'laboratoire vactis siege central labo'.toLowerCase();
      if (labText.includes(q)) {
        matchedLabCentral = laboratoireLocation;
      }
    }

    // Médecins sans géolocalisation
    const matchedDocsNonGeo = medecinsSansCoords.filter((m) => {
      const full = `${m.nom || ''} ${m.prenom || ''} ${m.specialite || ''} ${m.organisme || ''} ${m.ville || ''}`.toLowerCase();
      return full.includes(q);
    });

    const total =
      matchedDocsGeo.length +
      matchedAgences.length +
      (matchedLabCentral ? 1 : 0) +
      matchedDocsNonGeo.length;

    return {
      medecinsGeo: matchedDocsGeo.slice(0, 8),
      agencesList: matchedAgences.slice(0, 5),
      labCentral: matchedLabCentral,
      medecinsNonGeo: matchedDocsNonGeo.slice(0, 5),
      total,
    };
  }, [globalSearch, medecins, agences, laboratoireLocation, medecinsSansCoords]);

  // Sélection d'une entité depuis la recherche
  const handleSelectEntity = useCallback(
    (type, item) => {
      setSearchDropdownOpen(false);

      if (type === 'medecin-geo') {
        const seg = (item.segment || '').toUpperCase();
        if (seg && !selectedSegments.includes(seg)) {
          setSelectedSegments((prev) => [...prev, seg]);
        }
        setMapTarget({
          center: [item.latitude, item.longitude],
          zoom: 16,
          markerKey: `medecin-${item.id}`,
          timestamp: Date.now(),
        });
      } else if (type === 'lab-central') {
        setMapTarget({
          center: [item.latitude, item.longitude],
          zoom: 16,
          markerKey: 'labo-central',
          timestamp: Date.now(),
        });
      } else if (type === 'agence') {
        if (!showAgences) {
          setShowAgences(true);
        }
        setMapTarget({
          center: [item.latitude, item.longitude],
          zoom: 16,
          markerKey: `agence-${item.id}`,
          timestamp: Date.now(),
        });
      } else if (type === 'medecin-non-geo') {
        if (isAdmin) {
          setDrawerOpen(true);
          setSearchSansCoords(item.nom || '');
        }
        showToast(
          `Dr. ${item.prenom} ${item.nom} n'est pas encore géolocalisé.${isAdmin ? ' Positionnez-le depuis le panneau.' : ''}`
        );
      }
    },
    [selectedSegments, showAgences, isAdmin, showToast]
  );

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

  const getDoctorPinColor = (medecin) => {
    if (colorCriterion === 'statut') {
      const st = (medecin.statut || 'ACTIF_STABLE').toUpperCase();
      return STATUT_COLORS[st] || '#64748b';
    }
    const seg = (medecin.segment || 'D').toUpperCase();
    return SEGMENT_COLORS[seg] || '#64748b';
  };

  const activeTile = MAP_TILES[activeTileKey] || MAP_TILES.osm;

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] relative overflow-hidden bg-slate-900 font-sans">
      {/* Toast de notification flottant */}
      {toastMessage && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[3000] bg-slate-950/90 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 backdrop-blur-xl border border-teal-500/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bannière Mode Positionnement Médecin */}
      {positioningDoctor && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[2500] bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs sm:text-sm border border-white/30 backdrop-blur-md animate-pulse">
          <Navigation className="w-5 h-5 text-sky-200 animate-spin shrink-0" />
          <span>
            <strong>Mode ciblage :</strong> Cliquez sur la carte pour positionner{' '}
            <strong className="underline decoration-sky-300">Dr. {positioningDoctor.prenom} {positioningDoctor.nom}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPositioningDoctor(null)}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Barre supérieure principale (Glassmorphism & Contrôles tactiques) */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0 shadow-sm z-20 transition-colors">
        {/* Barre de recherche globale Médecins & Labos */}
        <div ref={searchContainerRef} className="relative mb-3">
          <div className={`flex items-center gap-2 rounded-2xl border transition-all px-3 py-2 ${
            searchDropdownOpen
              ? 'bg-white dark:bg-slate-800 border-teal-400 shadow-lg shadow-teal-500/10 ring-2 ring-teal-400/20'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-teal-300'
          }`}>
            <Search className="w-4 h-4 text-teal-500 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un médecin, laboratoire ou agence…"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setSearchDropdownOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => globalSearch.trim().length > 0 && setSearchDropdownOpen(true)}
              className="flex-1 bg-transparent outline-none text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-w-0"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => { setGlobalSearch(''); setSearchDropdownOpen(false); }}
                className="p-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {globalSearch && searchResults.total > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 shrink-0">
                {searchResults.total}
              </span>
            )}
          </div>

          {/* Dropdown résultats */}
          {searchDropdownOpen && globalSearch.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 z-[4000] mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto">
              {searchResults.total === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Search className="w-6 h-6 opacity-30" />
                  <span>Aucun résultat pour <strong>&quot;{globalSearch}&quot;</strong></span>
                </div>
              ) : (
                <>
                  {/* Médecins géolocalisés */}
                  {searchResults.medecinsGeo.length > 0 && (
                    <div>
                      <div className="px-3 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="w-3 h-3 text-teal-500" /> Médecins géolocalisés
                      </div>
                      {searchResults.medecinsGeo.map((m) => (
                        <button
                          key={`sr-doc-${m.id}`}
                          type="button"
                          onClick={() => handleSelectEntity('medecin-geo', m)}
                          className="w-full text-left px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center gap-3 transition-colors group"
                        >
                          <span
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                            style={{ backgroundColor: SEGMENT_COLORS[(m.segment || 'D').toUpperCase()] || '#64748b' }}
                          >
                            {m.segment || 'D'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              Dr. {m.prenom} {m.nom}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{m.specialite || 'Spécialité n/r'}{m.organisme ? ` · ${m.organisme}` : ''}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 ml-auto shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Agences concurrentes */}
                  {searchResults.agencesList.length > 0 && (
                    <div className={searchResults.medecinsGeo.length > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
                      <div className="px-3 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-purple-500" /> Agences concurrentes
                      </div>
                      {searchResults.agencesList.map((a) => (
                        <button
                          key={`sr-ag-${a.id}`}
                          type="button"
                          onClick={() => handleSelectEntity('agence', a)}
                          className="w-full text-left px-3 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-3 transition-colors group"
                        >
                          <span className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.nom}</p>
                            <p className="text-[10px] text-slate-500 truncate">{a.enseigne || 'Concurrent'}{a.adresse ? ` · ${a.adresse}` : ''}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-500 ml-auto shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Laboratoire central VACTIS */}
                  {searchResults.labCentral && (
                    <div className={(searchResults.medecinsGeo.length > 0 || searchResults.agencesList.length > 0) ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
                      <div className="px-3 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Laboratoire VACTIS
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectEntity('lab-central', searchResults.labCentral)}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-3 transition-colors group"
                      >
                        <span className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center font-black text-teal-700 dark:text-teal-300 shrink-0 text-sm">+</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Laboratoire Central VACTIS</p>
                          <p className="text-[10px] text-slate-500">Siège opérationnel</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 ml-auto shrink-0 transition-colors" />
                      </button>
                    </div>
                  )}

                  {/* Médecins sans géolocalisation */}
                  {searchResults.medecinsNonGeo.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      <div className="px-3 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-amber-500" /> Sans géolocalisation
                      </div>
                      {searchResults.medecinsNonGeo.map((m) => (
                        <button
                          key={`sr-nongeo-${m.id}`}
                          type="button"
                          onClick={() => handleSelectEntity('medecin-non-geo', m)}
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-3 transition-colors group"
                        >
                          <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Dr. {m.prenom} {m.nom}</p>
                            <p className="text-[10px] text-slate-500 truncate">{m.specialite || 'Spécialité n/r'} · Non positionné sur la carte</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 ml-auto shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Titre & Compteurs */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
                  Zone Intelligence
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60">
                    Marrakech
                  </span>
                </h1>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-bold text-slate-900 dark:text-slate-200">{filteredMedecins.length}</span> médecin{filteredMedecins.length > 1 ? 's' : ''} affiché{filteredMedecins.length > 1 ? 's' : ''} sur {medecins.length} géolocalisé{medecins.length > 1 ? 's' : ''}
                {showAgences && (
                  <span> · <strong className="text-purple-600 dark:text-purple-400">{agences.length}</strong> agence{agences.length > 1 ? 's' : ''}</span>
                )}
                <span> · Couverture <strong className="text-teal-600 dark:text-teal-400">{coveragePct}%</strong></span>
              </p>
            </div>
          </div>

          {/* Filtres & Commandes rapides */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Bascule de coloration */}
            <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-800/90 p-1 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setColorCriterion('segment')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all ${
                  colorCriterion === 'segment'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Par Segment
              </button>
              <button
                type="button"
                onClick={() => setColorCriterion('statut')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all ${
                  colorCriterion === 'statut'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Par Statut
              </button>
            </div>

            {/* Filtres par segment A / B / C / D avec compteurs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              {['A', 'B', 'C', 'D'].map((seg) => {
                const active = selectedSegments.includes(seg);
                const color = SEGMENT_COLORS[seg];
                const count = countsBySegment[seg] || 0;
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegmentFilter(seg)}
                    className={`px-2.5 py-1 rounded-xl font-black text-[11px] transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10'
                        : 'opacity-40 hover:opacity-75 text-slate-500'
                    }`}
                    title={`Segment ${seg} : ${count} médecin(s)`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: color }} />
                    <span>{seg}</span>
                    <span className="text-[10px] font-bold opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Filtre Statut */}
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-2xl px-3 py-1.5 font-bold text-xs focus:ring-2 focus:ring-teal-500 outline-none shadow-2xs cursor-pointer"
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
              className={`px-3 py-1.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs ${
                showAgences
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 ring-1 ring-purple-400/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showAgences ? <Eye className="w-3.5 h-3.5 text-purple-600" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Agences ({agences.length})</span>
            </button>

            {/* Reset filtres */}
            {(selectedSegments.length < 4 || selectedStatut !== 'ALL' || !showAgences) && (
              <button
                type="button"
                onClick={resetFilters}
                className="p-2 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Réinitialiser les filtres"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Actions Admin */}
            {isAdmin && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sans localisation</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800/80 text-[10px] font-black">
                    {medecinsSansCoords.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openNewAgencyModal}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter agence</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLaboratoryPlacementActive(true);
                    showToast('Cliquez sur la carte pour placer le laboratoire VACTIS.');
                  }}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Cross className="w-3.5 h-3.5" />
                  <span>{laboratoireLocation ? 'Modifier labo' : 'Localiser le labo'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Barre de navigation rapide par quartier de Marrakech */}
      <nav className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 scrollbar-none z-10 transition-colors">
        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1 mr-1">
          <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Quartiers :
        </span>
        <button
          type="button"
          onClick={() => {
            setActiveQuartier(null);
            setMapTarget({ center: MARRAKECH_CENTER, zoom: DEFAULT_ZOOM, id: Date.now() });
          }}
          className={`px-3 py-1 rounded-xl font-black shrink-0 transition-all text-[11px] ${
            !activeQuartier
              ? 'bg-teal-600 text-white shadow-xs scale-102 ring-2 ring-teal-500/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700'
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
              className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-all text-[11px] ${
                isSelected
                  ? 'bg-teal-600 text-white shadow-xs scale-102 ring-2 ring-teal-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700'
              }`}
            >
              {q.name}
            </button>
          );
        })}
      </nav>

      {/* Conteneur Cartographique Principal */}
      <div className="flex-1 relative w-full h-full bg-slate-100 dark:bg-slate-950">
        {loading ? (
          <div className="absolute inset-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Génération de la cartographie médicale...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xs">
            <div className="p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl shadow-2xl max-w-md text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Erreur de chargement</h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        {/* État vide si aucun médecin géolocalisé */}
        {!loading && medecins.length === 0 && (
          <div className="absolute top-6 left-6 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xl max-w-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Aucun médecin géolocalisé
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Votre portefeuille ne comporte pas encore de coordonnées GPS actives sur Marrakech.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="mt-3.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-2xl shadow-xs transition-all"
                  >
                    Positionner des médecins ({medecinsSansCoords.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HUD Widget : Intelligence Décisionnelle Flottante (Haut Droite) */}
        {!loading && (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xl w-64 transition-all">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Synthèse Zone
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHudCollapsed((prev) => !prev)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={hudCollapsed ? 'Déplier le panneau' : 'Replier le panneau'}
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${hudCollapsed ? 'rotate-90' : '-rotate-90'}`} />
                </button>
              </div>

              {!hudCollapsed && (
                <div className="space-y-3">
                  {/* CA Mobile */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                      CA Mobile Affiché
                    </span>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {totalCaMobile.toLocaleString('fr-FR')} MAD
                    </div>
                  </div>

                  {/* Taux de couverture */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                      <span>Couverture Géo Portefeuille</span>
                      <span className="font-black text-slate-900 dark:text-white">{coveragePct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${coveragePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini-légende des segments */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black">
                    <span className="text-emerald-600">A : {countsBySegment.A}</span>
                    <span className="text-sky-600">B : {countsBySegment.B}</span>
                    <span className="text-amber-600">C : {countsBySegment.C}</span>
                    <span className="text-rose-600">D : {countsBySegment.D}</span>
                  </div>

                  {laboratoireLocation && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-teal-700 dark:text-teal-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                      <span>Laboratoire central positionné</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sélecteur de Calques Flottant (Bas Gauche) */}
        {!loading && (
          <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2">
            {layerSelectorOpen && (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3 shadow-2xl mb-1 w-52 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-2 mb-1">
                  Style de carte
                </span>
                {Object.values(MAP_TILES).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTileKey(t.id);
                      setLayerSelectorOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      activeTileKey === t.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.name}</span>
                    {activeTileKey === t.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setLayerSelectorOpen((prev) => !prev)}
              className="px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-teal-600 flex items-center gap-2 transition-all hover:scale-102"
              title="Changer le style de carte"
            >
              <Layers className="w-4 h-4 text-teal-600" />
              <span>{activeTile.name}</span>
            </button>
          </div>
        )}

        {/* Map Leaflet */}
        <MapContainer
          center={MARRAKECH_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          maxBounds={MARRAKECH_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          className={`w-full h-full ${activeTile.isDarkFilter ? 'vactis-map-dark' : ''}`}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={activeTile.id}
            attribution={activeTile.attribution}
            url={activeTile.url}
            subdomains={activeTile.subdomains}
          />

          {/* Contrôleur de centrage fluide */}
          <MapController
            targetCenter={mapTarget?.center}
            targetZoom={mapTarget?.zoom}
            targetMarkerKey={mapTarget?.markerKey}
            markerRefs={markerRefs}
            targetTimestamp={mapTarget?.timestamp}
          />

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

          {/* Marqueur Laboratoire Central VACTIS */}
          {laboratoireLocation && (
            <Marker
              position={[laboratoireLocation.latitude, laboratoireLocation.longitude]}
              icon={createLaboratoryPinIcon()}
              ref={(m) => { if (m) markerRefs.current['labo-central'] = m; }}
            >
              <Popup className="vactis-map-popup">
                <div className="p-2 min-w-[210px] space-y-2">
                  <div className="flex items-center gap-2 border-b border-teal-100 dark:border-teal-900/50 pb-2">
                    <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                      +
                    </div>
                    <div>
                      <h4 className="font-black text-teal-900 dark:text-teal-200 text-sm">
                        Laboratoire VACTIS
                      </h4>
                      <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                        Siège Opérationnel
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Point de référence géographique pour le calcul des tournées et de la proximité prescripteurs.
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setLaboratoryPlacementActive(true);
                        showToast('Cliquez sur la carte pour déplacer le laboratoire.');
                      }}
                      className="w-full py-1 px-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-xl transition-colors"
                    >
                      Repositionner le laboratoire
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marqueurs des Médecins */}
          {filteredMedecins.map((medecin) => {
            if (medecin.latitude == null || medecin.longitude == null) return null;
            const pinColor = getDoctorPinColor(medecin);
            const label = medecin.segment || 'M';
            const isTopDoctor = (medecin.segment || '').toUpperCase() === 'A';
            const icon = createDoctorPinIcon(pinColor, label, isAdmin, isTopDoctor);

            return (
              <Marker
                key={`medecin-${medecin.id}`}
                position={[medecin.latitude, medecin.longitude]}
                icon={icon}
                draggable={isAdmin}
                ref={(m) => { if (m) markerRefs.current[`medecin-${medecin.id}`] = m; }}
                eventHandlers={{
                  dragend: (e) => handleDoctorDragEnd(medecin, e),
                }}
              >
                <Popup className="vactis-map-popup">
                  <div className="p-1 min-w-[240px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          Dr. {medecin.prenom} {medecin.nom}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {medecin.specialite || 'Spécialité non renseignée'}
                        </span>
                      </div>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-2xs"
                        style={{ backgroundColor: SEGMENT_COLORS[(medecin.segment || 'D').toUpperCase()] || '#64748b' }}
                      >
                        SEGMENT {medecin.segment || '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">CA Mobile</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {medecin.caMobile != null ? `${Number(medecin.caMobile).toLocaleString('fr-FR')} MAD` : '0 MAD'}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Statut</span>
                        <span className="font-bold text-sky-700 dark:text-sky-300 text-[11px] truncate block">
                          {(medecin.statut || '—').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {medecin.organisme && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{medecin.organisme}</span>
                      </p>
                    )}

                    {isAdmin && (
                      <p className="text-[10px] text-slate-400 italic mb-2.5">
                        Astuce : glissez ce repère pour ajuster sa position.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenFiche(medecin)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all hover:shadow-md"
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
                  ref={(m) => { if (m) markerRefs.current[`agence-${agency.id}`] = m; }}
                >
                  <Popup className="vactis-map-popup">
                    <div className="p-1 min-w-[240px]">
                      <div className="flex items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/60 pb-2 mb-2">
                        <div className="font-black text-purple-950 dark:text-purple-200 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          <span>{agency.nom}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                          Concurrent
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-3">
                        {agency.enseigne && (
                          <p>
                            <strong className="text-slate-800 dark:text-slate-200">Enseigne :</strong> {agency.enseigne}
                          </p>
                        )}
                        {agency.adresse && (
                          <p>
                            <strong className="text-slate-800 dark:text-slate-200">Adresse :</strong> {agency.adresse}
                          </p>
                        )}
                        {agency.notes && (
                          <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                            {agency.notes}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => openEditAgencyModal(agency)}
                            className="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmAgency(agency)}
                            className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
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
        <aside className="absolute right-0 top-0 bottom-0 w-84 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[2200] flex flex-col animate-in slide-in-from-right duration-250">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                Sans localisation ({medecinsSansCoords.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher nom, spécialité, ville..."
                value={searchSansCoords}
                onChange={(e) => setSearchSansCoords(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
              Cliquez sur <strong>Positionner</strong> puis cliquez sur la carte pour marquer les coordonnées exactes du cabinet.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 scrollbar-thin">
            {filteredSansCoords.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-slate-400">
                {medecinsSansCoords.length === 0 ? (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Tous les médecins sont géolocalisés !
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Le taux de couverture cartographique est de 100%.
                    </p>
                  </div>
                ) : (
                  'Aucun médecin correspondant à votre recherche.'
                )}
              </div>
            ) : (
              filteredSansCoords.map((doc) => {
                const isSelected = positioningDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-black text-slate-900 dark:text-white text-xs">
                          Dr. {doc.prenom} {doc.nom}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-medium">{doc.specialite || 'Spécialité —'}</p>
                        {doc.organisme && (
                          <p className="text-[10px] text-teal-700 dark:text-teal-400 font-bold mt-1">
                            {doc.organisme} {doc.ville ? `(${doc.ville})` : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-black text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: SEGMENT_COLORS[(doc.segment || 'D').toUpperCase()] || '#64748b' }}
                      >
                        {doc.segment || '—'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      {isSelected ? (
                        <span className="text-[11px] font-black text-sky-600 animate-pulse flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 animate-spin" />
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
                          className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[11px] font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-[3500] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>{editingAgencyId ? "Modifier l'agence concurrente" : 'Ajouter une agence concurrente'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAgencyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} className="p-6 space-y-4">
              {agencyError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  {agencyError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom de l'agence *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex. Laboratoire Al Menara"
                  value={agencyForm.nom}
                  onChange={(e) => setAgencyForm({ ...agencyForm, nom: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Enseigne / Réseau (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex. Groupe Bioclinic"
                  value={agencyForm.enseigne}
                  onChange={(e) => setAgencyForm({ ...agencyForm, enseigne: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ex. 31.6295"
                    value={agencyForm.latitude}
                    onChange={(e) => setAgencyForm({ ...agencyForm, latitude: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ex. -7.9811"
                    value={agencyForm.longitude}
                    onChange={(e) => setAgencyForm({ ...agencyForm, longitude: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <span className="font-semibold text-[11px]">
                  {agencyForm.latitude && agencyForm.longitude
                    ? `Coordonnées définies (${agencyForm.latitude}, ${agencyForm.longitude})`
                    : 'Cliquez sur la carte pour capturer les coordonnées'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAgencyClickPlacementActive(true);
                    showToast('Cliquez maintenant sur la carte pour positionner le point.');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[11px] shadow-xs"
                >
                  Placer via clic
                </button>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Adresse lisible (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex. 45 Avenue Mohammed VI, Guéliz"
                  value={agencyForm.adresse}
                  onChange={(e) => setAgencyForm({ ...agencyForm, adresse: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes d'intelligence concurrentielle
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex. Tarifs agressifs, forte présence sur les cliniques du nord..."
                  value={agencyForm.notes}
                  onChange={(e) => setAgencyForm({ ...agencyForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAgencyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingAgency}
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl shadow-xs disabled:opacity-50 transition-all"
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
        <div className="fixed inset-0 z-[3600] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-base mb-1">
              Supprimer cette agence ?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer l'agence concurrente «{' '}
              <strong className="text-slate-900 dark:text-white">{deleteConfirmAgency.nom}</strong> » de la cartographie ?
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmAgency(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAgency}
                className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-xs transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
