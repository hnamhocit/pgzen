import { useState, useCallback, useRef, useEffect } from "react";
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges, useReactFlow, NodeMouseHandler } from '@xyflow/react';
import { TabDoc } from "@/store/useTabStore";
import { toast } from 'sonner';
import { GraphEngine } from '../ERD/GraphEngine';
import { getLayoutedElements } from '../ERD/LayoutEngine';
import { getSchemaErdData } from '@/lib/tauri';

export function useERDGraph(tab: TabDoc) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  
  const engineRef = useRef<GraphEngine | null>(null);
  const [, setVisibleTables] = useState<Set<string>>(new Set());

  const { fitView, getNodes, getEdges } = useReactFlow();

  const initGraph = useCallback(async () => {
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
  }, [tab, layoutDirection, fitView]);

  useEffect(() => {
    if (tab.connectionId && tab.database && tab.schema) {
      initGraph();
    }
  }, [tab.connectionId, tab.database, tab.schema, initGraph]);

  const toggleNodeExpand = useCallback((nodeId: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id === `${tab.schema}.${nodeId}`) {
        return {
          ...node,
          data: { ...node.data, expanded: !(node.data.expanded) }
        };
      }
      return node;
    }));
    setTimeout(() => handleLayout(layoutDirection), 50);
  }, [tab.schema, layoutDirection]);

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

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_, node) => {
    if (focusedNode === node.id) {
      setFocusedNode(null);
      setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })));
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));
      fitView({ duration: 800, padding: 0.2, maxZoom: 1 });
    } else {
      setFocusedNode(node.id);
      
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
      
      fitView({ nodes: [{ id: node.id }], duration: 800, padding: 0.5, maxZoom: 1.2 });
    }
  }, [focusedNode, getEdges, fitView]);

  const onPaneClick = useCallback(() => {
    if (focusedNode) {
      setFocusedNode(null);
      setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })));
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));
    }
  }, [focusedNode]);

  return {
    loading,
    error,
    nodes,
    edges,
    layoutDirection,
    onNodesChange,
    onEdgesChange,
    onNodeDoubleClick,
    onPaneClick,
    handleLayout,
    handleExpandNeighbors
  };
}
