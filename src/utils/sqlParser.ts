import { Parser } from 'node-sql-parser';
import type { Table, Column, ParsedQuery, Relationship, InferredRelationship } from '../types';

const parser = new Parser();

/**
 * Strip all SQL comments from input before parsing.
 * Handles: -- single-line, /* multi-line *​/, and # (MySQL) comments.
 * Preserves comment-like sequences inside quoted strings.
 */
function stripSQLComments(sql: string): string {
  let result = '';
  let i = 0;

  while (i < sql.length) {
    // Single-quoted string — skip through
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      result += sql.slice(i, j);
      i = j;
      continue;
    }

    // Double-quoted identifier — skip through
    if (sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '"') j++;
      result += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    // Single-line comment (--)
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let end = sql.indexOf('\n', i);
      if (end === -1) break;
      // Replace comment with whitespace to preserve line structure
      result += ' ';
      i = end;
      continue;
    }

    // Multi-line comment (/* */)
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let end = sql.indexOf('*/', i + 2);
      if (end === -1) break;
      // Replace with a space to avoid accidentally joining tokens
      result += ' ';
      i = end + 2;
      continue;
    }

    // Hash comment (#) — MySQL style
    if (sql[i] === '#') {
      let end = sql.indexOf('\n', i);
      if (end === -1) break;
      result += ' ';
      i = end;
      continue;
    }

    result += sql[i];
    i++;
  }

  return result;
}

interface ParsedJoin {
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
}

interface ExtractedColumn {
  table: string;
  column: string;
}

// Parse SQL queries to extract tables and joins
export function parseSQLQueries(sql: string): ParsedQuery {
  const result: ParsedQuery = {
    tables: [],
    joins: [],
    columns: []
  };

  try {
    // Strip comments before parsing to avoid false table/column matches
    const cleanSql = stripSQLComments(sql);
    // Split by semicolon to handle multiple queries
    const queries = cleanSql.split(';').filter(q => q.trim());

    for (const query of queries) {
      try {
        const ast = parser.astify(query.trim());
        const astArray = Array.isArray(ast) ? ast : [ast];

        for (const statement of astArray) {
          extractFromAST(statement, result);
        }
      } catch (e) {
        // Try regex fallback for individual query
        extractWithRegex(query, result);
      }
    }
  } catch (e) {
    // Fallback to regex-based parsing
    extractWithRegex(sql, result);
  }

  // Remove duplicates
  result.tables = [...new Set(result.tables)];
  result.joins = removeDuplicateJoins(result.joins);
  result.columns = removeDuplicateColumns(result.columns);

  return result;
}

function extractFromAST(ast: any, result: ParsedQuery) {
  if (!ast) return;

  // Extract tables from FROM clause
  if (ast.from) {
    for (const from of ast.from) {
      if (from.table) {
        result.tables.push(from.table);
      }
      // Handle joined tables
      if (from.join) {
        for (const join of from.join) {
          if (join.table) {
            result.tables.push(join.table);
          }
          // Extract join conditions
          if (join.on) {
            const joinInfo = extractJoinCondition(join.on);
            if (joinInfo) {
              result.joins.push(joinInfo);
            }
          }
        }
      }
    }
  }

  // Extract columns from SELECT
  if (ast.columns && Array.isArray(ast.columns)) {
    for (const col of ast.columns) {
      if (col.expr && col.expr.column && col.expr.table) {
        result.columns.push({
          table: col.expr.table,
          column: col.expr.column
        });
      }
    }
  }

  // Extract from WHERE clause (for implicit joins)
  if (ast.where) {
    const implicitJoins = extractImplicitJoins(ast.where);
    result.joins.push(...implicitJoins);
  }
}

function extractJoinCondition(condition: any): ParsedJoin | null {
  if (condition.type === 'binary_expr' && condition.operator === '=') {
    const left = condition.left;
    const right = condition.right;

    if (left?.type === 'column_ref' && right?.type === 'column_ref') {
      return {
        leftTable: left.table || '',
        leftColumn: left.column,
        rightTable: right.table || '',
        rightColumn: right.column
      };
    }
  }
  return null;
}

