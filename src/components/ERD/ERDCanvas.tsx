import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ConnectionLineType,
} from '@xyflow/react';
import type { Connection, NodeTypes, EdgeTypes, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { gridLayout, forceDirectedLayout, createEdges, hierarchicalLayout } from '../../utils/layout';
import { getTableColor } from '../../utils/sqlParser';
import TableNode from './TableNode';
import RelationshipEdge from './RelationshipEdge';
import { ExportPanel } from './ExportPanel';
import {
  ContextMenu,
  buildTableMenuItems,
  buildEdgeMenuItems,
  buildCanvasMenuItems,
} from './ContextMenu';
import type { ContextMenuPosition } from './ContextMenu';
import { QuickTableDialog } from './QuickTableDialog';
import {
  LayoutGrid,
  Network,
  GitBranch,
  Download,
  Palette,
  Minus,
} from 'lucide-react';
import type { Column } from '../../types';

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

type LayoutType = 'grid' | 'force' | 'hierarchical';

// Custom SVG markers for edges
function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Cyan arrow marker for high visibility */}
        <marker
          id="arrow-cyan"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
        </marker>
        {/* Glow filter for animated effects */}
        <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

// Undo/redo history
interface HistoryEntry {
  tables: ReturnType<typeof useStore.getState>['tables'];
  relationships: ReturnType<typeof useStore.getState>['relationships'];
}

export interface ERDCanvasProps {
  activeRelationships: Set<string>;
  setActiveRelationships: React.Dispatch<React.SetStateAction<Set<string>>>;
  animatingRelationship: string | null;
  setAnimatingRelationship: React.Dispatch<React.SetStateAction<string | null>>;
  hiddenTables?: Set<string>;
}

