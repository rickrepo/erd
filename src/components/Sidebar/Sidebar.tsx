import { useState, useEffect, useRef } from 'react';
import {
  Code,
  ChevronDown,
  ChevronUp,
  Link,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  Database,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { SQLDialect } from '../../store/useStore';
import { toast } from '../common/Toast';
import { parseCreateTableStatements, inferRelationships, joinsToRelationships, parseSQLQueries, createTablesFromQuery } from '../../utils/sqlParser';

// App version
const APP_VERSION = '1.0.0';

const DIALECT_OPTIONS: { id: SQLDialect; label: string }[] = [
  { id: 'sql', label: 'Standard SQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'sqlserver', label: 'SQL Server' },
];

// SQL reserved words and common noise to filter out
const SQL_RESERVED_WORDS = new Set([
  'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'outer', 'full',
  'on', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'between', 'exists',
  'case', 'when', 'then', 'else', 'end', 'as', 'by', 'order', 'group', 'having',
  'limit', 'offset', 'union', 'all', 'distinct', 'top', 'into', 'values',
  'insert', 'update', 'delete', 'create', 'alter', 'drop', 'table', 'index',
  'view', 'procedure', 'function', 'trigger', 'database', 'schema',
  'primary', 'foreign', 'key', 'references', 'constraint', 'default',
  'auto_increment', 'serial', 'identity', 'unique', 'check',
  'int', 'integer', 'varchar', 'char', 'text', 'boolean', 'bool', 'date',
  'datetime', 'timestamp', 'decimal', 'float', 'double', 'numeric',
  'a', 'an', 'the', 'to', 'of', 'for', 'with', 'sql', 'two', 'one', 'three',
]);

// Validate if a string looks like a valid table name
function isValidTableName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 64) return false;
  if (SQL_RESERVED_WORDS.has(name.toLowerCase())) return false;
  // Must start with letter or underscore, contain only alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false;
  // Must not be all uppercase (likely a keyword)
  if (name === name.toUpperCase() && name.length <= 6) return false;
  return true;
}

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
  const {
    tables,
    relationships,
    sqlDialect,
    setSqlDialect,
    setTables,
    setRelationships,
    sqlInput: storeSqlInput,
    setSqlInput: setStoreSqlInput,
  } = useStore();

  // SQL input expanded by default when no tables
  const [sqlExpanded, setSqlExpanded] = useState(tables.length === 0);
  const [sqlInput, setSqlInputLocal] = useState('');

  // Sync local SQL input with store (for demo mode)
  useEffect(() => {
    if (storeSqlInput && !sqlInput) {
      setSqlInputLocal(storeSqlInput);
    }
  }, [storeSqlInput]);

  // Update both local state and store
  const setSqlInput = (value: string) => {
    setSqlInputLocal(value);
    setStoreSqlInput(value);
  };
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const dialectDropdownRef = useRef<HTMLDivElement>(null);

  const { subscription, setShowPremiumModal } = useAuthStore();

  // Expand SQL input when tables are cleared
  useEffect(() => {
    if (tables.length === 0) {
      setSqlExpanded(true);
    }
  }, [tables.length]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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
        // Filter out invalid table names
        const validTables = parsedTables.filter(t => isValidTableName(t.name));

        if (validTables.length === 0) {
          toast.error('No valid tables', 'Could not find valid CREATE TABLE statements');
          return;
        }

        const inferred = inferRelationships(validTables);
        const tableIdMap = new Map(validTables.map(t => [t.name.toLowerCase(), t.id]));

        const rels = inferred.map((inf, i) => ({
          id: `rel-${Date.now()}-${i}`,
          sourceTable: tableIdMap.get(inf.sourceTable.toLowerCase()) || inf.sourceTable,
          sourceColumn: inf.sourceColumn,
          targetTable: tableIdMap.get(inf.targetTable.toLowerCase()) || inf.targetTable,
          targetColumn: inf.targetColumn,
          type: 'one-to-many' as const,
        }));

        setTables(validTables);
        setRelationships(rels);
        setSqlExpanded(false);
        setSqlInput('');

        toast.success(
          'Schema imported',
          `Found ${validTables.length} tables and ${rels.length} relationships`
        );
        return;
      }

      // Try parsing as SELECT queries with JOINs
      const parsed = parseSQLQueries(sqlInput);

      // Filter parsed tables to only valid names (tables is an array of strings)
      if (parsed.tables.length > 0) {
        const validParsedTables = parsed.tables.filter(t => isValidTableName(t));

        if (validParsedTables.length === 0) {
          toast.error('No valid tables', 'Could not find valid table names in the query');
          return;
        }

        // Update parsed with filtered tables
        parsed.tables = validParsedTables;

        const newTables = createTablesFromQuery(parsed, tables);
        const validNewTables = newTables.filter(t => isValidTableName(t.name));

        if (validNewTables.length === 0) {
          toast.error('No valid tables', 'Could not extract valid table names');
          return;
        }

        const joinRels = joinsToRelationships(parsed.joins, validNewTables);

        setTables(validNewTables);
        setRelationships(joinRels);
        setSqlExpanded(false);
        setSqlInput('');

        toast.success(
          'Query analyzed',
          `Found ${validNewTables.length} tables and ${joinRels.length} relationships`
        );
        return;
      }

      toast.error('No SQL found', 'Paste CREATE TABLE, VIEW, PROCEDURE statements or SELECT queries with JOINs');
    } catch {
      toast.error('Parse error', 'Could not parse SQL. Check syntax and try again.');
    }
  };

  const visibleCount = activeRelationships.size;
  const totalCount = relationships.length;

  return (
    <div className="w-full lg:w-80 h-full bg-slate-800 lg:border-r border-slate-700 flex flex-col">
      {/* SQL Input Section */}
      <div className={`border-b border-slate-700 ${tables.length === 0 ? 'bg-slate-700/30' : ''}`}>
        <button
          onClick={() => setSqlExpanded(!sqlExpanded)}
          className={`w-full px-3 py-3 flex items-center justify-between text-sm font-medium transition-colors ${
            tables.length === 0
              ? 'text-white bg-purple-600/20 hover:bg-purple-600/30'
              : 'text-slate-300 hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${tables.length === 0 ? 'text-purple-400' : 'text-blue-400'}`} />
            <span>{tables.length === 0 ? 'Paste Your SQL Here' : 'Import SQL'}</span>
          </div>
          {sqlExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {sqlExpanded && (
          <div className="px-3 pb-3 animate-slideIn">
            {/* Guidance text */}
            <div className="mb-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <span className="text-purple-400 font-medium">Supported:</span> CREATE TABLE, CREATE VIEW,
                CREATE PROCEDURE, CREATE FUNCTION, SELECT with JOINs
              </p>
            </div>

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
              placeholder={`-- Paste your SQL here
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT REFERENCES users(id)
);`}
              className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
              spellCheck={false}
            />

            <button
              onClick={handleParseSQL}
              disabled={!sqlInput.trim()}
              className={`w-full mt-2 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                sqlInput.trim()
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Code className="w-4 h-4" />
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
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-purple-400 opacity-50" />
              </div>
              <p className="text-sm text-slate-400 mb-1">No relationships yet</p>
              <p className="text-xs text-slate-500">Paste SQL above to discover table relationships</p>
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

                            <div className={`p-1 rounded transition-colors ${isActive ? 'text-purple-300' : 'text-slate-500'}`}>
                              {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </div>
                          </button>

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
              className="w-full p-2.5 rounded-lg bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white">AI Query Builder</span>
                <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[9px] font-bold rounded">PRO</span>
              </div>
              <p className="text-[10px] text-slate-400 text-left">
                Generate SQL queries from your schema
              </p>
            </button>
          </div>
        )}

        {/* Version & Copyright */}
        <div className="px-3 py-2 border-t border-slate-700/50 text-center">
          <p className="text-[9px] text-slate-600">
            SchemaFlow v{APP_VERSION} · © {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
