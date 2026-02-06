import { useState, useEffect, useRef } from 'react';
import {
  Code,
  ChevronDown,
  ChevronUp,
  Database,
  CheckCircle,
  Table as TableIcon,
  Link,
  Plus,
  Trash2,
  Copy,
  Edit3,
  FileText,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Zap,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { SQLDialect } from '../../store/useStore';
import { toast } from '../common/Toast';
import { parseCreateTableStatements, inferRelationships, joinsToRelationships, parseSQLQueries, createTablesFromQuery } from '../../utils/sqlParser';

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

interface SQLQuery {
  id: string;
  name: string;
  sql: string;
}

// Split SQL input into separate queries
function splitSQLQueries(sql: string): string[] {
  // First check if it's CREATE TABLE statements
  if (/CREATE\s+(TABLE|VIEW|PROCEDURE|FUNCTION)/i.test(sql)) {
    return [sql]; // Return as single block for CREATE statements
  }

  // Split by SELECT (keeping the SELECT keyword)
  const queries: string[] = [];
  const parts = sql.split(/(?=\bSELECT\b)/gi);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && /^SELECT\b/i.test(trimmed)) {
      queries.push(trimmed);
    } else if (trimmed && queries.length === 0) {
      // Handle any preamble (comments, etc.)
      queries.push(trimmed);
    }
  }

  return queries.filter(q => q.trim().length > 0);
}

// Extract a name from a SQL query (first table or comment)
function extractQueryName(sql: string): string {
  // Check for a comment at the start
  const commentMatch = sql.match(/^--\s*(.+?)(?:\n|$)/);
  if (commentMatch) {
    return commentMatch[1].trim().substring(0, 40);
  }

  // Try to extract from first FROM clause
  const fromMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (fromMatch) {
    return `Query: ${fromMatch[1]}`;
  }

  return 'SQL Query';
}

type SidebarTab = 'sql' | 'joins';

