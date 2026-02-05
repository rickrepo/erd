import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronRight, Trash2, Minimize2, Crown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';

const ChatPanel: React.FC = () => {
  const { chatMessages, addChatMessage, clearChat, tables, relationships } = useStore();
  const { hasFeature, setShowPremiumModal } = useAuthStore();
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    // Simple response logic based on user input
    setTimeout(() => {
      const response = generateResponse(userMessage, tables, relationships);
      addChatMessage({
        role: 'assistant',
        content: response.content,
        suggestions: response.suggestions,
      });
    }, 500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    // Sanitize HTML entities first to prevent XSS
    const sanitized = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // Then apply markdown-like formatting
    return sanitized
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="text-blue-300 bg-slate-700 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br />');
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="hidden lg:flex fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-lg shadow-purple-500/30 items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Bot className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="w-full lg:w-96 h-full bg-slate-800 lg:border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Schema Assistant</h2>
            <p className="text-xs text-slate-400">Ask questions about your schema</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="hidden lg:block p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-slideIn ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-blue-500'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`flex-1 ${
                message.role === 'user' ? 'text-right' : ''
              }`}
            >
              <div
                className={`inline-block rounded-xl px-4 py-3 text-sm max-w-full ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-slate-700 text-slate-200 rounded-bl-md'
                }`}
              >
                <div
                  className="prose prose-sm prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-3 h-3" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Upgrade Banner */}
      {!hasFeature('aiMatchingEnabled') && tables.length > 0 && (
        <div className="mx-4 mb-2">
          <button
            onClick={() => setShowPremiumModal(true, 'feature')}
            className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/30 hover:border-purple-500/50 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-purple-300">Upgrade to Pro</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Get AI-powered relationship detection for smarter schema analysis
            </p>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your schema..."
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`px-4 rounded-xl transition-all ${
              input.trim()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

// Enhanced response generator that actually analyzes the schema
function generateResponse(
  input: string,
  tables: any[],
  relationships: any[]
): { content: string; suggestions?: string[] } {
  const lowerInput = input.toLowerCase();
  const words = lowerInput.split(/\s+/);

  // Check if asking about a specific table
  const matchedTable = tables.find(t =>
    lowerInput.includes(t.name.toLowerCase()) ||
    words.some(w => w === t.name.toLowerCase())
  );

  // Help & capabilities
  if (lowerInput.includes('help') || lowerInput === 'what can you do' || lowerInput === '?') {
    return {
      content: `I can analyze your database schema and help you with:

**Schema Analysis**
- Explain any table (try: "explain users table")
- Show column details and types
- Identify primary/foreign keys

**Relationships**
- Show all relationships between tables
- Find missing foreign key constraints
- Explain how tables connect

**Best Practices**
- Check for missing primary keys
- Find potential normalization issues
- Suggest indexes for common patterns

**SQL Generation**
- Generate SELECT queries for tables
- Create JOIN queries based on relationships

What would you like to know?`,
      suggestions: tables.length > 0
        ? ['Analyze my schema', `Explain ${tables[0]?.name}`, 'Show relationships']
        : ['How to import SQL', 'Load demo'],
    };
  }

  // Explain specific table
  if (matchedTable && (lowerInput.includes('explain') || lowerInput.includes('describe') || lowerInput.includes('what is') || lowerInput.includes('about'))) {
    const t = matchedTable;
    const pk = t.columns.filter((c: any) => c.isPrimaryKey);
    const outRels = relationships.filter((r: any) => r.sourceTable === t.id);
    const inRels = relationships.filter((r: any) => r.targetTable === t.id);

    let response = `## ${t.name}\n\n`;
    response += `**${t.columns.length} columns** | `;
    response += pk.length > 0 ? `PK: \`${pk.map((c: any) => c.name).join(', ')}\`` : 'No primary key';
    response += '\n\n**Columns:**\n';

    t.columns.forEach((col: any) => {
      let badges = '';
      if (col.isPrimaryKey) badges += ' 🔑';
      if (col.isForeignKey) badges += ' 🔗';
      if (!col.isNullable) badges += ' *';
      response += `- \`${col.name}\` ${col.type}${badges}\n`;
    });

    if (outRels.length > 0 || inRels.length > 0) {
      response += '\n**Relationships:**\n';
      outRels.forEach((r: any) => {
        const targetTable = tables.find((tt: any) => tt.id === r.targetTable);
        response += `- → \`${targetTable?.name || r.targetTable}\` via ${r.sourceColumn}\n`;
      });
      inRels.forEach((r: any) => {
        const sourceTable = tables.find((tt: any) => tt.id === r.sourceTable);
        response += `- ← \`${sourceTable?.name || r.sourceTable}\` via ${r.targetColumn}\n`;
      });
    }

    return {
      content: response,
      suggestions: [`Query ${t.name}`, 'Find related tables', 'Check for issues'],
    };
  }

  // Generate SELECT query for a table
  if (matchedTable && (lowerInput.includes('query') || lowerInput.includes('select') || lowerInput.includes('sql for'))) {
    const t = matchedTable;
    const cols = t.columns.slice(0, 5).map((c: any) => c.name).join(',\n  ');
    const hasMore = t.columns.length > 5;

    // Find related tables for JOIN suggestions
    const rels = relationships.filter((r: any) => r.sourceTable === t.id || r.targetTable === t.id);

    let sql = `\`\`\`sql\nSELECT\n  ${cols}${hasMore ? ',\n  -- ... more columns' : ''}\nFROM ${t.name}`;

    if (rels.length > 0) {
      const rel = rels[0];
      const otherTableId = rel.sourceTable === t.id ? rel.targetTable : rel.sourceTable;
      const otherTable = tables.find((tt: any) => tt.id === otherTableId);
      if (otherTable) {
        const joinCol = rel.sourceTable === t.id ? rel.sourceColumn : rel.targetColumn;
        const otherCol = rel.sourceTable === t.id ? rel.targetColumn : rel.sourceColumn;
        sql += `\nJOIN ${otherTable.name} ON ${t.name}.${joinCol} = ${otherTable.name}.${otherCol}`;
      }
    }

    sql += '\nWHERE 1=1\nLIMIT 100;\n\`\`\`';

    return {
      content: `Here's a sample query for **${t.name}**:\n\n${sql}`,
      suggestions: ['Add more joins', 'Explain this table', 'Show all tables'],
    };
  }

  // List tables
  if (lowerInput.includes('table') && (lowerInput.includes('show') || lowerInput.includes('list') || lowerInput.includes('all'))) {
    if (tables.length === 0) {
      return {
        content: "No tables loaded yet.\n\n**To add tables:**\n1. Switch to the **SQL** tab\n2. Paste your SQL queries or CREATE TABLE statements\n3. Click **Parse SQL**\n\nOr try the demo to see how it works!",
        suggestions: ['Load demo', 'How to import SQL'],
      };
    }

    let response = `## Your Schema (${tables.length} tables)\n\n`;
    tables.forEach((t: any) => {
      const pk = t.columns.find((c: any) => c.isPrimaryKey);
      const relCount = relationships.filter((r: any) => r.sourceTable === t.id || r.targetTable === t.id).length;
      response += `**${t.name}** - ${t.columns.length} cols`;
      if (pk) response += ` | PK: \`${pk.name}\``;
      if (relCount > 0) response += ` | ${relCount} rel${relCount > 1 ? 's' : ''}`;
      response += '\n';
    });

    return {
      content: response,
      suggestions: tables.length > 0 ? [`Explain ${tables[0].name}`, 'Show relationships', 'Find issues'] : [],
    };
  }

  // Show relationships
  if (lowerInput.includes('relationship') || lowerInput.includes('join') || lowerInput.includes('foreign key') || lowerInput.includes('connection')) {
    if (relationships.length === 0) {
      if (tables.length === 0) {
        return {
          content: "No tables or relationships yet. Import your SQL to get started!",
          suggestions: ['How to import SQL', 'Load demo'],
        };
      }
      return {
        content: "No relationships detected.\n\n**To add relationships:**\n- In the ERD, hover over a column to see connection handles\n- Drag from one column's handle to another\n- Or check the **AI** tab for inferred relationships\n\n**Tip:** Columns named like `user_id` often indicate relationships!",
        suggestions: ['Find potential relationships', 'Show tables'],
      };
    }

    let response = `## Relationships (${relationships.length})\n\n`;
    relationships.forEach((r: any) => {
      const sourceTable = tables.find((t: any) => t.id === r.sourceTable);
      const targetTable = tables.find((t: any) => t.id === r.targetTable);
      const typeLabel = r.type === 'one-to-one' ? '1:1' : r.type === 'many-to-many' ? 'N:M' : '1:N';
      response += `**${sourceTable?.name || '?'}**.${r.sourceColumn} → **${targetTable?.name || '?'}**.${r.targetColumn} (${typeLabel})\n`;
    });

    return {
      content: response,
      suggestions: ['Generate JOIN query', 'Find missing relationships', 'Show tables'],
    };
  }

  // Analyze/issues/problems
  if (lowerInput.includes('analyz') || lowerInput.includes('issue') || lowerInput.includes('problem') || lowerInput.includes('check') || lowerInput.includes('improve') || lowerInput.includes('review')) {
    if (tables.length === 0) {
      return {
        content: "Import your schema first, then I can analyze it for potential issues.",
        suggestions: ['How to import SQL', 'Load demo'],
      };
    }

    const issues: string[] = [];

    // Check for tables without PKs
    const noPK = tables.filter((t: any) => !t.columns.some((c: any) => c.isPrimaryKey));
    if (noPK.length > 0) {
      issues.push(`⚠️ **Missing primary keys:** ${noPK.map((t: any) => t.name).join(', ')}\n   Every table should have a primary key for data integrity.`);
    }

    // Check for potential missing FKs
    const potentialFKs: string[] = [];
    tables.forEach((t: any) => {
      t.columns.forEach((c: any) => {
        if ((c.name.endsWith('_id') || c.name.endsWith('Id')) && !c.isPrimaryKey && !c.isForeignKey) {
          // Check if there's already a relationship for this column
          const hasRel = relationships.some((r: any) =>
            (r.sourceTable === t.id && r.sourceColumn === c.name) ||
            (r.targetTable === t.id && r.targetColumn === c.name)
          );
          if (!hasRel) {
            potentialFKs.push(`${t.name}.${c.name}`);
          }
        }
      });
    });
    if (potentialFKs.length > 0) {
      issues.push(`🔗 **Potential missing foreign keys:**\n   ${potentialFKs.slice(0, 5).join(', ')}${potentialFKs.length > 5 ? ` (+${potentialFKs.length - 5} more)` : ''}\n   Check the AI tab for suggested relationships.`);
    }

    // Check for tables with no relationships
    const isolatedTables = tables.filter((t: any) =>
      !relationships.some((r: any) => r.sourceTable === t.id || r.targetTable === t.id)
    );
    if (isolatedTables.length > 0 && tables.length > 1) {
      issues.push(`📦 **Isolated tables:** ${isolatedTables.map((t: any) => t.name).join(', ')}\n   These tables have no connections to others.`);
    }

    // Check for very wide tables
    const wideTables = tables.filter((t: any) => t.columns.length > 15);
    if (wideTables.length > 0) {
      issues.push(`📊 **Wide tables (>15 columns):** ${wideTables.map((t: any) => `${t.name} (${t.columns.length})`).join(', ')}\n   Consider splitting into related tables.`);
    }

    if (issues.length === 0) {
      return {
        content: `✅ **Schema Analysis Complete**\n\nYour schema looks healthy:\n- ${tables.length} tables with proper structure\n- ${relationships.length} defined relationships\n- All tables have primary keys\n\nNo obvious issues detected!`,
        suggestions: ['Show all tables', 'Generate queries', 'Export diagram'],
      };
    }

    return {
      content: `## Schema Analysis\n\nFound ${issues.length} potential issue${issues.length > 1 ? 's' : ''}:\n\n${issues.join('\n\n')}`,
      suggestions: ['How to fix these', 'Show relationships', 'Check AI suggestions'],
    };
  }

  // Demo
  if (lowerInput.includes('demo') || lowerInput.includes('example') || lowerInput.includes('sample')) {
    return {
      content: "To try the demo:\n\n1. Go to the **SQL** tab\n2. Click **Load Schema Example**\n3. Click **Parse SQL & Generate ERD**\n\nThis will load a sample e-commerce schema with users, orders, products, and more!",
      suggestions: ['Show me the tables', 'How does this work'],
    };
  }

  // Import help
  if (lowerInput.includes('import') || lowerInput.includes('add') || lowerInput.includes('paste') || lowerInput.includes('how to')) {
    return {
      content: `**How to Import Your Schema:**

1. **From SQL Queries:**
   - Paste SELECT statements with JOINs
   - Tables and relationships are auto-detected

2. **From CREATE TABLE:**
   - Paste your DDL statements
   - Foreign keys become relationships
   - Column types are preserved

3. **Manually:**
   - Right-click on the canvas to add tables
   - Drag between columns to create relationships

**Supported dialects:** MySQL, PostgreSQL, SQLite, SQL Server`,
      suggestions: ['Load demo', 'Show tables'],
    };
  }

  // If asking about a table that doesn't exist
  if (words.some(w => w.length > 2 && lowerInput.includes('table'))) {
    const possibleTable = words.find(w => w.length > 2 && !['the', 'table', 'show', 'explain', 'what', 'about'].includes(w));
    if (possibleTable && tables.length > 0) {
      const similar = tables.find((t: any) => t.name.toLowerCase().includes(possibleTable) || possibleTable.includes(t.name.toLowerCase()));
      if (similar) {
        return {
          content: `Did you mean **${similar.name}**?`,
          suggestions: [`Explain ${similar.name}`, `Query ${similar.name}`, 'Show all tables'],
        };
      }
    }
  }

  // Default response - be helpful
  const defaultSuggestions = tables.length > 0
    ? ['Show tables', 'Analyze schema', 'Show relationships']
    : ['How to import SQL', 'Load demo', 'Help'];

  return {
    content: tables.length > 0
      ? `I can help you understand your schema with ${tables.length} table${tables.length > 1 ? 's' : ''}.\n\nTry asking:\n- "Explain [table name]"\n- "Show relationships"\n- "Analyze my schema"\n- "Generate query for [table]"`
      : `No schema loaded yet.\n\n**Quick start:**\n1. Go to the SQL tab and paste your SQL\n2. Click Parse to generate the ERD\n3. Ask me questions about your schema!\n\nOr try "load demo" to see an example.`,
    suggestions: defaultSuggestions,
  };
}

export default ChatPanel;
