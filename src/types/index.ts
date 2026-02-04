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

export interface SavedSchema {
  id: string;
  name: string;
  tables: Table[];
  relationships: Relationship[];
  createdAt: string;
  updatedAt: string;
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

// User & Subscription Types
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Subscription {
  tier: SubscriptionTier;
  expiresAt?: Date;
  features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  maxGenerationsPerDay: number;
  aiMatchingEnabled: boolean;
  exportWithoutWatermark: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface UsageStats {
  generationsToday: number;
  generationsTotal: number;
  lastGenerationAt?: Date;
  lastResetDate: string; // ISO date string for daily reset
}

export const FREE_TIER_LIMITS: SubscriptionFeatures = {
  maxGenerationsPerDay: 3,
  aiMatchingEnabled: false,
  exportWithoutWatermark: false,
  prioritySupport: false,
  customBranding: false,
};

export const PRO_TIER_FEATURES: SubscriptionFeatures = {
  maxGenerationsPerDay: 100,
  aiMatchingEnabled: true,
  exportWithoutWatermark: true,
  prioritySupport: true,
  customBranding: false,
};

export const ENTERPRISE_TIER_FEATURES: SubscriptionFeatures = {
  maxGenerationsPerDay: Infinity,
  aiMatchingEnabled: true,
  exportWithoutWatermark: true,
  prioritySupport: true,
  customBranding: true,
};
