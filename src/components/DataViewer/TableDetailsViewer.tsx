import { TabDoc } from "@/store/useTabStore";
import TableInspector from "./TableInspector";

interface TableDetailsViewerProps {
  tab: TabDoc;
}

export default function TableDetailsViewer({ tab }: TableDetailsViewerProps) {
  return <TableInspector tab={tab} />;
}
