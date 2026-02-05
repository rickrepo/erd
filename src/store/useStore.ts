import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Table, Relationship, ChatMessage, ViewMode, InferredRelationship, Column, SavedSchema } from '../types';

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
  savedSchemas: SavedSchema[];

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

  // Saved Schema Actions
  saveCurrentSchema: (name: string) => string;
  loadSavedSchema: (id: string) => void;
  deleteSavedSchema: (id: string) => void;
  renameSavedSchema: (id: string, name: string) => void;

  // Reset
  reset: () => void;
}

const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant' as const,
  content: `## Report Builder

I generate SQL queries from your schema relationships.

**Once you have tables loaded, try:**
- \`"query [table]"\` - Basic SELECT
- \`"report on [table]"\` - Full JOIN with related tables
- \`"aggregate [table]"\` - GROUP BY with counts
- \`"join [table1] and [table2]"\` - Custom JOINs

Load your schema from the SQL tab, then come back here to generate queries!`,
  timestamp: new Date(),
  suggestions: [
    'Help',
    'Show tables',
    'Load demo'
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
  savedSchemas: [] as SavedSchema[],
};

// Helper to get the user-scoped storage key
const getStorageKey = (): string => {
  try {
    const authData = localStorage.getItem('schemaflow-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.state?.user?.id) {
        return `schemaflow-data-${parsed.state.user.id}`;
      }
    }
  } catch {
    // Fall through to default
  }
  return 'schemaflow-data-anonymous';
};

/**
 * Call this when a user logs in or out to reload data from the correct
 * user-scoped localStorage key. Clears transient state (raw SQL, etc.)
 * and loads the user's persisted tables/relationships/savedSchemas.
 */
export const switchUserStorage = () => {
  const key = getStorageKey();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = parsed?.state;
      if (data) {
        useStore.setState({
          tables: data.tables ?? [],
          relationships: data.relationships ?? [],
          savedSchemas: data.savedSchemas ?? [],
          sqlDialect: data.sqlDialect ?? 'sql',
          sqlInput: '',
          schemaInput: '',
        });
        return;
      }
    }
  } catch {
    // Fall through to defaults
  }
  // No saved data for this user — start clean
  useStore.setState({
    tables: [],
    relationships: [],
    savedSchemas: [],
    sqlInput: '',
    schemaInput: '',
  });
};

export const useStore = create<ERDStore>()(
  persist(
    (set, get) => ({
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

  // Saved Schema Actions
  saveCurrentSchema: (name) => {
    const { tables, relationships, savedSchemas } = get();
    const now = new Date().toISOString();
    const id = `schema-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const schema: SavedSchema = {
      id,
      name,
      tables,
      relationships,
      createdAt: now,
      updatedAt: now,
    };

    set({ savedSchemas: [...savedSchemas, schema] });
    return id;
  },

  loadSavedSchema: (id) => {
    const { savedSchemas, addChatMessage } = get();
    const schema = savedSchemas.find(s => s.id === id);
    if (!schema) return;

    set({
      tables: schema.tables,
      relationships: schema.relationships,
      sqlInput: '',
      schemaInput: '',
    });

    addChatMessage({
      role: 'assistant',
      content: `Loaded saved schema **"${schema.name}"** with ${schema.tables.length} table(s) and ${schema.relationships.length} relationship(s).`,
    });
  },

  deleteSavedSchema: (id) => set((state) => ({
    savedSchemas: state.savedSchemas.filter(s => s.id !== id),
  })),

  renameSavedSchema: (id, name) => set((state) => ({
    savedSchemas: state.savedSchemas.map(s =>
      s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s
    ),
  })),

  // Reset
  reset: () => set({
    ...initialState,
    savedSchemas: get().savedSchemas,
    showWelcome: false,
    chatMessages: [createWelcomeMessage()],
  }),
    }),
    {
      name: 'schemaflow-data',
      // Only persist structured schema data — never raw SQL or transient UI state
      partialize: (state) => ({
        tables: state.tables,
        relationships: state.relationships,
        savedSchemas: state.savedSchemas,
        sqlDialect: state.sqlDialect,
      }),
      storage: {
        getItem: (_name) => {
          const key = getStorageKey();
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          // Return in the format zustand persist expects
          // but we store under a dynamic key
          return JSON.parse(raw);
        },
        setItem: (_name, value) => {
          const key = getStorageKey();
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (_name) => {
          const key = getStorageKey();
          localStorage.removeItem(key);
        },
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ERDStore> | undefined;
        return {
          ...currentState,
          tables: persisted?.tables ?? currentState.tables,
          relationships: persisted?.relationships ?? currentState.relationships,
          savedSchemas: persisted?.savedSchemas ?? currentState.savedSchemas,
          sqlDialect: persisted?.sqlDialect ?? currentState.sqlDialect,
        };
      },
    }
  )
);
