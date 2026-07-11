import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge, Position } from '@xyflow/react';

const elk = new ELK();

// We need to estimate height accurately because ELK relies on dimensions to avoid overlapping.
const getEstimatedHeight = (node: Node) => {
  if (node.measured?.height) return node.measured.height;
  // Fallback estimation based on number of columns and header
  const cols = (node.data.columns as any[]) || [];
  const expanded = node.data.expanded !== false; // assume true if undefined
  
  const headerHeight = 44;
  const colHeight = 36;
  
  // If expanded, max height is 280. If collapsed, only show PK/FK.
  if (expanded) {
    return Math.min(280, headerHeight + cols.length * colHeight);
  } else {
    const importantCols = cols.filter(c => c.is_primary_key || c.is_foreign_key);
    return Math.min(280, headerHeight + Math.max(1, importantCols.length) * colHeight);
  }
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR') => {
  const isHorizontal = direction === 'LR';
  
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '150',
      'elk.spacing.nodeNode': '80',
      'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.edgeRouting': 'SPLINES',
    },
    children: nodes.map(node => ({
      ...node,
      width: node.measured?.width ?? 280,
      height: getEstimatedHeight(node)
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  try {
    const layoutedGraph = await elk.layout(graph as any);
    
    const layoutedNodes = nodes.map(node => {
      const layoutedNode = layoutedGraph.children?.find(n => n.id === node.id);
      return {
        ...node,
        position: {
          x: layoutedNode?.x ?? node.position.x,
          y: layoutedNode?.y ?? node.position.y
        },
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("ELK Layout failed:", error);
    return { nodes, edges }; // Fallback to current positions if layout fails
  }
};
