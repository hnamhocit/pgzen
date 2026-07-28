import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { getPostgresTypeFamily, normalizePostgresType } from "@/lib/postgresTypes";
import { ColumnInfo, ForeignKeyInfo } from "@/lib/tauri";
import { TabDoc } from "@/store/useTabStore";
import { ForeignKeyCombobox } from "./ForeignKeyCombobox";

interface EditorFieldProps {
  col: ColumnInfo;
  val: any;
  onChange: (val: any) => void;
  foreignKey?: ForeignKeyInfo;
  tab?: TabDoc;
}

export function EditorField({ col, val, onChange, foreignKey, tab }: EditorFieldProps) {
  if (foreignKey && tab?.connectionId && tab?.database) {
    return (
      <ForeignKeyCombobox
        connectionId={tab.connectionId}
        database={tab.database}
        foreignKey={foreignKey}
        value={val}
        onChange={onChange}
      />
    );
  }

  const family = getPostgresTypeFamily(col.data_type);
  
  if (family === "boolean") {
    const boolVal = val === true || val === "true" || val === "t" || val === "1" || val === "y";
    return (
      <Switch 
        checked={boolVal} 
        onCheckedChange={onChange} 
      />
    );
  }
  
  const dt = normalizePostgresType(col.data_type);
  const isTimestamp = dt === 'timestamp' || dt === 'timestamptz';
  
  if (family === "date") {
    return (
      <Input 
        type={isTimestamp ? "datetime-local" : "date"}
        className="font-mono text-sm"
        value={val ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  
  if (family === "json") {
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <CodeMirror
          value={typeof val === 'string' ? val : (val ? JSON.stringify(val, null, 2) : "")}
          height="150px"
          extensions={[json()]}
          theme={tokyoNight}
          onChange={(v) => onChange(v)}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
        />
      </div>
    );
  }
  
  return (
    <Input 
      className="font-mono text-sm"
      placeholder={col.is_primary_key ? "Auto-generated (leave blank)" : "null"}
      value={val ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
