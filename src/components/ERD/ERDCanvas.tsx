import React, { useCallback, useMemo, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import type { Connection, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStore } from '../../store/useStore';
import { gridLayout, forceDirectedLayout, createEdges, hierarchicalLayout } from '../../utils/layout';
import TableNode from './TableNode';
import { LayoutGrid, Network, GitBranch, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

type LayoutType = 'grid' | 'force' | 'hierarchical';

const ERDCanvas: React.FC = () => {
  const { tables, relationships, setSelectedTable, addRelationship, selectedTable } = useStore();
  const [layoutType, setLayoutType] = useState<LayoutType>('force');
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Calculate initial nodes based on layout type
  const initialNodes = useMemo(() => {
    switch (layoutType) {
      case 'grid':
        return gridLayout(tables);
      case 'hierarchical':
        return hierarchicalLayout(tables, relationships);
      case 'force':
      default:
        return forceDirectedLayout(tables, relationships);
    }
  }, [tables, relationships, layoutType]);

  // Calculate edges from relationships
  const initialEdges = useMemo(() => createEdges(relationships, tables), [relationships, tables]);

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
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }, eds));
      }
    },
    [addRelationship, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
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
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-900"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />

        <Controls
          className="!bg-slate-800 !border-slate-700 !rounded-lg overflow-hidden"
          showInteractive={false}
        />

        <MiniMap
          nodeColor={(node) => {
            const data = node.data as { table?: { color?: string } } | undefined;
            return data?.table?.color || '#3b82f6';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-800 !border-slate-700"
          pannable
          zoomable
        />

        {/* Layout Controls Panel */}
        <Panel position="top-left" className="flex gap-2">
          <div className="glass rounded-lg p-1 flex gap-1">
            <button
              onClick={() => handleLayout('grid')}
              className={`p-2 rounded-md transition-colors ${
                layoutType === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-600 text-slate-300'
              }`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('force')}
              className={`p-2 rounded-md transition-colors ${
                layoutType === 'force'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-600 text-slate-300'
              }`}
              title="Force-Directed Layout"
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayout('hierarchical')}
              className={`p-2 rounded-md transition-colors ${
                layoutType === 'hierarchical'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-600 text-slate-300'
              }`}
              title="Hierarchical Layout"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>

          <div className="glass rounded-lg p-1 flex gap-1">
            <button
              onClick={() => zoomIn({ duration: 200 })}
              className="p-2 rounded-md hover:bg-slate-600 text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => zoomOut({ duration: 200 })}
              className="p-2 rounded-md hover:bg-slate-600 text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.2, duration: 300 })}
              className="p-2 rounded-md hover:bg-slate-600 text-slate-300 transition-colors"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </Panel>

        {/* Info Panel */}
        <Panel position="top-right">
          <div className="glass rounded-lg px-4 py-2 text-sm">
            <span className="text-slate-400">
              {tables.length} tables · {relationships.length} relationships
            </span>
          </div>
        </Panel>

        {/* Empty State */}
        {tables.length === 0 && (
          <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Network className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Tables Yet</h3>
              <p className="text-slate-400 max-w-md">
                Paste SQL queries or CREATE TABLE statements in the sidebar to get started.
                I'll extract tables and relationships automatically.
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default ERDCanvas;
