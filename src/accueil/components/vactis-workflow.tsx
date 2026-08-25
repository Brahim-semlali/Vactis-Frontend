"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Database,
  Film,
  Gauge,
  GitCompareArrows,
  History,
  ListChecks,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Data model                                                         */
/* ------------------------------------------------------------------ */

type Step = {
  id: number
  title: string
  short: string
  icon: LucideIcon
  accent: string // hex — tuned for legibility on white
  nx: number
  ny: number
  detail: {
    intro: string
    points: string[]
    output: string
  }
}

const LANE_TOP = 0.3
const LANE_BOTTOM = 0.74

const STEPS: Step[] = [
  {
    id: 1,
    title: "Entrée DATA",
    short: "Facturation · profils · retours terrain",
    icon: Database,
    accent: "#0d9488",
    nx: 0.08,
    ny: LANE_TOP,
    detail: {
      intro:
        "Point d'entrée du moteur. On collecte l'ensemble des signaux bruts disponibles sur chaque médecin.",
      points: [
        "Lignes de facturation détaillées par acte",
        "Profils médecins et référentiel du portefeuille",
        "Retours terrain remontés par les commerciaux",
      ],
      output: "Jeu de données consolidé, prêt à normaliser",
    },
  },
  {
    id: 2,
    title: "Normalisation",
    short: "Mise à l'échelle du portefeuille",
    icon: SlidersHorizontal,
    accent: "#0891b2",
    nx: 0.29,
    ny: LANE_TOP - 0.055,
    detail: {
      intro:
        "On ramène toutes les métriques sur une échelle comparable pour neutraliser les effets de taille.",
      points: [
        "Normalisation min-max sur le portefeuille",
        "Neutralisation des écarts de volume",
        "Gestion des valeurs aberrantes et manquantes",
      ],
      output: "Métriques comparables entre tous les médecins",
    },
  },
  {
    id: 3,
    title: "Agrégation",
    short: "CA mensuel moyen par médecin",
    icon: CalendarRange,
    accent: "#0284c7",
    nx: 0.5,
    ny: LANE_TOP,
    detail: {
      intro:
        "Les données sont regroupées par médecin et par mois pour construire la série temporelle de référence.",
      points: [
        "Chiffre d'affaires mensuel moyen par médecin",
        "Volume d'actes agrégé sur la période",
        "Base temporelle pour le calcul des tendances",
      ],
      output: "Séries mensuelles par médecin",
    },
  },
  {
    id: 4,
    title: "Références",
    short: "Moyenne glissante M-1 → M-3",
    icon: History,
    accent: "#2563eb",
    nx: 0.71,
    ny: LANE_TOP - 0.055,
    detail: {
      intro:
        "On établit une base de comparaison robuste via une moyenne glissante sur les trois mois précédents.",
      points: [
        "Moyenne glissante M-1, M-2, M-3",
        "Lissage des variations ponctuelles",
        "Référentiel individuel par médecin",
      ],
      output: "Valeur de référence par médecin",
    },
  },
  {
    id: 5,
    title: "Variations",
    short: "Delta CA & volume vs référence",
    icon: GitCompareArrows,
    accent: "#4f46e5",
    nx: 0.92,
    ny: LANE_TOP,
    detail: {
      intro:
        "Comparaison de la période courante à la référence pour détecter les mouvements significatifs.",
      points: [
        "Delta de chiffre d'affaires vs référence",
        "Delta de volume d'actes",
        "Détection des ruptures de tendance",
      ],
      output: "Signaux de variation par médecin",
    },
  },
  {
    id: 6,
    title: "Statut",
    short: "8 statuts VACTIS automatiques",
    icon: Activity,
    accent: "#7c3aed",
    nx: 0.92,
    ny: LANE_BOTTOM,
    detail: {
      intro:
        "Chaque médecin se voit attribuer l'un des 8 statuts qui résume sa dynamique commerciale.",
      points: [
        "Progression · Actif stable · Surveillance · Rétention",
        "Silence critique · Onboarding · À réactiver · Exclu",
        "Statut recalculé à chaque cycle mensuel",
      ],
      output: "Statut VACTIS attribué",
    },
  },
  {
    id: 7,
    title: "Silence & Risque",
    short: "Indice de rupture du rythme",
    icon: Radio,
    accent: "#9333ea",
    nx: 0.71,
    ny: LANE_BOTTOM + 0.055,
    detail: {
      intro:
        "On mesure la rupture de rythme d'activité pour anticiper le décrochage d'un médecin.",
      points: [
        "Indice de silence basé sur l'inactivité",
        "Score de risque de rupture",
        "Priorisation des médecins à risque",
      ],
      output: "Indice de risque par médecin",
    },
  },
  {
    id: 8,
    title: "Segment & Fiabilité",
    short: "Segment ABCD · score /100",
    icon: ShieldCheck,
    accent: "#c026d3",
    nx: 0.5,
    ny: LANE_BOTTOM,
    detail: {
      intro:
        "Segmentation du portefeuille et évaluation de la fiabilité de la relation commerciale.",
      points: ["Segment A / B / C / D", "Score de fiabilité sur 100", "Base de la stratégie de couverture"],
      output: "Segment + score de fiabilité",
    },
  },
  {
    id: 9,
    title: "Score de valeur",
    short: "40% Potentiel + 40% Perf + 20% Éco",
    icon: Gauge,
    accent: "#db2777",
    nx: 0.29,
    ny: LANE_BOTTOM + 0.055,
    detail: {
      intro:
        "Score composite qui synthétise la valeur commerciale d'un médecin pour le laboratoire.",
      points: ["40 % Potentiel de développement", "40 % Performance actuelle", "20 % Poids économique"],
      output: "Score de valeur consolidé",
    },
  },
  {
    id: 10,
    title: "Actions",
    short: "Plan commercial généré",
    icon: ListChecks,
    accent: "#ea580c",
    nx: 0.08,
    ny: LANE_BOTTOM,
    detail: {
      intro:
        "Le moteur transforme l'analyse en plan d'action concret, priorisé pour les équipes terrain.",
      points: [
        "Tâches commerciales priorisées",
        "Recommandations par médecin et par segment",
        "Boucle de retour vers le prochain cycle",
      ],
      output: "Plan d'action commercial généré",
    },
  },
]

