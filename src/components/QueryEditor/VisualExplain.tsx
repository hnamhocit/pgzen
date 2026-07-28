import { useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { ExplainNode } from "./ExplainNode";

const elk = new ELK();

const nodeTypes = {
  explainNode: ExplainNode,
};

function parseExplainGraph(planData: any) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let maxTime = 0;

  // Find max time for bottleneck threshold
  const findMaxTime = (node: any) => {
    if (node["Actual Total Time"] && node["Actual Total Time"] > maxTime) {
      maxTime = node["Actual Total Time"];
    }
    if (node.Plans) {
      node.Plans.forEach(findMaxTime);
    }
  };

  findMaxTime(planData);
  const bottleneckThreshold = maxTime > 0 ? maxTime * 0.5 : Infinity; // nodes taking > 50% max time are bottlenecks

  let idCounter = 1;

  const traverse = (nodeData: any, parentId: string | null = null) => {
    const nodeId = `node_${idCounter++}`;
    
    // Determine bottleneck
    let isBottleneck = false;
    if (
      nodeData["Actual Total Time"] !== undefined &&
      nodeData["Actual Total Time"] >= bottleneckThreshold &&
      nodeData["Actual Total Time"] > 5 // Ignore very fast nodes
    ) {
      isBottleneck = true;
    }
    // E.g. Seq Scan on a very large result set
    if (nodeData["Node Type"] === "Seq Scan" && nodeData["Actual Rows"] > 10000) {
      isBottleneck = true;
    }

    nodes.push({
      id: nodeId,
      type: "explainNode",
      position: { x: 0, y: 0 },
      data: {
        ...nodeData,
        isBottleneck,
      },
    });

    if (parentId) {
      edges.push({
        id: `e_${parentId}_${nodeId}`,
        source: nodeId, // Child feeds into Parent
        target: parentId,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: isBottleneck ? "#ef4444" : "#94a3b8" },
        style: { stroke: isBottleneck ? "#ef4444" : "#94a3b8", strokeWidth: isBottleneck ? 2 : 1 },
      });
    }

    if (nodeData.Plans) {
      nodeData.Plans.forEach((child: any) => traverse(child, nodeId));
    }
  };

  traverse(planData);
  return { nodes, edges };
}

async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "UP", // Children feed into parents, so data flows UP
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.spacing.nodeNode": "60",
    },
    children: nodes.map((node) => ({
      ...node,
      width: 256, // 64 * 4 = 256px width
      height: 140, // rough height estimation
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph as any);
    const layoutedNodes = nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: layoutedNode?.x ?? node.position.x,
          y: layoutedNode?.y ?? node.position.y,
        },
      };
    });
    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("ELK Layout failed:", error);
    return { nodes, edges };
  }
}

export default function VisualExplain({ plan }: { plan: any }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!plan) return;
    
    // Postgres json explain returns an array with one element
    const rootPlan = Array.isArray(plan) ? plan[0].Plan : plan.Plan || plan;
    
    const { nodes: initialNodes, edges: initialEdges } = parseExplainGraph(rootPlan);
    
    getLayoutedElements(initialNodes, initialEdges).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
      setNodes(layoutedNodes as any);
      setEdges(layoutedEdges as any);
    });
  }, [plan, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
        >
          <Background color="#ccc" gap={16} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
