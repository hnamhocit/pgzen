import { getTypeColorHex, TypeColorGroup } from "@/store/useThemeStore";

export function getColumnColor(type: string, typeGroups?: TypeColorGroup[]) {
  return getTypeColorHex(type, typeGroups);
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