const ACCENTS = STEPS.map((s) => s.accent)

/* ------------------------------------------------------------------ */
/*  Cinematic timeline — the "movie"                                   */
/* ------------------------------------------------------------------ */

type Scene =
  | { kind: "intro"; label: string; title: string; sub: string; duration: number }
  | { kind: "step"; stepId: number; duration: number }
  | { kind: "outro"; label: string; title: string; sub: string; duration: number }

const SCENES: Scene[] = [
  {
    kind: "intro",
    label: "MOTEUR VACTIS",
    title: "De la donnée brute au plan d'action",
    sub: "Suivez une donnée qui traverse les 10 transformations du moteur, mois après mois.",
    duration: 3400,
  },
  ...STEPS.map((s): Scene => ({ kind: "step", stepId: s.id, duration: 4200 })),
  {
    kind: "outro",
    label: "CYCLE MENSUEL",
    title: "Puis tout recommence",
    sub: "Le plan nourrit le terrain, le terrain nourrit la donnée. Chaque mois, chaque médecin est recalculé.",
    duration: 4200,
  },
]

const CAM_SCALE = 1.62

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

type Pt = { x: number; y: number }

const MAIN_ANCHORS: Pt[] = [
  { x: 0.08, y: LANE_TOP },
  { x: 0.29, y: LANE_TOP - 0.055 },
  { x: 0.5, y: LANE_TOP },
  { x: 0.71, y: LANE_TOP - 0.055 },
  { x: 0.92, y: LANE_TOP },
  { x: 0.985, y: 0.52 },
  { x: 0.92, y: LANE_BOTTOM },
  { x: 0.71, y: LANE_BOTTOM + 0.055 },
  { x: 0.5, y: LANE_BOTTOM },
  { x: 0.29, y: LANE_BOTTOM + 0.055 },
  { x: 0.08, y: LANE_BOTTOM },
]

const RETURN_ANCHORS: Pt[] = [
  { x: 0.08, y: LANE_BOTTOM },
  { x: 0.015, y: 0.52 },
  { x: 0.08, y: LANE_TOP },
]

