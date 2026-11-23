import ParticleField from './ParticleField.jsx';

/** Courbes des flux de données qui traversent l'arrière-plan (repère 1440 × 900). */
const FLUX = [
  'M -60 250 C 240 170, 470 330, 760 240 S 1210 120, 1500 200',
  'M -60 560 C 260 480, 520 650, 820 560 S 1240 430, 1500 520',
  'M -60 790 C 320 720, 650 860, 980 780 S 1330 690, 1500 740',
  'M 180 -60 C 250 180, 110 420, 240 640 S 420 880, 380 960',
  'M 1260 -60 C 1180 200, 1320 420, 1200 640 S 1040 880, 1090 960',
];

/** Fond de page : dégradés animés, flux de données, particules et éléments flottants. */
export default function AuthBackground() {
  return (
    <div className="vxa-bg" aria-hidden="true">
      <span className="vxa-bg-blob vxa-bg-blob--a" />
      <span className="vxa-bg-blob vxa-bg-blob--b" />
      <span className="vxa-bg-blob vxa-bg-blob--c" />

      <svg className="vxa-bg-flows" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {FLUX.map((d, i) => (
          <g key={d} style={{ '--i': i }}>
            <path className="vxa-flow-line" d={d} />
            <path className="vxa-flow-pulse" d={d} pathLength="100" />
          </g>
        ))}
      </svg>

      <ParticleField className="vxa-bg-particles" density={30} color="8, 124, 240" maxOpacity={0.4} speed={0.7} />

      <span className="vxa-bg-float vxa-bg-float--a" />
      <span className="vxa-bg-float vxa-bg-float--b" />
      <span className="vxa-bg-float vxa-bg-float--c" />
    </div>
  );
}
