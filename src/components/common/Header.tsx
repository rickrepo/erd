import { useState, useRef, useEffect } from 'react';
import { LogIn, Crown, Settings, LogOut, ChevronDown, Play, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStore } from '../../store/useStore';
import { Branding } from './Branding';
import { DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES } from '../../utils/demoData';
import { toast } from './Toast';

export function Header() {
  const { user, subscription, logout, setShowAuthPage, setShowPremiumModal, isAdmin } = useAuthStore();
  const { tables, loadDemo, reset } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLoadDemo = () => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
    toast.success('Demo loaded!', 'E-commerce schema with sample SQL queries');
  };

  const handleClear = () => {
    reset();
    toast.info('Cleared', 'All tables and relationships removed');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-[10px] font-medium rounded-full">
            FREE
          </span>
        );
    }
  };

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <Branding size="sm" />
      </div>

      {/* Right: User actions */}
      <div className="flex items-center gap-2">
        {/* Load Demo / Clear buttons */}
        {tables.length === 0 ? (
          <button
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Load Demo</span>
            <span className="sm:hidden">Demo</span>
          </button>
        ) : (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Upgrade button for free users */}
        {subscription.tier === 'free' && (
          <button
            onClick={() => setShowPremiumModal(true, 'feature')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-medium rounded-md transition-all shadow-sm"
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade
          </button>
        )}

        {/* User menu */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded-md transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs text-white font-medium">{user.name || 'User'}</div>
                <div className="text-[10px] text-slate-500">{user.email}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-2">
                <div className="px-3 py-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    {getTierBadge()}
                    {isAdmin() && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                {subscription.tier === 'free' && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowPremiumModal(true, 'feature');
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-purple-400 hover:bg-slate-700 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Could open settings
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <div className="border-t border-slate-700 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuthPage(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
