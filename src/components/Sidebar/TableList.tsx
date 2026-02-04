import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Key,
  Link,
  Plus,
  Trash2,
  Edit3,
  X,
  GripVertical,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Table, Column } from '../../types';
import { getTableColor } from '../../utils/sqlParser';
import SavedSchemas from './SavedSchemas';

const TableList: React.FC = () => {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    addTable,
    updateTable,
    removeTable,
    addColumn,
    removeColumn,
  } = useStore();

  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [showNewTable, setShowNewTable] = useState(false);

  const toggleExpand = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const handleAddTable = () => {
    if (!newTableName.trim()) return;

    const newTable: Table = {
      id: `table-${Date.now()}`,
      name: newTableName.trim(),
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      ],
      color: getTableColor(tables.length),
    };

    addTable(newTable);
    setNewTableName('');
    setShowNewTable(false);
    setExpandedTables((prev) => new Set([...prev, newTable.id]));
  };

  const handleAddColumn = (tableId: string) => {
    const column: Column = {
      name: `column_${Date.now() % 1000}`,
      type: 'VARCHAR',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
    };
    addColumn(tableId, column);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Tables</h2>
          <p className="text-xs text-slate-400">{tables.length} table(s) in diagram</p>
        </div>
        <button
          onClick={() => setShowNewTable(true)}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          title="Add Table"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* New Table Input */}
      {showNewTable && (
        <div className="mb-4 p-3 bg-slate-700 rounded-lg animate-slideIn">
          <input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Table name..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTable();
              if (e.key === 'Escape') setShowNewTable(false);
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTable}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Create Table
            </button>
            <button
              onClick={() => setShowNewTable(false)}
              className="py-1.5 px-3 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Saved Schemas */}
      <SavedSchemas />

      {/* Table List */}
      <div className="flex-1 space-y-2 overflow-auto mt-3">
        {tables.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <GripVertical className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No tables yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Parse SQL or add tables manually
            </p>
          </div>
        ) : (
          tables.map((table) => (
            <div
              key={table.id}
              className={`
                rounded-lg border transition-all
                ${selectedTable === table.id
                  ? 'border-blue-500 bg-slate-700/50'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }
              `}
            >
              {/* Table Header */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer"
                onClick={() => {
                  setSelectedTable(table.id);
                  toggleExpand(table.id);
                }}
              >
                <button className="text-slate-400">
                  {expandedTables.has(table.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: table.color }}
                />
                {editingTable === table.id ? (
                  <input
                    type="text"
                    defaultValue={table.name}
                    className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                    autoFocus
                    onBlur={(e) => {
                      updateTable(table.id, { name: e.target.value });
                      setEditingTable(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTable(table.id, { name: (e.target as HTMLInputElement).value });
                        setEditingTable(null);
                      }
                      if (e.key === 'Escape') setEditingTable(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 font-medium text-sm text-white">{table.name}</span>
                )}
                <span className="text-xs text-slate-500">{table.columns.length} cols</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTable(table.id);
                  }}
                  className="p-1 hover:bg-slate-600 rounded transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete table "${table.name}"?`)) {
                      removeTable(table.id);
                    }
                  }}
                  className="p-1 hover:bg-red-600/20 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>

              {/* Columns */}
              {expandedTables.has(table.id) && (
                <div className="border-t border-slate-700 py-1">
                  {table.columns.map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700/50 group"
                    >
                      {column.isPrimaryKey ? (
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                      ) : column.isForeignKey ? (
                        <Link className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <div className="w-3.5 h-3.5" />
                      )}
                      <span className="flex-1 text-sm text-slate-300">{column.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{column.type}</span>
                      <button
                        onClick={() => {
                          if (confirm(`Delete column "${column.name}"?`)) {
                            removeColumn(table.id, column.name);
                          }
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddColumn(table.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Column
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TableList;
