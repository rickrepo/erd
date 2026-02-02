import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Key, Link, MoreHorizontal, GripVertical } from 'lucide-react';
import type { Table, Column } from '../../types';

interface TableNodeData {
  table: Table;
  isSelected: boolean;
  onColumnClick?: (column: Column) => void;
  onEditTable?: () => void;
}

function TableNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableNodeData;
  const { table, onColumnClick, onEditTable } = nodeData;
  const isSelected = selected || nodeData.isSelected;

  const getColumnIcon = (column: Column) => {
    if (column.isPrimaryKey) {
      return <Key className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (column.isForeignKey) {
      return <Link className="w-3.5 h-3.5 text-blue-400" />;
    }
    return <div className="w-3.5 h-3.5" />;
  };

  return (
    <div
      className={`
        bg-slate-800 rounded-xl shadow-xl border-2 transition-all duration-200 min-w-[240px]
        ${isSelected
          ? 'border-blue-500 shadow-blue-500/20 shadow-2xl scale-105'
          : 'border-slate-600 hover:border-slate-500'
        }
      `}
      style={{
        boxShadow: isSelected
          ? `0 0 30px ${table.color}30, 0 10px 40px rgba(0,0,0,0.3)`
          : '0 10px 40px rgba(0,0,0,0.3)'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-xl flex items-center justify-between"
        style={{ backgroundColor: table.color || '#3b82f6' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-white/60 cursor-grab" />
          <h3 className="font-semibold text-white text-sm tracking-wide">
            {table.name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">
            {table.columns.length} cols
          </span>
          <button
            onClick={onEditTable}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="py-1">
        {table.columns.map((column: Column, index: number) => (
          <div
            key={column.name}
            className={`
              relative px-3 py-2 flex items-center gap-3 text-sm
              hover:bg-slate-700/50 cursor-pointer transition-colors group
              ${index !== table.columns.length - 1 ? 'border-b border-slate-700/50' : ''}
            `}
            onClick={() => onColumnClick?.(column)}
          >
            {/* Left handle for incoming relationships */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${column.name}-left`}
              className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />

            {/* Column icon */}
            {getColumnIcon(column)}

            {/* Column name */}
            <span className={`
              flex-1 font-medium
              ${column.isPrimaryKey ? 'text-amber-300' : column.isForeignKey ? 'text-blue-300' : 'text-slate-200'}
            `}>
              {column.name}
            </span>

            {/* Column type */}
            <span className="text-xs text-slate-500 font-mono">
              {column.type}
            </span>

            {/* Nullable indicator */}
            {column.isNullable && (
              <span className="text-xs text-slate-600">?</span>
            )}

            {/* Right handle for outgoing relationships */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${column.name}-right`}
              className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        ))}

        {table.columns.length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-500 italic">
            No columns defined
          </div>
        )}
      </div>

      {/* Footer with references */}
      {table.columns.some((c: Column) => c.references) && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
          <div className="text-xs text-slate-500">
            References: {table.columns.filter((c: Column) => c.references).map((c: Column) => c.references?.table).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TableNode);
