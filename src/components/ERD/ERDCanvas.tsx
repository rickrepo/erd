import { useCallback, useMemo, useEffect, useState } from 'react';
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
  MarkerType,
} from '@xyflow/react';
import type { Connection, NodeTypes, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../../store/useStore';
import { gridLayout, forceDirectedLayout, createEdges, hierarchicalLayout } from '../../utils/layout';
import { DEMO_POSITIONS } from '../../utils/demoData';
import TableNode from './TableNode';
import { ExportPanel } from './ExportPanel';
import { Branding } from '../common/Branding';
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
} from 'lucide-react';

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

type LayoutType = 'grid' | 'force' | 'hierarchical';

// Custom edge styling for professional ERD look
const edgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#6366f1', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: '#6366f1',
  },
};

const ERDCanvas: React.FC = () => {
  const { tables, relationships, setSelectedTable, addRelationship, selectedTable, isDemoMode } = useStore();
  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const [showExport, setShowExport] = useState(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Calculate initial nodes based on layout type
  const initialNodes = useMemo(() => {
    // Use demo positions if in demo mode
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

  // Calculate edges with professional styling
  const initialEdges = useMemo(() => {
    const edges = createEdges(relationships, tables);
    return edges.map((edge: Edge) => ({
      ...edge,
      ...edgeOptions,
      animated: false,
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
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
          ...edgeOptions,
        }, eds));
      }
    },
    [addRelationship, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string }) => {
      setSelectedTable(node.id);
    },
    [setSelectedTable]
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
  }, [setSelectedTable]);

  // Re-layout with animation
  const handleLayout = (type: LayoutType) => {
    setLayoutType(type);
    setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 100);
  };

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={edgeOptions}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-900"
        snapToGrid
        snapGrid={[20, 20]}
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
          className="!bg-slate-800/90 !border-slate-700 !rounded-xl !shadow-xl"
          pannable
          zoomable
        />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex gap-2">
          {/* Layout Controls */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-1.5 flex gap-1 shadow-xl border border-slate-700">
            <button
              onClick={() => handleLayout('grid')}
              className={`p-2.5 rounded-lg transition-all ${
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
              className={`p-2.5 rounded-lg transition-all ${
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
              className={`p-2.5 rounded-lg transition-all ${
                layoutType === 'hierarchical'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Tree Layout"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-1.5 flex gap-1 shadow-xl border border-slate-700">
            <button
              onClick={() => zoomIn({ duration: 200 })}
              className="p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomOut({ duration: 200 })}
              className="p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.15, duration: 300 })}
              className="p-2.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Export Button */}
          {tables.length > 0 && (
            <button
              onClick={() => setShowExport(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl p-2.5 flex items-center gap-2 shadow-xl text-white font-medium text-sm transition-all hover:scale-105"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right">
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

        {/* Branding */}
        <Panel position="bottom-left">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-slate-700/50">
            <Branding size="sm" />
          </div>
        </Panel>

        {/* Empty State */}
        {tables.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2 !left-1/2 !-translate-x-1/2">
            <div className="text-center max-w-md animate-fadeIn">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6 border border-slate-700">
                <Database className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ready to Design</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Paste SQL queries or CREATE TABLE statements in the sidebar.
                Tables and relationships will appear here automatically.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">Drag</span>
                <span>to connect columns</span>
                <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 ml-2">Scroll</span>
                <span>to zoom</span>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Export Panel */}
      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}
    </div>
  );
};

export default ERDCanvas;
