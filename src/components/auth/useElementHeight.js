import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Suit la hauteur d'un élément (ResizeObserver) pour pouvoir l'animer.
 * Renvoie [ref, hauteur] ; la hauteur vaut null tant qu'elle n'est pas mesurée.
 */
export default function useElementHeight() {
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = () => setHeight(element.offsetHeight);
    update();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, height];
}
