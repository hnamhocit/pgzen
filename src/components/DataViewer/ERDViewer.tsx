import { TabDoc } from "@/store/useTabStore";
import { CircleNotchIcon } from "@phosphor-icons/react";
import {
  ReactFlow,
  Controls,
  Background,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './ERD/TableNode';
import { ERDToolbar } from './ERD/ERDToolbar';
import { ColumnInfo } from '@/lib/tauri';
import { useERDGraph } from './hooks/useERDGraph';

interface ERDViewerProps {
  tab: TabDoc;
  columns: ColumnInfo[];
}

const nodeTypes = { table: TableNode };

function ERDGraph({ tab }: ERDViewerProps) {
  const { 
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
  } = useERDGraph(tab);

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
