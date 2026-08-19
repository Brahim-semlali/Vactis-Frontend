import ReactDOM from 'react-dom';

/**
 * Composant Portal universel pour téléporter les modaux et tiroirs (drawers)
 * directement au niveau de document.body. Évite tout piège de stacking context CSS.
 */
export default function Portal({ children }) {
  if (typeof window === 'undefined' || !document.body) {
    return null;
  }
  return ReactDOM.createPortal(children, document.body);
}
