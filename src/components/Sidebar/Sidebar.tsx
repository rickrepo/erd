import { useState, useEffect, useRef } from 'react';
import {
  Code,
  Database,
  Table2,
  Sparkles,
  ChevronDown,
  Crown,
  User,
  LogOut,
  Shield,
  LogIn,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminStore } from '../../store/useAdminStore';
import type { SQLDialect } from '../../store/useStore';
import SQLInput from './SQLInput';
import SchemaHelper from './SchemaHelper';
import TableList from './TableList';
import InferencePanel from './InferencePanel';
import { Branding } from '../common/Branding';
import { toast } from '../common/Toast';

type TabType = 'sql' | 'schema' | 'tables' | 'infer';

const DIALECT_OPTIONS: { id: SQLDialect; label: string }[] = [
  { id: 'sql', label: 'SQL (Standard)' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'sqlserver', label: 'SQL Server' },
];

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sql');
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const dialectDropdownRef = useRef<HTMLDivElement>(null);
  const { tables, pendingInferences, sqlDialect, setSqlDialect } = useStore();
  const { user, subscription, logout, setShowPremiumModal, setShowAuthPage, isAdmin } = useAuthStore();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (dialectDropdownRef.current && !dialectDropdownRef.current.contains(e.target as Node)) {
        setShowDialectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const { setShowAdminPanel, loadDemoData } = useAdminStore();

  const tabs = [
    { id: 'sql' as TabType, label: 'SQL', icon: Code },
    { id: 'schema' as TabType, label: 'Schema', icon: Database },
    { id: 'tables' as TabType, label: 'Tables', icon: Table2, count: tables.length },
    { id: 'infer' as TabType, label: 'AI', icon: Sparkles, count: pendingInferences.length },
  ];

  const currentDialect = DIALECT_OPTIONS.find(d => d.id === sqlDialect) || DIALECT_OPTIONS[0];

  const handleOpenAdmin = () => {
    if (!isAdmin()) {
      toast.error('Access Denied', 'Admin access requires login with admin credentials');
      setShowUserDropdown(false);
      return;
    }
    loadDemoData(); // Load demo data for the admin panel
    setShowAdminPanel(true);
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    toast.info('Signed out', 'You have been signed out successfully');
  };

  const handleSignIn = () => {
    setShowUserDropdown(false);
    setShowAuthPage(true);
  };

  const getTierBadge = () => {
    switch (subscription.tier) {
      case 'pro':
        return (
          <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-bold rounded-full">
            PRO
          </span>
        );
      case 'enterprise':
        return (
          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
            ENTERPRISE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-[10px] font-semibold rounded-full">
            FREE
          </span>
        );
    }
  };

  return (
    <div className="w-96 h-full bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header with Branding */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <Branding size="md" showTagline />

          {/* User Account */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {user ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </button>

            {showUserDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden animate-slideIn">
                {user ? (
                  <>
                    <div className="p-3 border-b border-slate-600">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {user.name || user.email}
                        </span>
                        {getTierBadge()}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      {isAdmin() && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Shield className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] text-red-400 font-medium">Administrator</span>
                        </div>
                      )}
                    </div>
                    {subscription.tier === 'free' && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setShowPremiumModal(true, 'upgrade');
                        }}
                        className="w-full px-3 py-2.5 text-sm text-left text-yellow-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade to Pro
                      </button>
                    )}
                    {isAdmin() && (
                      <button
                        onClick={handleOpenAdmin}
                        className="w-full px-3 py-2.5 text-sm text-left text-red-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 text-sm text-left text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 border-b border-slate-600">
                      <p className="text-sm text-slate-300 mb-1">Not signed in</p>
                      <p className="text-xs text-slate-500">Sign in to save your progress</p>
                    </div>
                    <button
                      onClick={handleSignIn}
                      className="w-full px-3 py-2.5 text-sm text-left text-white hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </button>
                    <button
                      onClick={handleSignIn}
                      className="w-full px-3 py-2.5 text-sm text-left text-blue-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Create Account
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowPremiumModal(true, 'upgrade');
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left text-yellow-400 hover:bg-slate-600 transition-colors flex items-center gap-2 border-t border-slate-600"
                    >
                      <Crown className="w-4 h-4" />
                      Get Pro
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SQL Dialect Selector */}
        <div className="mt-4 relative" ref={dialectDropdownRef}>
          <button
            onClick={() => setShowDialectDropdown(!showDialectDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              {currentDialect.label}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDialectDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDialectDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden animate-slideIn">
              {DIALECT_OPTIONS.map((dialect) => (
                <button
                  key={dialect.id}
                  onClick={() => {
                    setSqlDialect(dialect.id);
                    setShowDialectDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
                    sqlDialect === dialect.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {dialect.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 px-2 text-xs font-medium transition-all relative
              flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'text-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                px-1.5 py-0.5 text-[10px] rounded-full font-semibold
                ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}
              `}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sql' && <SQLInput />}
        {activeTab === 'schema' && <SchemaHelper />}
        {activeTab === 'tables' && <TableList />}
        {activeTab === 'infer' && <InferencePanel />}
      </div>
    </div>
  );
};

export default Sidebar;
