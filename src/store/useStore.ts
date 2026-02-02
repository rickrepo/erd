import { create } from 'zustand';
import type { Table, Relationship, ChatMessage, ViewMode, InferredRelationship, Column } from '../types';

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

  // Reset
  reset: () => void;
}

const initialState = {
  tables: [],
  relationships: [],
  selectedTable: null,
  selectedRelationship: null,
  chatMessages: [{
    id: 'welcome',
    role: 'assistant' as const,
    content: `Welcome to the Database Schema Designer! I can help you visualize and design your database schema.

**How to get started:**

1. **Paste SQL queries** - I'll extract tables and relationships from your JOINs
2. **Import schema** - Provide your database schema and I'll map it out
3. **Ask questions** - I can help refine relationships and suggest improvements

What would you like to do?`,
    timestamp: new Date(),
    suggestions: [
      'Import from SQL queries',
      'Generate schema SQL helper',
      'Create a new table manually'
    ]
  }],
  viewMode: 'design' as ViewMode,
  pendingInferences: [],
  sqlInput: '',
  schemaInput: '',
  isProcessing: false,
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

  clearChat: () => set({ chatMessages: initialState.chatMessages }),

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

  // Reset
  reset: () => set(initialState),
}));
