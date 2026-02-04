import { useState } from 'react';
import { Save, FolderOpen, Trash2, Edit3, Check, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const SavedSchemas: React.FC = () => {
  const { tables, savedSchemas, saveCurrentSchema, loadSavedSchema, deleteSavedSchema, renameSavedSchema } = useStore();
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSave = () => {
    const name = saveName.trim() || `Schema ${new Date().toLocaleDateString()}`;
    saveCurrentSchema(name);
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameSavedSchema(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="border-t border-slate-700 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved Schemas</h3>
        {tables.length > 0 && (
          <button
            onClick={() => setShowSaveInput(true)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        )}
      </div>

      {showSaveInput && (
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
            placeholder="Schema name..."
            className="flex-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            autoFocus
          />
          <button onClick={handleSave} className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => setShowSaveInput(false)} className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {savedSchemas.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No saved schemas yet</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-auto">
          {savedSchemas.map((schema) => (
            <div
              key={schema.id}
              className="flex items-center gap-1.5 p-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group"
            >
              {editingId === schema.id ? (
                <div className="flex-1 flex gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(schema.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 px-1.5 py-0.5 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200"
                    autoFocus
                  />
                  <button onClick={() => handleRename(schema.id)} className="text-green-400 hover:text-green-300">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => loadSavedSchema(schema.id)}
                    className="flex-1 text-left min-w-0"
                    title="Click to load"
                  >
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="text-xs text-slate-300 truncate">{schema.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-4.5 mt-0.5">
                      {schema.tables.length} tables, {schema.relationships.length} rels
                    </p>
                  </button>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartRename(schema.id, schema.name)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                      title="Rename"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteSavedSchema(schema.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedSchemas;
