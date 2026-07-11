import { Panel, useReactFlow } from '@xyflow/react';
import { CornersOutIcon, GraphIcon, PlusCircleIcon } from '@phosphor-icons/react';

export function ERDToolbar({ 
  onLayout, 
  onExpandNeighbors, 
  layoutDirection 
}: { 
  onLayout: (dir: 'LR' | 'TB') => void,
  onExpandNeighbors: (depth: number | 'all') => void,
  layoutDirection: 'LR' | 'TB'
}) {
  const { fitView } = useReactFlow();

  return (
    <Panel position="top-center" className="bg-background/80 backdrop-blur-md border border-border/60 shadow-lg rounded-xl p-1.5 flex items-center gap-1 mt-4">
      <button 
        onClick={() => fitView({ duration: 800, padding: 0.2 })}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium"
        title="Fit View"
      >
        <CornersOutIcon size={18} />
      </button>

      <div className="w-px h-6 bg-border/60 mx-1"></div>

      <button 
        onClick={() => onLayout(layoutDirection)}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium"
        title="Auto Layout"
      >
        <GraphIcon size={18} />
        Auto Layout
      </button>
      
      <div className="flex bg-muted/30 p-0.5 rounded-lg border border-border/40 ml-1">
         <button 
           onClick={() => onLayout('LR')}
           className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${layoutDirection === 'LR' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
         >
           L → R
         </button>
         <button 
           onClick={() => onLayout('TB')}
           className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${layoutDirection === 'TB' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
         >
           T ↓ B
         </button>
      </div>

      <div className="w-px h-6 bg-border/60 mx-1 ml-2"></div>

      <div className="flex bg-blue-500/10 p-0.5 rounded-lg border border-blue-500/20">
         <button 
           onClick={() => onExpandNeighbors(1)}
           className="px-3 py-1.5 text-[12px] font-medium rounded-md text-blue-600 hover:bg-background hover:shadow-sm transition-colors flex items-center gap-1.5"
         >
           <PlusCircleIcon size={14} weight="fill" />
           Depth 1
         </button>
         <button 
           onClick={() => onExpandNeighbors(2)}
           className="px-3 py-1.5 text-[12px] font-medium rounded-md text-blue-600 hover:bg-background hover:shadow-sm transition-colors flex items-center gap-1.5"
         >
           <PlusCircleIcon size={14} weight="fill" />
           Depth 2
         </button>
         <button 
           onClick={() => onExpandNeighbors('all')}
           className="px-3 py-1.5 text-[12px] font-medium rounded-md text-blue-600 hover:bg-background hover:shadow-sm transition-colors flex items-center gap-1.5"
         >
           <PlusCircleIcon size={14} weight="fill" />
           All
         </button>
      </div>
    </Panel>
  );
}
