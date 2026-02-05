import { useState, useEffect, useRef } from 'react';
import {
  Code,
  ChevronDown,
  ChevronUp,
  Crown,
  User,
  LogOut,
  Shield,
  LogIn,
  Link,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Play,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminStore } from '../../store/useAdminStore';
import type { SQLDialect } from '../../store/useStore';
import { Branding } from '../common/Branding';
import { toast } from '../common/Toast';
import { parseCreateTableStatements, inferRelationships, joinsToRelationships, parseSQLQueries, createTablesFromQuery } from '../../utils/sqlParser';

const DIALECT_OPTIONS: { id: SQLDialect; label: string }[] = [
  { id: 'sql', label: 'Standard SQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'sqlserver', label: 'SQL Server' },
];

interface SidebarProps {
  activeRelationships: Set<string>;
  onToggleRelationship: (relId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onAnimateChain: (startRelId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeRelationships,
  onToggleRelationship,
  onShowAll,
  onHideAll,
  onAnimateChain,
}) => {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [sqlInput, setSqlInput] = useState('');
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const dialectDropdownRef = useRef<HTMLDivElement>(null);

  const {
    tables,
    relationships,
    sqlDialect,
    setSqlDialect,
    setTables,
    setRelationships,
  } = useStore();
  const { user, subscription, logout, setShowPremiumModal, setShowAuthPage, isAdmin } = useAuthStore();
  const { setShowAdminPanel, loadDemoData } = useAdminStore();

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

  const currentDialect = DIALECT_OPTIONS.find(d => d.id === sqlDialect) || DIALECT_OPTIONS[0];

  // Group relationships by source table for better organization
  const groupedRelationships = relationships.reduce((acc, rel) => {
    const sourceTable = tables.find(t => t.id === rel.sourceTable);
    const tableName = sourceTable?.name || 'Unknown';
    if (!acc[tableName]) acc[tableName] = [];
    acc[tableName].push(rel);
    return acc;
  }, {} as Record<string, typeof relationships>);

  // Find relationship chains (e.g., users -> orders -> order_items)
  const findChain = (startRelId: string): string[] => {
    const chain: string[] = [startRelId];
    const startRel = relationships.find(r => r.id === startRelId);
    if (!startRel) return chain;

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

    return chain;
  };

  const handleParseSQL = () => {
    if (!sqlInput.trim()) return;

    try {
      // Try parsing as CREATE TABLE statements first
      const parsedTables = parseCreateTableStatements(sqlInput);

      if (parsedTables.length > 0) {
        // Found CREATE TABLE statements
        const inferred = inferRelationships(parsedTables);
        // Need to map table names to IDs
        const tableIdMap = new Map(parsedTables.map(t => [t.name.toLowerCase(), t.id]));

        const rels = inferred.map((inf, i) => ({
          id: `rel-${Date.now()}-${i}`,
          sourceTable: tableIdMap.get(inf.sourceTable.toLowerCase()) || inf.sourceTable,
          sourceColumn: inf.sourceColumn,
          targetTable: tableIdMap.get(inf.targetTable.toLowerCase()) || inf.targetTable,
          targetColumn: inf.targetColumn,
          type: 'one-to-many' as const,
        }));

        setTables(parsedTables);
        setRelationships(rels);
        setSqlExpanded(false);
        setSqlInput('');

        toast.success(
          'Schema imported',
          `Found ${parsedTables.length} tables and ${rels.length} relationships`
        );
        return;
      }

      // Try parsing as SELECT queries with JOINs
      const parsed = parseSQLQueries(sqlInput);
      if (parsed.tables.length > 0) {
        const newTables = createTablesFromQuery(parsed, tables);
        const joinRels = joinsToRelationships(parsed.joins, newTables);

        setTables(newTables);
        setRelationships(joinRels);
        setSqlExpanded(false);
        setSqlInput('');

        toast.success(
          'Query analyzed',
          `Found ${newTables.length} tables and ${joinRels.length} relationships`
        );
        return;
      }

      toast.error('No tables found', 'Could not parse any CREATE TABLE statements or JOIN queries');
    } catch {
      toast.error('Parse error', 'Could not parse SQL. Check syntax and try again.');
    }
  };

  const handleOpenAdmin = () => {
    if (!isAdmin()) {
      toast.error('Access Denied', 'Admin access requires login with admin credentials');
      setShowUserDropdown(false);
      return;
    }
    loadDemoData();
    setShowAdminPanel(true);
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    toast.info('Signed out', 'You have been signed out successfully');
  };

  const getTierBadge = () => {
    switch (subscription.tier) {
      case 'pro':
        return <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[9px] font-bold rounded-full">PRO</span>;
      case 'enterprise':
        return <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold rounded-full">ENT</span>;
      default:
        return null;
    }
  };

  const visibleCount = activeRelationships.size;
  const totalCount = relationships.length;

  return (
    <div className="w-full lg:w-80 h-full bg-slate-800 lg:border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <Branding size="sm" />

          <div className="flex items-center gap-1.5">
            {/* User Menu */}
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1 p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {user ? (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                )}
                {getTierBadge()}
              </button>

              {showUserDropdown && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden animate-slideIn">
                  {user ? (
                    <>
                      <div className="p-2.5 border-b border-slate-600">
                        <p className="text-xs font-medium text-white truncate">{user.name || user.email.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      {subscription.tier === 'free' && (
                        <button
                          onClick={() => { setShowUserDropdown(false); setShowPremiumModal(true, 'upgrade'); }}
                          className="w-full px-3 py-2 text-xs text-left text-yellow-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          Upgrade to Pro
                        </button>
                      )}
                      {isAdmin() && (
                        <button
                          onClick={handleOpenAdmin}
                          className="w-full px-3 py-2 text-xs text-left text-red-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Admin Panel
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-3 py-2 text-xs text-left text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setShowUserDropdown(false); setShowAuthPage(true); }}
                        className="w-full px-3 py-2 text-xs text-left text-white hover:bg-slate-600 transition-colors flex items-center gap-2"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In
                      </button>
                      <button
                        onClick={() => { setShowUserDropdown(false); setShowPremiumModal(true, 'upgrade'); }}
                        className="w-full px-3 py-2 text-xs text-left text-yellow-400 hover:bg-slate-600 transition-colors flex items-center gap-2 border-t border-slate-600"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Get Pro
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SQL Input - Collapsible */}
      <div className="border-b border-slate-700">
        <button
          onClick={() => setSqlExpanded(!sqlExpanded)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>Import SQL</span>
          </div>
          {sqlExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {sqlExpanded && (
          <div className="px-3 pb-3 animate-slideIn">
            {/* Dialect Selector */}
            <div className="relative mb-2" ref={dialectDropdownRef}>
              <button
                onClick={() => setShowDialectDropdown(!showDialectDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-700/50 rounded-lg text-xs text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <span>{currentDialect.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDialectDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDialectDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden">
                  {DIALECT_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSqlDialect(d.id); setShowDialectDropdown(false); }}
                      className={`w-full px-2.5 py-1.5 text-xs text-left transition-colors ${
                        sqlDialect === d.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="Paste CREATE TABLE statements..."
              className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-slate-200 font-mono resize-none focus:border-blue-500 transition-colors"
              spellCheck={false}
            />

            <button
              onClick={handleParseSQL}
              disabled={!sqlInput.trim()}
              className={`w-full mt-2 py-2 rounded-lg text-xs font-medium transition-all ${
                sqlInput.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Parse & Visualize
            </button>
          </div>
        )}
      </div>

      {/* Relationship Explorer - Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Link className="w-4 h-4 text-purple-400" />
              Discovered Joins
            </h2>
            <span className="text-xs text-slate-400">{visibleCount}/{totalCount} visible</span>
          </div>

          {totalCount > 0 && (
            <div className="flex gap-1.5">
              <button
                onClick={onShowAll}
                className="flex-1 py-1.5 px-2 text-[10px] font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" />
                Show All
              </button>
              <button
                onClick={onHideAll}
                className="flex-1 py-1.5 px-2 text-[10px] font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <EyeOff className="w-3 h-3" />
                Hide All
              </button>
            </div>
          )}
        </div>

        {/* Relationship List */}
        <div className="flex-1 overflow-auto p-3">
          {totalCount === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-purple-400 opacity-50" />
              </div>
              <p className="text-sm text-slate-400 mb-1">No relationships found</p>
              <p className="text-xs text-slate-500">Import SQL with foreign keys or connect columns in the ERD</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedRelationships).map(([tableName, rels]) => (
                <div key={tableName}>
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5 px-1">
                    From {tableName}
                  </div>
                  <div className="space-y-1">
                    {rels.map((rel) => {
                      const targetTable = tables.find(t => t.id === rel.targetTable);
                      const isActive = activeRelationships.has(rel.id);
                      const chain = findChain(rel.id);
                      const hasChain = chain.length > 1;

                      return (
                        <div
                          key={rel.id}
                          className={`
                            group rounded-lg border transition-all cursor-pointer
                            ${isActive
                              ? 'bg-purple-500/20 border-purple-500/50'
                              : 'bg-slate-700/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                            }
                          `}
                        >
                          <button
                            onClick={() => onToggleRelationship(rel.id)}
                            className="w-full p-2.5 flex items-center gap-2 text-left"
                          >
                            {/* Glow indicator */}
                            <div className={`
                              w-2 h-2 rounded-full flex-shrink-0 transition-all
                              ${isActive
                                ? 'bg-purple-400 shadow-lg shadow-purple-400/50'
                                : 'bg-slate-600 group-hover:bg-purple-400/50'
                              }
                            `} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className={`font-medium ${isActive ? 'text-purple-300' : 'text-slate-300'}`}>
                                  {rel.sourceColumn}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className={`font-medium truncate ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                                  {targetTable?.name}.{rel.targetColumn}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {rel.type === 'one-to-one' ? '1:1' : rel.type === 'one-to-many' ? '1:N' : 'N:M'}
                                {hasChain && (
                                  <span className="ml-2 text-purple-400">• {chain.length} table chain</span>
                                )}
                              </div>
                            </div>

                            {/* Toggle visibility */}
                            <div className={`p-1 rounded transition-colors ${isActive ? 'text-purple-300' : 'text-slate-500'}`}>
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </div>
                          </button>

                          {/* Chain animation button */}
                          {hasChain && isActive && (
                            <div className="px-2.5 pb-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); onAnimateChain(rel.id); }}
                                className="w-full py-1.5 text-[10px] font-medium bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 rounded-md transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-3 h-3" />
                                Animate {chain.length}-table chain
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Upgrade Prompt */}
        {totalCount > 0 && subscription.tier === 'free' && (
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={() => setShowPremiumModal(true, 'feature')}
              className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">AI Query Builder</span>
                <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[9px] font-bold rounded">PRO</span>
              </div>
              <p className="text-[10px] text-slate-400 text-left">
                Generate SQL queries and get AI insights about your schema relationships
              </p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
