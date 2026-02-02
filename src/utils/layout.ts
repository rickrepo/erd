import type { Node, Edge } from '@xyflow/react';
import type { Table, Relationship } from '../types';

interface LayoutOptions {
  spacing: {
    horizontal: number;
    vertical: number;
  };
  nodeWidth: number;
  nodeHeight: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  spacing: {
    horizontal: 300,
    vertical: 200,
  },
  nodeWidth: 250,
  nodeHeight: 200,
};

// Calculate node height based on number of columns
export function calculateNodeHeight(columnCount: number): number {
  const headerHeight = 48;
  const columnHeight = 32;
  const padding = 16;
  return headerHeight + (columnCount * columnHeight) + padding;
}

// Simple grid layout
export function gridLayout(
  tables: Table[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cols = Math.ceil(Math.sqrt(tables.length));

  return tables.map((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      id: table.id,
      type: 'tableNode',
      position: {
        x: col * opts.spacing.horizontal + 50,
        y: row * opts.spacing.vertical + 50,
      },
      data: {
        table,
        isSelected: false,
      },
    };
  });
}

// Force-directed layout simulation
export function forceDirectedLayout(
  tables: Table[],
  relationships: Relationship[],
  iterations: number = 100
): Node[] {
  if (tables.length === 0) return [];

  const nodes = tables.map((table) => ({
    id: table.id,
    x: Math.random() * 800 + 100,
    y: Math.random() * 600 + 100,
    vx: 0,
    vy: 0,
    table,
  }));

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Simulation parameters
  const repulsion = 5000;
  const attraction = 0.05;
  const damping = 0.9;
  const minDistance = 250;

  for (let i = 0; i < iterations; i++) {
    // Apply repulsion between all nodes
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const nodeA = nodes[a];
        const nodeB = nodes[b];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance < minDistance * 2) {
          const force = repulsion / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          nodeA.vx -= fx;
          nodeA.vy -= fy;
          nodeB.vx += fx;
          nodeB.vy += fy;
        }
      }
    }

    // Apply attraction along edges
    for (const rel of relationships) {
      const source = nodeMap.get(rel.sourceTable);
      const target = nodeMap.get(rel.targetTable);

      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (distance - minDistance) * attraction;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }
    }

    // Update positions
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;

      // Keep nodes within bounds
      node.x = Math.max(50, Math.min(1500, node.x));
      node.y = Math.max(50, Math.min(1000, node.y));
    }
  }

  return nodes.map(node => ({
    id: node.id,
    type: 'tableNode',
    position: { x: node.x, y: node.y },
    data: {
      table: node.table,
      isSelected: false,
    },
  }));
}

// Create edges from relationships
export function createEdges(
  relationships: Relationship[],
  _tables: Table[]
): Edge[] {
  return relationships.map(rel => {
    return {
      id: rel.id,
      source: rel.sourceTable,
      target: rel.targetTable,
      sourceHandle: `${rel.sourceColumn}-right`,
      targetHandle: `${rel.targetColumn}-left`,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#64748b',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: '#94a3b8',
        fontSize: 12,
      },
      data: {
        relationship: rel,
        label: `${rel.type === 'one-to-one' ? '1:1' : rel.type === 'one-to-many' ? '1:N' : 'N:M'}`,
      },
    };
  });
}

// Auto-arrange nodes to minimize edge crossings
export function optimizeLayout(
  nodes: Node[],
  edges: Edge[],
  iterations: number = 50
): Node[] {
  if (nodes.length <= 1) return nodes;

  const result = [...nodes];

  // Build adjacency information
  const connections = new Map<string, Set<string>>();
  for (const node of nodes) {
    connections.set(node.id, new Set());
  }

  for (const edge of edges) {
    connections.get(edge.source)?.add(edge.target);
    connections.get(edge.target)?.add(edge.source);
  }

  // Simple optimization: place connected nodes closer
  for (let i = 0; i < iterations; i++) {
    for (const node of result) {
      const connected = connections.get(node.id);
      if (!connected || connected.size === 0) continue;

      let avgX = 0;
      let avgY = 0;
      let count = 0;

      for (const connectedId of connected) {
        const connectedNode = result.find(n => n.id === connectedId);
        if (connectedNode) {
          avgX += connectedNode.position.x;
          avgY += connectedNode.position.y;
          count++;
        }
      }

      if (count > 0) {
        avgX /= count;
        avgY /= count;

        // Move slightly towards average position of connected nodes
        node.position.x += (avgX - node.position.x) * 0.1;
        node.position.y += (avgY - node.position.y) * 0.1;
      }
    }
  }

  return result;
}

// Hierarchical layout for trees
export function hierarchicalLayout(
  tables: Table[],
  relationships: Relationship[]
): Node[] {
  if (tables.length === 0) return [];

  // Build adjacency list
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const table of tables) {
    children.set(table.id, []);
    parents.set(table.id, []);
  }

  for (const rel of relationships) {
    children.get(rel.targetTable)?.push(rel.sourceTable);
    parents.get(rel.sourceTable)?.push(rel.targetTable);
  }

  // Find root nodes (tables with no parents)
  const roots = tables.filter(t => parents.get(t.id)?.length === 0);

  // If no roots found, use all tables
  const startNodes = roots.length > 0 ? roots : tables;

  // BFS to assign levels
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = startNodes.map(t => ({ id: t.id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    const childIds = children.get(id) || [];
    for (const childId of childIds) {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    }
  }

  // Handle disconnected nodes
  for (const table of tables) {
    if (!visited.has(table.id)) {
      levels.set(table.id, 0);
    }
  }

  // Group by level
  const levelGroups = new Map<number, Table[]>();
  for (const table of tables) {
    const level = levels.get(table.id) || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(table);
  }

  // Position nodes
  const nodes: Node[] = [];
  const levelSpacing = 300;
  const nodeSpacing = 280;

  for (const [level, levelTables] of levelGroups) {
    const levelWidth = levelTables.length * nodeSpacing;
    const startX = -levelWidth / 2 + nodeSpacing / 2 + 500;

    levelTables.forEach((table, index) => {
      nodes.push({
        id: table.id,
        type: 'tableNode',
        position: {
          x: startX + index * nodeSpacing,
          y: level * levelSpacing + 50,
        },
        data: {
          table,
          isSelected: false,
        },
      });
    });
  }

  return nodes;
}
