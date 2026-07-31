import ControlePage from './ControlePage.jsx';

/**
 * Point d'entrée de la rubrique Contrôle CA.
 * Reçoit `navigate` depuis AppLayout via Home.jsx.
 */
export default function Controle({ navigate }) {
  return <ControlePage navigate={navigate} />;
}
