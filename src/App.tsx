import { useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar/Sidebar';
import ERDCanvas from './components/ERD/ERDCanvas';
import ChatPanel from './components/Chat/ChatPanel';
import { WelcomeModal } from './components/common/WelcomeModal';
import { useStore } from './store/useStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES } from './utils/demoData';

const App: React.FC = () => {
  const { showWelcome, setShowWelcome, loadDemo, reset } = useStore();

  const handleLoadDemo = useCallback(() => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
  }, [loadDemo]);

  const handleStartFresh = useCallback(() => {
    reset();
    setShowWelcome(false);
  }, [reset, setShowWelcome]);

  // Handle escape key to close welcome modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showWelcome) {
        handleStartFresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, handleStartFresh]);

  return (
    <ReactFlowProvider>
      <div className="w-full h-screen flex bg-slate-900 overflow-hidden">
        {/* Left Sidebar - SQL Input, Tables, etc. */}
        <Sidebar />

        {/* Main Canvas - ERD Diagram */}
        <div className="flex-1 relative">
          <ERDCanvas />
        </div>

        {/* Right Panel - Chat/Q&A */}
        <ChatPanel />

        {/* Welcome Modal */}
        {showWelcome && (
          <WelcomeModal
            onClose={handleStartFresh}
            onLoadDemo={handleLoadDemo}
            onStartFresh={handleStartFresh}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default App;
