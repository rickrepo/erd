import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
import { Branding } from '../common/Branding';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Sparkles,
  Database,
  Plus,
  Undo2,
  Redo2,
  RotateCcw,
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
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
        </marker>
        <marker
          id="arrow-selected"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
        </marker>
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
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();

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
    // Limit history size
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

  // Calculate initial nodes based on layout type
  const initialNodes = useMemo(() => {
    if (isDemoMode && layoutType === 'force') {
      return tables.map((table) => ({
        id: table.id,
        type: 'tableNode',
        position: DEMO_POSITIONS[table.id] || { x: Math.random() * 800, y: Math.random() * 600 },
        data: {
          table,
          isSelected: false,
        },
      }));
    }

    switch (layoutType) {
      case 'grid':
        return gridLayout(tables);
      case 'hierarchical':
        return hierarchicalLayout(tables, relationships);
      case 'force':
      default:
        return forceDirectedLayout(tables, relationships);
    }
  }, [tables, relationships, layoutType, isDemoMode]);

  // Calculate edges with custom edge type
  const initialEdges = useMemo(() => {
    const edges = createEdges(relationships, tables);
    return edges.map((edge: Edge) => ({
      ...edge,
      type: 'relationship',
      animated: false,
    }));
  }, [relationships, tables]);

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

        addRelationship({
          id: `rel-${Date.now()}`,
          sourceTable: connection.source,
          sourceColumn,
          targetTable: connection.target,
          targetColumn,
          type: 'one-to-many',
        });

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

    // If we have a flow position, we'll set the node position after render
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
  }, [contextMenu, handleAddColumnToTable, handleDuplicateTable, handleDeleteTable, handleDeleteRelationship, handleChangeRelationshipType, handleQuickAddTable]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Delete selected table or relationship
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

      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl+Y = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // F2 = Rename selected table
      if (e.key === 'F2') {
        const state = useStore.getState();
        if (state.selectedTable) {
          e.preventDefault();
          setRenamingTable(state.selectedTable);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteTable, handleDeleteRelationship, handleUndo, handleRedo]);

  // Inline rename handler
  useEffect(() => {
    if (!renamingTable) return;

    // Find the node element and inject an input
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

  // Re-layout with animation
  const handleLayout = useCallback((type: LayoutType) => {
    setLayoutType(type);
    setTimeout(() => fitView({ padding: 0.2, maxZoom: 1, duration: 500 }), 100);
  }, [fitView]);

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

        <Controls
          className="!bg-slate-800/90 !border-slate-700 !rounded-xl overflow-hidden !shadow-xl"
          showInteractive={false}
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
        <Panel position="top-left" className="flex flex-wrap gap-1.5 lg:gap-2 max-w-[calc(100vw-1rem)]">
          {/* Layout Controls */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-1 lg:p-1.5 flex gap-0.5 lg:gap-1 shadow-xl border border-slate-700">
            <button
              onClick={() => handleLayout('grid')}
              className={`p-2 lg:p-2.5 rounded-lg transition-all ${
                layoutType === 'grid'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('force')}
              className={`p-2 lg:p-2.5 rounded-lg transition-all ${
                layoutType === 'force'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Auto Layout"
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('hierarchical')}
              className={`p-2 lg:p-2.5 rounded-lg transition-all ${
                layoutType === 'hierarchical'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Tree Layout"
            >
              <GitBranch className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-600 my-auto mx-0.5" />

            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
              disabled={historyRef.current.length === 0}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
              disabled={futureRef.current.length === 0}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-1 lg:p-1.5 flex gap-0.5 lg:gap-1 shadow-xl border border-slate-700">
            <button
              onClick={() => zoomIn({ duration: 200 })}
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomOut({ duration: 200 })}
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.15, duration: 300 })}
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Add Table Button */}
          <button
            onClick={() => handleQuickAddTable({ x: 400, y: 200 })}
            className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-2 lg:p-2.5 shadow-xl border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 lg:gap-2 text-sm font-medium"
            title="Add Table"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Table</span>
          </button>

          {/* Export Button */}
          {tables.length > 0 && (
            <button
              onClick={() => setShowExport(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl p-2 lg:p-2.5 flex items-center gap-1.5 lg:gap-2 shadow-xl text-white font-medium text-sm transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* Clear / Start Fresh Button */}
          {tables.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear everything and start fresh?')) {
                  reset();
                }
              }}
              className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-2 lg:p-2.5 shadow-xl border border-slate-700 hover:bg-red-600/20 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-all flex items-center gap-1.5 lg:gap-2 text-sm font-medium"
              title="Clear & Start Fresh"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="hidden sm:block">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-xl border border-slate-700 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">{tables.length}</span>
              <span className="text-xs text-slate-400">tables</span>
            </div>
            <div className="w-px h-4 bg-slate-600" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{relationships.length}</span>
              <span className="text-xs text-slate-400">relations</span>
            </div>
          </div>
        </Panel>

        {/* Keyboard shortcuts hint — desktop only */}
        <Panel position="bottom-right" className="hidden lg:block">
          <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl px-3 py-2 shadow-xl border border-slate-700/50 text-[10px] text-slate-500 space-y-0.5">
            <div><kbd className="text-slate-400">Right-click</kbd> for options</div>
            <div><kbd className="text-slate-400">Del</kbd> remove selected</div>
            <div><kbd className="text-slate-400">F2</kbd> rename table</div>
            <div><kbd className="text-slate-400">Ctrl+Z</kbd> undo</div>
          </div>
        </Panel>

        {/* Branding — desktop only */}
        <Panel position="bottom-left" className="hidden lg:block">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-slate-700/50">
            <Branding size="sm" />
          </div>
        </Panel>

        {/* Empty State */}
        {tables.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2 !left-1/2 !-translate-x-1/2 !w-[calc(100%-2rem)] sm:!w-auto">
            <div className="text-center max-w-md mx-auto animate-fadeIn px-4">
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4 lg:mb-6 border border-slate-700">
                <Database className="w-8 h-8 lg:w-12 lg:h-12 text-blue-400" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 lg:mb-3">Ready to Design</h3>
              <p className="text-sm lg:text-base text-slate-400 mb-4 lg:mb-6 leading-relaxed">
                <span className="hidden sm:inline">Paste SQL queries or CREATE TABLE statements in the sidebar, or right-click here to add tables directly.</span>
                <span className="sm:hidden">Switch to the SQL tab to paste your schema, or tap below to add a table.</span>
              </p>
              <div className="hidden sm:flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
                <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">Drag</span>
                <span>to move</span>
                <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">Connect</span>
                <span>handles to link</span>
                <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">Scroll</span>
                <span>to zoom</span>
              </div>
              <button
                onClick={() => handleQuickAddTable({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
                className="mt-4 lg:mt-6 px-5 py-2.5 lg:px-6 lg:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center gap-2 mx-auto transition-all text-sm lg:text-base"
              >
                <Plus className="w-4 h-4" />
                Add Your First Table
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

      {/* Free tier watermark — hidden for Pro/Enterprise */}
      {!isPremium && tables.length > 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden">
          <div className="rotate-[-18deg] select-none opacity-[0.06]">
            <div className="text-[80px] lg:text-[120px] font-black text-white tracking-widest whitespace-nowrap">
              SchemaFlow
            </div>
            <div className="text-center text-[18px] lg:text-[24px] font-semibold text-white tracking-[0.3em] -mt-2">
              FREE VERSION
            </div>
          </div>
          <button
            onClick={() => setShowPremiumModal(true, 'feature')}
            className="pointer-events-auto absolute bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-purple-500/30 hover:border-purple-400/60 transition-all hover:scale-105 shadow-lg"
          >
            Upgrade to remove watermark
          </button>
        </div>
      )}
    </div>
  );
};

export default ERDCanvas;
