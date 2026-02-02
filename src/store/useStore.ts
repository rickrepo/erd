import { create } from 'zustand';
import type { Table, Relationship, ChatMessage, ViewMode, InferredRelationship, Column } from '../types';

export type SQLDialect = 'sql' | 'mysql' | 'postgres' | 'sqlite' | 'sqlserver';

interface ERDStore {
  // State
  tables: Table[];
  relationships: Relationship[];
  selectedTable: string | null;
  selectedRelationship: string | null;
  chatMessages: ChatMessage[];
  viewMode: ViewMode;
  pendingInferences: InferredRelationship[];
  sqlInput: string;
  schemaInput: string;
  isProcessing: boolean;
  sqlDialect: SQLDialect;
  showWelcome: boolean;
  isDemoMode: boolean;

  // Table Actions
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  setTables: (tables: Table[]) => void;

  // Column Actions
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnName: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnName: string) => void;

  // Relationship Actions
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  removeRelationship: (id: string) => void;
  setRelationships: (relationships: Relationship[]) => void;

  // Selection Actions
  setSelectedTable: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;

  // Chat Actions
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;

  // View Actions
  setViewMode: (mode: ViewMode) => void;

  // Inference Actions
  setPendingInferences: (inferences: InferredRelationship[]) => void;
  acceptInference: (inference: InferredRelationship) => void;
  rejectInference: (index: number) => void;

  // Input Actions
  setSqlInput: (sql: string) => void;
  setSchemaInput: (schema: string) => void;
  setIsProcessing: (processing: boolean) => void;
  setSqlDialect: (dialect: SQLDialect) => void;

  // UI Actions
  setShowWelcome: (show: boolean) => void;
  loadDemo: (tables: Table[], relationships: Relationship[], sql: string) => void;

  // Reset
  reset: () => void;
}

const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant' as const,
  content: `Welcome to **SchemaFlow**! I'm here to help you visualize and design your database schema.

**Quick Start:**

1. **Paste SQL** - Add your queries or CREATE TABLE statements
2. **Auto-detect** - I'll find tables and relationships automatically
3. **Refine** - Review inferred connections and adjust as needed
4. **Export** - Download your professional ERD diagram

Try the interactive demo or paste your own SQL to begin!`,
  timestamp: new Date(),
  suggestions: [
    'Load demo schema',
    'Paste my SQL',
    'How does this work?'
  ]
});

const initialState = {
  tables: [] as Table[],
  relationships: [] as Relationship[],
  selectedTable: null as string | null,
  selectedRelationship: null as string | null,
  chatMessages: [createWelcomeMessage()],
  viewMode: 'design' as ViewMode,
  pendingInferences: [] as InferredRelationship[],
  sqlInput: '',
  schemaInput: '',
  isProcessing: false,
  sqlDialect: 'sql' as SQLDialect,
  showWelcome: true,
  isDemoMode: false,
};

export const useStore = create<ERDStore>((set, get) => ({
  ...initialState,

  // Table Actions
  addTable: (table) => set((state) => ({
    tables: [...state.tables, table]
  })),

  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    )
  })),

  removeTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id),
    relationships: state.relationships.filter(
      (r) => r.sourceTable !== id && r.targetTable !== id
    ),
    selectedTable: state.selectedTable === id ? null : state.selectedTable
  })),

  setTables: (tables) => set({ tables }),

  // Column Actions
  addColumn: (tableId, column) => set((state) => ({
    tables: state.tables.map((t) =>
      t.id === tableId
        ? { ...t, columns: [...t.columns, column] }
        : t
    )
  })),

  updateColumn: (tableId, columnName, updates) => set((state) => ({
    tables: state.tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            columns: t.columns.map((c) =>
              c.name === columnName ? { ...c, ...updates } : c
            )
          }
        : t
    )
  })),

  removeColumn: (tableId, columnName) => set((state) => ({
    tables: state.tables.map((t) =>
      t.id === tableId
        ? { ...t, columns: t.columns.filter((c) => c.name !== columnName) }
        : t
    ),
    relationships: state.relationships.filter(
      (r) => !(r.sourceTable === tableId && r.sourceColumn === columnName) &&
             !(r.targetTable === tableId && r.targetColumn === columnName)
    )
  })),

  // Relationship Actions
  addRelationship: (relationship) => set((state) => ({
    relationships: [...state.relationships, relationship]
  })),

  updateRelationship: (id, updates) => set((state) => ({
    relationships: state.relationships.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    )
  })),

  removeRelationship: (id) => set((state) => ({
    relationships: state.relationships.filter((r) => r.id !== id),
    selectedRelationship: state.selectedRelationship === id ? null : state.selectedRelationship
  })),

  setRelationships: (relationships) => set({ relationships }),

  // Selection Actions
  setSelectedTable: (id) => set({ selectedTable: id, selectedRelationship: null }),
  setSelectedRelationship: (id) => set({ selectedRelationship: id, selectedTable: null }),

  // Chat Actions
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }]
  })),

  clearChat: () => set({ chatMessages: [createWelcomeMessage()] }),

  // View Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  // Inference Actions
  setPendingInferences: (inferences) => set({ pendingInferences: inferences }),

  acceptInference: (inference) => {
    const { tables, addRelationship, pendingInferences, setPendingInferences } = get();

    const sourceTable = tables.find(t => t.name.toLowerCase() === inference.sourceTable.toLowerCase());
    const targetTable = tables.find(t => t.name.toLowerCase() === inference.targetTable.toLowerCase());

    if (sourceTable && targetTable) {
      addRelationship({
        id: `rel-${Date.now()}`,
        sourceTable: sourceTable.id,
        sourceColumn: inference.sourceColumn,
        targetTable: targetTable.id,
        targetColumn: inference.targetColumn,
        type: 'one-to-many'
      });
    }

    setPendingInferences(pendingInferences.filter(i =>
      !(i.sourceTable === inference.sourceTable &&
        i.sourceColumn === inference.sourceColumn &&
        i.targetTable === inference.targetTable &&
        i.targetColumn === inference.targetColumn)
    ));
  },

  rejectInference: (index) => set((state) => ({
    pendingInferences: state.pendingInferences.filter((_, i) => i !== index)
  })),

  // Input Actions
  setSqlInput: (sql) => set({ sqlInput: sql }),
  setSchemaInput: (schema) => set({ schemaInput: schema }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setSqlDialect: (dialect) => set({ sqlDialect: dialect }),

  // UI Actions
  setShowWelcome: (show) => set({ showWelcome: show }),

  loadDemo: (tables, relationships, sql) => {
    const { addChatMessage } = get();

    set({
      tables,
      relationships,
      sqlInput: sql,
      showWelcome: false,
      isDemoMode: true,
      pendingInferences: [],
    });

    addChatMessage({
      role: 'assistant',
      content: `I've loaded an **e-commerce database demo** with ${tables.length} tables and ${relationships.length} relationships.

This schema includes:
- **users** - Customer accounts
- **products** - Product catalog
- **categories** - Product categories
- **orders** - Customer orders
- **order_items** - Order line items
- **addresses** - Shipping addresses

Feel free to explore! You can:
- **Drag tables** to rearrange the layout
- **Click columns** to see connections
- **Export** your diagram as PNG or SVG

Try asking me questions about the schema!`,
      suggestions: [
        'Show relationships',
        'Export diagram',
        'Clear and start fresh'
      ]
    });
  },

  // Reset
  reset: () => set({
    ...initialState,
    showWelcome: false,
    chatMessages: [createWelcomeMessage()],
  }),
}));
