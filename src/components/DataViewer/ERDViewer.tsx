import { useEffect, useState, useCallback, useRef } from "react";

import { TabDoc } from "@/store/useTabStore";
import { CircleNotchIcon } from "@phosphor-icons/react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  useReactFlow,
  ReactFlowProvider,
  NodeMouseHandler
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './ERD/TableNode';
import { ERDToolbar } from './ERD/ERDToolbar';
import { getLayoutedElements } from './ERD/LayoutEngine';
import { toast } from 'sonner';
import { GraphEngine } from './ERD/GraphEngine';
import { getSchemaErdData, ColumnInfo } from '@/lib/tauri';

interface ERDViewerProps {
  tab: TabDoc;
  columns: ColumnInfo[];
}

const nodeTypes = { table: TableNode };

function ERDGraph({ tab }: ERDViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  
  const engineRef = useRef<GraphEngine | null>(null);
  const [visibleTables, setVisibleTables] = useState<Set<string>>(new Set());

  const { fitView, getNodes, getEdges } = useReactFlow();

  const initGraph = async () => {
    setLoading(true);
    try {
      const data = await getSchemaErdData(tab.connectionId!, tab.database!, tab.schema!);
      const engine = new GraphEngine(data, tab.schema!);
      engineRef.current = engine;
      
      const initialVisible = new Set<string>();
      if (tab.title) {
        initialVisible.add(tab.title);
      } else if (engine.getTableIds().length > 0) {
        initialVisible.add(engine.getTableIds()[0]);
      }
      
      setVisibleTables(initialVisible);
      
      const { nodes: newNodes, edges: newEdges } = engine.buildNodesAndEdges(initialVisible, [], toggleNodeExpand);
      
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(newNodes, newEdges, layoutDirection);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (err: any) {
      console.error(err);
      setError(String(err));
      toast.error("Failed to load schema ERD data");
    } finally {
      setLoading(false);
      setTimeout(() => fitView({ padding: 0.2, duration: 500, maxZoom: 1 }), 100);
    }
  };

  useEffect(() => {
    if (tab.connectionId && tab.database && tab.schema) {
      initGraph();
    }
  }, [tab.connectionId, tab.database, tab.schema]);

  const toggleNodeExpand = (nodeId: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id === `${tab.schema}.${nodeId}`) {
        return {
          ...node,
          data: { ...node.data, expanded: !(node.data.expanded) }
        };
      }
      return node;
    }));
    // Re-layout slightly after expansion to adjust heights
    setTimeout(() => handleLayout(layoutDirection), 50);
  };

  const handleLayout = async (dir: 'LR' | 'TB') => {
    setLayoutDirection(dir);
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const nodesToUse = currentNodes.length > 0 ? currentNodes : nodes;
    const edgesToUse = currentEdges.length > 0 ? currentEdges : edges;

    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodesToUse, edgesToUse, dir);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    fitView({ padding: 0.2, duration: 800, maxZoom: 1 });
  };

  const handleExpandNeighbors = async (depth: number | 'all') => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    // Find selected nodes, or default to focused node, or default to main table
    const selectedNodes = getNodes().filter(n => n.selected);
    const targets = selectedNodes.length > 0 
      ? selectedNodes 
      : getNodes().filter(n => n.id === focusedNode || n.id === `${tab.schema}.${tab.title}`);
    
    if (targets.length === 0) return;
    
    const targetNames = new Set(targets.map(t => t.data.title as string));
    
    toast.info(`Expanding neighbors (Depth: ${depth})...`);
    
    const newVisible = engine.expand(targetNames, depth);
    
    setVisibleTables(newVisible);
    
    const { nodes: newNodes, edges: newEdges } = engine.buildNodesAndEdges(newVisible, getNodes(), toggleNodeExpand);
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(newNodes, newEdges, layoutDirection);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 800, maxZoom: 1 }), 50);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeDoubleClick: NodeMouseHandler = (_, node) => {
    if (focusedNode === node.id) {
      setFocusedNode(null); // exit focus mode
      setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })));
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));
      fitView({ duration: 800, padding: 0.2, maxZoom: 1 });
    } else {
      setFocusedNode(node.id);
      
      // Find connected nodes
      const currentEdges = getEdges();
      const connectedEdges = currentEdges.filter(e => e.source === node.id || e.target === node.id);
      const connectedNodeIds = new Set([node.id, ...connectedEdges.map(e => e.source), ...connectedEdges.map(e => e.target)]);
      
      setNodes(nds => nds.map(n => ({
        ...n,
        style: { opacity: connectedNodeIds.has(n.id) ? 1 : 0.2, transition: 'opacity 0.3s' }
      })));
      setEdges(eds => eds.map(e => ({
        ...e,
        style: { ...e.style, opacity: (e.source === node.id || e.target === node.id) ? 1 : 0.1, transition: 'opacity 0.3s' }
      })));
      
      // Center on the focused node
      fitView({ nodes: [{ id: node.id }], duration: 800, padding: 0.5, maxZoom: 1.2 });
    }
  };

  const onPaneClick = () => {
    if (focusedNode) {
      setFocusedNode(null);
      setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })));
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground bg-background">
        <CircleNotchIcon className="animate-spin mr-2" size={20} />
        Loading ER Diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive p-4 text-center bg-background">
        Error loading ER Diagram: {error}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#0f1115]"
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
          <defs>
            <marker id="crows-foot-many" viewBox="0 0 20 20" refX="20" refY="10" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
              <path d="M 0,10 L 10,10 M 10,3 L 10,17 M 10,10 L 20,3 M 10,10 L 20,10 M 10,10 L 20,17" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="crows-foot-one" viewBox="0 0 20 20" refX="20" refY="10" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
              <path d="M 0,10 L 20,10 M 10,3 L 10,17 M 15,3 L 15,17" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </marker>
          </defs>
        </svg>
        <Background gap={16} size={1} color="#334155" />
        <Controls className="bg-background/80 backdrop-blur-md border border-border/60 shadow-md rounded-lg overflow-hidden fill-foreground" />
        <ERDToolbar 
          onLayout={handleLayout} 
          onExpandNeighbors={handleExpandNeighbors}
          layoutDirection={layoutDirection}
        />
      </ReactFlow>
    </div>
  );
}

export default function ERDViewerWrapper(props: ERDViewerProps) {
  return (
    <ReactFlowProvider>
      <ERDGraph {...props} />
    </ReactFlowProvider>
  );
}
