import { TreeStructureIcon } from "@phosphor-icons/react";
import { RelationInspectorInfo } from "../types";

export default function RelationsSection({ relations }: { relations: RelationInspectorInfo }) {
  const isEmpty = relations.parents.length === 0 && relations.children.length === 0;

  if (isEmpty) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <TreeStructureIcon weight="fill" className="text-cyan-500" /> Relations (Inheritance)
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="p-5 flex flex-col gap-4">
          {relations.parents.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Inherits From (Parents)</h3>
              <div className="flex flex-col gap-1">
                {relations.parents.map(p => (
                  <div key={p} className="text-sm font-mono text-cyan-600 dark:text-cyan-500">{p}</div>
                ))}
              </div>
            </div>
          )}
          
          {relations.parents.length > 0 && relations.children.length > 0 && (
            <div className="h-px w-full bg-border/60"></div>
          )}

          {relations.children.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Inherited By (Children)</h3>
              <div className="flex flex-col gap-1">
                {relations.children.map(c => (
                  <div key={c} className="text-sm font-mono text-cyan-600 dark:text-cyan-500">{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
