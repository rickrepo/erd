import React, { useState } from 'react';
import { Copy, Check, Database } from 'lucide-react';
import { generateSchemaHelperSQL, parseSchemaResults } from '../../utils/sqlParser';
import { useStore } from '../../store/useStore';

type Dialect = 'mysql' | 'postgres' | 'sqlite' | 'sqlserver';

const SchemaHelper: React.FC = () => {
  const [dialect, setDialect] = useState<Dialect>('mysql');
  const [copied, setCopied] = useState(false);
  const [schemaResults, setSchemaResults] = useState('');
  const { setTables, tables, addChatMessage } = useStore();

  const sql = generateSchemaHelperSQL(dialect);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportResults = () => {
    if (!schemaResults.trim()) return;

    const parsedTables = parseSchemaResults(schemaResults);
    if (parsedTables.length > 0) {
      setTables([...tables, ...parsedTables]);
      addChatMessage({
        role: 'assistant',
        content: `Successfully imported **${parsedTables.length} tables** from your schema results! The ERD has been updated with the new tables.`,
      });
      setSchemaResults('');
    }
  };

  const dialects: { id: Dialect; name: string; icon: string }[] = [
    { id: 'mysql', name: 'MySQL', icon: '🐬' },
    { id: 'postgres', name: 'PostgreSQL', icon: '🐘' },
    { id: 'sqlite', name: 'SQLite', icon: '🪶' },
    { id: 'sqlserver', name: 'SQL Server', icon: '🔷' },
  ];

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-2">Schema Helper</h2>
        <p className="text-xs text-slate-400">
          Get your database schema by running the SQL query below. Then paste the results to import
          tables automatically.
        </p>
      </div>

      {/* Database Dialect Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">Database Type</label>
        <div className="grid grid-cols-2 gap-2">
          {dialects.map((d) => (
            <button
              key={d.id}
              onClick={() => setDialect(d.id)}
              className={`
                py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${dialect === d.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              <span>{d.icon}</span>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generated SQL Query */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-400">Schema Query</label>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Query
              </>
            )}
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 max-h-48 overflow-auto">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{sql}</pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h3 className="text-xs font-semibold text-blue-300 mb-2">How to use:</h3>
        <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
          <li>Copy the query above</li>
          <li>Run it in your database client</li>
          <li>Copy the results (CSV or tab-separated)</li>
          <li>Paste the results below</li>
        </ol>
      </div>

      {/* Schema Results Input */}
      <div className="flex-1 min-h-32">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Paste Query Results
        </label>
        <textarea
          value={schemaResults}
          onChange={(e) => setSchemaResults(e.target.value)}
          placeholder="Paste the results from the schema query here (CSV or tab-separated)..."
          className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 font-mono resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          spellCheck={false}
        />
      </div>

      {/* Import Button */}
      <button
        onClick={handleImportResults}
        disabled={!schemaResults.trim()}
        className={`
          mt-4 w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
          ${!schemaResults.trim()
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'
          }
        `}
      >
        <Database className="w-4 h-4" />
        Import Schema Results
      </button>
    </div>
  );
};

export default SchemaHelper;
