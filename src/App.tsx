import { useEffect, useCallback, useState } from 'react';
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
import { Code, GitBranch, FileCode } from 'lucide-react';

type MobilePanel = 'sidebar' | 'canvas' | 'chat';

const App: React.FC = () => {
  const { showWelcome, setShowWelcome, loadDemo, reset, tables } = useStore();
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

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('canvas');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLoadDemo = useCallback(() => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
    toast.success('Demo loaded!', 'E-commerce schema has been loaded');
    if (isMobile) setMobilePanel('canvas');
  }, [loadDemo, isMobile]);

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

  const mobileTabs: { id: MobilePanel; label: string; icon: typeof Code; badge?: number }[] = [
    { id: 'sidebar', label: 'SQL', icon: Code },
    { id: 'canvas', label: 'ERD', icon: GitBranch, badge: tables.length },
    { id: 'chat', label: 'Report', icon: FileCode },
  ];

  return (
    <ReactFlowProvider>
      <div className="w-full h-screen flex flex-col lg:flex-row bg-slate-900 overflow-hidden">
        {/* Desktop layout: all panels visible */}
        {!isMobile && (
          <>
            <Sidebar />
            <div className="flex-1 relative">
              <ERDCanvas />
            </div>
            <ChatPanel />
          </>
        )}

        {/* Mobile layout: one panel at a time + bottom nav */}
        {isMobile && (
          <>
            <div className="flex-1 overflow-hidden relative">
              <div className={mobilePanel === 'sidebar' ? 'h-full' : 'hidden'}>
                <Sidebar />
              </div>
              <div className={mobilePanel === 'canvas' ? 'h-full' : 'hidden'}>
                <ERDCanvas />
              </div>
              <div className={mobilePanel === 'chat' ? 'h-full' : 'hidden'}>
                <ChatPanel />
              </div>
            </div>

            {/* Mobile bottom navigation */}
            <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700 safe-area-bottom">
              <div className="flex">
                {mobileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMobilePanel(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors relative ${
                      mobilePanel === tab.id
                        ? 'text-blue-400'
                        : 'text-slate-500 active:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute top-1.5 right-1/2 translate-x-4 px-1 min-w-[16px] h-4 text-[9px] font-bold bg-blue-500 text-white rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                    {mobilePanel === tab.id && (
                      <div className="absolute top-0 left-4 right-4 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

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
