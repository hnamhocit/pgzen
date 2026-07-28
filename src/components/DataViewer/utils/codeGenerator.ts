import { ColumnInfo } from "@/lib/tauri";
import { getPostgresTypeFamily, normalizePostgresType } from "@/lib/postgresTypes";

export type Language = 'rust' | 'typescript' | 'python' | 'dart' | 'csharp' | 'java';

export function generateCode(lang: Language, tableName: string, columns: ColumnInfo[]): string {
  const className = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  
  const getType = (pgType: string, l: Language) => {
    const t = normalizePostgresType(pgType);
    const family = getPostgresTypeFamily(t);
    const isNum = family === "numeric";
    const isBool = family === "boolean";
    const isDate = family === "date";
    const isJson = family === "json";

    switch (l) {
      case 'rust':
        if (isNum) return t.includes('float') || t.includes('double') ? 'f64' : 'i64';
        if (isBool) return 'bool';
        if (isDate) return 'chrono::NaiveDateTime';
        if (isJson) return 'serde_json::Value';
        return 'String';
      case 'typescript':
        if (isNum) return 'number';
        if (isBool) return 'boolean';
        if (isDate) return 'Date';
        if (isJson) return 'any';
        return 'string';
      case 'python':
        if (isNum) return t.includes('float') || t.includes('double') ? 'float' : 'int';
        if (isBool) return 'bool';
        if (isDate) return 'datetime';
        if (isJson) return 'dict';
        return 'str';
      case 'dart':
        if (isNum) return t.includes('float') || t.includes('double') ? 'double' : 'int';
        if (isBool) return 'bool';
        if (isDate) return 'DateTime';
        if (isJson) return 'Map<String, dynamic>';
        return 'String';
      case 'csharp':
        if (isNum) return t.includes('float') || t.includes('double') ? 'double' : 'long';
        if (isBool) return 'bool';
        if (isDate) return 'DateTime';
        if (isJson) return 'JsonDocument';
        return 'string';
      case 'java':
        if (isNum) return t.includes('float') || t.includes('double') ? 'Double' : 'Long';
        if (isBool) return 'Boolean';
        if (isDate) return 'LocalDateTime';
        if (isJson) return 'JsonNode';
        return 'String';
    }
  };

  switch (lang) {
    case 'rust':
      return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${className} {\n${columns.map(c => `    pub ${c.name}: ${getType(c.data_type, lang)},`).join('\n')}\n}`;
    case 'typescript':
      return `export interface ${className} {\n${columns.map(c => `  ${c.name}: ${getType(c.data_type, lang)};`).join('\n')}\n}`;
    case 'python':
      return `from dataclasses import dataclass\nfrom datetime import datetime\n\n@dataclass\nclass ${className}:\n${columns.map(c => `    ${c.name}: ${getType(c.data_type, lang)}`).join('\n')}`;
    case 'dart':
      return `class ${className} {\n${columns.map(c => `  final ${getType(c.data_type, lang)} ${c.name};`).join('\n')}\n\n  ${className}({\n${columns.map(c => `    required this.${c.name},`).join('\n')}\n  });\n}`;
    case 'csharp':
      return `public record ${className}(\n${columns.map(c => `    ${getType(c.data_type, lang)} ${c.name.charAt(0).toUpperCase() + c.name.slice(1)}`).join(',\n')}\n);`;
    case 'java':
      return `public class ${className} {\n${columns.map(c => `    private ${getType(c.data_type, lang)} ${c.name};`).join('\n')}\n\n    // Getters and Setters omitted for brevity\n}`;
  }
}