function catmull(pts: Pt[], segments: number): Pt[] {
  const n = pts.length
  if (n < 2) return pts.slice()
  const get = (i: number) => pts[Math.max(0, Math.min(n - 1, i))]
  const out: Pt[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    for (let s = 0; s < segments; s++) {
      const t = s / segments
      const t2 = t * t
      const t3 = t2 * t
      const x =
        0.5 *
        (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
      const y =
        0.5 *
        (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      out.push({ x, y })
    }
  }
  out.push(get(n - 1))
  return out
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const RGB = ACCENTS.map(hexToRgb)

function accentAt(u: number): [number, number, number] {
  const n = RGB.length
  const clamped = Math.max(0, Math.min(1, u))
  const idx = clamped * (n - 1)
  const i = Math.floor(idx)
  const f = idx - i
  const a = RGB[i]
  const b = RGB[Math.min(n - 1, i + 1)]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

function buildPixelPath(anchors: Pt[], w: number, h: number, segments: number) {
  const norm = catmull(anchors, segments)
  const pts = norm.map((p) => ({ x: p.x * w, y: p.y * h }))
  const cum: number[] = [0]
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    cum.push(len)
  }
  return { pts, cum, len }
}

function pointAtLength(path: { pts: Pt[]; cum: number[]; len: number }, dist: number): Pt {
  const { pts, cum, len } = path
  const d = Math.max(0, Math.min(len, dist))
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < d) lo = mid + 1
    else hi = mid
  }
  const i = Math.max(1, lo)
  const seg = cum[i] - cum[i - 1] || 1
  const f = (d - cum[i - 1]) / seg
  const a = pts[i - 1]
  const b = pts[i]
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
}

/* ------------------------------------------------------------------ */
/*  Size hook                                                          */
/* ------------------------------------------------------------------ */

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, size }
}

/* ------------------------------------------------------------------ */
/*  Canvas engine — the flowing river of data (light theme)            */
/* ------------------------------------------------------------------ */

type Particle = { p: number; speed: number; size: number; wobble: number }

const GREY: [number, number, number] = [148, 163, 184]

