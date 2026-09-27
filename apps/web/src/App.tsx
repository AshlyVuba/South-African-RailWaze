import { UnifiedViewport } from './components/UnifiedViewport';
import { OperationsPortal } from './components/OperationsPortal';

export function App() {
  const isOperationsDemo = new URLSearchParams(window.location.search).get('demo') === 'operations';
  return isOperationsDemo ? <OperationsPortal /> : <UnifiedViewport />;
}
