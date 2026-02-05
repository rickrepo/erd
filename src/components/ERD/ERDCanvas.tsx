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
import { DEMO_POSITIONS } from '../../utils/demoData';
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
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import type { Column } from '../../types';

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

type LayoutType = 'grid' | 'force' | 'hierarchical';

// Custom SVG markers for relationship arrows
function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Active relationship marker (green) */}
        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
        </marker>
        {/* Glow filter for animated dot */}
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

const ERDCanvas: React.FC = () => {
  const {
    tables,
    relationships,
    setSelectedTable,
    setSelectedRelationship,
    addRelationship,
    removeRelationship,
    updateRelationship,
    removeTable,
    addTable,
    addColumn,
    updateTable,
    selectedTable,
    isDemoMode,
    reset,
  } = useStore();

  const { subscription, setShowPremiumModal } = useAuthStore();
  const isPremium = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const [showExport, setShowExport] = useState(false);
  const { fitView, screenToFlowPosition } = useReactFlow();

  // Active relationships - which connections are currently visible
  const [activeRelationships, setActiveRelationships] = useState<Set<string>>(new Set());
  const [animatingRelationship, setAnimatingRelationship] = useState<string | null>(null);

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
        // Hide this relationship
        next.delete(rel.id);
      } else {
        // Show with animation
        setAnimatingRelationship(rel.id);
        next.add(rel.id);
        // Clear animation flag after animation completes
        setTimeout(() => setAnimatingRelationship(null), 700);
        // Fit view to show both tables
        setTimeout(() => fitView({
          padding: 0.3,
          maxZoom: 0.9,
          duration: 500,
          nodes: [{ id: rel.sourceTable }, { id: rel.targetTable }]
        }), 50);
      }
      return next;
    });
  }, [relationships, fitView]);

  // Show all relationships
  const handleShowAll = useCallback(() => {
    const allIds = new Set(relationships.map(r => r.id));
    setActiveRelationships(allIds);
  }, [relationships]);

  // Hide all relationships
  const handleHideAll = useCallback(() => {
    setActiveRelationships(new Set());
  }, []);

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

  // Calculate initial nodes based on layout type
  const initialNodes = useMemo(() => {
    if (isDemoMode && layoutType === 'force') {
      return tables.map((table) => ({
        id: table.id,
        type: 'tableNode' as const,
        position: DEMO_POSITIONS[table.id] || { x: Math.random() * 800, y: Math.random() * 600 },
        data: {
          table,
          isSelected: false,
          activeRelationships: activeTableColumns,
          onFKClick: handleFKClick,
        },
      }));
    }

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

    // Map layout nodes with proper typing
    return layoutNodes.map(node => {
      const nodeData = node.data as { table: typeof tables[0]; isSelected: boolean };
      return {
        id: node.id,
        type: 'tableNode' as const,
        position: node.position,
        data: {
          table: nodeData.table,
          isSelected: nodeData.isSelected,
          activeRelationships: activeTableColumns,
          onFKClick: handleFKClick,
        },
      };
    });
  }, [tables, relationships, layoutType, isDemoMode, activeTableColumns, handleFKClick]);

  // Calculate edges - only create edges for active relationships
  const initialEdges = useMemo(() => {
    const edges = createEdges(relationships, tables);
    return edges.map((edge: Edge) => ({
      ...edge,
      type: 'relationship',
      animated: false,
      data: {
        ...edge.data,
        isActive: activeRelationships.has(edge.id),
        isAnimating: animatingRelationship === edge.id,
      },
    }));
  }, [relationships, tables, activeRelationships, animatingRelationship]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when relationships change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Update selected state
  useEffect(() => {
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

        // Auto-show the new relationship
        setActiveRelationships(prev => new Set([...prev, newRelId]));
        setAnimatingRelationship(newRelId);
        setTimeout(() => setAnimatingRelationship(null), 700);

        setEdges((eds) => addEdge({
          ...connection,
          type: 'relationship',
        }, eds));
      }
    },
    [addRelationship, setEdges]
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
  }, [tables, addTable]);

  const handleAddColumnToTable = useCallback((tableId: string) => {
    const col: Column = {
      name: `new_column`,
      type: 'VARCHAR(255)',
      isPrimaryKey: false,
      isForeignKey: false,
      isNullable: true,
    };
    addColumn(tableId, col);
  }, [addColumn]);

  const handleDeleteRelationship = useCallback((relId: string) => {
    removeRelationship(relId);
    setSelectedRelationship(null);
    setActiveRelationships(prev => {
      const next = new Set(prev);
      next.delete(relId);
      return next;
    });
  }, [removeRelationship, setSelectedRelationship]);

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
    const newTable = {
      id: `table-${Date.now()}`,
      name,
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false },
      ],
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
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1, duration: 500 }), 100);
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

      // Escape to hide all relationships
      if (e.key === 'Escape') {
        handleHideAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteTable, handleDeleteRelationship, handleUndo, handleRedo, handleHideAll]);

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

  // Count visible relationships
  const visibleCount = activeRelationships.size;
  const totalCount = relationships.length;

  return (
    <div className="w-full h-full relative">
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
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
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
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
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
          className="!bg-slate-800/90 !border-slate-700 !rounded-xl !shadow-xl !hidden lg:!block"
          pannable
          zoomable
        />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex items-center gap-2">
          {/* Relationship visibility controls */}
          {relationships.length > 0 && (
            <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-700 flex items-center">
              <div className="px-3 py-2 border-r border-slate-700">
                <span className="text-xs text-slate-400">Connections</span>
                <span className="ml-2 text-sm font-medium text-white">{visibleCount}/{totalCount}</span>
              </div>
              <button
                onClick={handleShowAll}
                className="px-3 py-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
                title="Show all relationships"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden lg:inline">Show All</span>
              </button>
              <button
                onClick={handleHideAll}
                className="px-3 py-2.5 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm rounded-r-xl"
                title="Hide all relationships"
              >
                <EyeOff className="w-4 h-4" />
                <span className="hidden lg:inline">Hide All</span>
              </button>
            </div>
          )}

          {/* Layout Buttons */}
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl p-1 flex gap-0.5 shadow-xl border border-slate-700">
            <button
              onClick={() => handleLayout('grid')}
              className={`p-2 rounded-lg transition-all ${
                layoutType === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('force')}
              className={`p-2 rounded-lg transition-all ${
                layoutType === 'force'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Auto Layout"
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('hierarchical')}
              className={`p-2 rounded-lg transition-all ${
                layoutType === 'hierarchical'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Tree Layout"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>
        </Panel>

        {/* Active Relationships Pills */}
        {activeRelationships.size > 0 && (
          <Panel position="top-center" className="flex flex-wrap items-center gap-2 max-w-[60vw]">
            {Array.from(activeRelationships).slice(0, 5).map(relId => {
              const rel = relationships.find(r => r.id === relId);
              if (!rel) return null;
              const sourceTable = tables.find(t => t.id === rel.sourceTable);
              const targetTable = tables.find(t => t.id === rel.targetTable);
              if (!sourceTable || !targetTable) return null;

              return (
                <div
                  key={relId}
                  className="bg-emerald-600/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 animate-fadeIn"
                >
                  <span className="text-xs text-white font-medium">
                    {sourceTable.name}.{rel.sourceColumn}
                  </span>
                  <span className="text-emerald-200">→</span>
                  <span className="text-xs text-white font-medium">
                    {targetTable.name}.{rel.targetColumn}
                  </span>
                  <button
                    onClick={() => {
                      setActiveRelationships(prev => {
                        const next = new Set(prev);
                        next.delete(relId);
                        return next;
                      });
                    }}
                    className="p-0.5 hover:bg-emerald-500 rounded-full ml-1"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              );
            })}
            {activeRelationships.size > 5 && (
              <span className="text-xs text-slate-400">
                +{activeRelationships.size - 5} more
              </span>
            )}
          </Panel>
        )}

        {/* Export & Actions */}
        <Panel position="top-right" className="flex items-center gap-2">
          {tables.length > 0 && (
            <>
              <button
                onClick={() => {
                  if (confirm('Clear everything and start fresh?')) {
                    reset();
                    setActiveRelationships(new Set());
                  }
                }}
                className="bg-slate-800/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 text-sm font-medium transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xl text-white font-medium text-sm transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </>
          )}
        </Panel>

        {/* Stats - Bottom Right */}
        {tables.length > 0 && (
          <Panel position="bottom-right" className="hidden lg:block">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-xl border border-slate-700/50 text-sm">
              <span className="text-white font-medium">{tables.length}</span>
              <span className="text-slate-400 ml-1">tables</span>
              <span className="text-slate-600 mx-2">·</span>
              <span className="text-white font-medium">{relationships.length}</span>
              <span className="text-slate-400 ml-1">relationships</span>
            </div>
          </Panel>
        )}

        {/* Instructions - Bottom Left */}
        {tables.length > 0 && relationships.length > 0 && visibleCount === 0 && (
          <Panel position="bottom-left" className="hidden lg:block">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-slate-700/50 max-w-xs">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Click glowing columns</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Foreign keys glow blue. Click to reveal their connections.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Empty State */}
        {tables.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2 !left-1/2 !-translate-x-1/2">
            <div className="text-center max-w-md mx-auto animate-fadeIn">
              <h3 className="text-2xl font-bold text-white mb-3">No Tables Yet</h3>
              <p className="text-slate-400 mb-6">
                Paste SQL in the sidebar or right-click to add tables manually.
              </p>
              <button
                onClick={() => handleQuickAddTable({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
              >
                Add First Table
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

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

      {/* Free tier watermark */}
      {!isPremium && tables.length > 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
          <div className="rotate-[-18deg] select-none opacity-[0.04]">
            <div className="text-[100px] lg:text-[140px] font-black text-white tracking-widest whitespace-nowrap">
              SchemaFlow
            </div>
          </div>
          <button
            onClick={() => setShowPremiumModal(true, 'feature')}
            className="pointer-events-auto absolute bottom-4 right-4 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm text-slate-400 text-xs font-medium rounded-lg border border-slate-700 hover:border-slate-500 transition-all"
          >
            Remove watermark
          </button>
        </div>
      )}
    </div>
  );
};

export default ERDCanvas;
