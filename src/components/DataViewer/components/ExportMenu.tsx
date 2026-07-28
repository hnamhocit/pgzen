import { DownloadSimpleIcon, FileTextIcon, TableIcon, FileCodeIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onExport: (format: 'csv' | 'xlsx' | 'json') => void;
}

export function ExportMenu({ onExport }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
        <DownloadSimpleIcon size={16} /> Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 z-50">
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onExport('csv')}>
          <FileTextIcon className="text-green-600" size={14} /> CSV File (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onExport('xlsx')}>
          <TableIcon className="text-emerald-600" size={14} /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onExport('json')}>
          <FileCodeIcon className="text-amber-500" size={14} /> JSON Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
