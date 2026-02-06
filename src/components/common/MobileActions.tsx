import { useState } from 'react';
import { Plus, Table2, Code, Save, FolderOpen, X, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { toast } from './Toast';
import { sanitizeTableName, sanitizeSessionName, generateSafeId } from '../../utils/sanitize';
import { getTableColor } from '../../utils/sqlParser';

interface MobileActionsProps {
  onShowSql: () => void;
  currentPanel?: 'sidebar' | 'canvas' | 'joins';
}

export function MobileActions({ onShowSql, currentPanel = 'canvas' }: MobileActionsProps) {
  // Only show FAB on canvas view
  if (currentPanel !== 'canvas') {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showSaveSession, setShowSaveSession] = useState(false);
  const [showLoadSession, setShowLoadSession] = useState(false);
  const [tableName, setTableName] = useState('');
  const [sessionName, setSessionName] = useState('');

  const { tables, addTable, savedSchemas, saveCurrentSchema, loadSavedSchema, deleteSavedSchema } = useStore();

  const handleAddTable = () => {
    const sanitized = sanitizeTableName(tableName);
    if (!sanitized) {
      toast.error('Invalid name', 'Please enter a valid table name');
      return;
    }

    // Check for duplicates
    if (tables.some(t => t.name.toLowerCase() === sanitized.toLowerCase())) {
      toast.error('Duplicate', 'A table with this name already exists');
      return;
    }

    addTable({
      id: generateSafeId('table'),
      name: sanitized,
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      ],
      color: getTableColor(tables.length),
    });

    setTableName('');
    setShowAddTable(false);
    setIsOpen(false);
    toast.success('Table added', `Created table "${sanitized}"`);
  };

  const handleSaveSession = () => {
    const sanitized = sanitizeSessionName(sessionName);
    if (!sanitized) {
      toast.error('Invalid name', 'Please enter a valid session name');
      return;
    }

    if (tables.length === 0) {
      toast.error('No tables', 'Add some tables before saving');
      return;
    }

    saveCurrentSchema(sanitized);
    setSessionName('');
    setShowSaveSession(false);
    setIsOpen(false);
    toast.success('Session saved', `Saved as "${sanitized}"`);
  };

  const handleLoadSession = (id: string) => {
    loadSavedSchema(id);
    setShowLoadSession(false);
    setIsOpen(false);
    toast.success('Session loaded', 'Schema restored');
  };

  const handleDeleteSession = (id: string, name: string) => {
    if (confirm(`Delete session "${name}"?`)) {
      deleteSavedSchema(id);
      toast.info('Deleted', 'Session removed');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isOpen
              ? 'bg-slate-700 rotate-45'
              : 'bg-gradient-to-br from-purple-600 to-purple-500'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Action Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 animate-fadeIn">
            <button
              onClick={() => { setShowAddTable(true); setIsOpen(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 rounded-lg shadow-lg border border-slate-700 text-white text-sm whitespace-nowrap"
            >
              <Table2 className="w-4 h-4 text-blue-400" />
              Add Table
            </button>
            <button
              onClick={() => { onShowSql(); setIsOpen(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 rounded-lg shadow-lg border border-slate-700 text-white text-sm whitespace-nowrap"
            >
              <Code className="w-4 h-4 text-green-400" />
              Import SQL
            </button>
            <button
              onClick={() => { setShowSaveSession(true); setIsOpen(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 rounded-lg shadow-lg border border-slate-700 text-white text-sm whitespace-nowrap"
            >
              <Save className="w-4 h-4 text-purple-400" />
              Save Session
            </button>
            {savedSchemas.length > 0 && (
              <button
                onClick={() => { setShowLoadSession(true); setIsOpen(false); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 rounded-lg shadow-lg border border-slate-700 text-white text-sm whitespace-nowrap"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                Load Session ({savedSchemas.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Table Dialog */}
      {showAddTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddTable(false)} />
          <div className="relative w-full bg-slate-800 rounded-t-2xl p-4 pb-8 animate-slideUp">
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-4">Add New Table</h3>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Table name (e.g., users, orders)"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddTable(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                disabled={!tableName.trim()}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Session Dialog */}
      {showSaveSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSaveSession(false)} />
          <div className="relative w-full bg-slate-800 rounded-t-2xl p-4 pb-8 animate-slideUp">
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-4">Save Session</h3>
            <p className="text-sm text-slate-400 mb-3">
              Save your current {tables.length} table(s) for later
            </p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Session name (e.g., E-commerce DB)"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowSaveSession(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                disabled={!sessionName.trim() || tables.length === 0}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Session Dialog */}
      {showLoadSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLoadSession(false)} />
          <div className="relative w-full max-h-[70vh] bg-slate-800 rounded-t-2xl p-4 pb-8 animate-slideUp overflow-hidden flex flex-col">
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white mb-4 flex-shrink-0">Load Session</h3>

            <div className="flex-1 overflow-y-auto space-y-2">
              {savedSchemas.map((schema) => (
                <div
                  key={schema.id}
                  className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg"
                >
                  <button
                    onClick={() => handleLoadSession(schema.id)}
                    className="flex-1 text-left"
                  >
                    <div className="text-white font-medium">{schema.name}</div>
                    <div className="text-xs text-slate-400">
                      {schema.tables.length} tables · {schema.relationships.length} joins
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(schema.id, schema.name)}
                    className="p-2 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {savedSchemas.length === 0 && (
                <p className="text-center text-slate-500 py-8">No saved sessions</p>
              )}
            </div>

            <button
              onClick={() => setShowLoadSession(false)}
              className="w-full py-3 bg-slate-700 text-slate-300 rounded-lg font-medium mt-4 flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
