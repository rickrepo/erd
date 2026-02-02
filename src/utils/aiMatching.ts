import type { Table, InferredRelationship } from '../types';

// AI-powered relationship matching (premium feature)
// This simulates what a real AI service would provide
// In production, this would call an AI API endpoint

export interface AIMatchingResult {
  relationships: InferredRelationship[];
  insights: string[];
  suggestedIndexes: string[];
}

// Simulated AI analysis patterns
const SEMANTIC_PATTERNS = [
  { pattern: /^created_by$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: "created_by" typically references a user' },
  { pattern: /^updated_by$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: "updated_by" typically references a user' },
  { pattern: /^owner_id$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: "owner" typically references a user' },
  { pattern: /^author_id$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: "author" typically references a user' },
  { pattern: /^assignee_id$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: "assignee" typically references a user' },
  { pattern: /^parent_id$/i, target: 'self', targetColumn: 'id', reason: 'Self-referential relationship detected (hierarchical data)' },
  { pattern: /^reply_to$/i, target: 'self', targetColumn: 'id', reason: 'Self-referential relationship for threaded replies' },
  { pattern: /^manager_id$/i, target: 'employees', targetColumn: 'id', reason: 'Semantic match: manager references employees table' },
  { pattern: /^supervisor_id$/i, target: 'users', targetColumn: 'id', reason: 'Semantic match: supervisor references users table' },
  { pattern: /^billing_address_id$/i, target: 'addresses', targetColumn: 'id', reason: 'Semantic match: billing address references addresses' },
  { pattern: /^shipping_address_id$/i, target: 'addresses', targetColumn: 'id', reason: 'Semantic match: shipping address references addresses' },
];

// Data type compatibility matrix for AI matching
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  'INT': ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'SERIAL'],
  'INTEGER': ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL'],
  'BIGINT': ['BIGINT', 'INT', 'INTEGER', 'SERIAL'],
  'UUID': ['UUID', 'CHAR(36)', 'VARCHAR(36)'],
  'VARCHAR': ['VARCHAR', 'CHAR', 'TEXT', 'STRING'],
  'TEXT': ['TEXT', 'VARCHAR', 'LONGTEXT', 'MEDIUMTEXT'],
};

function areTypesCompatible(type1: string, type2: string): boolean {
  const baseType1 = type1.toUpperCase().replace(/\(\d+\)/, '');
  const baseType2 = type2.toUpperCase().replace(/\(\d+\)/, '');

  if (baseType1 === baseType2) return true;

  const compatible1 = TYPE_COMPATIBILITY[baseType1] || [baseType1];
  const compatible2 = TYPE_COMPATIBILITY[baseType2] || [baseType2];

  return compatible1.some(t => compatible2.includes(t));
}

// AI-enhanced relationship inference
export function aiEnhancedInference(tables: Table[]): AIMatchingResult {
  const relationships: InferredRelationship[] = [];
  const insights: string[] = [];
  const suggestedIndexes: string[] = [];
  const tableMap = new Map(tables.map(t => [t.name.toLowerCase(), t]));
  const tableNames = Array.from(tableMap.keys());

  // Track what we've already matched
  const matchedPairs = new Set<string>();

  for (const table of tables) {
    for (const column of table.columns) {
      // Skip if already a defined FK
      if (column.isForeignKey && column.references) continue;

      const colLower = column.name.toLowerCase();
      const matchKey = `${table.name}.${column.name}`;

      // Pattern 1: Semantic pattern matching
      for (const semantic of SEMANTIC_PATTERNS) {
        if (semantic.pattern.test(column.name)) {
          let targetTableName = semantic.target;

          // Handle self-referential
          if (targetTableName === 'self') {
            targetTableName = table.name.toLowerCase();
          }

          const targetTable = tableMap.get(targetTableName);
          if (targetTable && !matchedPairs.has(matchKey)) {
            const targetColumn = targetTable.columns.find(
              c => c.name.toLowerCase() === semantic.targetColumn || c.isPrimaryKey
            );

            if (targetColumn && areTypesCompatible(column.type, targetColumn.type)) {
              relationships.push({
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: targetTable.name,
                targetColumn: targetColumn.name,
                confidence: 0.92,
                reason: `AI Analysis: ${semantic.reason}`
              });
              matchedPairs.add(matchKey);

              // Generate insight
              if (targetTableName === table.name.toLowerCase()) {
                insights.push(`Detected hierarchical structure in "${table.name}" table`);
              }
            }
          }
          break;
        }
      }

      // Pattern 2: Column name similarity across tables
      if (!matchedPairs.has(matchKey) && colLower.endsWith('_id')) {
        const baseName = colLower.slice(0, -3);

        // Try to find matching table with fuzzy matching
        for (const targetTableName of tableNames) {
          if (targetTableName === table.name.toLowerCase()) continue;

          const similarity = calculateSimilarity(baseName, targetTableName.replace(/_/g, ''));
          if (similarity > 0.8) {
            const targetTable = tableMap.get(targetTableName)!;
            const targetPK = targetTable.columns.find(c => c.isPrimaryKey);

            if (targetPK && areTypesCompatible(column.type, targetPK.type)) {
              relationships.push({
                sourceTable: table.name,
                sourceColumn: column.name,
                targetTable: targetTable.name,
                targetColumn: targetPK.name,
                confidence: 0.88,
                reason: `AI Analysis: Fuzzy match between "${column.name}" and table "${targetTable.name}" (${Math.round(similarity * 100)}% similar)`
              });
              matchedPairs.add(matchKey);
              break;
            }
          }
        }
      }

      // Pattern 3: Detect potential composite keys / junction tables
      if (table.columns.filter(c => c.name.toLowerCase().endsWith('_id')).length >= 2) {
        const fkColumns = table.columns.filter(c => c.name.toLowerCase().endsWith('_id'));
        if (fkColumns.length === 2 && !insights.some(i => i.includes(table.name))) {
          insights.push(`"${table.name}" appears to be a junction table (many-to-many relationship)`);
        }
      }

      // Pattern 4: Suggest indexes for FK columns
      if (colLower.endsWith('_id') && !column.isPrimaryKey) {
        const indexSuggestion = `CREATE INDEX idx_${table.name}_${column.name} ON ${table.name}(${column.name});`;
        if (!suggestedIndexes.includes(indexSuggestion)) {
          suggestedIndexes.push(indexSuggestion);
        }
      }
    }
  }

  // Pattern 5: Detect naming convention issues
  const namingIssues = detectNamingIssues(tables);
  insights.push(...namingIssues);

  // Deduplicate and sort
  const uniqueRelationships = deduplicateRelationships(relationships);

  return {
    relationships: uniqueRelationships.sort((a, b) => b.confidence - a.confidence),
    insights: [...new Set(insights)],
    suggestedIndexes: suggestedIndexes.slice(0, 5), // Limit to top 5
  };
}

// Levenshtein distance-based similarity
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

function detectNamingIssues(tables: Table[]): string[] {
  const issues: string[] = [];

  for (const table of tables) {
    // Check for inconsistent naming conventions
    const hasSnakeCase = table.columns.some(c => c.name.includes('_'));
    const hasCamelCase = table.columns.some(c => /[a-z][A-Z]/.test(c.name));

    if (hasSnakeCase && hasCamelCase) {
      issues.push(`Inconsistent naming convention in "${table.name}" (mixing snake_case and camelCase)`);
    }

    // Check for missing primary key
    if (!table.columns.some(c => c.isPrimaryKey)) {
      issues.push(`Table "${table.name}" has no primary key defined`);
    }
  }

  return issues;
}

function deduplicateRelationships(relationships: InferredRelationship[]): InferredRelationship[] {
  const seen = new Set<string>();
  return relationships.filter(r => {
    const key = `${r.sourceTable}.${r.sourceColumn}-${r.targetTable}.${r.targetColumn}`;
    const reverseKey = `${r.targetTable}.${r.targetColumn}-${r.sourceTable}.${r.sourceColumn}`;
    if (seen.has(key) || seen.has(reverseKey)) return false;
    seen.add(key);
    return true;
  });
}

// Simulate AI processing delay for demo purposes
export async function runAIAnalysis(tables: Table[]): Promise<AIMatchingResult> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  return aiEnhancedInference(tables);
}
