import React, { useState } from 'react';
import { Play, Upload, FileText, AlertCircle, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  parseSQLQueries,
  parseCreateTableStatements,
  createTablesFromQuery,
  joinsToRelationships,
  inferRelationships,
} from '../../utils/sqlParser';

const EXAMPLE_QUERIES = `-- Example: Paste your SQL queries here
SELECT
  o.order_id,
  o.order_date,
  c.customer_name,
  c.email,
  p.product_name,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_date > '2024-01-01';`;

const EXAMPLE_SCHEMA = `-- Or paste CREATE TABLE statements
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT DEFAULT 0
);

CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`;

const SQLInput: React.FC = () => {
  const {
    sqlInput,
    setSqlInput,
    tables,
    setTables,
    setRelationships,
    setPendingInferences,
    addChatMessage,
    isProcessing,
    setIsProcessing,
  } = useStore();

  const { hasFeature, setShowPremiumModal } = useAuthStore();

  const [parseResult, setParseResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const aiEnabled = hasFeature('aiMatchingEnabled');

  const handleParse = () => {
    if (!sqlInput.trim()) {
      setParseResult({
        success: false,
        message: 'Please enter SQL queries or CREATE TABLE statements',
      });
      return;
    }

    setIsProcessing(true);
    setParseResult(null);

    try {
      // Try parsing as CREATE TABLE statements first
      const schemaTables = parseCreateTableStatements(sqlInput);

      if (schemaTables.length > 0) {
        // Found CREATE TABLE statements
        setTables([...tables, ...schemaTables]);

        // Build relationships from foreign keys
        const fkRelationships = schemaTables.flatMap((table) =>
          table.columns
            .filter((col) => col.isForeignKey && col.references)
            .map((col) => ({
              id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              sourceTable: table.id,
              sourceColumn: col.name,
              targetTable: schemaTables.find(
                (t) => t.name.toLowerCase() === col.references!.table.toLowerCase()
              )?.id || col.references!.table,
              targetColumn: col.references!.column,
              type: 'one-to-many' as const,
            }))
        );

        setRelationships(fkRelationships);

        // Infer additional relationships
        const allTables = [...tables, ...schemaTables];
        const inferred = inferRelationships(allTables);
        setPendingInferences(inferred);

        setParseResult({
          success: true,
          message: `Found ${schemaTables.length} table(s)`,
          details: `Tables: ${schemaTables.map((t) => t.name).join(', ')}. ${
            fkRelationships.length
          } relationship(s) extracted. ${inferred.length} potential relationship(s) inferred.`,
        });

        addChatMessage({
          role: 'assistant',
          content: `I've analyzed your schema and found **${schemaTables.length} tables**: ${schemaTables
            .map((t) => `\`${t.name}\``)
            .join(', ')}.

${fkRelationships.length > 0
  ? `I detected **${fkRelationships.length} explicit relationships** from your foreign key constraints.`
  : ''}

${inferred.length > 0
  ? `I also found **${inferred.length} potential relationships** based on column naming conventions. Check the "Inferences" tab to review and accept them.`
  : ''}

You can drag the tables around to arrange them, or use the layout buttons to auto-arrange.`,
        });
      } else {
        // Try parsing as SELECT queries
        const parsed = parseSQLQueries(sqlInput);

        if (parsed.tables.length > 0) {
          const newTables = createTablesFromQuery(parsed, tables);
          const allTables = [...tables, ...newTables];
          setTables(allTables);

          // Create relationships from JOINs
          const joinRelationships = joinsToRelationships(parsed.joins, allTables);
          setRelationships(joinRelationships);

          // Infer additional relationships
          const inferred = inferRelationships(allTables);
          setPendingInferences(inferred);

          setParseResult({
            success: true,
            message: `Found ${parsed.tables.length} table(s) and ${parsed.joins.length} join(s)`,
            details: `Tables: ${parsed.tables.join(', ')}`,
          });

          addChatMessage({
            role: 'assistant',
            content: `I've parsed your SQL queries and found **${parsed.tables.length} tables**: ${parsed.tables
              .map((t) => `\`${t}\``)
              .join(', ')}.

${parsed.joins.length > 0
  ? `I detected **${parsed.joins.length} relationships** from your JOIN clauses.`
  : 'No explicit JOINs were found.'}

${inferred.length > 0
  ? `I also inferred **${inferred.length} potential relationships** from column names. Check the "Inferences" tab to review.`
  : ''}

💡 **Tip**: For more accurate column types, paste your CREATE TABLE statements or use the Schema Helper to get schema info from your database.`,
          });
        } else {
          setParseResult({
            success: false,
            message: 'No tables found in the SQL',
            details: 'Make sure your SQL contains FROM/JOIN clauses or CREATE TABLE statements.',
          });
        }
      }
    } catch (error) {
      setParseResult({
        success: false,
        message: 'Error parsing SQL',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadExample = (type: 'query' | 'schema') => {
    setSqlInput(type === 'query' ? EXAMPLE_QUERIES : EXAMPLE_SCHEMA);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white mb-2">SQL Input</h2>
        <p className="text-xs text-slate-400">
          Paste your SQL queries or CREATE TABLE statements. I'll extract tables and relationships
          automatically.
        </p>
      </div>

      {/* Quick examples */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => loadExample('query')}
          className="flex-1 py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <FileText className="w-3 h-3" />
          Load Query Example
        </button>
        <button
          onClick={() => loadExample('schema')}
          className="flex-1 py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Upload className="w-3 h-3" />
          Load Schema Example
        </button>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 min-h-0">
        <textarea
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
          placeholder="Paste your SQL here..."
          className="w-full h-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-sm text-slate-200 font-mono resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          spellCheck={false}
        />
      </div>

      {/* Parse Result */}
      {parseResult && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            parseResult.success
              ? 'bg-green-900/30 border border-green-700'
              : 'bg-red-900/30 border border-red-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {parseResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={parseResult.success ? 'text-green-300' : 'text-red-300'}>
              {parseResult.message}
            </span>
          </div>
          {parseResult.details && (
            <p className="text-xs text-slate-400 ml-6">{parseResult.details}</p>
          )}
        </div>
      )}

      {/* Parse Button */}
      <button
        onClick={handleParse}
        disabled={isProcessing || !sqlInput.trim()}
        className={`
          mt-3 w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
          ${isProcessing || !sqlInput.trim()
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'
          }
        `}
      >
        <Play className="w-4 h-4" />
        {isProcessing ? 'Processing...' : 'Parse SQL & Generate ERD'}
      </button>

      {/* AI Upsell - only show for free users */}
      {!aiEnabled && (
        <button
          onClick={() => setShowPremiumModal(true, 'feature')}
          className="mt-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 text-xs text-slate-300 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 group"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Unlock AI-powered relationship detection</span>
          <ArrowRight className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};

export default SQLInput;
