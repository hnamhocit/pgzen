import { PuzzlePieceIcon } from "@phosphor-icons/react";


export default function ExtensionsSection({ dependencies }: { dependencies: string[] }) {
  if (dependencies.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <PuzzlePieceIcon weight="fill" className="text-orange-500" /> Extension Dependencies
      </h3>
      <div className="bg-background border border-border/60 rounded-lg overflow-hidden">
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {dependencies.map(ext => (
              <div key={ext} className="px-3 py-1.5 rounded-md bg-muted border border-border/60 text-sm font-mono text-foreground flex items-center gap-2">
                <PuzzlePieceIcon className="text-muted-foreground" /> {ext}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
