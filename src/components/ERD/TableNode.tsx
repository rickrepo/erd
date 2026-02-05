import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Key, Link, Circle } from 'lucide-react';
import type { Table, Column } from '../../types';

interface TableNodeData {
  table: Table;
  isSelected: boolean;
  onColumnClick?: (column: Column) => void;
  onEditTable?: () => void;
  isExporting?: boolean;
}

// Industry standard: Show all columns without truncation
function TableNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableNodeData;
  const { table, onColumnClick, isExporting } = nodeData;
  const isSelected = selected || nodeData.isSelected;
  const [isHovered, setIsHovered] = useState(false);

  const pkColumns = table.columns.filter(c => c.isPrimaryKey);
  const fkColumns = table.columns.filter(c => c.isForeignKey);

  const getColumnIcon = (column: Column) => {
    if (column.isPrimaryKey) {
      return <Key className="w-3 h-3 text-amber-400 flex-shrink-0" />;
    }
    if (column.isForeignKey) {
      return <Link className="w-3 h-3 text-blue-400 flex-shrink-0" />;
    }
    return <Circle className="w-2 h-2 text-slate-500 flex-shrink-0" />;
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

  // Show handles when hovered, selected, or exporting
  const showHandles = isHovered || isSelected || isExporting;

  return (
    <div
      className={`
        bg-slate-900 rounded-lg shadow-2xl transition-all duration-200 min-w-[260px] max-w-[320px]
        ${isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
          : 'hover:shadow-3xl'
        }
        ${isExporting ? '' : 'hover:scale-[1.01]'}
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
                {table.columns.length} columns
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Columns - show all columns (industry standard) */}
      <div className="bg-slate-800/50">
        {table.columns.map((column: Column, index: number) => (
          <div
            key={column.name}
            className={`
              relative px-3 py-1.5 flex items-center gap-2 text-xs
              hover:bg-slate-700/50 cursor-pointer transition-colors group
              ${index !== table.columns.length - 1 ? 'border-b border-slate-700/30' : ''}
            `}
            onClick={() => onColumnClick?.(column)}
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

            {/* Column icon */}
            <div className="w-4 flex justify-center">
              {getColumnIcon(column)}
            </div>

            {/* Column name */}
            <span className={`
              flex-1 font-medium truncate
              ${column.isPrimaryKey ? 'text-amber-300' : column.isForeignKey ? 'text-blue-300' : 'text-slate-200'}
            `}>
              {column.name}
              {!column.isNullable && <span className="text-red-400 ml-0.5">*</span>}
            </span>

            {/* Column type badge */}
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded font-mono
              ${column.isPrimaryKey
                ? 'bg-amber-500/20 text-amber-300'
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
        ))}
      </div>

      {/* Footer - FK references summary */}
      {fkColumns.length > 0 && (
        <div className="px-3 py-2 bg-slate-800/30 rounded-b-md border-t border-slate-700/30">
          <div className="text-[10px] text-slate-500 flex flex-wrap gap-1">
            {fkColumns.slice(0, 3).map((c: Column) => (
              <span
                key={c.name}
                className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded"
              >
                -&gt; {c.references?.table}
              </span>
            ))}
            {fkColumns.length > 3 && (
              <span className="px-1.5 py-0.5 text-slate-500">
                +{fkColumns.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TableNode);
