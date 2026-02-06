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
  Palette,
  Minus,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DEMO_TABLES, DEMO_RELATIONSHIPS } from '../../utils/demoData';
import { useAdminStore } from '../../store/useAdminStore';
import { toast } from './Toast';

interface MobileJoinsPanelProps {
  activeRelationships: Set<string>;
  onToggleRelationship: (relId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onAnimateChain: (startRelId: string) => void;
  edgeStyle?: 'gradient' | 'flat';
  onEdgeStyleChange?: (style: 'gradient' | 'flat') => void;
  onSwitchToCanvas?: () => void;
}

export const MobileJoinsPanel: React.FC<MobileJoinsPanelProps> = ({
  activeRelationships,
  onToggleRelationship,
  onShowAll,
  onHideAll,
  onAnimateChain,
  edgeStyle = 'gradient',
  onEdgeStyleChange,
  onSwitchToCanvas,
}) => {
  const { tables, relationships, loadDemo } = useStore();
  const { getCurrentDemoQuery, cycleToNextDemo } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTable, setFilterTable] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Build table color map
  const tableColorMap: Record<string, string> = {};
  tables.forEach((t) => {
    tableColorMap[t.id] = t.color || '#3b82f6';
  });

  const handleLoadDemo = () => {
    const currentQuery = getCurrentDemoQuery();
    const sql = currentQuery?.sql || '-- No demo queries configured';
    const queryName = currentQuery?.name || 'E-commerce schema';

    loadDemo(DEMO_TABLES, DEMO_RELATIONSHIPS, sql);
    toast.success('Demo loaded!', queryName);
    cycleToNextDemo();
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
            <Link className="w-4 h-4 text-cyan-400" />
            Relationships
          </h2>
          {totalCount > 0 && (
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
              {visibleCount} of {totalCount} visible
            </span>
          )}
        </div>

        {/* Only show filters if there are relationships */}
        {totalCount > 0 && (
          <>
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
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
                    : 'Filter by table'}
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
                      !filterTable ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-600'
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
                          ? 'bg-cyan-600 text-white'
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
            <div className="flex gap-2 mt-3">
              <button
                onClick={onShowAll}
                className="flex-1 py-2 px-3 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
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

            {/* Edge Style Toggle */}
            {onEdgeStyleChange && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onEdgeStyleChange('gradient')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    edgeStyle === 'gradient'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  Gradient
                </button>
                <button
                  onClick={() => onEdgeStyleChange('flat')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    edgeStyle === 'flat'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Flat
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Joins List */}
      <div className="flex-1 overflow-auto p-3">
        {filteredRelationships.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
              <Link className="w-6 h-6 text-cyan-400 opacity-50" />
            </div>
            <p className="text-sm text-slate-400 mb-1">
              {searchQuery || filterTable ? 'No matching joins' : 'No relationships yet'}
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery || filterTable
                ? 'Try adjusting your filters'
                : 'Go to SQL tab and import your schema'}
            </p>
            {!searchQuery && !filterTable && relationships.length === 0 && (
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Database className="w-4 h-4" />
                Load Demo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRelationships.map((rel) => {
              const sourceTable = tables.find((t) => t.id === rel.sourceTable);
              const targetTable = tables.find((t) => t.id === rel.targetTable);
              const srcColor = tableColorMap[rel.sourceTable] || '#3b82f6';
              const tgtColor = tableColorMap[rel.targetTable] || '#8b5cf6';
              const isActive = activeRelationships.has(rel.id);
              const chain = findChain(rel.id);
              const hasChain = chain.length > 1;

              return (
                <div
                  key={rel.id}
                  className={`rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-700/50 border-slate-600'
                      : 'bg-slate-700/30 border-slate-700 active:bg-slate-700/50'
                  }`}
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: srcColor,
                    borderRightWidth: '3px',
                    borderRightColor: tgtColor,
                  }}
                >
                  <button
                    onClick={() => {
                      const wasActive = activeRelationships.has(rel.id);
                      onToggleRelationship(rel.id);
                      // Switch to canvas when activating a join
                      if (!wasActive && onSwitchToCanvas) {
                        onSwitchToCanvas();
                      }
                    }}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Toggle indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-600 text-slate-400'
                        }`}
                        style={isActive ? { backgroundColor: `${srcColor}40` } : undefined}
                      >
                        {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </div>

                      {/* Join info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: srcColor }}
                          />
                          <span className="font-medium truncate" style={{ color: srcColor }}>
                            {sourceTable?.name}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tgtColor }}
                          />
                          <span className="font-medium truncate" style={{ color: tgtColor }}>
                            {targetTable?.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 ml-3.5">
                          {rel.sourceColumn} → {rel.targetColumn}
                          <span className="mx-1">•</span>
                          <span
                            className="px-1 py-0.5 rounded font-bold"
                            style={{
                              background: `linear-gradient(90deg, ${srcColor}30, ${tgtColor}30)`,
                              color: '#e2e8f0',
                            }}
                          >
                            {rel.type === 'one-to-one' ? '1:1' : rel.type === 'one-to-many' ? '1:N' : 'N:M'}
                          </span>
                        </div>
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
                        className="w-full py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        style={{
                          background: `linear-gradient(90deg, ${srcColor}40, ${tgtColor}40)`,
                          color: '#e2e8f0',
                        }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Trace {chain.length}-table chain
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileJoinsPanel;
