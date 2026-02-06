import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Link,
  ArrowRight,
  Search,
  Play,
  Filter,
  ChevronDown,
  Table as TableIcon,
  Database,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES } from '../../utils/demoData';
import { toast } from './Toast';

interface MobileJoinsPanelProps {
  activeRelationships: Set<string>;
  onToggleRelationship: (relId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onAnimateChain: (startRelId: string) => void;
}

export const MobileJoinsPanel: React.FC<MobileJoinsPanelProps> = ({
  activeRelationships,
  onToggleRelationship,
  onShowAll,
  onHideAll,
  onAnimateChain,
}) => {
  const { tables, relationships, loadDemo } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTable, setFilterTable] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const handleLoadDemo = () => {
    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, DEMO_SQL_QUERIES);
    toast.success('Demo loaded!', 'E-commerce schema with sample SQL');
  };

  // Filter relationships based on search and table filter
  const filteredRelationships = relationships.filter((rel) => {
    const sourceTable = tables.find((t) => t.id === rel.sourceTable);
    const targetTable = tables.find((t) => t.id === rel.targetTable);

    if (filterTable && rel.sourceTable !== filterTable && rel.targetTable !== filterTable) {
      return false;
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSource =
        sourceTable?.name.toLowerCase().includes(searchLower) ||
        rel.sourceColumn.toLowerCase().includes(searchLower);
      const matchesTarget =
        targetTable?.name.toLowerCase().includes(searchLower) ||
        rel.targetColumn.toLowerCase().includes(searchLower);
      return matchesSource || matchesTarget;
    }

    return true;
  });

  const visibleCount = activeRelationships.size;
  const totalCount = relationships.length;

  // Find chains for a relationship
  const findChain = (startRelId: string): string[] => {
    const chain: string[] = [startRelId];
    const startRel = relationships.find((r) => r.id === startRelId);
    if (!startRel) return chain;

    let currentTargetTable = startRel.targetTable;
    const visited = new Set([startRelId]);

    while (true) {
      const nextRel = relationships.find(
        (r) => r.sourceTable === currentTargetTable && !visited.has(r.id)
      );
      if (!nextRel) break;
      chain.push(nextRel.id);
      visited.add(nextRel.id);
      currentTargetTable = nextRel.targetTable;
    }

    return chain;
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Link className="w-4 h-4 text-purple-400" />
            Join Control Panel
          </h2>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
            {visibleCount}/{totalCount}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search joins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Filter by table */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {filterTable
                ? tables.find((t) => t.id === filterTable)?.name || 'All Tables'
                : 'All Tables'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showFilterDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 max-h-48 overflow-auto">
              <button
                onClick={() => {
                  setFilterTable(null);
                  setShowFilterDropdown(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                  !filterTable ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                All Tables
              </button>
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => {
                    setFilterTable(table.id);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
                    filterTable === table.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <TableIcon className="w-3 h-3" />
                  {table.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {totalCount > 0 && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={onShowAll}
              className="flex-1 py-2 px-3 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Show All
            </button>
            <button
              onClick={onHideAll}
              className="flex-1 py-2 px-3 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Hide All
            </button>
          </div>
        )}
      </div>

      {/* Joins List */}
      <div className="flex-1 overflow-auto p-3">
        {filteredRelationships.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
              <Link className="w-6 h-6 text-purple-400 opacity-50" />
            </div>
            <p className="text-sm text-slate-400 mb-1">
              {searchQuery || filterTable ? 'No matching joins' : 'No relationships yet'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery || filterTable
                ? 'Try adjusting your filters'
                : 'Import SQL or load demo to see joins'}
            </p>
            {!searchQuery && !filterTable && relationships.length === 0 && (
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Database className="w-4 h-4" />
                Load Demo Data
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRelationships.map((rel) => {
              const sourceTable = tables.find((t) => t.id === rel.sourceTable);
              const targetTable = tables.find((t) => t.id === rel.targetTable);
              const isActive = activeRelationships.has(rel.id);
              const chain = findChain(rel.id);
              const hasChain = chain.length > 1;

              return (
                <div
                  key={rel.id}
                  className={`rounded-xl border transition-all ${
                    isActive
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-slate-700/30 border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => onToggleRelationship(rel.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div
                        className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 transition-all ${
                          isActive
                            ? 'bg-purple-400 shadow-lg shadow-purple-400/50'
                            : 'bg-slate-600'
                        }`}
                      />

                      {/* Join info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              isActive ? 'text-purple-300' : 'text-white'
                            }`}
                          >
                            {sourceTable?.name}
                          </span>
                          <span className="text-xs text-slate-500">.{rel.sourceColumn}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span
                            className={`text-sm font-medium ${
                              isActive ? 'text-blue-300' : 'text-white'
                            }`}
                          >
                            {targetTable?.name}
                          </span>
                          <span className="text-xs text-slate-500">.{rel.targetColumn}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isActive
                                ? 'bg-purple-500/30 text-purple-200'
                                : 'bg-slate-600 text-slate-400'
                            }`}
                          >
                            {rel.type === 'one-to-one'
                              ? '1:1'
                              : rel.type === 'one-to-many'
                              ? '1:N'
                              : 'N:M'}
                          </span>
                          {hasChain && (
                            <span className="text-[10px] text-purple-400">
                              {chain.length} table chain
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle icon */}
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive ? 'bg-purple-500/30 text-purple-300' : 'bg-slate-600 text-slate-400'
                        }`}
                      >
                        {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Animate chain button */}
                  {hasChain && isActive && (
                    <div className="px-3 pb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnimateChain(rel.id);
                        }}
                        className="w-full py-2 text-xs font-medium bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Animate {chain.length}-table chain
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SQL Preview - bottom section */}
      <SQLPreview />
    </div>
  );
};

// SQL Preview sub-component
const SQLPreview: React.FC = () => {
  const { sqlInput } = useStore();
  const [expanded, setExpanded] = useState(false);

  if (!sqlInput) return null;

  return (
    <div className="flex-shrink-0 border-t border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-sm font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-blue-400" />
          SQL Query Used
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 animate-slideIn">
          <pre className="p-2.5 bg-slate-900 rounded-lg text-xs text-slate-300 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
            {sqlInput.slice(0, 1000)}
            {sqlInput.length > 1000 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MobileJoinsPanel;