function EngineCanvas({
  width,
  height,
  activeId,
  hoveredId,
}: {
  width: number
  height: number
  activeId: number | null
  hoveredId: number | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const highlightRef = useRef<{ active: number | null; hovered: number | null }>({
    active: null,
    hovered: null,
  })
  highlightRef.current = { active: activeId, hovered: hoveredId }

  const paths = useMemo(() => {
    if (!width || !height) return null
    const main = buildPixelPath(MAIN_ANCHORS, width, height, 36)
    const ret = buildPixelPath(RETURN_ANCHORS, width, height, 36)
    const total = main.len + ret.len
    return { main, ret, total, mainFrac: main.len / total }
  }, [width, height])

  if (particlesRef.current.length === 0) {
    const arr: Particle[] = []
    const count = 110
    for (let i = 0; i < count; i++) {
      arr.push({
        p: i / count,
        speed: 0.04 + Math.random() * 0.03,
        size: 1.2 + Math.random() * 2.6,
        wobble: Math.random() * Math.PI * 2,
      })
    }
    particlesRef.current = arr
  }

  const nodePx = useMemo(
    () => STEPS.map((s) => ({ id: s.id, x: s.nx * width, y: s.ny * height })),
    [width, height],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !paths || !width || !height) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let last = performance.now()

    const trace = (pts: Pt[]) => {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    }

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, width, height)

      // --- river bed: soft wide chromatic ribbon
      const g = ctx.createLinearGradient(0, 0, width, height)
      ACCENTS.forEach((_, i) => {
        const [r, gg, b] = RGB[i]
        g.addColorStop(i / (ACCENTS.length - 1), `rgba(${r},${gg},${b},0.14)`)
      })
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      trace(paths.main.pts)
      ctx.lineWidth = 16
      ctx.strokeStyle = g
      ctx.stroke()

      // crisp gradient core
      const g2 = ctx.createLinearGradient(0, 0, width, height)
      ACCENTS.forEach((_, i) => {
        const [r, gg, b] = RGB[i]
        g2.addColorStop(i / (ACCENTS.length - 1), `rgba(${r},${gg},${b},0.55)`)
      })
      trace(paths.main.pts)
      ctx.lineWidth = 2
      ctx.strokeStyle = g2
      ctx.stroke()

      // animated directional dashes riding the core
      if (!reduced) {
        ctx.save()
        trace(paths.main.pts)
        ctx.setLineDash([2, 26])
        ctx.lineDashOffset = -(now / 22) % 28
        ctx.lineWidth = 3.5
        ctx.strokeStyle = "rgba(255,255,255,0.9)"
        ctx.stroke()
        ctx.restore()
      }

      // --- return loop (monthly cycle): dashed teal
      ctx.save()
      ctx.setLineDash([4, 10])
      ctx.lineDashOffset = reduced ? 0 : (now / 34) % 14
      trace(paths.ret.pts)
      ctx.lineWidth = 1.75
      ctx.strokeStyle = "rgba(13,148,136,0.5)"
      ctx.stroke()
      ctx.restore()

      // --- node halos (soft colored blooms behind DOM hubs)
      const { active, hovered } = highlightRef.current
      nodePx.forEach((n, i) => {
        const isHi = n.id === active || n.id === hovered
        const [r, gg, b] = RGB[i]
        const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 620 + i)
        const rad = (isHi ? 52 : 34) + (isHi ? pulse * 12 : pulse * 5)
        const hg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad)
        hg.addColorStop(0, `rgba(${r},${gg},${b},${isHi ? 0.32 : 0.16})`)
        hg.addColorStop(1, `rgba(${r},${gg},${b},0)`)
        ctx.fillStyle = hg
        ctx.beginPath()
        ctx.arc(n.x, n.y, rad, 0, Math.PI * 2)
        ctx.fill()
      })

      // --- particles: vivid colored dots with soft glow (source-over)
      const parts = particlesRef.current
      for (const part of parts) {
        if (!reduced) {
          part.p = (part.p + (part.speed * dt) / 1) % 1
          part.wobble += dt * 2
        }
        let pt: Pt
        let color: [number, number, number]
        let alpha: number
        if (part.p < paths.mainFrac) {
          const local = part.p / paths.mainFrac
          pt = pointAtLength(paths.main, local * paths.main.len)
          color = accentAt(local)
          alpha = 0.95
        } else {
          const local = (part.p - paths.mainFrac) / (1 - paths.mainFrac)
          pt = pointAtLength(paths.ret, local * paths.ret.len)
          const start = accentAt(1)
          color = [
            start[0] + (GREY[0] - start[0]) * local,
            start[1] + (GREY[1] - start[1]) * local,
            start[2] + (GREY[2] - start[2]) * local,
          ]
          alpha = 0.55 * (1 - local) + 0.25
        }
        // subtle perpendicular wobble for a living feel
        const wob = reduced ? 0 : Math.sin(part.wobble) * 1.4
        const [r, gg, b] = color
        const rad = part.size * 3.4
        const rg = ctx.createRadialGradient(pt.x, pt.y + wob, 0, pt.x, pt.y + wob, rad)
        rg.addColorStop(0, `rgba(${r | 0},${gg | 0},${b | 0},${alpha})`)
        rg.addColorStop(0.4, `rgba(${r | 0},${gg | 0},${b | 0},${alpha * 0.5})`)
        rg.addColorStop(1, `rgba(${r | 0},${gg | 0},${b | 0},0)`)
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(pt.x, pt.y + wob, rad, 0, Math.PI * 2)
        ctx.fill()
        // bright solid core
        ctx.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${Math.min(1, alpha + 0.05)})`
        ctx.beginPath()
        ctx.arc(pt.x, pt.y + wob, Math.max(0.7, part.size * 0.6), 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paths, width, height, nodePx])

  return <canvas ref={canvasRef} style={{ width, height }} className="absolute inset-0" aria-hidden />
}

/* ------------------------------------------------------------------ */
/*  Node hub (DOM overlay)                                             */
/* ------------------------------------------------------------------ */

function NodeHub({
  step,
  index,
  isActive,
  isHovered,
  dimmed,
  onSelect,
  onHover,
}: {
  step: Step
  index: number
  isActive: boolean
  isHovered: boolean
  dimmed?: boolean
  onSelect: () => void
  onHover: (v: boolean) => void
}) {
  const Icon = step.icon
  const topLane = step.ny < 0.5
  const lifted = isActive || isHovered
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: dimmed ? 0.28 : 1, scale: 1, filter: dimmed ? "saturate(0.6)" : "saturate(1)" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      aria-expanded={isActive}
      aria-label={`Étape ${step.id} : ${step.title}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{ left: `${step.nx * 100}%`, top: `${step.ny * 100}%` }}
    >
      <span
        className="relative flex size-12 items-center justify-center rounded-full border-2 transition-transform duration-300"
        style={{
          transform: lifted ? "scale(1.14)" : "scale(1)",
          borderColor: step.accent,
          background: lifted ? step.accent : "#ffffff",
          boxShadow: lifted
            ? `0 0 0 4px ${step.accent}22, 0 10px 24px -6px ${step.accent}aa`
            : `0 6px 16px -8px ${step.accent}aa, 0 1px 2px rgba(15,23,42,0.06)`,
          color: lifted ? "#ffffff" : step.accent,
        }}
      >
        <Icon className="size-[19px]" strokeWidth={2} />
        <span
          className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full font-mono text-[9px] font-bold text-white ring-2 ring-white"
          style={{ background: step.accent }}
        >
          {step.id}
        </span>
      </span>

      <span
        className="pointer-events-none absolute left-1/2 w-36 -translate-x-1/2 text-center"
        style={topLane ? { bottom: "calc(100% + 9px)" } : { top: "calc(100% + 9px)" }}
      >
        <span
          className="block text-[12.5px] font-semibold leading-tight text-balance transition-colors"
          style={{ color: lifted ? step.accent : "#0f172a" }}
        >
          {step.title}
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-slate-500 text-pretty">{step.short}</span>
      </span>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile vertical flow                                               */
