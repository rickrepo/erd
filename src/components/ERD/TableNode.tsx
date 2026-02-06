import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Key, Link, X, Plus } from 'lucide-react';
import type { Table, Column } from '../../types';

interface TableNodeData {
  table: Table;
  isSelected: boolean;
  isDimmed?: boolean;
  activeRelationships?: Set<string>; // Which relationships are currently shown
  onFKClick?: (tableId: string, columnName: string) => void;
  onColumnClick?: (column: Column) => void;
  onEditTable?: () => void;
  onAddColumn?: (tableId: string) => void;
  onDeleteColumn?: (tableId: string, columnName: string) => void;
  onEditColumn?: (tableId: string, columnName: string, updates: Partial<Column>) => void;
  isExporting?: boolean;
}

// Professional ERD table node with glowing FK indicators
function TableNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableNodeData;
  const { table, onColumnClick, onFKClick, isExporting, isDimmed, activeRelationships, onAddColumn, onDeleteColumn, onEditColumn } = nodeData;
  const isSelected = selected || nodeData.isSelected;
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredFK, setHoveredFK] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const pkColumns = table.columns.filter(c => c.isPrimaryKey);
  const fkColumns = table.columns.filter(c => c.isForeignKey);

  const getColumnIcon = (column: Column) => {
    if (column.isPrimaryKey) {
      return <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />;
    }
    if (column.isForeignKey) {
      return <Link className="w-3 h-3 text-blue-400 flex-shrink-0" />;
    }
    return null;
  };

  const getTypeAbbreviation = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('VARCHAR') || t.includes('TEXT') || t.includes('CHAR')) return 'str';
    if (t.includes('INT') || t.includes('SERIAL')) return 'int';
    if (t.includes('DECIMAL') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('NUMERIC')) return 'num';
    if (t.includes('BOOL')) return 'bool';
    if (t.includes('DATE') || t.includes('TIME')) return 'date';
    if (t.includes('JSON')) return 'json';
    if (t.includes('UUID')) return 'uuid';
    return type.slice(0, 4).toLowerCase();
  };

  // Check if this FK's relationship is currently active/shown
  const isFKActive = (column: Column) => {
    if (!activeRelationships || !column.isForeignKey) return false;
    // Check if any active relationship involves this table and column
    return activeRelationships.has(`${table.id}-${column.name}`);
  };

  // Show handles when hovered, selected, or exporting
  const showHandles = isHovered || isSelected || isExporting;

  const handleFKClick = (e: React.MouseEvent, column: Column) => {
    e.stopPropagation();
    if (column.isForeignKey && onFKClick) {
      onFKClick(table.id, column.name);
    }
  };

  return (
    <div
      className={`
        bg-slate-900 rounded-lg shadow-2xl transition-all duration-200 min-w-[260px] max-w-[320px]
        ${isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
          : 'hover:shadow-3xl'
        }
        ${isExporting ? '' : 'hover:scale-[1.01]'}
        ${isDimmed ? 'opacity-30 pointer-events-none' : ''}
      `}
      style={{
        boxShadow: isSelected
          ? `0 0 40px ${table.color}40, 0 20px 60px rgba(0,0,0,0.5)`
          : '0 10px 50px rgba(0,0,0,0.4)',
        border: `2px solid ${isSelected ? table.color : '#334155'}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-md flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${table.color} 0%, ${table.color}dd 100%)`,
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <h3 className="font-bold text-white text-sm tracking-wide truncate">
              {table.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {pkColumns.length > 0 && (
                <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                  <Key className="w-2.5 h-2.5" /> {pkColumns.length}
                </span>
              )}
              {fkColumns.length > 0 && (
                <span className="text-[10px] text-white/70 flex items-center gap-0.5">
                  <Link className="w-2.5 h-2.5" /> {fkColumns.length}
                </span>
              )}
              <span className="text-[10px] text-white/60">
                {table.columns.length} cols
              </span>
            </div>
          </div>
        </div>
        {/* Add column button */}
        {!isExporting && onAddColumn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddColumn(table.id);
            }}
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
            title="Add column"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* Columns */}
      <div className="bg-slate-800/50">
        {table.columns.map((column: Column, index: number) => {
          const isFK = column.isForeignKey;
          const isActiveFK = isFKActive(column);
          const isHoveredFK = hoveredFK === column.name && isFK;

          return (
            <div
              key={column.name}
              className={`
                relative px-3 py-1.5 flex items-center gap-2 text-xs
                transition-all duration-300 group
                ${index !== table.columns.length - 1 ? 'border-b border-slate-700/30' : ''}
                ${isFK ? 'cursor-pointer hover:bg-blue-500/20' : 'hover:bg-slate-700/50 cursor-pointer'}
                ${isActiveFK ? 'bg-blue-500/30' : ''}
              `}
              onClick={(e) => isFK ? handleFKClick(e, column) : onColumnClick?.(column)}
              onMouseEnter={() => isFK && setHoveredFK(column.name)}
              onMouseLeave={() => setHoveredFK(null)}
            >
              {/* Left handle */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-left`}
                className={`!w-3 !h-3 !border-2 !border-slate-900 transition-all duration-200 ${
                  showHandles
                    ? '!bg-blue-500 !opacity-100 hover:!bg-blue-400 hover:!scale-125'
                    : '!bg-blue-500/40 !opacity-0'
                }`}
                style={{ left: -7 }}
              />

              {/* Column icon with glow for FK - purple-blue AI feel */}
              <div className={`w-4 flex justify-center relative ${isFK ? 'fk-glow-container' : ''}`}>
                {getColumnIcon(column)}
                {/* Glowing indicator for FK - purple-blue gradient */}
                {isFK && !isActiveFK && (
                  <div className={`
                    absolute inset-0 -m-1.5 rounded-full
                    ${isHoveredFK
                      ? 'animate-ping-slow bg-gradient-to-r from-purple-400/60 to-blue-400/60'
                      : 'animate-pulse-glow bg-gradient-to-r from-purple-500/40 to-blue-500/40'}
                  `} />
                )}
                {isFK && isActiveFK && (
                  <div className="absolute inset-0 -m-1.5 rounded-full bg-gradient-to-r from-purple-400/60 to-cyan-400/60 animate-pulse" />
                )}
              </div>

              {/* Column name - editable on double-click */}
              {editingColumn === column.name ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim() && editValue !== column.name) {
                      onEditColumn?.(table.id, column.name, { name: editValue.trim() });
                    }
                    setEditingColumn(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue.trim() && editValue !== column.name) {
                        onEditColumn?.(table.id, column.name, { name: editValue.trim() });
                      }
                      setEditingColumn(null);
                    } else if (e.key === 'Escape') {
                      setEditingColumn(null);
                    }
                  }}
                  className="flex-1 bg-slate-700 text-white text-xs px-1 py-0.5 rounded outline-none border border-blue-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`
                    flex-1 font-medium truncate transition-colors duration-200
                    ${column.isPrimaryKey ? 'text-amber-300' :
                      isActiveFK ? 'text-green-300' :
                      column.isForeignKey ? 'text-blue-300' : 'text-slate-200'}
                    ${isHoveredFK ? 'text-blue-200' : ''}
                  `}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingColumn(column.name);
                    setEditValue(column.name);
                  }}
                >
                  {column.name}
                  {!column.isNullable && <span className="text-red-400 ml-0.5">*</span>}
                </span>
              )}

              {/* FK target hint on hover */}
              {isFK && column.references && isHoveredFK && !editingColumn && (
                <span className="text-[9px] text-blue-300 animate-fadeIn">
                  → {column.references.table}
                </span>
              )}

              {/* Delete button on hover */}
              {!isExporting && !editingColumn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteColumn?.(table.id, column.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/30 rounded transition-all"
                  title="Delete column"
                >
                  <X className="w-3 h-3 text-red-400" />
                </button>
              )}

              {/* Column type badge */}
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors duration-200
                ${column.isPrimaryKey
                  ? 'bg-amber-500/20 text-amber-300'
                  : isActiveFK
                    ? 'bg-green-500/20 text-green-300'
                    : column.isForeignKey
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-700 text-slate-400'
                }
              `}>
                {getTypeAbbreviation(column.type)}
              </span>

              {/* Right handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-right`}
                className={`!w-3 !h-3 !border-2 !border-slate-900 transition-all duration-200 ${
                  showHandles
                    ? '!bg-purple-500 !opacity-100 hover:!bg-purple-400 hover:!scale-125'
                    : '!bg-purple-500/40 !opacity-0'
                }`}
                style={{ right: -7 }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer - Click FK hint */}
      {fkColumns.length > 0 && (
        <div className="px-3 py-2 bg-slate-800/30 rounded-b-md border-t border-slate-700/30">
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <span className="animate-pulse-glow inline-block w-2 h-2 rounded-full bg-blue-400/50"></span>
            <span>Click glowing columns to reveal connections</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TableNode);
