import { useMemo, useRef, useCallback } from 'react';

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'DROP', 'ALTER',
  'CREATE', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'IF',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'UNIQUE',
  'DEFAULT', 'AUTO_INCREMENT', 'SERIAL', 'IDENTITY',
  'CASCADE', 'RESTRICT', 'CHECK', 'ENUM',
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'FLOAT', 'DOUBLE',
  'DECIMAL', 'NUMERIC', 'VARCHAR', 'CHAR', 'TEXT', 'BLOB', 'BOOLEAN', 'BOOL',
  'DATE', 'TIME', 'TIMESTAMP', 'DATETIME', 'YEAR', 'JSON', 'UUID',
  'TRUE', 'FALSE', 'CURRENT_TIMESTAMP', 'NOW',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'IFNULL', 'NULLIF',
  'CONCAT', 'SUBSTRING', 'TRIM', 'UPPER', 'LOWER', 'LENGTH', 'REPLACE',
  'CAST', 'CONVERT', 'EXTRACT', 'DATE_FORMAT',
]);

function tokenize(sql: string): { type: string; value: string }[] {
  const tokens: { type: string; value: string }[] = [];
  let i = 0;

  while (i < sql.length) {
    // Comments
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let end = sql.indexOf('\n', i);
      if (end === -1) end = sql.length;
      tokens.push({ type: 'comment', value: sql.slice(i, end) });
      i = end;
      continue;
    }

    // Strings
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      let j = i + 1;
      while (j < sql.length && sql[j] !== quote) {
        if (sql[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/\d/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[\d.]/.test(sql[j])) j++;
      tokens.push({ type: 'number', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    // Words
    if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const upper = word.toUpperCase();
      if (SQL_KEYWORDS.has(upper)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (SQL_FUNCTIONS.has(upper)) {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'identifier', value: word });
      }
      i = j;
      continue;
    }

    // Operators
    if ('(),.;*=<>!+-/%'.includes(sql[i])) {
      tokens.push({ type: 'operator', value: sql[i] });
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push({ type: 'whitespace', value: sql.slice(i, j) });
      i = j;
      continue;
    }

    tokens.push({ type: 'other', value: sql[i] });
    i++;
  }

  return tokens;
}

const TOKEN_COLORS: Record<string, string> = {
  keyword: 'text-purple-400 font-semibold',
  function: 'text-yellow-300',
  string: 'text-green-400',
  number: 'text-orange-400',
  comment: 'text-slate-500 italic',
  operator: 'text-slate-300',
  identifier: 'text-blue-300',
  whitespace: '',
  other: 'text-slate-300',
};

interface SQLHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SQLHighlighter({ value, onChange, placeholder, className }: SQLHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const highlighted = useMemo(() => {
    if (!value) return '';
    const tokens = tokenize(value);
    return tokens.map((token) => {
      const cls = TOKEN_COLORS[token.type] || '';
      const escaped = token.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (!cls) return escaped;
      return `<span class="${cls}">${escaped}</span>`;
    }).join('');
  }, [value]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className={`relative ${className || ''}`}>
      {/* Highlighted overlay */}
      <div
        ref={highlightRef}
        className="absolute inset-0 p-4 text-sm font-mono whitespace-pre-wrap break-words overflow-hidden pointer-events-none leading-relaxed"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: highlighted || `<span class="text-slate-500">${placeholder || ''}</span>` }}
      />

      {/* Actual textarea (invisible text, visible caret) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder=""
        className="w-full h-full bg-transparent text-transparent caret-white p-4 text-sm font-mono resize-none border-0 outline-none leading-relaxed"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