/* ------------------------------------------------------------------ */

function MobileFlow({ activeId, onSelect }: { activeId: number | null; onSelect: (id: number) => void }) {
  return (
    <ol className="relative space-y-1.5 pl-8">
      <span
        aria-hidden
        className="absolute left-[15px] top-3 bottom-3 w-[2px] rounded-full"
        style={{
          background: "linear-gradient(180deg,#0d9488,#0284c7,#4f46e5,#9333ea,#db2777,#ea580c)",
        }}
      />
      {STEPS.map((step) => {
        const Icon = step.icon
        const isActive = activeId === step.id
        return (
          <li key={step.id} className="relative">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-expanded={isActive}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300"
              style={isActive ? { borderColor: step.accent, boxShadow: `0 8px 22px -12px ${step.accent}` } : undefined}
            >
              <span
                className="absolute -left-[26px] flex size-6 items-center justify-center rounded-full border-2 bg-white font-mono text-[10px] font-bold ring-4 ring-white"
                style={{ borderColor: step.accent, color: step.accent }}
              >
                {step.id}
              </span>
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${step.accent}18`, color: step.accent }}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                <span className="block truncate text-xs text-slate-500">{step.short}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

function DetailPanel({ step, onClose }: { step: Step; onClose: () => void }) {
  const Icon = step.icon
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-white p-5 sm:p-6"
      style={{
        borderColor: `${step.accent}55`,
        boxShadow: `0 24px 60px -30px ${step.accent}, 0 1px 2px rgba(15,23,42,0.04)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${step.accent}, ${step.accent}44)` }}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Fermer le détail"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 items-center justify-center rounded-xl text-white"
          style={{ background: step.accent, boxShadow: `0 10px 24px -8px ${step.accent}` }}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="font-mono text-[11px] font-medium tracking-wide" style={{ color: step.accent }}>
            ÉTAPE {String(step.id).padStart(2, "0")} / 10
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 text-pretty">{step.detail.intro}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {step.detail.points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: step.accent }} aria-hidden />
            <span className="leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
      <p
        className="mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
        style={{ background: step.accent }}
      >
        <ArrowRight className="size-3.5" />
        {step.detail.output}
      </p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function VactisWorkflow() {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const active = STEPS.find((s) => s.id === activeId) ?? null
  const { ref, size } = useElementSize<HTMLDivElement>()

  // cinematic state
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const pausedRef = useRef(false)
  const elapsedRef = useRef(0)
  pausedRef.current = paused

  const scene = SCENES[sceneIndex]
  const sceneStep = scene?.kind === "step" ? STEPS.find((s) => s.id === scene.stepId) ?? null : null
  const spotlightId = playing ? sceneStep?.id ?? null : activeId

  const select = useCallback((id: number) => {
    setActiveId((cur) => (cur === id ? null : id))
  }, [])

  const startFilm = useCallback(() => {
    setActiveId(null)
    setHoveredId(null)
    elapsedRef.current = 0
    setSceneIndex(0)
    setProgress(0)
    setPaused(false)
    setPlaying(true)
  }, [])

  const exitFilm = useCallback(() => {
    setPlaying(false)
    setPaused(false)
    setProgress(0)
    elapsedRef.current = 0
    setSceneIndex(0)
  }, [])

  const jumpTo = useCallback((i: number) => {
    elapsedRef.current = 0
    setProgress(0)
    setSceneIndex(i)
    setPaused(false)
  }, [])

  // cinematic timeline driver
  useEffect(() => {
    if (!playing) return
    const dur = SCENES[sceneIndex].duration
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!pausedRef.current) {
        elapsedRef.current += dt
        const p = Math.min(1, elapsedRef.current / dur)
        setProgress(p)
        if (p >= 1) {
          if (sceneIndex + 1 >= SCENES.length) {
            setPlaying(false)
            return
          }
          elapsedRef.current = 0
          setSceneIndex((i) => i + 1)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, sceneIndex])

  // camera target for the Ken Burns pan/zoom
  const fx = sceneStep ? sceneStep.nx : 0.5
  const fy = sceneStep ? sceneStep.ny : 0.5
  const camScale = playing && sceneStep ? CAM_SCALE : 1
  const camX = playing && size.w ? (0.5 - camScale * fx) * size.w : 0
  const camY = playing && size.h ? (0.5 - camScale * fy) * size.h : 0

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.25)]">
      {/* ambient light blooms */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 320px at 10% -6%, rgba(13,148,136,0.10), transparent 60%), radial-gradient(620px 340px at 90% 106%, rgba(234,88,12,0.09), transparent 60%), radial-gradient(520px 300px at 92% 2%, rgba(79,70,229,0.08), transparent 60%)",
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          maskImage: "radial-gradient(circle at 50% 42%, black, transparent 82%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 42%, black, transparent 82%)",
        }}
      />

      <div className="relative p-5 sm:p-8">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-500 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-teal-600" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.15em] text-teal-700">MOTEUR VACTIS · EN CYCLE</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance sm:text-[2rem]">
              La donnée brute devient plan d&apos;action
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 text-pretty">
              Un flux continu de 10 transformations. Chaque particule est une donnée qui se raffine le long du
              moteur, puis reboucle au recalcul mensuel de chaque médecin.
            </p>
          </div>
          <button
            type="button"
            onClick={playing ? exitFilm : startFilm}
            className="group inline-flex shrink-0 items-center gap-2.5 self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            style={{
              background: "linear-gradient(120deg,#0d9488,#2563eb 45%,#9333ea 75%,#ea580c)",
              boxShadow: "0 14px 30px -12px rgba(79,70,229,0.6)",
            }}
          >
            {playing ? <X className="size-4" /> : <Film className="size-4" />}
            {playing ? "Quitter le film" : "Lancer le film"}
            {!playing && (
              <Play className="size-3.5 translate-x-0 fill-white transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        {/* ---- desktop: cinematic stage ---- */}
        <div
          ref={ref}
          className="relative mt-8 hidden overflow-hidden rounded-2xl lg:block"
          style={{ aspectRatio: "16 / 7.6" }}
        >
          {/* camera-driven inner stage */}
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: "0px 0px", pointerEvents: playing ? "none" : "auto" }}
            animate={{ scale: camScale, x: camX, y: camY }}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
          >
            {size.w > 0 && <EngineCanvas width={size.w} height={size.h} activeId={spotlightId} hoveredId={hoveredId} />}

            {/* spotlight vignette during playback */}
            <motion.div
              aria-hidden
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: playing && sceneStep ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              style={{
                background: `radial-gradient(circle at ${fx * 100}% ${fy * 100}%, transparent 70px, rgba(15,23,42,0.06) 150px, rgba(15,23,42,0.34) 320px)`,
              }}
            />

            {STEPS.map((step, i) => (
              <NodeHub
                key={step.id}
                step={step}
                index={i}
                isActive={spotlightId === step.id}
                isHovered={hoveredId === step.id}
                dimmed={playing && !!sceneStep && sceneStep.id !== step.id}
                onSelect={() => select(step.id)}
                onHover={(v) => setHoveredId(v ? step.id : null)}
              />
            ))}

            <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
              <div className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur">
                <RefreshCw className="size-3 text-teal-600" />
                <span className="text-[10px] font-semibold text-teal-700">Cycle mensuel</span>
              </div>
            </div>
          </motion.div>

          {/* letterbox bars */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-slate-950"
            initial={false}
            animate={{ height: playing ? "7%" : "0%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-slate-950"
            initial={false}
            animate={{ height: playing ? "7%" : "0%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* film subtitle / caption */}
          <AnimatePresence>
            {playing && scene && (
              <motion.div
                key={sceneIndex}
                className="absolute inset-x-0 bottom-[9%] z-30 flex justify-center px-6"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="max-w-2xl rounded-2xl border border-white/15 bg-slate-950/80 px-6 py-4 text-center shadow-2xl backdrop-blur-md">
                  {scene.kind === "step"
                    ? (() => {
                        const s = STEPS.find((x) => x.id === scene.stepId)!
                        const Icon = s.icon
                        return (
                          <>
                            <p
                              className="flex items-center justify-center gap-2 font-mono text-[11px] font-semibold tracking-[0.2em]"
                              style={{ color: s.accent }}
                            >
                              <Icon className="size-3.5" />
                              SÉQUENCE {String(s.id).padStart(2, "0")} / 10 · {s.title.toUpperCase()}
                            </p>
                            <p className="mt-2 text-[15px] leading-relaxed text-white text-pretty">{s.detail.intro}</p>
                            <p
                              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium"
                              style={{ color: s.accent }}
                            >
                              <ArrowRight className="size-3.5" />
                              {s.detail.output}
                            </p>
                          </>
                        )
                      })()
                    : (
                      <>
                        <p className="font-mono text-[11px] font-semibold tracking-[0.25em] text-teal-300">
                          {scene.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white text-balance">{scene.title}</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300 text-pretty">{scene.sub}</p>
                      </>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* idle hint */}
          {!playing && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-500 backdrop-blur">
              <TrendingUp className="size-3.5 text-teal-600" />
              <span>Cliquez une étape ou lancez le film</span>
            </div>
          )}
        </div>

        {/* ---- cinematic controls ---- */}
        <AnimatePresence>
          {playing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 hidden items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:flex"
            >
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:scale-105"
                aria-label={paused ? "Reprendre" : "Mettre en pause"}
              >
                {paused ? <Play className="size-4 fill-white" /> : <Pause className="size-4 fill-white" />}
              </button>
              <button
                type="button"
                onClick={startFilm}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                aria-label="Recommencer"
              >
                <RotateCcw className="size-4" />
              </button>

              {/* chapter scrubber */}
              <div className="flex flex-1 items-center gap-1">
                {SCENES.map((sc, i) => {
                  const accent = sc.kind === "step" ? STEPS.find((s) => s.id === sc.stepId)!.accent : "#0d9488"
                  const done = i < sceneIndex
                  const current = i === sceneIndex
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => jumpTo(i)}
                      className="group relative h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
                      aria-label={`Aller à la séquence ${i + 1}`}
                    >
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: done ? "100%" : current ? `${progress * 100}%` : "0%",
                          background: accent,
                        }}
                      />
                    </button>
                  )
                })}
              </div>

              <span className="shrink-0 font-mono text-xs text-slate-500">
                {String(sceneIndex + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- mobile: vertical flow ---- */}
        <div className="mt-8 lg:hidden">
          <MobileFlow activeId={activeId} onSelect={select} />
        </div>

        {/* detail panel (interactive mode only) */}
        <AnimatePresence mode="wait">
          {active && !playing && (
            <div className="mt-6">
              <DetailPanel step={active} onClose={() => setActiveId(null)} />
            </div>
          )}
        </AnimatePresence>

        {/* legend */}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-8 rounded-full" style={{ background: "linear-gradient(90deg,#94a3b8,#0d9488)" }} />
            <span>Donnée brute → raffinée</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-8 rounded-full"
              style={{ background: "linear-gradient(90deg,#0d9488,#4f46e5,#db2777,#ea580c)" }}
            />
            <span>Transformation en valeur</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-8 rounded-full border border-dashed border-teal-500/60" />
            <span>Boucle de recalcul mensuel</span>
          </div>
        </div>
      </div>
    </section>
  )
}
