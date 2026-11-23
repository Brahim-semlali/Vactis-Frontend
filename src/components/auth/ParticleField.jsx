import { useEffect, useRef } from 'react';

const random = (min, max) => min + Math.random() * (max - min);

/**
 * Particules lumineuses dessinées sur un <canvas> : de petits points qui
 * dérivent lentement vers le haut en scintillant. Avec `linkDistance`, les
 * particules proches sont reliées par un trait fin (réseau de données) ;
 * avec `interactive`, celles proches de la souris se relient aussi au pointeur.
 *
 * Une seule boucle requestAnimationFrame, vitesse indépendante de la fréquence
 * d'affichage ; image fixe si l'utilisateur a demandé de réduire les animations.
 */
export default function ParticleField({
  className = '',
  density = 40,
  color = '0, 212, 232',
  maxOpacity = 0.7,
  speed = 1,
  linkDistance = 0,
  interactive = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let particles = [];
    const pointeur = { x: 0, y: 0, actif: false };

    const spawn = (y) => ({
      x: random(0, width),
      y: y ?? random(0, height),
      r: random(0.6, 1.9),
      vx: random(-0.12, 0.12) * speed,
      vy: random(-0.32, -0.08) * speed,
      alpha: random(0.25, 1) * maxOpacity,
      phase: random(0, Math.PI * 2),
    });

    function draw(time) {
      ctx.clearRect(0, 0, width, height);

      if (linkDistance > 0) {
        const maxDistance2 = linkDistance * linkDistance;
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i += 1) {
          for (let j = i + 1; j < particles.length; j += 1) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance2 = dx * dx + dy * dy;
            if (distance2 < maxDistance2) {
              ctx.strokeStyle = `rgba(${color}, ${(1 - distance2 / maxDistance2) * 0.18})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }

        if (pointeur.actif) {
          const portee2 = maxDistance2 * 2.25;
          ctx.lineWidth = 0.8;
          for (const p of particles) {
            const dx = p.x - pointeur.x;
            const dy = p.y - pointeur.y;
            const distance2 = dx * dx + dy * dy;
            if (distance2 < portee2) {
              ctx.strokeStyle = `rgba(${color}, ${(1 - distance2 / portee2) * 0.4})`;
              ctx.beginPath();
              ctx.moveTo(pointeur.x, pointeur.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.shadowColor = `rgba(${color}, 0.9)`;
      for (const p of particles) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0012 + p.phase);
        ctx.shadowBlur = p.r * 4;
        ctx.fillStyle = `rgba(${color}, ${p.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densité proportionnelle à la surface, bornée pour rester léger
      const surface = (width * height) / (900 * 700);
      const count = Math.round(density * Math.min(1.6, Math.max(0.4, surface)));
      particles = Array.from({ length: count }, () => spawn());
      if (reduce) draw(0);
    }

    function step(time) {
      const dt = last ? Math.min(48, time - last) / 16.67 : 1;
      last = time;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -4) Object.assign(p, spawn(height + 4));
        if (p.x < -4) p.x = width + 4;
        else if (p.x > width + 4) p.x = -4;
      }
      draw(time);
      frame = window.requestAnimationFrame(step);
    }

    // Le canvas ne capte pas la souris : on écoute son conteneur
    const hote = interactive ? canvas.parentElement : null;
    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointeur.x = event.clientX - rect.left;
      pointeur.y = event.clientY - rect.top;
      pointeur.actif = true;
    };
    const handlePointerLeave = () => {
      pointeur.actif = false;
    };

    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    hote?.addEventListener('pointermove', handlePointerMove);
    hote?.addEventListener('pointerleave', handlePointerLeave);
    if (!reduce) frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      hote?.removeEventListener('pointermove', handlePointerMove);
      hote?.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [density, color, maxOpacity, speed, linkDistance, interactive]);

  return <canvas ref={canvasRef} className={`vxa-particles ${className}`.trim()} aria-hidden="true" />;
}
