import { useState, useMemo } from 'react';
import {
  Link,
  Copy,
  Check,
  Trash2,
  FileText,
  ArrowLeftRight,
  Upload,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

type ViewTab = 'active' | 'summary' | 'import';

const RelationshipSummary: React.FC = () => {
  const {
    tables,
    relationships,
    removeRelationship,
    setRelationships,
    setTables,
    addChatMessage,
  } = useStore();

  const [activeView, setActiveView] = useState<ViewTab>('active');
  const [copied, setCopied] = useState(false);
  const [textImport, setTextImport] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Build human-readable table name map
  const tableNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    tables.forEach((t) => {
      map[t.id] = t.name;
    });
    return map;
  }, [tables]);

  // Generate text summary
  const textSummary = useMemo(() => {
    if (tables.length === 0) return 'No tables in the current diagram.';

    const lines: string[] = [];
    lines.push('=== DATABASE SCHEMA SUMMARY ===');
    lines.push('');

    // Tables section
    lines.push(`TABLES (${tables.length}):`);
    tables.forEach((table) => {
      const pk = table.columns.filter(c => c.isPrimaryKey).map(c => c.name);
      const fk = table.columns.filter(c => c.isForeignKey).map(c => c.name);
      lines.push(`  ${table.name}`);
      lines.push(`    Columns: ${table.columns.map(c => `${c.name} (${c.type}${c.isPrimaryKey ? ', PK' : ''}${c.isForeignKey ? ', FK' : ''}${!c.isNullable ? ', NOT NULL' : ''})`).join(', ')}`);
      if (pk.length > 0) lines.push(`    Primary Key: ${pk.join(', ')}`);
      if (fk.length > 0) lines.push(`    Foreign Keys: ${fk.join(', ')}`);
      lines.push('');
    });

    // Relationships section
    if (relationships.length > 0) {
      lines.push(`RELATIONSHIPS (${relationships.length}):`);
      relationships.forEach((rel) => {
        const sourceTable = tableNameMap[rel.sourceTable] || rel.sourceTable;
        const targetTable = tableNameMap[rel.targetTable] || rel.targetTable;
        const typeLabel =
          rel.type === 'one-to-one' ? '1:1' :
          rel.type === 'one-to-many' ? '1:N' :
          'N:M';
        lines.push(`  ${sourceTable}.${rel.sourceColumn} -> ${targetTable}.${rel.targetColumn} (${typeLabel})`);
      });
      lines.push('');
    }

    // Explanation
    lines.push('RELATIONSHIP EXPLANATION:');
    if (relationships.length === 0) {
      lines.push('  No relationships defined yet.');
    } else {
      relationships.forEach((rel) => {
        const sourceTable = tableNameMap[rel.sourceTable] || rel.sourceTable;
        const targetTable = tableNameMap[rel.targetTable] || rel.targetTable;
        if (rel.type === 'one-to-one') {
          lines.push(`  - Each ${sourceTable} has exactly one ${targetTable} (via ${rel.sourceColumn})`);
        } else if (rel.type === 'one-to-many') {
          lines.push(`  - Each ${targetTable} can have many ${sourceTable} records (via ${rel.sourceColumn} -> ${rel.targetColumn})`);
        } else {
          lines.push(`  - ${sourceTable} and ${targetTable} have a many-to-many relationship (via ${rel.sourceColumn} <-> ${rel.targetColumn})`);
        }
      });
    }

    return lines.join('\n');
  }, [tables, relationships, tableNameMap]);

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(textSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse text import
  const handleTextImport = () => {
    if (!textImport.trim()) return;

    try {
      const lines = textImport.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const newTables: { name: string; columns: { name: string; type: string; pk: boolean; fk: boolean; nullable: boolean; refTable?: string; refCol?: string }[] }[] = [];
      const newRels: { source: string; sourceCol: string; target: string; targetCol: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' }[] = [];

      let currentTable: typeof newTables[0] | null = null;

      for (const line of lines) {
        // Skip headers and separators
        if (line.startsWith('===') || line.startsWith('---') || line.startsWith('TABLES') || line.startsWith('RELATIONSHIPS') || line.startsWith('RELATIONSHIP EXPLANATION')) continue;

        // Table definition: "table_name" or "Table: table_name"
        const tableMatch = line.match(/^(?:Table:\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
        if (tableMatch && !line.includes(':') || line.match(/^Table:\s*(.+)$/)) {
          const name = (line.match(/^Table:\s*(.+)$/) || tableMatch)?.[1]?.trim();
          if (name && !name.includes(' ')) {
            currentTable = { name, columns: [] };
            newTables.push(currentTable);
            continue;
          }
        }

        // Column definition: "column_name type" or "column_name (type)"
        const colMatch = line.match(/^[-\s]*(\w+)\s*[:(]\s*(\w[\w(),.]*)\s*\)?\s*(PK|PRIMARY KEY)?\s*(FK|FOREIGN KEY)?\s*(NOT NULL)?/i);
        if (colMatch && currentTable) {
          currentTable.columns.push({
            name: colMatch[1],
            type: colMatch[2].toUpperCase(),
            pk: !!colMatch[3],
            fk: !!colMatch[4],
            nullable: !colMatch[5],
          });
          continue;
        }

        // Columns line: "Columns: id (INT, PK), name (VARCHAR), ..."
        const colsLineMatch = line.match(/^Columns:\s*(.+)$/i);
        if (colsLineMatch && currentTable) {
          const colDefs = colsLineMatch[1].split(/,\s*(?=[a-zA-Z_])/);
          for (const colDef of colDefs) {
            const m = colDef.match(/(\w+)\s*\(([^)]+)\)/);
            if (m) {
              const flags = m[2].toUpperCase();
              currentTable.columns.push({
                name: m[1],
                type: flags.split(',')[0].trim(),
                pk: flags.includes('PK'),
                fk: flags.includes('FK'),
                nullable: !flags.includes('NOT NULL'),
              });
            }
          }
          continue;
        }

        // Relationship: "source.col -> target.col (1:N)" or "source -> target"
        const relMatch = line.match(/^\s*[-•]?\s*(\w+)(?:\.(\w+))?\s*->\s*(\w+)(?:\.(\w+))?\s*(?:\((1:[1NM]|N:M|one-to-one|one-to-many|many-to-many)\))?/i);
        if (relMatch) {
          const typeStr = (relMatch[5] || '1:N').toLowerCase();
          const type: 'one-to-one' | 'one-to-many' | 'many-to-many' =
            typeStr === '1:1' || typeStr === 'one-to-one' ? 'one-to-one' :
            typeStr === 'n:m' || typeStr === 'many-to-many' ? 'many-to-many' :
            'one-to-many';

          newRels.push({
            source: relMatch[1],
            sourceCol: relMatch[2] || 'id',
            target: relMatch[3],
            targetCol: relMatch[4] || 'id',
            type,
          });
          continue;
        }
      }

      if (newTables.length === 0 && newRels.length === 0) {
        setImportResult({ success: false, message: 'No tables or relationships found. Use format like:\nusers\n  id (INT, PK)\n  name (VARCHAR)\n\norders.user_id -> users.id (1:N)' });
        return;
      }

      // Create table objects
      let tableCount = tables.length;
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
      const tableIdMap: Record<string, string> = {};

      // Map existing table names to IDs
      tables.forEach(t => { tableIdMap[t.name.toLowerCase()] = t.id; });

      const createdTables = newTables
        .filter(t => !tableIdMap[t.name.toLowerCase()])
        .map(t => {
          const id = `table-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          tableIdMap[t.name.toLowerCase()] = id;
          const color = colors[tableCount % colors.length];
          tableCount++;
          return {
            id,
            name: t.name,
            columns: t.columns.length > 0 ? t.columns.map(c => ({
              name: c.name,
              type: c.type,
              isPrimaryKey: c.pk,
              isForeignKey: c.fk,
              isNullable: c.nullable,
            })) : [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false }],
            color,
          };
        });

      if (createdTables.length > 0) {
        setTables([...tables, ...createdTables]);
      }

      // Create relationship objects
      const createdRels = newRels
        .filter(r => tableIdMap[r.source.toLowerCase()] && tableIdMap[r.target.toLowerCase()])
        .map(r => ({
          id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sourceTable: tableIdMap[r.source.toLowerCase()],
          sourceColumn: r.sourceCol,
          targetTable: tableIdMap[r.target.toLowerCase()],
          targetColumn: r.targetCol,
          type: r.type,
        }));

      if (createdRels.length > 0) {
        setRelationships([...relationships, ...createdRels]);
      }

      setImportResult({
        success: true,
        message: `Imported ${createdTables.length} table(s) and ${createdRels.length} relationship(s)`,
      });

      addChatMessage({
        role: 'assistant',
        content: `Imported **${createdTables.length} tables** and **${createdRels.length} relationships** from text input.${
          createdTables.length > 0 ? `\nNew tables: ${createdTables.map(t => `\`${t.name}\``).join(', ')}` : ''
        }`,
      });

      setTextImport('');
    } catch {
      setImportResult({ success: false, message: 'Error parsing text. Check format and try again.' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="flex border-b border-slate-700">
        {([
          { id: 'active' as ViewTab, label: 'Relationships', icon: Link },
          { id: 'summary' as ViewTab, label: 'Summary', icon: FileText },
          { id: 'import' as ViewTab, label: 'Import', icon: Upload },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 py-2.5 px-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeView === tab.id
                ? 'text-blue-400 bg-slate-700/50 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Relationships (toggle on/off) */}
      {activeView === 'active' && (
        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-slate-400 mb-3">
            {relationships.length} active relationship{relationships.length !== 1 ? 's' : ''}. Click the eye icon to remove from the ERD.
          </p>

          {relationships.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No relationships yet</p>
              <p className="text-xs mt-1">Connect columns in the ERD or parse SQL with foreign keys</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel) => {
                const srcName = tableNameMap[rel.sourceTable] || rel.sourceTable;
                const tgtName = tableNameMap[rel.targetTable] || rel.targetTable;
                const typeLabel =
                  rel.type === 'one-to-one' ? '1:1' :
                  rel.type === 'one-to-many' ? '1:N' : 'N:M';

                return (
                  <div
                    key={rel.id}
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-blue-300 font-medium truncate">{srcName}</span>
                          <span className="text-slate-500">.{rel.sourceColumn}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 my-0.5">
                          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-bold">{typeLabel}</span>
                          <span>→</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-purple-300 font-medium truncate">{tgtName}</span>
                          <span className="text-slate-500">.{rel.targetColumn}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeRelationship(rel.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Remove relationship"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Text Summary */}
      {activeView === 'summary' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">AI-readable schema summary</p>
            <button
              onClick={handleCopySummary}
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
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 overflow-auto">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {textSummary}
            </pre>
          </div>
        </div>
      )}

      {/* Text Import */}
      {activeView === 'import' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <p className="text-xs text-slate-400 mb-2">
            Paste a text description of your schema. Supports table definitions and relationship notation.
          </p>

          <div className="mb-3 p-2.5 bg-slate-900/50 border border-slate-700 rounded-lg">
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              Example format:<br />
              users<br />
              &nbsp;&nbsp;id (INT, PK)<br />
              &nbsp;&nbsp;name (VARCHAR)<br />
              &nbsp;&nbsp;email (VARCHAR, NOT NULL)<br />
              <br />
              orders<br />
              &nbsp;&nbsp;id (INT, PK)<br />
              &nbsp;&nbsp;user_id (INT, FK)<br />
              <br />
              orders.user_id -&gt; users.id (1:N)
            </p>
          </div>

          <textarea
            value={textImport}
            onChange={(e) => {
              setTextImport(e.target.value);
              setImportResult(null);
            }}
            placeholder="Paste your schema description here..."
            className="flex-1 min-h-[120px] bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 font-mono resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            spellCheck={false}
          />

          {importResult && (
            <div className={`mt-2 p-2 rounded-lg text-xs ${
              importResult.success ? 'bg-green-900/30 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'
            }`}>
              {importResult.message}
            </div>
          )}

          <button
            onClick={handleTextImport}
            disabled={!textImport.trim()}
            className={`mt-3 w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              textImport.trim()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Schema
          </button>
        </div>
      )}
    </div>
  );
};

export default RelationshipSummary;
