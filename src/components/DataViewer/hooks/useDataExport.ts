import { useDataViewerStore } from "../store/useDataViewerStore";
import * as XLSX from "xlsx";

export function useDataExport(tableName: string) {
  const { selectedRows, setSelectedRows, data, columns } = useDataViewerStore();

  const handleExport = (format: 'json' | 'xlsx' | 'csv') => {
    const selectedData = Array.from(selectedRows).sort((a, b) => a - b).map(idx => data[idx]);
    if (selectedData.length === 0) return;

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
    setSelectedRows(new Set());
  };

  return { handleExport };
}
