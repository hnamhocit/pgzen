import { useEffect } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useDataViewerStore } from "../store/useDataViewerStore";

export function Pagination() {
  const {
    page,
    setPage,
    pageSize,
    totalRows,
    loading,
    data,
    pageInput,
    setPageInput,
  } = useDataViewerStore();

  const totalPages = totalRows !== null ? Math.ceil(totalRows / pageSize) : 1;

  // Sync pageInput when page changes
  useEffect(() => {
    setPageInput(page.toString());
  }, [page, setPageInput]);

  const handlePageJump = () => {
    let p = parseInt(pageInput, 10);
    if (isNaN(p)) {
      setPageInput(page.toString());
      return;
    }
    p = Math.max(1, Math.min(p, totalPages));
    setPage(p);
    setPageInput(p.toString());
  };

  return (
    <div className="flex items-center gap-1 bg-background border border-border rounded-md shadow-sm p-1 ml-2">
      <button
        className="p-1.5 hover:bg-muted rounded text-foreground disabled:opacity-30 transition-colors"
        disabled={page === 1 || loading}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        title="Previous Page"
      >
        <CaretLeftIcon size={14} weight="bold" />
      </button>
      <div className="flex items-center gap-1 px-1 text-foreground font-medium">
        <input
          type="text"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={handlePageJump}
          onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
          className="w-10 h-6 text-center text-xs bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none transition-colors"
        />
        <span className="text-muted-foreground select-none">/ {totalPages}</span>
      </div>
      <button
        className="p-1.5 hover:bg-muted rounded text-foreground disabled:opacity-30 transition-colors"
        disabled={(totalRows !== null && page >= totalPages) || data.length < pageSize || loading}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        title="Next Page"
      >
        <CaretRightIcon size={14} weight="bold" />
      </button>
    </div>
  );
}
