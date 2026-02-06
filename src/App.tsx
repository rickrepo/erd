import { useEffect, useCallback, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import Sidebar from './components/Sidebar/Sidebar';
import ERDCanvas from './components/ERD/ERDCanvas';
import { Header } from './components/common/Header';
import { MobileActions } from './components/common/MobileActions';
import { WelcomeModal } from './components/common/WelcomeModal';
import { PremiumModal } from './components/common/PremiumModal';
import { UsageLimitModal } from './components/common/UsageLimitModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthPage } from './components/auth/AuthPage';
import { ToastContainer, toast } from './components/common/Toast';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { useAdminStore } from './store/useAdminStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS } from './utils/demoData';
import { GitBranch, Code, Link } from 'lucide-react';
import { MobileJoinsPanel } from './components/common/MobileJoinsPanel';
import { VersionFooter } from './components/common/VersionFooter';

type MobilePanel = 'sidebar' | 'canvas' | 'joins';

// Inner component that has access to ReactFlow context
const AppContent: React.FC = () => {
  const { showWelcome, setShowWelcome, loadDemo, reset, tables, relationships, isDemoMode } = useStore();
  const {
    showPremiumModal,
    showUsageLimitModal,
    showAuthPage,
    setShowPremiumModal,
    setShowUsageLimitModal,
    setShowAuthPage,
    isAdmin,
  } = useAuthStore();
  const { showAdminPanel, setShowAdminPanel, getCurrentDemoQuery, cycleToNextDemo } = useAdminStore();

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('canvas');
  const [isMobile, setIsMobile] = useState(false);

  // Active relationships state - lifted to App for sharing between Sidebar and Canvas
  const [activeRelationships, setActiveRelationships] = useState<Set<string>>(new Set());
  const [animatingRelationship, setAnimatingRelationship] = useState<string | null>(null);
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set());

  // Auto-hide tables when all their relationships are hidden
  // DISABLED for demo mode - show all tables always
  useEffect(() => {
    // In demo mode, never hide any tables
    if (isDemoMode) {
      setHiddenTables(new Set());
      return;
    }

    // Don't hide anything if no active relationships or no tables
    if (activeRelationships.size === 0 || tables.length === 0) {
      setHiddenTables(new Set());
      return;
    }

    // Guard against race condition: ensure active relationships match current relationships
    const relationshipIds = new Set(relationships.map(r => r.id));
    const validActiveCount = [...activeRelationships].filter(id => relationshipIds.has(id)).length;

    // If none of the active relationships exist in current data, we're in a transitional state
    if (validActiveCount === 0) {
      setHiddenTables(new Set());
      return;
    }

    const tablesWithVisibleRelationships = new Set<string>();
    for (const relId of activeRelationships) {
      const rel = relationships.find(r => r.id === relId);
      if (rel) {
        tablesWithVisibleRelationships.add(rel.sourceTable);
        tablesWithVisibleRelationships.add(rel.targetTable);
      }
    }

    // Auto-hide tables that have no visible relationships
    const newHiddenTables = new Set<string>();
    for (const table of tables) {
      const hasVisibleRelationship = tablesWithVisibleRelationships.has(table.id);
      const hasAnyRelationship = relationships.some(
        r => r.sourceTable === table.id || r.targetTable === table.id
      );

      // Only auto-hide if table has relationships but none are visible
      if (hasAnyRelationship && !hasVisibleRelationship) {
        newHiddenTables.add(table.id);
      }
    }

    // Safety check: NEVER hide ALL tables - that would result in blank screen
    if (newHiddenTables.size >= tables.length) {
      setHiddenTables(new Set());
      return;
    }

    setHiddenTables(newHiddenTables);
  }, [activeRelationships, relationships, tables, isDemoMode]);

  const { fitView } = useReactFlow();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLoadDemo = useCallback(() => {
    const currentQuery = getCurrentDemoQuery();
    const sql = currentQuery?.sql || '-- No demo queries configured';
    const queryName = currentQuery?.name || 'E-commerce schema';

    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, sql);
    // Default all joins to ON when loading demo
    setActiveRelationships(new Set(DEMO_RELATIONSHIPS.map(r => r.id)));
    toast.success('Demo loaded!', queryName);
    cycleToNextDemo(); // Advance to next query for next time
    if (isMobile) setMobilePanel('canvas');
  }, [loadDemo, isMobile, getCurrentDemoQuery, cycleToNextDemo]);

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

  // Sidebar handlers for relationship visibility
  const handleToggleRelationship = useCallback((relId: string) => {
    setActiveRelationships(prev => {
      const next = new Set(prev);
      if (next.has(relId)) {
        next.delete(relId);
      } else {
        setAnimatingRelationship(relId);
        next.add(relId);
        setTimeout(() => setAnimatingRelationship(null), 700);

        // Find the relationship and fit view to it
        const rel = relationships.find(r => r.id === relId);
        if (rel) {
          setTimeout(() => fitView({
            padding: 0.3,
            maxZoom: 0.9,
            duration: 500,
            nodes: [{ id: rel.sourceTable }, { id: rel.targetTable }]
          }), 50);
        }
      }
      return next;
    });
  }, [relationships, fitView]);

  const handleShowAll = useCallback(() => {
    const allIds = new Set(relationships.map(r => r.id));
    setActiveRelationships(allIds);
  }, [relationships]);

  const handleHideAll = useCallback(() => {
    setActiveRelationships(new Set());
  }, []);

  // Animate chain of relationships
  const handleAnimateChain = useCallback((startRelId: string) => {
    const chain: string[] = [startRelId];
    const startRel = relationships.find(r => r.id === startRelId);
    if (!startRel) return;

    // Find relationships that start from the target table
    let currentTargetTable = startRel.targetTable;
    const visited = new Set([startRelId]);

    while (true) {
      const nextRel = relationships.find(r =>
        r.sourceTable === currentTargetTable && !visited.has(r.id)
      );
      if (!nextRel) break;
      chain.push(nextRel.id);
      visited.add(nextRel.id);
      currentTargetTable = nextRel.targetTable;
    }

    // Animate each relationship in sequence
    chain.forEach((relId, i) => {
      setTimeout(() => {
        setAnimatingRelationship(relId);
        setActiveRelationships(prev => new Set([...prev, relId]));
        setTimeout(() => setAnimatingRelationship(null), 500);
      }, i * 400);
    });
  }, [relationships]);

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
    { id: 'canvas', label: 'Diagram', icon: GitBranch, badge: tables.length },
    { id: 'joins', label: 'Joins', icon: Link, badge: relationships.length },
  ];

  // Debug: log to help diagnose
  console.log('App render:', { showWelcome, isMobile, tables: tables.length, isDemoMode, hiddenTables: hiddenTables.size });

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-slate-900 overflow-hidden">
      {/* Debug panel at TOP to trace App state */}
      <div className="fixed top-16 right-4 bg-green-900/95 text-white p-3 rounded-lg z-[200] text-xs font-mono border-2 border-green-500">
        <p className="font-bold mb-1">APP DEBUG v1.9.5</p>
        <p>showWelcome: {showWelcome ? 'true' : 'false'}</p>
        <p>isDemoMode: {isDemoMode ? 'true' : 'false'}</p>
        <p>tables: {tables.length}</p>
        <p>relationships: {relationships.length}</p>
        <p>isMobile: {isMobile ? 'true' : 'false'}</p>
        <p>hiddenTables: {hiddenTables.size}</p>
      </div>

      {/* Top Header Bar */}
      <Header />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop layout */}
        {!isMobile && (
          <>
            <Sidebar
              activeRelationships={activeRelationships}
              onToggleRelationship={handleToggleRelationship}
              onShowAll={handleShowAll}
              onHideAll={handleHideAll}
              onAnimateChain={handleAnimateChain}
            />
            <div className="flex-1 relative">
              <ERDCanvas
                activeRelationships={activeRelationships}
                setActiveRelationships={setActiveRelationships}
                animatingRelationship={animatingRelationship}
                setAnimatingRelationship={setAnimatingRelationship}
                hiddenTables={hiddenTables}
              />
            </div>
          </>
        )}

        {/* Mobile layout */}
        {isMobile && (
          <>
            <div className="flex-1 overflow-hidden relative">
              <div className={mobilePanel === 'sidebar' ? 'h-full' : 'hidden'}>
                <Sidebar />
              </div>
              <div className={mobilePanel === 'canvas' ? 'h-full' : 'hidden'}>
                <ERDCanvas
                  activeRelationships={activeRelationships}
                  setActiveRelationships={setActiveRelationships}
                  animatingRelationship={animatingRelationship}
                  setAnimatingRelationship={setAnimatingRelationship}
                  hiddenTables={hiddenTables}
                />
              </div>
              <div className={mobilePanel === 'joins' ? 'h-full' : 'hidden'}>
                <MobileJoinsPanel
                  activeRelationships={activeRelationships}
                  onToggleRelationship={handleToggleRelationship}
                  onShowAll={handleShowAll}
                  onHideAll={handleHideAll}
                  onAnimateChain={handleAnimateChain}
                />
              </div>
            </div>

            {/* Mobile bottom navigation */}
            <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700 safe-area-bottom z-50">
              <div className="flex">
                {mobileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMobilePanel(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors relative ${
                      mobilePanel === tab.id
                        ? 'text-purple-400'
                        : 'text-slate-500 active:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute top-1.5 right-1/2 translate-x-4 px-1 min-w-[16px] h-4 text-[9px] font-bold bg-purple-500 text-white rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                    {mobilePanel === tab.id && (
                      <div className="absolute top-0 left-4 right-4 h-0.5 bg-purple-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

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
      {showAdminPanel && isAdmin() && (
        <AdminPanel onClose={handleCloseAdminPanel} />
      )}

      {/* Mobile Actions FAB */}
      {isMobile && (
        <MobileActions onShowSql={() => setMobilePanel('sidebar')} />
      )}

      {/* Version Footer - desktop only (mobile has its own bottom nav) */}
      {!isMobile && <VersionFooter />}

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

// Wrapper that provides ReactFlowProvider
const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
};

export default App;
