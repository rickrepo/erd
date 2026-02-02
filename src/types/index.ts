import type { Node, Edge } from '@xyflow/react';

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  color?: string;
}

export interface Relationship {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ParsedQuery {
  tables: string[];
  joins: {
    leftTable: string;
    leftColumn: string;
    rightTable: string;
    rightColumn: string;
  }[];
  columns: {
    table: string;
    column: string;
  }[];
}

export interface SchemaInfo {
  tables: Table[];
  relationships: Relationship[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export type TableNode = Node<{
  table: Table;
  isSelected: boolean;
  onColumnClick?: (column: Column) => void;
}>;

export type RelationshipEdge = Edge<{
  relationship: Relationship;
  label?: string;
}>;

export interface InferredRelationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  confidence: number;
  reason: string;
}

export type ViewMode = 'design' | 'query' | 'schema';

export interface AppState {
  tables: Table[];
  relationships: Relationship[];
  selectedTable: string | null;
  selectedRelationship: string | null;
  chatMessages: ChatMessage[];
  viewMode: ViewMode;
  pendingInferences: InferredRelationship[];
  sqlInput: string;
  schemaInput: string;
}