const ERDCanvas: React.FC<ERDCanvasProps> = ({
  activeRelationships,
  setActiveRelationships,
  animatingRelationship,
  setAnimatingRelationship,
  hiddenTables = new Set(),
}) => {
  const {
    tables: allTables,
    relationships: allRelationships,
    setSelectedTable,
    setSelectedRelationship,
    addRelationship,
    removeRelationship,
    updateRelationship,
    removeTable,
    addTable,
    addColumn,
    updateColumn,
    removeColumn,
    updateTable,
    selectedTable,
    sqlInput,
    setSqlInput,
  } = useStore();

  // Filter out hidden tables and their relationships
  const tables = useMemo(() =>
    allTables.filter(t => !hiddenTables.has(t.id)),
    [allTables, hiddenTables]
  );

  const relationships = useMemo(() =>
    allRelationships.filter(r =>
      !hiddenTables.has(r.sourceTable) && !hiddenTables.has(r.targetTable)
    ),
    [allRelationships, hiddenTables]
  );

  const { subscription } = useAuthStore();
  const isPremium = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchical');
  const [showExport, setShowExport] = useState(false);
  const [edgeStyle, setEdgeStyle] = useState<'gradient' | 'flat'>('gradient');
  const { fitView, screenToFlowPosition } = useReactFlow();

  // Track if we've done the initial animation
  const hasAnimatedRef = useRef(false);
  const prevRelCountRef = useRef(allRelationships.length);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    type: 'table' | 'edge' | 'canvas';
    targetId?: string;
    targetData?: Record<string, unknown>;
  } | null>(null);

  // Quick table dialog state
  const [quickTableDialog, setQuickTableDialog] = useState<{
    position: ContextMenuPosition;
    flowPosition: { x: number; y: number };
  } | null>(null);

  // Inline rename state
  const [renamingTable, setRenamingTable] = useState<string | null>(null);

  // Undo/redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    historyRef.current.push({
      tables: JSON.parse(JSON.stringify(tables)),
      relationships: JSON.parse(JSON.stringify(relationships)),
    });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    futureRef.current = [];
  }, [tables, relationships]);

  // Track changes for undo
  const prevTablesLen = useRef(tables.length);
  const prevRelsLen = useRef(relationships.length);
  useEffect(() => {
    if (tables.length !== prevTablesLen.current || relationships.length !== prevRelsLen.current) {
      pushHistory();
      prevTablesLen.current = tables.length;
      prevRelsLen.current = relationships.length;
    }
  }, [tables.length, relationships.length, pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const entry = historyRef.current.pop()!;
    futureRef.current.push({
      tables: JSON.parse(JSON.stringify(tables)),
      relationships: JSON.parse(JSON.stringify(relationships)),
    });
    skipHistoryRef.current = true;
    useStore.getState().setTables(entry.tables);
    useStore.getState().setRelationships(entry.relationships);
  }, [tables, relationships]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const entry = futureRef.current.pop()!;
    historyRef.current.push({
      tables: JSON.parse(JSON.stringify(tables)),
      relationships: JSON.parse(JSON.stringify(relationships)),
    });
    skipHistoryRef.current = true;
    useStore.getState().setTables(entry.tables);
    useStore.getState().setRelationships(entry.relationships);
  }, [tables, relationships]);

  // Auto-animate relationships when NEW relationships are added (not on initial load)
  // IMPORTANT: Don't call setActiveRelationships here - that's handled by the parent component
  useEffect(() => {
    if (relationships.length === 0) {
      hasAnimatedRef.current = false;
      prevRelCountRef.current = 0;
      return;
    }

    // Skip animation on first render - let parent handle initial state
    if (prevRelCountRef.current === 0) {
      prevRelCountRef.current = relationships.length;
      hasAnimatedRef.current = true;
      return;
    }

    // New relationships were added - only animate, don't change activeRelationships
    if (relationships.length > prevRelCountRef.current) {
      const newRels = relationships.slice(prevRelCountRef.current);
      newRels.forEach((rel, i) => {
        setTimeout(() => {
          setAnimatingRelationship(rel.id);
          setTimeout(() => setAnimatingRelationship(null), 600);
        }, i * 400);
      });
    }

    prevRelCountRef.current = relationships.length;
  }, [relationships.length, setAnimatingRelationship]);

  // Handle FK column click - toggle relationship visibility with animation
  const handleFKClick = useCallback((tableId: string, columnName: string) => {
    // Find the relationship for this FK
    const rel = relationships.find(r =>
      (r.sourceTable === tableId && r.sourceColumn === columnName) ||
      (r.targetTable === tableId && r.targetColumn === columnName)
    );

    if (!rel) return;

    setActiveRelationships(prev => {
      const next = new Set(prev);
      if (next.has(rel.id)) {
        next.delete(rel.id);
      } else {
        setAnimatingRelationship(rel.id);
        next.add(rel.id);
        setTimeout(() => setAnimatingRelationship(null), 700);
        setTimeout(() => fitView({
          padding: 0.3,
          maxZoom: 0.9,
          duration: 500,
          nodes: [{ id: rel.sourceTable }, { id: rel.targetTable }]
        }), 50);
      }
      return next;
    });
  }, [relationships, fitView, setActiveRelationships, setAnimatingRelationship]);

  // Build the set of active table-column keys for highlighting
  const activeTableColumns = useMemo(() => {
    const keys = new Set<string>();
    relationships.forEach(rel => {
      if (activeRelationships.has(rel.id)) {
        keys.add(`${rel.sourceTable}-${rel.sourceColumn}`);
        keys.add(`${rel.targetTable}-${rel.targetColumn}`);
      }
    });
    return keys;
  }, [relationships, activeRelationships]);

  // Store node positions separately so they don't change when data changes
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const userDraggedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevLayoutTypeRef = useRef<LayoutType>(layoutType);
  const prevTableIdsRef = useRef<string[]>([]);
  const prevTableCountRef = useRef(tables.length);

  // Auto-fit when tables are added (not on every change)
  useEffect(() => {
    const currentCount = tables.length;
    const prevCount = prevTableCountRef.current;

    // Only auto-fit when tables are added (not removed or on initial load)
    if (currentCount > prevCount && prevCount > 0) {
      // Small delay to let the layout settle
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, maxZoom: 0.8, duration: 300 });
      }, 100);
      return () => clearTimeout(timer);
    }

    prevTableCountRef.current = currentCount;
  }, [tables.length, fitView]);

  // Calculate positions only when layout type changes or tables are added/removed
  const nodePositions = useMemo(() => {
    const currentTableIds = tables.map(t => t.id).sort().join(',');
    const prevTableIds = prevTableIdsRef.current.sort().join(',');
    const layoutChanged = prevLayoutTypeRef.current !== layoutType;
    const tablesChanged = currentTableIds !== prevTableIds;

    // Only recalculate positions if layout type changed or tables changed
    if (layoutChanged || tablesChanged || nodePositionsRef.current.size === 0) {
      prevLayoutTypeRef.current = layoutType;
      prevTableIdsRef.current = tables.map(t => t.id);

      // If layout type changed, clear user-dragged positions
      if (layoutChanged) {
        userDraggedPositionsRef.current.clear();
      }

      // Use the selected layout algorithm
      const layoutNodes = (() => {
        switch (layoutType) {
          case 'grid':
            return gridLayout(tables);
          case 'hierarchical':
            return hierarchicalLayout(tables, relationships);
          case 'force':
          default:
            return forceDirectedLayout(tables, relationships);
        }
      })();

      const newPositions = new Map(
        layoutNodes.map(node => [
          node.id,
          // Preserve user-dragged position if exists
          userDraggedPositionsRef.current.get(node.id) || node.position
        ])
      );

      nodePositionsRef.current = newPositions;
    }

    return nodePositionsRef.current;
  }, [tables, relationships, layoutType]);

  // Track when user drags a node
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    // Save user-dragged position
    userDraggedPositionsRef.current.set(node.id, node.position);
  }, []);

  // Regenerate SQL for all tables
  const regenerateAllSQL = useCallback(() => {
    const currentTables = useStore.getState().tables;
    if (currentTables.length === 0) {
      setSqlInput('');
      return;
    }

    const sqls = currentTables.map(table => {
      if (table.columns.length === 0) {
        return `-- ${table.name} (no columns yet)`;
      }
      const columnNames = table.columns.map(c => c.name).join(', ');
      return `-- ${table.name} query\nSELECT ${columnNames}\nFROM ${table.name};`;
    });
    setSqlInput(sqls.join('\n\n'));
  }, [setSqlInput]);

  // Handle adding column to table
  const handleAddColumnToTable = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    // Generate unique column name
    const existingNames = table?.columns.map(c => c.name) || [];
    let suffix = 1;
    let newName = 'new_column';
    while (existingNames.includes(newName)) {
      newName = `new_column_${suffix}`;
      suffix++;
    }

    const col: Column = {
      name: newName,
      type: 'VARCHAR(255)',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
    };
    addColumn(tableId, col);

    // Sync SQL - regenerate the table's SQL
    if (table) {
      regenerateAllSQL();
    }
  }, [addColumn, tables, regenerateAllSQL]);

  // Handle column deletion
  const handleDeleteColumnFromTable = useCallback((tableId: string, columnName: string) => {
    removeColumn(tableId, columnName);
    regenerateAllSQL();
  }, [removeColumn, regenerateAllSQL]);

  // Handle column editing
  const handleEditColumnInTable = useCallback((tableId: string, columnName: string, updates: Partial<Column>) => {
    updateColumn(tableId, columnName, updates);
    regenerateAllSQL();
  }, [updateColumn, regenerateAllSQL]);

  // Calculate initial nodes - positions are stable, only data changes
  const initialNodes = useMemo(() => {
    return tables.map((table) => ({
      id: table.id,
      type: 'tableNode' as const,
      position: nodePositions.get(table.id) || { x: Math.random() * 800, y: Math.random() * 600 },
      data: {
        table,
        isSelected: false,
        activeRelationships: activeTableColumns,
        onFKClick: handleFKClick,
        onAddColumn: handleAddColumnToTable,
        onDeleteColumn: handleDeleteColumnFromTable,
        onEditColumn: handleEditColumnInTable,
      },
    }));
  }, [tables, nodePositions, activeTableColumns, handleFKClick, handleAddColumnToTable, handleDeleteColumnFromTable, handleEditColumnInTable]);

  // Calculate edges with smart handle selection based on node positions
  const initialEdges = useMemo(() => {
    const edges = createEdges(relationships, tables, nodePositions);
    return edges.map((edge: Edge) => ({
      ...edge,
      type: 'relationship',
      animated: false,
      data: {
        ...edge.data,
        isActive: activeRelationships.has(edge.id),
        isAnimating: animatingRelationship === edge.id,
        edgeStyle,
      },
    }));
  }, [relationships, tables, nodePositions, activeRelationships, animatingRelationship, edgeStyle]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Track if this is the initial mount to skip first effect run
  const isInitialMountRef = useRef(true);
  const prevTableIdsForNodesRef = useRef<string>(tables.map(t => t.id).sort().join(','));
  const prevRelIdsForEdgesRef = useRef<string>(relationships.map(r => r.id).sort().join(','));

  // Update nodes when tables actually change (skip initial mount)
  useEffect(() => {
    // Skip initial mount - useNodesState already has the right data
    if (isInitialMountRef.current) {
      return;
    }
    const currentTableIds = tables.map(t => t.id).sort().join(',');
    if (currentTableIds !== prevTableIdsForNodesRef.current) {
      prevTableIdsForNodesRef.current = currentTableIds;
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes, tables]);

  // Update node positions when layout type changes
  const prevLayoutTypeForNodesRef = useRef<LayoutType>(layoutType);
  useEffect(() => {
    if (isInitialMountRef.current) {
      return;
    }
    if (layoutType !== prevLayoutTypeForNodesRef.current) {
      prevLayoutTypeForNodesRef.current = layoutType;
      setNodes(initialNodes);
    }
  }, [layoutType, initialNodes, setNodes]);

  // Update edges when relationships actually change (skip initial mount)
  useEffect(() => {
    // Skip initial mount - useEdgesState already has the right data
    if (isInitialMountRef.current) {
      return;
    }
    const currentRelIds = relationships.map(r => r.id).sort().join(',');
    if (currentRelIds !== prevRelIdsForEdgesRef.current) {
      prevRelIdsForEdgesRef.current = currentRelIds;
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges, relationships]);

  // Update edge active state when activeRelationships changes
  const prevActiveRelsRef = useRef<string>([...activeRelationships].sort().join(','));
  useEffect(() => {
    const currentActiveRels = [...activeRelationships].sort().join(',');
    if (currentActiveRels !== prevActiveRelsRef.current) {
      prevActiveRelsRef.current = currentActiveRels;
      // Update edge data with new active states
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            isActive: activeRelationships.has(edge.id),
          },
        }))
      );
    }
  }, [activeRelationships, setEdges]);

  // Update edge animating state when animatingRelationship changes
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          isAnimating: animatingRelationship === edge.id,
        },
      }))
    );
  }, [animatingRelationship, setEdges]);

  // Update edge style when changed
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          edgeStyle,
        },
      }))
    );
  }, [edgeStyle, setEdges]);

  // Auto-cycle join animations every 8 seconds when there are active relationships
  useEffect(() => {
    if (activeRelationships.size === 0 || relationships.length === 0) return;

    const cycleAnimation = () => {
      const activeRels = [...activeRelationships];
      if (activeRels.length === 0) return;

      // Pick a random relationship to animate
      const randomIndex = Math.floor(Math.random() * activeRels.length);
      const relId = activeRels[randomIndex];

      setAnimatingRelationship(relId);
      setTimeout(() => setAnimatingRelationship(null), 800);
    };

    // Start cycle after 5 seconds, then repeat every 8 seconds
    const initialDelay = setTimeout(cycleAnimation, 5000);
    const interval = setInterval(cycleAnimation, 8000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [activeRelationships, relationships.length, setAnimatingRelationship]);

  // Mark initial mount as complete after first render cycle
  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  // Update selected state (only when selectedTable actually changes, skip null->null)
  const prevSelectedTableRef = useRef<string | null>(selectedTable);
  useEffect(() => {
    if (prevSelectedTableRef.current === selectedTable) {
      return;
    }
    prevSelectedTableRef.current = selectedTable;
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedTable,
        },
      }))
    );
  }, [selectedTable, setNodes]);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        const sourceColumn = connection.sourceHandle.replace('-right', '');
        const targetColumn = connection.targetHandle.replace('-left', '');

        const newRelId = `rel-${Date.now()}`;
        addRelationship({
          id: newRelId,
          sourceTable: connection.source,
          sourceColumn,
          targetTable: connection.target,
          targetColumn,
          type: 'one-to-many',
        });

        setActiveRelationships(prev => new Set([...prev, newRelId]));
        setAnimatingRelationship(newRelId);
        setTimeout(() => setAnimatingRelationship(null), 700);

        setEdges((eds) => addEdge({
          ...connection,
          type: 'relationship',
        }, eds));
      }
    },
    [addRelationship, setEdges, setActiveRelationships, setAnimatingRelationship]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedTable(node.id);
      setSelectedRelationship(null);
    },
    [setSelectedTable, setSelectedRelationship]
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedRelationship(edge.id);
      setSelectedTable(null);
    },
    [setSelectedRelationship, setSelectedTable]
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setSelectedRelationship(null);
    setContextMenu(null);
  }, [setSelectedTable, setSelectedRelationship]);

  // Handle double-click on node to rename
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setRenamingTable(node.id);
    },
    []
  );

  // Right-click context menus
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setSelectedTable(node.id);
      const data = node.data as { table?: { name?: string } };
      setContextMenu({
        position: { x: event.clientX, y: event.clientY },
        type: 'table',
        targetId: node.id,
        targetData: { tableName: data?.table?.name || '' },
      });
    },
    [setSelectedTable]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setSelectedRelationship(edge.id);
      const edgeData = edge.data as { relationship?: { type?: string } } | undefined;
      setContextMenu({
        position: { x: event.clientX, y: event.clientY },
        type: 'edge',
        targetId: edge.id,
        targetData: { currentType: edgeData?.relationship?.type || 'one-to-many' },
      });
    },
    [setSelectedRelationship]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        position: { x: event.clientX, y: event.clientY },
        type: 'canvas',
      });
    },
    []
  );

  // Context menu actions
  const handleDeleteTable = useCallback((tableId: string) => {
    removeTable(tableId);
    setSelectedTable(null);
  }, [removeTable, setSelectedTable]);

  // Generate SQL SELECT for a table
  const generateTableSQL = useCallback((tableName: string, columns: { name: string }[]) => {
    const columnNames = columns.map(c => c.name).join(', ');
    return `-- ${tableName} query\nSELECT ${columnNames}\nFROM ${tableName};`;
  }, []);

  // Append SQL for a new table
  const appendTableSQL = useCallback((tableName: string, columns: { name: string }[]) => {
    const newSQL = generateTableSQL(tableName, columns);
    const currentSQL = sqlInput.trim();
    const updatedSQL = currentSQL ? `${currentSQL}\n\n${newSQL}` : newSQL;
    setSqlInput(updatedSQL);
  }, [sqlInput, setSqlInput, generateTableSQL]);

  const handleDuplicateTable = useCallback((tableId: string) => {
    const original = tables.find(t => t.id === tableId);
    if (!original) return;
    const newTable = {
      ...original,
      id: `table-${Date.now()}`,
      name: `${original.name}_copy`,
      color: getTableColor(tables.length),
    };
    addTable(newTable);
    // Generate SQL for the duplicated table
    appendTableSQL(newTable.name, original.columns);
  }, [tables, addTable, appendTableSQL]);

  const handleDeleteRelationship = useCallback((relId: string) => {
    removeRelationship(relId);
    setSelectedRelationship(null);
    setActiveRelationships(prev => {
      const next = new Set(prev);
      next.delete(relId);
      return next;
    });
  }, [removeRelationship, setSelectedRelationship, setActiveRelationships]);

  const handleChangeRelationshipType = useCallback((relId: string, type: 'one-to-one' | 'one-to-many' | 'many-to-many') => {
    updateRelationship(relId, { type });
  }, [updateRelationship]);

  const handleQuickAddTable = useCallback((screenPos: ContextMenuPosition) => {
    const flowPos = screenToFlowPosition({ x: screenPos.x, y: screenPos.y });
    setQuickTableDialog({
      position: screenPos,
      flowPosition: flowPos,
    });
  }, [screenToFlowPosition]);

  const handleCreateTable = useCallback((name: string, flowPosition?: { x: number; y: number }) => {
    // Create table with no columns - user will add them via SQL or manually
    const newTable = {
      id: `table-${Date.now()}`,
      name,
      columns: [] as { name: string; type: string; isPrimaryKey: boolean; isForeignKey: boolean; isNullable: boolean }[],
      color: getTableColor(tables.length),
    };
    addTable(newTable);

    if (flowPosition) {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === newTable.id ? { ...n, position: flowPosition } : n
          )
        );
      }, 50);
    }

    setQuickTableDialog(null);
    setSelectedTable(newTable.id);
  }, [tables.length, addTable, setNodes, setSelectedTable]);

  // Re-layout with animation
  const handleLayout = useCallback((type: LayoutType) => {
    setLayoutType(type);
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 0.8, duration: 500 }), 100);
  }, [fitView]);

  // Build context menu items
  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'table' && contextMenu.targetId) {
      return buildTableMenuItems({
        tableId: contextMenu.targetId,
        tableName: (contextMenu.targetData?.tableName as string) || '',
        onRename: () => setRenamingTable(contextMenu.targetId!),
        onAddColumn: () => handleAddColumnToTable(contextMenu.targetId!),
        onDuplicate: () => handleDuplicateTable(contextMenu.targetId!),
        onDelete: () => handleDeleteTable(contextMenu.targetId!),
      });
    }

    if (contextMenu.type === 'edge' && contextMenu.targetId) {
      return buildEdgeMenuItems({
        relationshipId: contextMenu.targetId,
        currentType: (contextMenu.targetData?.currentType as string) || 'one-to-many',
        onChangeType: (type) => handleChangeRelationshipType(contextMenu.targetId!, type),
        onDelete: () => handleDeleteRelationship(contextMenu.targetId!),
      });
    }

    if (contextMenu.type === 'canvas') {
      return buildCanvasMenuItems({
        onAddTable: () => handleQuickAddTable(contextMenu.position),
        onLayoutGrid: () => handleLayout('grid'),
        onLayoutForce: () => handleLayout('force'),
        onLayoutHierarchical: () => handleLayout('hierarchical'),
      });
    }

    return [];
  }, [contextMenu, handleAddColumnToTable, handleDuplicateTable, handleDeleteTable, handleDeleteRelationship, handleChangeRelationshipType, handleQuickAddTable, handleLayout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useStore.getState();
        if (state.selectedTable) {
          e.preventDefault();
          handleDeleteTable(state.selectedTable);
        } else if (state.selectedRelationship) {
          e.preventDefault();
          handleDeleteRelationship(state.selectedRelationship);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      if (e.key === 'F2') {
        const state = useStore.getState();
        if (state.selectedTable) {
          e.preventDefault();
          setRenamingTable(state.selectedTable);
        }
      }

      // Escape to hide all
      if (e.key === 'Escape') {
        setActiveRelationships(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteTable, handleDeleteRelationship, handleUndo, handleRedo, setActiveRelationships]);

  // Inline rename handler
  useEffect(() => {
    if (!renamingTable) return;

    const timer = setTimeout(() => {
      const nodeEl = document.querySelector(`[data-id="${renamingTable}"]`);
      if (!nodeEl) {
        setRenamingTable(null);
        return;
      }
      const headerEl = nodeEl.querySelector('h3');
      if (!headerEl) {
        setRenamingTable(null);
        return;
      }

      const currentName = headerEl.textContent || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'bg-transparent text-white text-sm font-bold border-b-2 border-white outline-none w-full';
      input.style.minWidth = '80px';

      const originalHTML = headerEl.innerHTML;
      headerEl.innerHTML = '';
      headerEl.appendChild(input);
      input.focus();
      input.select();

      const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          updateTable(renamingTable, { name: newName });
        }
        headerEl.innerHTML = originalHTML;
        if (newName && newName !== currentName) {
          headerEl.textContent = newName;
        }
        setRenamingTable(null);
      };

      input.addEventListener('blur', finish);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') {
          headerEl.innerHTML = originalHTML;
          setRenamingTable(null);
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [renamingTable, updateTable]);

  return (
    <div className="w-full h-full relative bg-slate-900">
      <EdgeMarkerDefs />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.8 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'relationship',
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-900"
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#1e293b"
        />

        <MiniMap
          nodeColor={(node) => {
            const data = node.data as { table?: { color?: string } } | undefined;
            return data?.table?.color || '#3b82f6';
          }}
          maskColor="rgba(15, 23, 42, 0.9)"
          className="!bg-slate-800/90 !border-slate-700 !rounded-xl !shadow-xl !hidden lg:!block !bottom-12"
          pannable
          zoomable
        />

        {/* Layout Toolbar - Desktop only */}
        <Panel position="top-left" className="hidden lg:flex items-center gap-2">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-lg p-1 flex gap-1 shadow-lg border border-slate-700/80">
            <button
              onClick={() => handleLayout('grid')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                layoutType === 'grid'
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => handleLayout('force')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                layoutType === 'force'
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Auto Layout"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto</span>
            </button>
            <button
              onClick={() => handleLayout('hierarchical')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                layoutType === 'hierarchical'
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Tree Layout"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tree</span>
            </button>
          </div>

          {/* Edge Style Toggle */}
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-lg p-1 flex gap-1 shadow-lg border border-slate-700/80">
            <button
              onClick={() => setEdgeStyle('gradient')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                edgeStyle === 'gradient'
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Gradient Lines"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gradient</span>
            </button>
            <button
              onClick={() => setEdgeStyle('flat')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                edgeStyle === 'flat'
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
              title="Flat Lines"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flat</span>
            </button>
          </div>
        </Panel>

        {/* Actions - Desktop only */}
        <Panel position="top-right" className="hidden lg:flex items-center gap-2">
          {tables.length > 0 && (
            <button
              onClick={() => setShowExport(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-lg px-4 py-2 flex items-center gap-1.5 shadow-lg text-white font-medium text-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </Panel>

      </ReactFlow>

      {/* Empty State - Centered Overlay */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-center max-w-lg mx-auto animate-fadeIn pointer-events-auto px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-full mb-4">
              <span className="text-purple-400 text-sm font-medium">Visualize your database relationships</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Paste Your SQL Queries</h3>
            <p className="text-slate-400 mb-6 text-sm sm:text-base leading-relaxed">
              Paste <span className="text-purple-400 font-medium">SELECT queries with JOINs</span> or{' '}
              <span className="text-purple-400 font-medium">CREATE TABLE</span> statements in the sidebar.
              <br className="hidden sm:block" />
              We'll automatically detect tables and their relationships.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  // Focus the SQL input in sidebar
                  const sidebar = document.querySelector('textarea');
                  if (sidebar) sidebar.focus();
                }}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all"
              >
                Paste SQL to Start
              </button>
              <button
                onClick={() => handleQuickAddTable({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium transition-all"
              >
                Or Add Tables Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}

      {/* Context Menu */}
      {contextMenu && contextMenuItems.length > 0 && (
        <ContextMenu
          position={contextMenu.position}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Quick Table Dialog */}
      {quickTableDialog && (
        <QuickTableDialog
          position={quickTableDialog.position}
          onCreateTable={(name) => handleCreateTable(name, quickTableDialog.flowPosition)}
          onClose={() => setQuickTableDialog(null)}
        />
      )}

      {/* Free tier watermarks - multiple visible watermarks */}
      {!isPremium && tables.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* Center watermark - most prominent */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rotate-[-12deg] select-none opacity-[0.08]">
              <div className="text-[50px] sm:text-[70px] lg:text-[100px] font-black text-white tracking-[0.15em]">
                SchemaFlow
              </div>
            </div>
          </div>

          {/* Top-left watermark */}
          <div className="absolute top-20 left-10 rotate-[-12deg] select-none opacity-[0.06]">
            <div className="text-[30px] sm:text-[40px] font-bold text-white tracking-wider">
              SchemaFlow
            </div>
          </div>

          {/* Bottom-right watermark */}
          <div className="absolute bottom-24 right-10 rotate-[-12deg] select-none opacity-[0.06]">
            <div className="text-[30px] sm:text-[40px] font-bold text-white tracking-wider">
              SchemaFlow
            </div>
          </div>

          {/* Bottom-left corner badge - moved to avoid overlap with export panel */}
          <div className="absolute bottom-4 left-4 select-none opacity-70">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs font-semibold text-slate-400">
                Made with <span className="text-purple-400">SchemaFlow</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ERDCanvas;
