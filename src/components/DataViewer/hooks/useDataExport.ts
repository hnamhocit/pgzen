import { useDataViewerStore } from "../store/useDataViewerStore";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export function useDataExport(tableName: string) {
  const { selectedRows, setSelectedRows, data, columns } = useDataViewerStore();

  const handleExport = async (format: 'json' | 'xlsx' | 'csv') => {
    const selectedData = selectedRows.size > 0
      ? Array.from(selectedRows).sort((a, b) => a - b).map(idx => data[idx])
      : data;
      
    if (selectedData.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const loadingToast = toast.loading(`Exporting to ${format.toUpperCase()}...`);

    try {
      // Yield to main thread so the toast can render
      await new Promise(resolve => setTimeout(resolve, 50));

      if (format === 'json') {
        const jsonStr = JSON.stringify(selectedData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(selectedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `${tableName}_export.xlsx`);
      } else if (format === 'csv') {
        const header = columns.map(c => `"${c.name}"`).join(",");
        const csv = selectedData.map(row => 
          columns.map(c => {
            let val = row[c.name];
            if (val === null || val === undefined) return '""';
            if (typeof val === 'object') val = JSON.stringify(val);
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(",")
        ).join("\n");
        const blob = new Blob([`${header}\n${csv}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}_export.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast.success("Export successful!", { id: loadingToast });
      setSelectedRows(new Set());
    } catch (error: any) {
      console.error(error);
      toast.error(`Export failed: ${error.message || error}`, { id: loadingToast });
    }
  };

  return { handleExport };
}