interface SidebarProps {
  activeRelationships?: Set<string>;
  onToggleRelationship?: (relId: string) => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  onAnimateChain?: (relId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeRelationships = new Set(),
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
    removeTable,
    sqlInput: storeSqlInput,
    setSqlInput: setStoreSqlInput,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SidebarTab>('sql');
  const [sqlExpanded, setSqlExpanded] = useState(tables.length === 0);
  const [sqlQueries, setSqlQueries] = useState<SQLQuery[]>([]);
  const [newQueryInput, setNewQueryInput] = useState('');
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [editingQuerySql, setEditingQuerySql] = useState('');
  const [showCombinedView, setShowCombinedView] = useState(false);
  const [filterTable, setFilterTable] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Sync local SQL input with store (for demo mode)
  useEffect(() => {
    if (storeSqlInput && sqlQueries.length === 0) {
      // Split store SQL into separate queries
      const split = splitSQLQueries(storeSqlInput);
      if (split.length > 0) {
        const newQueries = split.map((sql, idx) => ({
          id: `query-${Date.now()}-${idx}`,
          name: extractQueryName(sql),
          sql,
        }));
        setSqlQueries(newQueries);
      }
    }
  }, [storeSqlInput]);

  // Update store when queries change
  useEffect(() => {
    const combined = sqlQueries.map(q => q.sql).join('\n\n');
    if (combined !== storeSqlInput) {
      setStoreSqlInput(combined);
    }
  }, [sqlQueries, setStoreSqlInput, storeSqlInput]);

  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const dialectDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Expand SQL input when tables are cleared
  useEffect(() => {
    if (tables.length === 0) {
      setSqlExpanded(true);
      setActiveTab('sql');
    }
  }, [tables.length]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialectDropdownRef.current && !dialectDropdownRef.current.contains(e.target as Node)) {
        setShowDialectDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentDialect = DIALECT_OPTIONS.find(d => d.id === sqlDialect) || DIALECT_OPTIONS[0];

  const handleAddQuery = () => {
    if (!newQueryInput.trim()) return;

    // Split the input into multiple queries
    const split = splitSQLQueries(newQueryInput);
    const newQueries = split.map((sql, idx) => ({
      id: `query-${Date.now()}-${idx}`,
      name: extractQueryName(sql),
      sql,
    }));

    setSqlQueries(prev => [...prev, ...newQueries]);
    setNewQueryInput('');
    setShowAddQuery(false);

    toast.success('Query added', `Added ${newQueries.length} query${newQueries.length !== 1 ? 'ies' : ''}`);
  };

  const handleRemoveQuery = (id: string) => {
    setSqlQueries(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuery = (id: string) => {
    if (!editingQuerySql.trim()) return;

    setSqlQueries(prev =>
      prev.map(q =>
        q.id === id
          ? { ...q, sql: editingQuerySql, name: extractQueryName(editingQuerySql) }
          : q
      )
    );
    setEditingQueryId(null);
    setEditingQuerySql('');
  };

  const handleCopyQuery = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.info('Copied', 'SQL copied to clipboard');
  };

  const handleDeleteTable = (tableId: string) => {
    const tableName = tables.find(t => t.id === tableId)?.name;
    removeTable(tableId);
    toast.info('Table removed', tableName ? `Removed "${tableName}" and its relationships` : 'Table removed');
  };

  const getCombinedSQL = () => sqlQueries.map(q => q.sql).join('\n\n');

  const handleParseSQL = () => {
    const sqlInput = getCombinedSQL();
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

  // Filter relationships based on selected table
  const filteredRelationships = filterTable
    ? relationships.filter(r => r.sourceTable === filterTable || r.targetTable === filterTable)
    : relationships;

  // Get table name by ID
  const getTableName = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.name || tableId;
  };

  return (
    <div className="w-full lg:w-80 h-full bg-slate-800 lg:border-r border-slate-700 flex flex-col">
      {/* Tabs - Only show when tables exist */}
      {tables.length > 0 && (
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'sql'
                ? 'text-purple-400 border-purple-500 bg-purple-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            <Code className="w-4 h-4" />
            SQL
          </button>
          <button
            onClick={() => setActiveTab('joins')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'joins'
                ? 'text-cyan-400 border-cyan-500 bg-cyan-500/10'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            <Link className="w-4 h-4" />
            Joins
            {relationships.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/30 text-cyan-300 rounded-full">
                {relationships.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* SQL Tab Content */}
      {(activeTab === 'sql' || tables.length === 0) && (
        <div className="flex-1 flex flex-col overflow-hidden">
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
                <span>{tables.length === 0 ? 'Paste Your SQL Here' : 'SQL Queries'}</span>
                {sqlQueries.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] rounded-full">
                    {sqlQueries.length}
                  </span>
                )}
              </div>
              {sqlExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

                {/* Combined View Toggle (when multiple queries) */}
                {sqlQueries.length > 1 && (
                  <button
                    onClick={() => setShowCombinedView(!showCombinedView)}
                    className="w-full mb-2 flex items-center justify-between px-2.5 py-2 bg-slate-900/50 rounded-lg text-xs text-slate-400 hover:bg-slate-900 transition-colors border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Combined SQL ({sqlQueries.length} queries)</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showCombinedView ? 'rotate-90' : ''}`} />
                  </button>
                )}

                {/* Combined View */}
                {showCombinedView && sqlQueries.length > 1 && (
                  <div className="mb-3 p-2 bg-slate-900 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-medium">All Queries Combined</span>
                      <button
                        onClick={() => handleCopyQuery(getCombinedSQL())}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy all"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="text-[10px] text-slate-400 font-mono max-h-32 overflow-auto whitespace-pre-wrap">
                      {getCombinedSQL()}
                    </pre>
                  </div>
                )}

                {/* Individual Query Cards */}
                {sqlQueries.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-64 overflow-auto">
                    {sqlQueries.map((query, index) => (
                      <div
                        key={query.id}
                        className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden"
                      >
                        {editingQueryId === query.id ? (
                          <div className="p-2">
                            <textarea
                              value={editingQuerySql}
                              onChange={(e) => setEditingQuerySql(e.target.value)}
                              className="w-full h-24 bg-slate-800 border border-slate-600 rounded p-2 text-xs text-slate-200 font-mono resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1 mt-2">
                              <button
                                onClick={() => setEditingQueryId(null)}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateQuery(query.id)}
                                className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="px-2.5 py-1.5 bg-slate-700/30 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                #{index + 1} {query.name}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => handleCopyQuery(query.sql)}
                                  className="p-1 text-slate-500 hover:text-white transition-colors"
                                  title="Copy"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingQueryId(query.id);
                                    setEditingQuerySql(query.sql);
                                  }}
                                  className="p-1 text-slate-500 hover:text-white transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleRemoveQuery(query.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <pre className="px-2.5 py-2 text-[10px] text-slate-400 font-mono max-h-20 overflow-auto whitespace-pre-wrap">
                              {query.sql.substring(0, 300)}
                              {query.sql.length > 300 && '...'}
                            </pre>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Query Form */}
                {showAddQuery ? (
                  <div className="mb-3">
                    <textarea
                      value={newQueryInput}
                      onChange={(e) => setNewQueryInput(e.target.value)}
                      placeholder={`-- Enter your SQL query
SELECT * FROM users
JOIN orders ON users.id = orders.user_id;`}
                      className="w-full h-28 bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder:text-slate-600"
                      spellCheck={false}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowAddQuery(false);
                          setNewQueryInput('');
                        }}
                        className="flex-1 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddQuery}
                        disabled={!newQueryInput.trim()}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                          newQueryInput.trim()
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Add Query
                      </button>
                    </div>
                  </div>
                ) : sqlQueries.length === 0 ? (
                  /* Initial SQL Input when no queries */
                  <div className="mb-3">
                    <div className="mb-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-purple-400 font-medium">Supported:</span> CREATE TABLE, CREATE VIEW,
                        CREATE PROCEDURE, SELECT with JOINs
                      </p>
                    </div>
                    <textarea
                      value={newQueryInput}
                      onChange={(e) => setNewQueryInput(e.target.value)}
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
                      onClick={handleAddQuery}
                      disabled={!newQueryInput.trim()}
                      className={`w-full mt-2 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        newQueryInput.trim()
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add SQL
                    </button>
                  </div>
                ) : (
                  /* Add Query Button when queries exist */
                  <button
                    onClick={() => setShowAddQuery(true)}
                    className="w-full mb-3 py-2 rounded-lg text-xs font-medium bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Query
                  </button>
                )}

                {/* Parse Button */}
                {sqlQueries.length > 0 && (
                  <button
                    onClick={handleParseSQL}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    <Code className="w-4 h-4" />
                    Parse & Visualize ({sqlQueries.length} {sqlQueries.length === 1 ? 'query' : 'queries'})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Schema Summary - shown when tables exist */}
          {tables.length > 0 && (
            <div className="flex-1 overflow-auto p-3">
              {/* Success indicator */}
              <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Schema Loaded</span>
                </div>
                <p className="text-xs text-slate-400">
                  {tables.length} table{tables.length !== 1 ? 's' : ''} and {relationships.length} join{relationships.length !== 1 ? 's' : ''} discovered
                </p>
              </div>

              {/* Table list with delete option */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Tables
                </div>
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="flex items-center gap-2 px-2.5 py-2 bg-slate-700/30 rounded-lg group hover:bg-slate-700/50 transition-colors"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-white font-medium flex-1">{table.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {table.columns.length} col{table.columns.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                      title="Delete table"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Tip about joins tab */}
              {relationships.length > 0 && (
                <div className="mt-4 p-2.5 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
                  <p className="text-[10px] text-cyan-300 flex items-center gap-1.5">
                    <Link className="w-3 h-3" />
                    <span>View and manage joins in the <strong>Joins</strong> tab above</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no tables */}
          {tables.length === 0 && !sqlExpanded && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Database className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-1">No schema loaded</p>
                <p className="text-xs text-slate-500">Paste SQL above to get started</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Joins Tab Content */}
      {activeTab === 'joins' && tables.length > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter Header */}
          <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
            <div className="relative flex-1" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  filterTable
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  <span>{filterTable ? getTableName(filterTable) : 'Filter by table'}</span>
                </div>
                {filterTable ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFilterTable(null); }}
                    className="p-0.5 hover:bg-slate-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 max-h-48 overflow-auto">
                  <button
                    onClick={() => { setFilterTable(null); setShowFilterDropdown(false); }}
                    className={`w-full px-2.5 py-1.5 text-xs text-left transition-colors ${
                      !filterTable ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    All Tables
                  </button>
                  {tables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setFilterTable(t.id); setShowFilterDropdown(false); }}
                      className={`w-full px-2.5 py-1.5 text-xs text-left transition-colors ${
                        filterTable === t.id ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Show/Hide All Buttons */}
            <div className="flex gap-1">
              <button
                onClick={onShowAll}
                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/20 rounded transition-colors"
                title="Show all"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onHideAll}
                className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-600 rounded transition-colors"
                title="Hide all"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Relationships List */}
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {filteredRelationships.length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {filterTable ? 'No joins for this table' : 'No joins found'}
                </p>
              </div>
            ) : (
              filteredRelationships.map((rel) => {
                const isActive = activeRelationships.has(rel.id);
                const sourceTable = getTableName(rel.sourceTable);
                const targetTable = getTableName(rel.targetTable);

                return (
                  <div
                    key={rel.id}
                    className={`rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => onToggleRelationship?.(rel.id)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                          <span className="text-xs font-medium text-white">{sourceTable}</span>
                          <ChevronRight className="w-3 h-3 text-slate-500" />
                          <span className="text-xs font-medium text-white">{targetTable}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAnimateChain?.(rel.id);
                              }}
                              className="p-1 text-cyan-400 hover:bg-cyan-500/30 rounded transition-colors"
                              title="Animate chain"
                            >
                              <Zap className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleRelationship?.(rel.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              isActive
                                ? 'text-cyan-400 hover:bg-cyan-500/30'
                                : 'text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono bg-slate-800/50 rounded px-2 py-1">
                        {sourceTable}.{rel.sourceColumn} → {targetTable}.{rel.targetColumn}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stats Footer */}
          {relationships.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
              <span>
                {activeRelationships.size} of {relationships.length} visible
              </span>
              <span>
                {filteredRelationships.length} shown
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
