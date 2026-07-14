import {
  TextAaIcon,
  HashIcon,
  CalendarBlankIcon,
  BracketsCurlyIcon,
  ShapesIcon,
  ToggleLeftIcon,
  FingerprintIcon,
} from "@phosphor-icons/react";

export function getColumnColor(type: string) {
  const t = type.toLowerCase();
  
  if (t.includes("uuid")) return { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-400" };
  
  if (t.includes("int") || t.includes("float") || t.includes("double") || t.includes("numeric") || t.includes("decimal") || t.includes("real")) 
    return { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400" };
  
  if (t.includes("char") || t.includes("text")) 
    return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" };
  
  if (t.includes("bool")) 
    return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400" };
  
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) 
    return { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-400" };
  
  if (t.includes("json") || t.includes("array")) 
    return { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-400" };
  
  return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" };
}

export function DataTypeIcon({ type, className }: { type: string, className?: string }) {
  const t = type.toLowerCase();
  
  if (t.includes("uuid")) return <FingerprintIcon className={className} weight="bold" />;
  if (t.includes("int") || t.includes("float") || t.includes("double") || t.includes("numeric") || t.includes("decimal") || t.includes("real")) 
    return <HashIcon className={className} weight="bold" />;
  if (t.includes("char") || t.includes("text")) return <TextAaIcon className={className} weight="bold" />;
  if (t.includes("json") || t.includes("array")) return <BracketsCurlyIcon className={className} weight="bold" />;
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return <CalendarBlankIcon className={className} weight="bold" />;
  if (["boolean", "bool"].includes(t)) return <ToggleLeftIcon className={className} weight="bold" />;
  
  return <ShapesIcon className={className} weight="bold" />;
}

export function parseFilterToSql(filterText: string): string {
  if (!filterText) return "";
  let sql = filterText;
  sql = sql.replace(/&&/g, " AND ");
  sql = sql.replace(/\|\|/g, " OR ");
  sql = sql.replace(/==/g, "=");
  sql = sql.replace(/between\s*\(([^,]+),\s*([^)]+)\)/gi, "BETWEEN $1 AND $2");
  return sql.trim();
}

export function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toString();
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  
  // Format string correctly and escape single quotes for SQL
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

