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

// Simple response generator
function generateResponse(
  input: string,
  tables: any[],
  relationships: any[]
): { content: string; suggestions?: string[] } {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
    return {
      content: `I can help you with:

1. **Analyzing your schema** - Just paste SQL queries or CREATE TABLE statements
2. **Finding relationships** - I detect FKs and infer connections from column names
3. **Suggesting improvements** - I can identify missing indexes or normalization issues
4. **Explaining tables** - Ask me about any table in your diagram

What would you like to know?`,
      suggestions: ['Show me the tables', 'Find missing relationships', 'Explain my schema'],
    };
  }

  if (lowerInput.includes('table') && (lowerInput.includes('show') || lowerInput.includes('list'))) {
    if (tables.length === 0) {
      return {
        content: "You haven't added any tables yet. Try pasting some SQL in the sidebar!",
        suggestions: ['Import from SQL queries', 'Create a new table'],
      };
    }
    const tableList = tables.map((t) => `- **${t.name}** (${t.columns.length} columns)`).join('\n');
    return {
      content: `Here are your tables:\n\n${tableList}`,
      suggestions: ['Show relationships', 'Find issues'],
    };
  }

  if (lowerInput.includes('relationship') || lowerInput.includes('foreign key')) {
    if (relationships.length === 0) {
      return {
        content: "No relationships detected yet. Check the **Inferences** tab for suggested relationships based on column naming patterns.",
        suggestions: ['Show inferred relationships', 'How to add relationships'],
      };
    }
    return {
      content: `Found **${relationships.length} relationship(s)** in your schema. You can see them as connecting lines in the ERD diagram.

To add new relationships:
1. Hover over a column to see connection points
2. Drag from one column to another
3. The relationship will be created automatically`,
      suggestions: ['Show all tables', 'Find issues'],
    };
  }

  if (lowerInput.includes('issue') || lowerInput.includes('problem') || lowerInput.includes('improve')) {
    const issues: string[] = [];

    // Check for tables without PKs
    const noPKTables = tables.filter((t) => !t.columns.some((c: any) => c.isPrimaryKey));
    if (noPKTables.length > 0) {
      issues.push(`⚠️ Tables without primary keys: ${noPKTables.map((t) => t.name).join(', ')}`);
    }

    // Check for potential missing FKs
    const potentialFKs = tables.flatMap((t) =>
      t.columns
        .filter((c: any) => c.name.endsWith('_id') && !c.isForeignKey && !c.isPrimaryKey)
        .map((c: any) => `${t.name}.${c.name}`)
    );
    if (potentialFKs.length > 0) {
      issues.push(`🔗 Potential missing foreign keys: ${potentialFKs.join(', ')}`);
    }

    if (issues.length === 0) {
      return {
        content: "✅ Your schema looks good! I didn't find any obvious issues.",
        suggestions: ['Show tables', 'Add a new table'],
      };
    }

    return {
      content: `Found some potential issues:\n\n${issues.join('\n\n')}`,
      suggestions: ['How to fix these', 'Show all tables'],
    };
  }

  // Default response
  return {
    content: `I understand you're asking about "${input}".

Currently, I can help you:
- Analyze and visualize database schemas
- Identify table relationships
- Suggest improvements

Try pasting some SQL queries or CREATE TABLE statements to get started!`,
    suggestions: ['Show me an example', 'What can you do', 'Help'],
  };
}

export default ChatPanel;