function extractImplicitJoins(condition: any): ParsedJoin[] {
  const joins: ParsedJoin[] = [];

  if (condition.type === 'binary_expr') {
    if (condition.operator === '=' &&
        condition.left?.type === 'column_ref' &&
        condition.right?.type === 'column_ref' &&
        condition.left.table &&
        condition.right.table &&
        condition.left.table !== condition.right.table) {
      joins.push({
        leftTable: condition.left.table,
        leftColumn: condition.left.column,
        rightTable: condition.right.table,
        rightColumn: condition.right.column
      });
    }

    if (condition.operator === 'AND' || condition.operator === 'OR') {
      joins.push(...extractImplicitJoins(condition.left));
      joins.push(...extractImplicitJoins(condition.right));
    }
  }

  return joins;
}

// Regex fallback for parsing SQL
function extractWithRegex(sql: string, result: ParsedQuery) {
  // Extract table names from FROM and JOIN clauses
  const fromRegex = /\bFROM\s+([`"']?[\w]+[`"']?(?:\s+(?:AS\s+)?[\w]+)?)/gi;
  const joinRegex = /\bJOIN\s+([`"']?[\w]+[`"']?(?:\s+(?:AS\s+)?[\w]+)?)/gi;

  let match;
  while ((match = fromRegex.exec(sql)) !== null) {
    const tableName = match[1].replace(/[`"']/g, '').split(/\s+/)[0];
    result.tables.push(tableName);
  }

  while ((match = joinRegex.exec(sql)) !== null) {
    const tableName = match[1].replace(/[`"']/g, '').split(/\s+/)[0];
    result.tables.push(tableName);
  }

  // Extract JOIN conditions
  const onRegex = /\bON\s+([`"']?[\w]+[`"']?)\.([`"']?[\w]+[`"']?)\s*=\s*([`"']?[\w]+[`"']?)\.([`"']?[\w]+[`"']?)/gi;
  while ((match = onRegex.exec(sql)) !== null) {
    result.joins.push({
      leftTable: match[1].replace(/[`"']/g, ''),
      leftColumn: match[2].replace(/[`"']/g, ''),
      rightTable: match[3].replace(/[`"']/g, ''),
      rightColumn: match[4].replace(/[`"']/g, '')
    });
  }

  // Extract columns with table qualifiers
  const columnRegex = /([`"']?[\w]+[`"']?)\.([`"']?[\w]+[`"']?)/gi;
  while ((match = columnRegex.exec(sql)) !== null) {
    const table = match[1].replace(/[`"']/g, '');
    const column = match[2].replace(/[`"']/g, '');
    // Avoid adding JOIN keywords as tables
    if (!['ON', 'AND', 'OR', 'WHERE', 'FROM', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER'].includes(table.toUpperCase())) {
      result.columns.push({ table, column });
    }
  }
}

function removeDuplicateJoins(joins: ParsedJoin[]): ParsedJoin[] {
  const seen = new Set<string>();
  return joins.filter(j => {
    const key = `${j.leftTable}.${j.leftColumn}-${j.rightTable}.${j.rightColumn}`;
    const reverseKey = `${j.rightTable}.${j.rightColumn}-${j.leftTable}.${j.leftColumn}`;
    if (seen.has(key) || seen.has(reverseKey)) return false;
    seen.add(key);
    return true;
  });
}

function removeDuplicateColumns(columns: ExtractedColumn[]): ExtractedColumn[] {
  const seen = new Set<string>();
  return columns.filter(c => {
    const key = `${c.table}.${c.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Parse CREATE TABLE statements
export function parseCreateTableStatements(sql: string): Table[] {
  const tables: Table[] = [];

  // Strip comments before parsing to avoid false matches inside comments
  const cleanSql = stripSQLComments(sql);

  // Regex to match CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([\w]+)[`"']?\s*\(([\s\S]*?)\)\s*(?:;|$)/gi;

  let match;
  while ((match = createTableRegex.exec(cleanSql)) !== null) {
    const tableName = match[1];
    const columnsStr = match[2];

    const columns = parseColumnDefinitions(columnsStr);

    tables.push({
      id: `table-${tableName}-${Date.now()}`,
      name: tableName,
      columns,
      color: getTableColor(tables.length)
    });
  }

  return tables;
}

function parseColumnDefinitions(columnsStr: string): Column[] {
  const columns: Column[] = [];
  const primaryKeys: string[] = [];
  const foreignKeys: Map<string, { table: string; column: string }> = new Map();

  // Extract PRIMARY KEY constraint
  const pkRegex = /PRIMARY\s+KEY\s*\(\s*([`"']?[\w]+[`"']?(?:\s*,\s*[`"']?[\w]+[`"']?)*)\s*\)/gi;
  let pkMatch;
  while ((pkMatch = pkRegex.exec(columnsStr)) !== null) {
    const pkColumns = pkMatch[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
    primaryKeys.push(...pkColumns);
  }

  // Extract FOREIGN KEY constraints
  const fkRegex = /FOREIGN\s+KEY\s*\(\s*[`"']?([\w]+)[`"']?\s*\)\s*REFERENCES\s+[`"']?([\w]+)[`"']?\s*\(\s*[`"']?([\w]+)[`"']?\s*\)/gi;
  let fkMatch;
  while ((fkMatch = fkRegex.exec(columnsStr)) !== null) {
    foreignKeys.set(fkMatch[1], { table: fkMatch[2], column: fkMatch[3] });
  }

  // Parse individual column definitions
  const lines = columnsStr.split(',');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip constraint definitions
    if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX|KEY|CONSTRAINT)/i.test(trimmed)) {
      continue;
    }

    // Parse column: name type [constraints]
    const colMatch = trimmed.match(/^[`"']?([\w]+)[`"']?\s+(\w+(?:\([^)]+\))?)/i);
    if (colMatch) {
      const name = colMatch[1];
      const type = colMatch[2].toUpperCase();
      const isPK = primaryKeys.includes(name) ||
                   /PRIMARY\s+KEY/i.test(trimmed) ||
                   /SERIAL|AUTO_INCREMENT|IDENTITY/i.test(trimmed);
      const isFK = foreignKeys.has(name);
      const isNullable = !/NOT\s+NULL/i.test(trimmed) && !isPK;

      const column: Column = {
        name,
        type,
        isPrimaryKey: isPK,
        isForeignKey: isFK,
        isNullable
      };

      if (isFK) {
        column.references = foreignKeys.get(name);
      }

      // Check for inline REFERENCES
      const refMatch = trimmed.match(/REFERENCES\s+[`"']?([\w]+)[`"']?\s*\(\s*[`"']?([\w]+)[`"']?\s*\)/i);
      if (refMatch) {
        column.isForeignKey = true;
        column.references = { table: refMatch[1], column: refMatch[2] };
      }

      columns.push(column);
    }
  }

  return columns;
}

// Infer relationships from column naming conventions
export function inferRelationships(tables: Table[]): InferredRelationship[] {
  const inferences: InferredRelationship[] = [];
  const tableNames = tables.map(t => t.name.toLowerCase());
  const tableMap = new Map(tables.map(t => [t.name.toLowerCase(), t]));

  for (const table of tables) {
    for (const column of table.columns) {
      // Skip if already a foreign key
      if (column.isForeignKey && column.references) continue;

      const colLower = column.name.toLowerCase();

      // Pattern 1: column ends with _id (e.g., user_id -> users.id)
      if (colLower.endsWith('_id')) {
        const baseName = colLower.slice(0, -3);

        // Try singular and plural forms
        const possibleTables = [
          baseName,
          baseName + 's',
          baseName + 'es',
          baseName.replace(/ie$/, 'y')
        ];

        for (const possible of possibleTables) {
          if (tableNames.includes(possible) && possible !== table.name.toLowerCase()) {
            const targetTable = tableMap.get(possible)!;
            const targetPK = targetTable.columns.find(c => c.isPrimaryKey);

            if (targetPK) {
              inferences.push({
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: targetTable.name,
                targetColumn: targetPK.name,
                confidence: 0.9,
                reason: `Column "${column.name}" follows naming convention for foreign key to "${targetTable.name}"`
              });
              break;
            }
          }
        }
      }

      // Pattern 2: column matches another table's name + Id (e.g., userId -> users.id)
      const camelCaseMatch = colLower.match(/^(\w+)id$/);
      if (camelCaseMatch) {
        const baseName = camelCaseMatch[1];
        const possibleTables = [baseName, baseName + 's', baseName + 'es'];

        for (const possible of possibleTables) {
          if (tableNames.includes(possible) && possible !== table.name.toLowerCase()) {
            const targetTable = tableMap.get(possible)!;
            const targetPK = targetTable.columns.find(c => c.isPrimaryKey);

            if (targetPK) {
              inferences.push({
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: targetTable.name,
                targetColumn: targetPK.name,
                confidence: 0.85,
                reason: `Column "${column.name}" appears to reference "${targetTable.name}"`
              });
              break;
            }
          }
        }
      }

      // Pattern 3: FK prefix (e.g., fk_user -> users.id)
      if (colLower.startsWith('fk_') || colLower.startsWith('fk')) {
        const baseName = colLower.replace(/^fk_?/, '');
        const possibleTables = [baseName, baseName + 's', baseName + 'es'];

        for (const possible of possibleTables) {
          if (tableNames.includes(possible) && possible !== table.name.toLowerCase()) {
            const targetTable = tableMap.get(possible)!;
            const targetPK = targetTable.columns.find(c => c.isPrimaryKey);

            if (targetPK) {
              inferences.push({
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: targetTable.name,
                targetColumn: targetPK.name,
                confidence: 0.95,
                reason: `Column "${column.name}" has FK prefix suggesting reference to "${targetTable.name}"`
              });
              break;
            }
          }
        }
      }
    }
  }

  // Remove duplicates and sort by confidence
  const seen = new Set<string>();
  return inferences
    .filter(i => {
      const key = `${i.sourceTable}.${i.sourceColumn}-${i.targetTable}.${i.targetColumn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence);
}

// Convert parsed query joins to relationships
export function joinsToRelationships(
  joins: ParsedQuery['joins'],
  tables: Table[]
): Relationship[] {
  const relationships: Relationship[] = [];
  const tableMap = new Map(tables.map(t => [t.name.toLowerCase(), t]));

  for (const join of joins) {
    const sourceTable = tableMap.get(join.leftTable.toLowerCase());
    const targetTable = tableMap.get(join.rightTable.toLowerCase());

    if (sourceTable && targetTable) {
      relationships.push({
        id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceTable: sourceTable.id,
        sourceColumn: join.leftColumn,
        targetTable: targetTable.id,
        targetColumn: join.rightColumn,
        type: 'one-to-many'
      });
    }
  }

  return relationships;
}

// Generate SQL helper query for getting schema info
export function generateSchemaHelperSQL(dialect: 'mysql' | 'postgres' | 'sqlite' | 'sqlserver' = 'mysql'): string {
  switch (dialect) {
    case 'postgres':
      return `-- PostgreSQL: Get all tables and columns
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END as is_primary_key,
    fk.foreign_table_name as references_table,
    fk.foreign_column_name as references_column
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_name = c.table_name
    AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT
        ku.table_name,
        ku.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;`;

    case 'sqlite':
      return `-- SQLite: Get table info (run for each table)
-- First, get all table names:
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';

-- Then for each table, run:
-- PRAGMA table_info(your_table_name);
-- PRAGMA foreign_key_list(your_table_name);`;

    case 'sqlserver':
      return `-- SQL Server: Get all tables and columns
SELECT
    t.TABLE_NAME as table_name,
    c.COLUMN_NAME as column_name,
    c.DATA_TYPE as data_type,
    c.IS_NULLABLE as is_nullable,
    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as is_primary_key,
    fk.REFERENCED_TABLE_NAME as references_table,
    fk.REFERENCED_COLUMN_NAME as references_column
FROM INFORMATION_SCHEMA.TABLES t
JOIN INFORMATION_SCHEMA.COLUMNS c
    ON t.TABLE_NAME = c.TABLE_NAME
    AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
LEFT JOIN (
    SELECT ku.TABLE_NAME, ku.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
LEFT JOIN (
    SELECT
        fk.name as FK_NAME,
        tp.name as TABLE_NAME,
        cp.name as COLUMN_NAME,
        tr.name as REFERENCED_TABLE_NAME,
        cr.name as REFERENCED_COLUMN_NAME
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
    JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
    JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
) fk ON c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
WHERE t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;`;

    case 'mysql':
    default:
      return `-- MySQL: Get all tables and columns
SELECT
    t.TABLE_NAME as table_name,
    c.COLUMN_NAME as column_name,
    c.DATA_TYPE as data_type,
    c.IS_NULLABLE as is_nullable,
    c.COLUMN_KEY as column_key,
    kcu.REFERENCED_TABLE_NAME as references_table,
    kcu.REFERENCED_COLUMN_NAME as references_column
FROM INFORMATION_SCHEMA.TABLES t
JOIN INFORMATION_SCHEMA.COLUMNS c
    ON t.TABLE_NAME = c.TABLE_NAME
    AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON c.TABLE_NAME = kcu.TABLE_NAME
    AND c.COLUMN_NAME = kcu.COLUMN_NAME
    AND c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
WHERE t.TABLE_SCHEMA = DATABASE()
    AND t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;`;
  }
}

// Parse schema query results
export function parseSchemaResults(results: string): Table[] {
  const tables: Map<string, Table> = new Map();
  const lines = results.trim().split('\n');

  for (const line of lines) {
    const parts = line.split(/[,\t|]/).map(p => p.trim());
    if (parts.length < 4) continue;

    const [tableName, columnName, dataType, isNullable, isPK, refTable, refColumn] = parts;

    if (!tableName || !columnName || tableName === 'table_name') continue;

    if (!tables.has(tableName)) {
      tables.set(tableName, {
        id: `table-${tableName}-${Date.now()}`,
        name: tableName,
        columns: [],
        color: getTableColor(tables.size)
      });
    }

    const table = tables.get(tableName)!;
    const column: Column = {
      name: columnName,
      type: dataType || 'VARCHAR',
      isPrimaryKey: isPK === 'YES' || isPK === 'PRI',
      isForeignKey: !!refTable,
      isNullable: isNullable === 'YES' || isNullable === 'true'
    };

    if (refTable && refColumn) {
      column.references = { table: refTable, column: refColumn };
    }

    table.columns.push(column);
  }

  return Array.from(tables.values());
}

// Color palette for tables
const TABLE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function getTableColor(index: number): string {
  return TABLE_COLORS[index % TABLE_COLORS.length];
}

// Create tables from parsed query
export function createTablesFromQuery(parsed: ParsedQuery, existingTables: Table[]): Table[] {
  const existingNames = new Set(existingTables.map(t => t.name.toLowerCase()));
  const newTables: Table[] = [];

  // Build a map of columns per table from both SELECT columns and JOIN conditions
  const tableColumns = new Map<string, Set<string>>();

  for (const col of parsed.columns) {
    const key = col.table.toLowerCase();
    if (!tableColumns.has(key)) tableColumns.set(key, new Set());
    tableColumns.get(key)!.add(col.column);
  }

  // Add columns referenced in JOIN conditions
  for (const join of parsed.joins) {
    const leftKey = join.leftTable.toLowerCase();
    const rightKey = join.rightTable.toLowerCase();
    if (!tableColumns.has(leftKey)) tableColumns.set(leftKey, new Set());
    if (!tableColumns.has(rightKey)) tableColumns.set(rightKey, new Set());
    tableColumns.get(leftKey)!.add(join.leftColumn);
    tableColumns.get(rightKey)!.add(join.rightColumn);
  }

  for (const tableName of parsed.tables) {
    if (!existingNames.has(tableName.toLowerCase())) {
      const knownColumns = tableColumns.get(tableName.toLowerCase()) || new Set<string>();

      const tableColumnDefs = Array.from(knownColumns).map(colName => ({
        name: colName,
        type: colName.toLowerCase() === 'id' ? 'INT' : 'VARCHAR',
        isPrimaryKey: colName.toLowerCase() === 'id',
        isForeignKey: false,
        isNullable: true,
      }));

      // Add id column if not present
      if (!tableColumnDefs.some(c => c.name.toLowerCase() === 'id')) {
        tableColumnDefs.unshift({
          name: 'id',
          type: 'INT',
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
        });
      }

      newTables.push({
        id: `table-${tableName}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: tableName,
        columns: tableColumnDefs,
        color: getTableColor(existingTables.length + newTables.length)
      });
    }
  }

  return newTables;
}
