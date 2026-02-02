import { useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar/Sidebar';
import ERDCanvas from './components/ERD/ERDCanvas';
import ChatPanel from './components/Chat/ChatPanel';
import { WelcomeModal } from './components/common/WelcomeModal';
import { PremiumModal } from './components/common/PremiumModal';
import { UsageLimitModal } from './components/common/UsageLimitModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthPage } from './components/auth/AuthPage';
import { ToastContainer, toast } from './components/common/Toast';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { useAdminStore } from './store/useAdminStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES } from './utils/demoData';

const App: React.FC = () => {
  const { showWelcome, setShowWelcome, loadDemo, reset } = useStore();
  const {
    showPremiumModal,
    showUsageLimitModal,
    showAuthPage,
    setShowPremiumModal,
    setShowUsageLimitModal,
    setShowAuthPage,
    isAdmin,
  } = useAuthStore();
  const { showAdminPanel, setShowAdminPanel } = useAdminStore();

  const handleLoadDemo = useCallback(() => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
    toast.success('Demo loaded!', 'E-commerce schema has been loaded');
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

  // Security check for admin panel
  const handleOpenAdminPanel = useCallback(() => {
    if (!isAdmin()) {
      toast.error('Access Denied', 'You do not have permission to access the admin panel');
      setShowAdminPanel(false);
      return;
    }
  }, [isAdmin, setShowAdminPanel]);

  // Check admin access when panel opens
  useEffect(() => {
    if (showAdminPanel) {
      handleOpenAdminPanel();
    }
  }, [showAdminPanel, handleOpenAdminPanel]);

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
        } else if (showAuthPage) {
          setShowAuthPage(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showWelcome,
    showPremiumModal,
    showUsageLimitModal,
    showAdminPanel,
    showAuthPage,
    handleStartFresh,
    handleClosePremiumModal,
    handleCloseUsageLimitModal,
    handleCloseAdminPanel,
    setShowAuthPage,
  ]);

  // Show auth page if requested
  if (showAuthPage) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

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

        {/* Admin Panel - Only show if user is admin */}
        {showAdminPanel && isAdmin() && (
          <AdminPanel onClose={handleCloseAdminPanel} />
        )}

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </ReactFlowProvider>
  );
};

export default App;
