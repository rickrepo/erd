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
    horizontal: 420,
    vertical: 80, // Reduced - we calculate based on actual node heights
  },
  nodeWidth: 280,
  nodeHeight: 250,
};

// Calculate node height based on number of columns (matching TableNode rendering)
export function calculateNodeHeight(columnCount: number): number {
  const headerHeight = 56; // Header with table name and stats
  const columnHeight = 28; // Each column row
  const footerHeight = 32; // FK references footer (approximate)
  const padding = 8;
  return headerHeight + (columnCount * columnHeight) + footerHeight + padding;
}

// Simple grid layout with dynamic row heights
export function gridLayout(
  tables: Table[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cols = Math.ceil(Math.sqrt(tables.length));

  // Calculate row heights based on tallest node in each row
  const rows: Table[][] = [];
  tables.forEach((table, index) => {
    const rowIndex = Math.floor(index / cols);
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(table);
  });

  // Calculate cumulative Y positions
  const rowYPositions: number[] = [50];
  rows.forEach((_row, rowIndex) => {
    if (rowIndex > 0) {
      const prevRowMaxHeight = Math.max(...rows[rowIndex - 1].map(t => calculateNodeHeight(t.columns.length)));
      rowYPositions.push(rowYPositions[rowIndex - 1] + prevRowMaxHeight + opts.spacing.vertical);
    }
  });

  return tables.map((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      id: table.id,
      type: 'tableNode',
      position: {
        x: col * opts.spacing.horizontal + 50,
        y: rowYPositions[row],
      },
      data: {
        table,
        isSelected: false,
      },
    };
  });
}

// Force-directed layout with LEFT-TO-RIGHT bias for relationships
export function forceDirectedLayout(
  tables: Table[],
  relationships: Relationship[],
  iterations: number = 100
): Node[] {
  if (tables.length === 0) return [];

  // Calculate the average node height for spacing
  const avgHeight = tables.reduce((sum, t) => sum + calculateNodeHeight(t.columns.length), 0) / tables.length;

  // Initialize with left-to-right bias based on relationship direction
  // Tables that are referenced (targets) should start more to the right
  const referenceCount = new Map<string, number>();
  const referencedByCount = new Map<string, number>();

  for (const table of tables) {
    referenceCount.set(table.id, 0);
    referencedByCount.set(table.id, 0);
  }

  for (const rel of relationships) {
    referenceCount.set(rel.sourceTable, (referenceCount.get(rel.sourceTable) || 0) + 1);
    referencedByCount.set(rel.targetTable, (referencedByCount.get(rel.targetTable) || 0) + 1);
  }

  // Calculate initial X position based on "depth" - tables that reference others are on the left
  const nodes = tables.map((table, index) => {
    const refs = referenceCount.get(table.id) || 0;
    const refdBy = referencedByCount.get(table.id) || 0;
    // More references = more to the left, more referenced by = more to the right
    const xBias = (refdBy - refs) * 200 + 500;

    return {
      id: table.id,
      x: xBias + (Math.random() - 0.5) * 200,
      y: 100 + index * 120,
      vx: 0,
      vy: 0,
      table,
      height: calculateNodeHeight(table.columns.length),
    };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Simulation parameters
  const repulsion = 15000;
  const attraction = 0.02;
  const damping = 0.8;
  const minDistance = Math.max(400, avgHeight + 100);
  const horizontalBias = 0.3; // Encourage source to be left of target

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

    // Apply attraction along edges with LEFT-TO-RIGHT bias
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

        // LEFT-TO-RIGHT BIAS: push source left, target right
        if (source.x > target.x - 100) {
          source.vx -= horizontalBias * 50;
          target.vx += horizontalBias * 50;
        }
      }
    }

    // Update positions
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;

      // Keep nodes within bounds
      node.x = Math.max(80, Math.min(1600, node.x));
      node.y = Math.max(80, Math.min(1000, node.y));
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

// Hierarchical layout for trees - LEFT TO RIGHT flow for clean edge routing
export function hierarchicalLayout(
  tables: Table[],
  relationships: Relationship[]
): Node[] {
  if (tables.length === 0) return [];

  // Build adjacency list - source tables connect to target tables
  // For left-to-right: source (FK table) should be to the LEFT of target (PK table)
  const outgoing = new Map<string, string[]>(); // source -> targets
  const incoming = new Map<string, string[]>(); // target -> sources

  for (const table of tables) {
    outgoing.set(table.id, []);
    incoming.set(table.id, []);
  }

  for (const rel of relationships) {
    outgoing.get(rel.sourceTable)?.push(rel.targetTable);
    incoming.get(rel.targetTable)?.push(rel.sourceTable);
  }

  // Find root nodes (tables that ARE referenced but don't reference others, or have no incoming)
  // These should be on the RIGHT side (PK/lookup tables)
  const roots = tables.filter(t => outgoing.get(t.id)?.length === 0 && incoming.get(t.id)?.length! > 0);

  // If no roots found, find tables with no incoming references (true roots, on left)
  const leftRoots = tables.filter(t => incoming.get(t.id)?.length === 0);

  // Use left roots for BFS, but we'll reverse the level at the end
  const startNodes = leftRoots.length > 0 ? leftRoots : (roots.length > 0 ? roots : tables);

  // BFS to assign levels - follow outgoing edges
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = startNodes.map(t => ({ id: t.id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    // Follow outgoing edges (source -> target), target goes to next level (right)
    const targetIds = outgoing.get(id) || [];
    for (const targetId of targetIds) {
      if (!visited.has(targetId)) {
        queue.push({ id: targetId, level: level + 1 });
      }
    }
  }

  // Handle disconnected nodes
  for (const table of tables) {
    if (!visited.has(table.id)) {
      levels.set(table.id, 0);
    }
  }

  // Group by level (column)
  const levelGroups = new Map<number, Table[]>();
  for (const table of tables) {
    const level = levels.get(table.id) || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(table);
  }

  // Position nodes HORIZONTALLY (left to right) instead of vertically
  const nodes: Node[] = [];
  const columnSpacing = 420; // Horizontal gap between columns
  const rowSpacing = 100; // Vertical gap between rows in same column

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const levelTables = levelGroups.get(level)!;

    // Calculate total height needed for this column
    let currentY = 80;

    levelTables.forEach((table) => {
      const nodeHeight = calculateNodeHeight(table.columns.length);

      nodes.push({
        id: table.id,
        type: 'tableNode',
        position: {
          x: 80 + level * columnSpacing, // X increases with level (left to right)
          y: currentY,
        },
        data: {
          table,
          isSelected: false,
        },
      });

      currentY += nodeHeight + rowSpacing;
    });
  }

  return nodes;
}
