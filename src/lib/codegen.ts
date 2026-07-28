import { getPostgresTypeFamily, normalizePostgresType } from "./postgresTypes";

export type Language = "rust" | "typescript" | "ruby" | "csharp" | "dart" | "python" | "java";

interface ColumnInfo {
  name: string;
  data_type: string;
}

function getTsType(sqlType: string): string {
  const family = getPostgresTypeFamily(normalizePostgresType(sqlType));
  if (family === "numeric") return "number";
  if (family === "boolean") return "boolean";
  if (family === "json") return "any";
  if (family === "date") return "Date | string";
  return "string";
}

function getRustType(sqlType: string): string {
  if (!sqlType) return "String";
  const t = normalizePostgresType(sqlType);
  const family = getPostgresTypeFamily(t);
  
  if (t === "smallint") return "i16";
  if (t === "integer" || t === "int") return "i32";
  if (t === "bigint") return "i64";
  if (t === "real") return "f32";
  if (t === "double precision" || t === "numeric") return "f64";
  
  if (family === "boolean") return "bool";
  if (family === "json") return "serde_json::Value";
  if (family === "uuid") return "uuid::Uuid";
  if (family === "date") return "chrono::NaiveDateTime";
  return "String";
}

function getCSharpType(sqlType: string): string {
  if (!sqlType) return "string";
  const t = normalizePostgresType(sqlType);
  const family = getPostgresTypeFamily(t);
  
  if (t === "smallint") return "short";
  if (t === "integer" || t === "int") return "int";
  if (t === "bigint") return "long";
  if (t === "real") return "float";
  if (t === "double precision" || t === "numeric") return "double";
  
  if (family === "boolean") return "bool";
  if (family === "date") return "DateTime";
  if (family === "uuid") return "Guid";
  return "string";
}

function getDartType(sqlType: string): string {
  const t = normalizePostgresType(sqlType);
  const family = getPostgresTypeFamily(t);
  
  if (t === "integer" || t === "int" || t === "bigint" || t === "smallint") return "int";
  if (family === "numeric") return "double";
  if (family === "boolean") return "bool";
  if (family === "date") return "DateTime";
  if (family === "json") return "Map<String, dynamic>";
  return "String";
}

function getPythonType(sqlType: string): string {
  const family = getPostgresTypeFamily(normalizePostgresType(sqlType));
  if (family === "numeric") {
    const t = normalizePostgresType(sqlType);
    if (t === "real" || t === "double precision" || t === "numeric") return "float";
    return "int";
  }
  if (family === "boolean") return "bool";
  if (family === "date") return "datetime";
  if (family === "json") return "dict";
  if (family === "uuid") return "UUID";
  return "str";
}

function getJavaType(sqlType: string): string {
  const t = normalizePostgresType(sqlType);
  const family = getPostgresTypeFamily(t);
  
  if (t === "smallint") return "Short";
  if (t === "integer" || t === "int") return "Integer";
  if (t === "bigint") return "Long";
  if (t === "real") return "Float";
  if (t === "double precision" || t === "numeric") return "Double";
  
  if (family === "boolean") return "Boolean";
  if (family === "date") return "LocalDateTime";
  if (family === "uuid") return "UUID";
  if (family === "json") return "Object"; // or JsonNode
  
  return "String";
}

function snakeToPascal(str: string): string {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function generateCode(lang: Language, tableName: string, columns: ColumnInfo[], data: any[]): string {
  const className = snakeToPascal(tableName || "UnknownTable");

  switch (lang) {
    case "typescript": {
      let code = `export interface ${className} {\n`;
      for (const col of columns) {
        code += `  ${col.name}: ${getTsType(col.data_type)};\n`;
      }
      code += `}\n\n`;
      if (data.length > 0) {
        code += `export const mock${className}Data: ${className}[] = ${JSON.stringify(data, null, 2)};\n`;
      }
      return code;
    }
    case "rust": {
      let code = `#[derive(Debug, Serialize, Deserialize)]\npub struct ${className} {\n`;
      for (const col of columns) {
        code += `    pub ${col.name}: Option<${getRustType(col.data_type)}>,\n`;
      }
      code += `}\n`;
      return code;
    }
    case "ruby": {
      let code = `class ${className}\n`;
      code += `  attr_accessor ${columns.map(c => `:${c.name}`).join(", ")}\n\n`;
      code += `  def initialize(attrs = {})\n`;
      for (const col of columns) {
        code += `    @${col.name} = attrs[:${col.name}]\n`;
      }
      code += `  end\n`;
      code += `end\n`;
      return code;
    }
    case "csharp": {
      let code = `public class ${className}\n{\n`;
      for (const col of columns) {
        code += `    public ${getCSharpType(col.data_type)}? ${snakeToPascal(col.name)} { get; set; }\n`;
      }
      code += `}\n`;
      return code;
    }
    case "dart": {
      let code = `class ${className} {\n`;
      for (const col of columns) {
        let type = getDartType(col.data_type);
        // Map string to nullable String?
        code += `  final ${type}? ${col.name};\n`;
      }
      code += `\n  ${className}({\n`;
      for (const col of columns) {
        code += `    this.${col.name},\n`;
      }
      code += `  });\n\n`;
      code += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
      code += `    return ${className}(\n`;
      for (const col of columns) {
        let type = getDartType(col.data_type);
        if (type === "DateTime") {
          code += `      ${col.name}: json['${col.name}'] != null ? DateTime.parse(json['${col.name}']) : null,\n`;
        } else {
          code += `      ${col.name}: json['${col.name}'],\n`;
        }
      }
      code += `    );\n  }\n`;
      code += `}\n`;
      return code;
    }
    case "python": {
      let code = `from typing import Optional\nfrom dataclasses import dataclass\nimport datetime\n\n@dataclass\nclass ${className}:\n`;
      for (const col of columns) {
        code += `    ${col.name}: Optional[${getPythonType(col.data_type)}] = None\n`;
      }
      return code;
    }
    case "java": {
      let code = `public class ${className} {\n`;
      for (const col of columns) {
        code += `    private ${getJavaType(col.data_type)} ${col.name};\n`;
      }
      code += `\n    // Getters and Setters...\n`;
      code += `}\n`;
      return code;
    }
    default:
      return "";
  }
}
