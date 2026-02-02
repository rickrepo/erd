import { useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar/Sidebar';
import ERDCanvas from './components/ERD/ERDCanvas';
import ChatPanel from './components/Chat/ChatPanel';
import { WelcomeModal } from './components/common/WelcomeModal';
import { PremiumModal } from './components/common/PremiumModal';
import { UsageLimitModal } from './components/common/UsageLimitModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { useAdminStore } from './store/useAdminStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES } from './utils/demoData';

const App: React.FC = () => {
  const { showWelcome, setShowWelcome, loadDemo, reset } = useStore();
  const {
    showPremiumModal,
    showUsageLimitModal,
    setShowPremiumModal,
    setShowUsageLimitModal
  } = useAuthStore();
  const { showAdminPanel, setShowAdminPanel } = useAdminStore();

  const handleLoadDemo = useCallback(() => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
  }, [loadDemo]);

  const handleStartFresh = useCallback(() => {
    reset();
    setShowWelcome(false);
  }, [reset, setShowWelcome]);

  const handleClosePremiumModal = useCallback(() => {
    setShowPremiumModal(false);
  }, [setShowPremiumModal]);

  const handleCloseUsageLimitModal = useCallback(() => {
    setShowUsageLimitModal(false);
  }, [setShowUsageLimitModal]);

  const handleUpgradeFromLimit = useCallback(() => {
    setShowUsageLimitModal(false);
    setShowPremiumModal(true, 'limit');
  }, [setShowUsageLimitModal, setShowPremiumModal]);

  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
  }, [setShowAdminPanel]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAdminPanel) {
          handleCloseAdminPanel();
        } else if (showPremiumModal) {
          handleClosePremiumModal();
        } else if (showUsageLimitModal) {
          handleCloseUsageLimitModal();
        } else if (showWelcome) {
          handleStartFresh();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, showPremiumModal, showUsageLimitModal, showAdminPanel, handleStartFresh, handleClosePremiumModal, handleCloseUsageLimitModal, handleCloseAdminPanel]);

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

        {/* Premium Modal */}
        {showPremiumModal && (
          <PremiumModal onClose={handleClosePremiumModal} />
        )}

        {/* Usage Limit Modal */}
        {showUsageLimitModal && (
          <UsageLimitModal
            onClose={handleCloseUsageLimitModal}
            onUpgrade={handleUpgradeFromLimit}
          />
        )}

        {/* Admin Panel */}
        {showAdminPanel && (
          <AdminPanel onClose={handleCloseAdminPanel} />
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default App;
